import type { Metadata } from "next";

import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist | Atelier Store",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">My Atelier</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Wishlist</h1>
      </header>
      <WishlistView />
    </div>
  );
}
