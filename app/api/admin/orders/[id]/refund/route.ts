import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { recordRefundAtomically } from "@/lib/firestore";
import { z } from "zod";

const schema = z.object({
  reference: z.string().trim().min(2).max(100),
  reason: z.string().trim().max(500).optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const input = schema.parse(await req.json());
    const order = await db.order.findUnique({ where: { id }, include: { paymentGateway: true } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") {
      return NextResponse.json({ error: "Order is already refunded." }, { status: 409 });
    }
    if (order.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Only paid orders can be refunded." }, { status: 409 });
    }
    if (!order.paymentGatewayId) {
      return NextResponse.json({ error: "Payment gateway is missing." }, { status: 409 });
    }

    const result = await recordRefundAtomically({
      orderId: id,
      gatewayId: order.paymentGatewayId,
      reference: input.reference,
      reason: input.reason || null
    });
    if (!result.refunded) {
      return NextResponse.json({
        error: result.reason === "duplicate_reference"
          ? "This refund reference has already been processed."
          : "Order was updated concurrently. Refresh and verify its payment status."
      }, { status: 409 });
    }
    return NextResponse.json({ ok: true, reference: input.reference, status: "REFUNDED" });
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "This refund reference has already been processed." }, { status: 409 });
    }
    return NextResponse.json({ error: "Refund failed. Check the reference and order state." }, { status: 400 });
  }
}
