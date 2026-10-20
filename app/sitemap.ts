import type { MetadataRoute } from "next";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string }[] = [];

  // Keep the sitemap useful even if one optional catalog query is temporarily unavailable.
  try {
    products = await db.product.findMany({
      where: { published: true, stock: { gt: 0 } },
      select: { slug: true, updatedAt: true },
    });
  } catch (error) {
    console.error("Sitemap products error:", error instanceof Error ? error.message : String(error));
  }
  try {
    categories = await db.category.findMany({
      select: { slug: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Sitemap categories error:", error instanceof Error ? error.message : String(error));
  }

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: base + "/products", changeFrequency: "daily", priority: 0.9 },
    ...categories.map((category) => ({
      url: base + "/products?category=" + encodeURIComponent(category.slug),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: base + "/products/" + encodeURIComponent(product.slug),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
