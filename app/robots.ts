import {getSiteUrl} from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/products"],
      disallow: ["/admin/", "/api/", "/account/", "/cart", "/checkout", "/order-success", "/track", "/wishlist"],
    },
    sitemap: base + "/sitemap.xml",
  };
}
