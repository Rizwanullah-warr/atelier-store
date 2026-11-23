"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductGrid } from "@/components/product/product-grid";
import { useWishlist } from "@/components/wishlist/wishlist-context";
import { getWishlistProducts } from "@/lib/account-actions";
import type { StorefrontProduct } from "@/lib/product-utils";

export function WishlistView() {
  const { slugs, ready, signedIn, error } = useWishlist();
  const [products, setProducts] = useState<StorefrontProduct[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const key = slugs.join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    getWishlistProducts(key ? key.split(",") : []).then(
      (rows) => {
        if (cancelled) return;
        setProducts(rows);
        setLoadError(false);
      },
      () => {
        if (!cancelled) setLoadError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [ready, key]);

  if (!ready || (products === null && !loadError)) {
    return <div className="h-80 animate-pulse bg-surface" />;
  }

  // Items un-hearted on this page disappear straight away.
  const visible = (products ?? []).filter((product) => slugs.includes(product.slug));

  return (
    <div>
      {!signedIn && (
        <p className="mb-8 border border-line bg-surface p-5 text-center text-sm">
          Saved on this device only.{" "}
          <Link href="/account" className="link-underline">
            Sign in
          </Link>{" "}
          to keep your wishlist on your account and see it everywhere.
        </p>
      )}
      {(error || loadError) && (
        <p role="alert" className="mb-8 text-center text-sm text-alert">
          {error ?? "We couldn't load your saved items. Please refresh to try again."}
        </p>
      )}
      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-3xl">Nothing saved yet</p>
          <p className="mt-3 text-sm text-muted">
            Tap the heart on any piece to keep it here.
          </p>
          <Link href="/new-arrivals" className="btn btn-solid mt-8">
            Shop New In
          </Link>
        </div>
      ) : (
        <ProductGrid products={visible} />
      )}
    </div>
  );
}
