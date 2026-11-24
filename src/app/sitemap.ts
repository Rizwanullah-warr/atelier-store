import type { MetadataRoute } from "next";

import { getAllProductSlugs, getCategories } from "@/db/queries/products";
import { infoHref, infoPages } from "@/lib/info-pages";
import { curatedListings } from "@/lib/listings";
import { siteUrl } from "@/lib/site";

// Every public page, for search engines. Product and category lists come from
// the cached catalog queries.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categories] = await Promise.all([getAllProductSlugs(), getCategories()]);
  const paths = [
    "/",
    "/new-arrivals",
    ...curatedListings.map((listing) => `/shop/${listing.slug}`),
    ...categories.map((category) => `/shop/${category.slug}`),
    ...slugs.map((slug) => `/products/${slug}`),
    ...infoPages.filter((page) => !page.draft).map((page) => infoHref(page.slug)),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${siteUrl}${path}` }));
}
