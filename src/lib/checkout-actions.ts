"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { closePendingOrder, createPendingOrder, attachCheckoutSession } from "@/db/queries/orders";
import { getCheckoutVariants } from "@/db/queries/products";
import { auth } from "@/lib/auth";
import { getPaymentMode, getStripe } from "@/lib/stripe";

// Countries Stripe Checkout offers for the shipping address. Edit to match
// where the store actually ships.
const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "CA", "GB", "IE", "FR", "DE", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "DK", "NO", "AU", "NZ", "JP", "SG", "AE", "PK", "IN"];

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

type CheckoutLine = { sku: string; quantity: number };

export type StartCheckoutResult = {
  error: string;
  // The bag no longer matches the database; the client should re-check it.
  bagChanged?: boolean;
};

// Server Functions are reachable by direct POST, so the input is validated
// here and only SKUs and quantities are taken from it.
function parseLines(input: unknown): CheckoutLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) {
    return null;
  }
  const merged = new Map<string, number>();
  for (const line of input) {
    const sku = (line as CheckoutLine)?.sku;
    const quantity = (line as CheckoutLine)?.quantity;
    if (typeof sku !== "string" || sku.length === 0 || sku.length > 200) return null;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
    merged.set(sku, (merged.get(sku) ?? 0) + quantity);
  }
  return [...merged].map(([sku, quantity]) => ({ sku, quantity }));
}

// Starts Stripe Checkout for the bag and redirects to Stripe's payment page.
// Prices and stock are read from the database; stock is decremented only once
// Stripe confirms the payment (see src/lib/checkout.ts).
export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  if (!getPaymentMode()) {
    return { error: "Online payment is not set up yet." };
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Checkout is misconfigured (NEXT_PUBLIC_APP_URL is not set)." };
  }

  const lines = parseLines(input);
  if (!lines) {
    return { error: "Your bag could not be read. Please refresh the page and try again." };
  }

  const variants = new Map(
    (await getCheckoutVariants(lines.map((line) => line.sku))).map((v) => [v.sku, v]),
  );
  const unavailable = lines.some((line) => {
    const variant = variants.get(line.sku);
    return !variant || variant.stock < line.quantity;
  });
  if (unavailable) {
    return {
      error: "Some pieces in your bag have just changed. Please review your bag.",
      bagChanged: true,
    };
  }

  const items = lines.map((line) => {
    const variant = variants.get(line.sku)!;
    return {
      variantId: variant.variantId,
      sku: variant.sku,
      productSlug: variant.productSlug,
      name: variant.name,
      color: variant.color,
      size: variant.size,
      image: variant.image,
      unitPriceCents: variant.priceCents,
      quantity: line.quantity,
    };
  });

  const session = await auth.api.getSession({ headers: await headers() });
  const orderId = randomUUID();
  const order = await createPendingOrder({
    id: orderId,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    items,
  });

  let checkoutUrl: string;
  try {
    const checkout = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: orderId,
        metadata: { orderId, orderNumber: String(order.number) },
        payment_intent_data: { metadata: { orderId } },
        // Signed-in customers' orders appear in their account; guests enter an email on Stripe.
        customer_email: session?.user.email,
        line_items: items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitPriceCents,
            product_data: {
              name: item.name,
              description: [item.color, item.size && `Size ${item.size}`]
                .filter(Boolean)
                .join(" · "),
              images: item.image ? [item.image] : undefined,
              metadata: { sku: item.sku },
            },
          },
        })),
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: "Complimentary express shipping",
              fixed_amount: { amount: 0, currency: "usd" },
              delivery_estimate: {
                minimum: { unit: "business_day", value: 2 },
                maximum: { unit: "business_day", value: 5 },
              },
            },
          },
        ],
        success_url: `${appUrl}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancelled`,
      },
      // Retrying the same order never creates a second Stripe session.
      { idempotencyKey: `checkout-${orderId}` },
    );
    if (!checkout.url) throw new Error("Stripe returned a session without a URL");
    await attachCheckoutSession(orderId, checkout.id);
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error("Could not start Stripe Checkout", error);
    await closePendingOrder(orderId, "failed", "Checkout could not be started.");
    return {
      error: "We couldn't connect to the payment provider. Nothing was charged. Please try again.",
    };
  }

  // Outside the try: redirect() works by throwing.
  redirect(checkoutUrl);
}
