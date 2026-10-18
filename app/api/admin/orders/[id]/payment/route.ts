import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { notifyStatus } from "@/lib/notifications/telegram-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "confirm" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    let done = false;
    await db.$transaction(async tx => {
      const current = await tx.order.findUnique({
        where: { id },
        select: { id: true, paymentStatus: true, paymentGatewayId: true, total: true, paymentReference: true, status: true }
      });
      if (!current || current.paymentStatus === "PAID" || current.status !== "PENDING") return;

      if (action === "confirm") {
        if (!current.paymentGatewayId) return;
        const ref = current.paymentReference || "ADMIN-CONFIRM-" + current.id;
        const changed = await tx.order.updateMany({
          where: { id, paymentStatus: "PENDING", status: "PENDING" },
          data: { paymentStatus: "PAID", status: "CONFIRMED", paymentReference: ref }
        });
        if (changed.count !== 1) return;
        await tx.paymentTransaction.create({
          data: { orderId: id, gatewayId: current.paymentGatewayId, reference: ref, amount: current.total, status: "PAID", rawResponse: { source: "admin_dashboard_confirmation" }, verifiedAt: new Date() }
        });
        await tx.stockReservation.updateMany({ where: { orderId: id, status: "HELD" }, data: { status: "CONFIRMED" } });
        await tx.auditLog.create({ data: { action: "ADMIN_PAYMENT_CONFIRMED", entity: "Order", entityId: id, metadata: { source: "dashboard" } } });
      } else {
        const changed = await tx.order.updateMany({
          where: { id, paymentStatus: "PENDING", status: "PENDING" },
          data: { paymentStatus: "FAILED", status: "CANCELLED" }
        });
        if (changed.count !== 1) return;
        const rs = await tx.stockReservation.findMany({ where: { orderId: id, status: "HELD" } });
        for (const r of rs) await tx.product.update({ where: { id: r.productId }, data: { stock: { increment: r.quantity } } });
        await tx.stockReservation.updateMany({ where: { orderId: id, status: "HELD" }, data: { status: "RELEASED" } });
        await tx.auditLog.create({ data: { action: "ADMIN_PAYMENT_REJECTED", entity: "Order", entityId: id, metadata: { source: "dashboard" } } });
      }
      done = true;
    });

    if (!done) return NextResponse.json({ error: "Order already processed or not found." }, { status: 409 });
    try { await notifyStatus(id); } catch {}
    return NextResponse.json({ ok: true, status: action === "confirm" ? "CONFIRMED" : "CANCELLED" });
  } catch {
    return NextResponse.json({ error: "Payment update failed." }, { status: 400 });
  }
}
