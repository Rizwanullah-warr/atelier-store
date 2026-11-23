import type { Metadata } from "next";
import Link from "next/link";

import { OpenBagButton } from "@/components/cart/open-bag-button";

export const metadata: Metadata = {
  title: "Checkout Cancelled | Atelier Store",
  robots: { index: false },
};

// Stripe Checkout's cancel_url: the customer left Stripe without paying.
export default function CheckoutCancelledPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">Checkout</p>
        <h1 className="mt-3 font-serif text-4xl md:text-6xl">Checkout cancelled</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
          No payment was taken. Your bag is still saved, so you can pick up where you
          left off.
        </p>
      </header>
      <div className="flex justify-center gap-3">
        <OpenBagButton />
        <Link href="/new-arrivals" className="btn">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
