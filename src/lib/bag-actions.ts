"use server";

import { getLiveBagLines, type LiveBagLine } from "@/db/queries/products";

// Public, read-only: returns current stock and price for SKUs in a bag.
// Server Functions are reachable by direct POST, so validate the input.
const MAX_LINES = 50;

export async function checkBagStock(skus: unknown): Promise<LiveBagLine[]> {
  if (!Array.isArray(skus)) throw new Error("Invalid bag");
  const unique = [
    ...new Set(
      skus.filter(
        (sku): sku is string =>
          typeof sku === "string" && sku.length > 0 && sku.length <= 200,
      ),
    ),
  ].slice(0, MAX_LINES);
  return getLiveBagLines(unique);
}
