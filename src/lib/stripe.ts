import "server-only";

import Stripe from "stripe";

// Created lazily so the app builds and runs without Stripe keys; checkout is
// simply reported as unavailable until STRIPE_SECRET_KEY is set.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

// "test" for test-mode keys (no real money moves), "live" for live keys
// (sk_live_ or restricted rk_live_), null when payments are not set up.
export type PaymentMode = "test" | "live" | null;

export function getPaymentMode(): PaymentMode {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.includes("_live_") ? "live" : "test";
}
