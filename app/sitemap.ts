import type { MetadataRoute } from "next";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const products = await db.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: base + "/products", changeFrequency: "daily", priority: 0.9 },
    { url: base + "/cart", changeFrequency: "weekly", priority: 0.4 },
    ...products.map((p) => ({
      url: base + "/products/" + p.slug,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
