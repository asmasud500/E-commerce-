import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  published: z.boolean().optional()
});

export async function GET() {
  const products = await db.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  try {
    const body = productSchema.parse(await request.json());
    const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const product = await db.product.create({
      data: {
        name: body.name, sku: body.sku, slug: slug + "-" + Date.now(),
        price: body.price, compareAtPrice: body.compareAtPrice, stock: body.stock,
        description: body.description, categoryId: body.categoryId || null,
        published: body.published ?? false
      }
    });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
  }
}
