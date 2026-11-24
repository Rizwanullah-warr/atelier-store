"use server";

import { z } from "zod";

import { getProductsBySlugs } from "@/db/queries/products";
import type { StorefrontProduct } from "@/lib/product-utils";

// Public and read-only: current product cards (price, stock) for slugs the
// browser remembered, e.g. recently viewed. Unknown slugs are skipped.
const slugList = z.array(z.string().min(1).max(200)).max(12);

export async function getProductCards(slugs: unknown): Promise<StorefrontProduct[]> {
  return getProductsBySlugs(slugList.parse(slugs));
}
