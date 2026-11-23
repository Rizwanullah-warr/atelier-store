import "server-only";

import type Stripe from "stripe";

import {
  closePendingOrder,
  findOrderForSession,
  markOrderPaid,
  markOrderRefunded,
  type PaymentDetails,
} from "@/db/queries/orders";
import { getStripe } from "@/lib/stripe";

// Confirms a Stripe Checkout session against our order. Called from the
// webhook and from the page Stripe redirects to after payment; both paths are
// safe to run any number of times, in any order, even at the same moment.

export type SyncResult =
  | "paid" // just confirmed: stock was decremented
  | "already-processed" // confirmed earlier (or closed); nothing changed
  | "refunded" // paid, but stock ran out; refunded in full
  | "pending" // not paid yet (still open, or an async payment is processing)
  | "expired"
  | "unknown-order";

export const OUT_OF_STOCK_NOTE =
  "A piece in this order sold out while you were paying, so the payment was refunded in full. Refunds usually reach your account within 5 to 10 business days.";

const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

export const isCheckoutSessionId = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 255 && CHECKOUT_SESSION_ID.test(value);

const paymentIntentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);

function paymentDetails(session: Stripe.Checkout.Session): PaymentDetails {
  const shipping = session.collected_information?.shipping_details ?? null;
  return {
    email: session.customer_details?.email ?? null,
    totalCents: session.amount_total,
    paymentIntentId: paymentIntentId(session),
    shippingName: shipping?.name ?? session.customer_details?.name ?? null,
    shippingAddress: shipping
      ? {
          line1: shipping.address.line1,
          line2: shipping.address.line2,
          city: shipping.address.city,
          state: shipping.address.state,
          postalCode: shipping.address.postal_code,
          country: shipping.address.country,
        }
      : null,
  };
}

// Always reads the session from Stripe, so nothing the caller passes in
// (a redirect URL, a webhook body) is trusted beyond the session id.
export async function syncCheckoutSession(sessionId: string): Promise<SyncResult> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const order = await findOrderForSession(session.id, session.client_reference_id);
  if (!order) return "unknown-order";

  if (session.status === "expired") {
    await closePendingOrder(order.id, "expired");
    return "expired";
  }

  const isPaid =
    session.status === "complete" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required");
  if (!isPaid) return "pending";

  const details = paymentDetails(session);
  const result = await markOrderPaid(order.id, details);
  if (result !== "insufficient-stock") return result;

  // The customer paid, but a piece sold out while they were on Stripe's page.
  // Refund in full; the idempotency key makes a repeated attempt a no-op.
  if (!details.paymentIntentId) {
    throw new Error(`Order ${order.id} is out of stock but has no payment intent to refund`);
  }
  await getStripe().refunds.create(
    { payment_intent: details.paymentIntentId, metadata: { orderId: order.id } },
    { idempotencyKey: `refund-${order.id}` },
  );
  await markOrderRefunded(order.id, details, OUT_OF_STOCK_NOTE);
  return "refunded";
}

// For async payment failures reported by webhook.
export async function failCheckoutSession(session: Stripe.Checkout.Session) {
  const order = await findOrderForSession(session.id, session.client_reference_id);
  if (order) {
    await closePendingOrder(order.id, "failed", "The payment did not go through.");
  }
}
