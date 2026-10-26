import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firestore";
import { verifyCustomerToken } from "@/lib/auth/customer";
import { rateLimit } from "@/lib/security/rate-limit";

const productSchema = z.object({ productId: z.string().trim().min(1).max(128) });
const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

async function customer(req: NextRequest) {
  const token = req.cookies.get("customer_session")?.value;
  return token ? verifyCustomerToken(token) : null;
}

function limited(req: NextRequest, userId: string, action: string) {
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  return rateLimit("wishlist:" + action + ":" + userId + ":" + ip, 60, 60_000);
}

export async function GET(req: NextRequest) {
  try {
    const session = await customer(req);
    if (!session) return jsonError("Please log in to view your wishlist.", 401);
    const rl = limited(req, session.userId, "read");
    if (!rl.ok) return jsonError("Too many requests. Please wait and try again.", 429);
    const items = await db.wishlistItem.findMany({
      where: { userId: session.userId },
      include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Wishlist read failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Wishlist is temporarily unavailable.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await customer(req);
    if (!session) return jsonError("Please log in to save wishlist items.", 401);
    const rl = limited(req, session.userId, "write");
    if (!rl.ok) return jsonError("Too many requests. Please wait and try again.", 429);
    const parsed = productSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("A valid productId is required.", 400);
    const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
    if (!product) return jsonError("Product not found.", 404);
    await db.wishlistItem.upsert({
      where: { userId_productId: { userId: session.userId, productId: product.id } },
      update: {},
      create: { userId: session.userId, productId: product.id }
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Wishlist add failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Could not update your wishlist right now.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await customer(req);
    if (!session) return jsonError("Please log in to update your wishlist.", 401);
    const rl = limited(req, session.userId, "write");
    if (!rl.ok) return jsonError("Too many requests. Please wait and try again.", 429);
    const parsed = productSchema.safeParse({ productId: req.nextUrl.searchParams.get("productId") });
    if (!parsed.success) return jsonError("A valid productId is required.", 400);
    await db.wishlistItem.deleteMany({
      where: { userId: session.userId, productId: parsed.data.productId }
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Wishlist remove failed:", error instanceof Error ? error.message : String(error));
    return jsonError("Could not update your wishlist right now.", 500);
  }
}
