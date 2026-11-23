import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { isCheckoutSessionId, syncCheckoutSession } from "@/lib/checkout";
import { getPaymentMode } from "@/lib/stripe";

// Stripe redirects here after payment (the Checkout success_url). The order is
// confirmed now, so it works even without webhooks (e.g. local development);
// the webhook does the same for customers who close the tab. Then the
// customer is sent on to the confirmation page.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!isCheckoutSessionId(sessionId) || !getPaymentMode()) {
    redirect("/checkout/success");
  }

  try {
    const result = await syncCheckoutSession(sessionId);
    // Stock changed: make product pages show it right away.
    if (result === "paid") revalidateTag("products", { expire: 0 });
  } catch (error) {
    // The confirmation page shows the order as still being confirmed; the
    // webhook (or a later visit to this URL) finishes the job.
    console.error("Could not confirm Stripe Checkout session", error);
  }

  redirect(`/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
}
