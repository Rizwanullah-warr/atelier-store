import type { NextRequest } from "next/server";

import { searchProducts } from "@/db/queries/products";

// Suggestions for the search box as the shopper types. searchProducts is
// cached per query (tag "products"), so repeated keystrokes are cheap.
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return Response.json({ suggestions: [] });

  const products = await searchProducts(query, 6);
  return Response.json({
    suggestions: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      category: product.category.name,
      priceCents: product.priceCents,
      image: product.images[0] ?? null,
    })),
  });
}
