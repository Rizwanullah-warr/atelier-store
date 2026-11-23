import { revalidateTag } from "next/cache";
import type Stripe from "stripe";

import { failCheckoutSession, syncCheckoutSession } from "@/lib/checkout";
import { getPaymentMode, getStripe } from "@/lib/stripe";

// Stripe calls this URL when a Checkout session changes. Configure it in the
// Stripe Dashboard (or forward to it with `stripe listen`) for these events:
// checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !getPaymentMode()) {
    return new Response("Stripe webhooks are not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  // The signature covers the raw body, so read it as text before parsing.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired": {
        const result = await syncCheckoutSession(event.data.object.id);
        // Stock changed: make product pages show it right away.
        if (result === "paid") revalidateTag("products", { expire: 0 });
        break;
      }
      case "checkout.session.async_payment_failed":
        await failCheckoutSession(event.data.object);
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook ${event.type} failed`, error);
    // A non-2xx response makes Stripe retry the event later.
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
