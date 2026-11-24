"use client";

import { useEffect, useState } from "react";

import { ProductRow } from "@/components/home/product-row";
import { getProductCards } from "@/lib/product-actions";
import type { StorefrontProduct } from "@/lib/product-utils";

// Recently viewed products are remembered in this browser only (localStorage);
// the cards are loaded fresh, so prices and stock are always current.
const STORAGE_KEY = "atelier-recently-viewed";
const MAX_REMEMBERED = 12;

function readSlugs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// Put on a product page to remember the visit.
export function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const slugs = [slug, ...readSlugs().filter((s) => s !== slug)].slice(0, MAX_REMEMBERED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      // Storage unavailable (private mode): nothing to remember.
    }
  }, [slug]);
  return null;
}

// Shows nothing until there is something to show.
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);

  useEffect(() => {
    const slugs = readSlugs()
      .filter((s) => s !== excludeSlug)
      .slice(0, 4);
    if (slugs.length === 0) return;
    let cancelled = false;
    getProductCards(slugs)
      .then((cards) => {
        if (!cancelled) setProducts(cards);
      })
      .catch(() => {
        // Offline or server error: simply don't show the row.
      });
    return () => {
      cancelled = true;
    };
  }, [excludeSlug]);

  if (products.length === 0) return null;
  return <ProductRow eyebrow="Your History" title="Recently Viewed" products={products} />;
}
