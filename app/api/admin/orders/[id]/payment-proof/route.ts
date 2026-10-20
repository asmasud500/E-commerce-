import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { readAdminSession } from "@/lib/auth/admin";
import { readPrivatePaymentProof } from "@/lib/telegram/file-storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const { id } = await params;
  try {
    const order = await db.order.findUnique({ where: { id }, select: { id: true, orderNumber: true, paymentProofStoragePath: true } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (!order.paymentProofStoragePath) return NextResponse.json({ error: "No saved payment proof exists for this order." }, { status: 404 });
    const bytes = await readPrivatePaymentProof(String(order.paymentProofStoragePath));
    if (!bytes) return NextResponse.json({ error: "Payment proof file was not found in storage." }, { status: 404 });
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": 'inline; filename="payment-proof-' + String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, "") + '.jpg"',
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Admin payment proof retrieval failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to retrieve payment proof." }, { status: 500 });
  }
}
