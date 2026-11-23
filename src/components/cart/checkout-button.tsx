"use client";

import { useState, useTransition } from "react";

import { useCart } from "@/components/cart/cart-context";
import { startCheckout } from "@/lib/checkout-actions";

export function CheckoutButton() {
  const { items, paymentMode, stockCheck, validate } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!paymentMode) {
    return (
      <>
        <button type="button" disabled className="btn btn-solid mt-6 w-full">
          Checkout Unavailable
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Online payment is not set up yet. Your bag is saved in this browser.
        </p>
      </>
    );
  }

  const hasUnavailable = items.some((item) => item.maxQuantity === 0);

  const checkout = () => {
    setError(null);
    startTransition(async () => {
      // Confirm live stock first; if anything changed, let the shopper review it.
      const unchanged = await validate();
      if (!unchanged) {
        setError(
          "Your bag was updated with the latest availability. Please review it, then check out again.",
        );
        return;
      }
      // On success this redirects to Stripe, so a result means it did not start.
      const result = await startCheckout(
        items.map(({ sku, quantity }) => ({ sku, quantity })),
      );
      if (result?.error) {
        setError(result.error);
        if (result.bagChanged) await validate();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={checkout}
        disabled={isPending || hasUnavailable || stockCheck === "checking"}
        className="btn btn-solid mt-6 w-full"
      >
        {isPending ? "Preparing Secure Checkout…" : "Checkout"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-xs text-alert">
          {error}
        </p>
      ) : hasUnavailable ? (
        <p className="mt-3 text-center text-xs text-muted">
          Remove unavailable pieces to check out.
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">
          {paymentMode === "test" ? (
            <>
              Test mode: no real payment is taken. Pay with card{" "}
              <span className="whitespace-nowrap">4242 4242 4242 4242</span>, any future
              date and any CVC.
            </>
          ) : (
            "You'll pay securely on Stripe."
          )}
        </p>
      )}
    </>
  );
}
