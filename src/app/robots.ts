import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages.
      disallow: ["/admin", "/account", "/checkout", "/api", "/wishlist", "/search"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
