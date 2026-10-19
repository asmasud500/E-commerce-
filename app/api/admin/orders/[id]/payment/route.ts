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
        // Do not create a synthetic transaction reference to make an unverified
        // payment look paid. Require evidence captured by the payment-proof flow.
        if (!current.paymentGatewayId || !current.paymentReference) return;
        const evidence = await tx.order.findFirst({
          where: { id, paymentStatus: "PENDING", status: "PENDING", OR: [
            { paymentProofSubmittedAt: { not: null } },
            { paymentProvider: { not: null } }
          ] },
          select: { id: true }
        });
        if (!evidence) return;
        const ref = current.paymentReference;
        // Enforce transaction-ID uniqueness for manual dashboard confirmation too,
        // not only for the automatic SMS webhook.
        const duplicateTransaction = await tx.paymentTransaction.findFirst({
          where: { gatewayId: current.paymentGatewayId, providerTransactionId: ref },
          select: { id: true }
        });
        if (duplicateTransaction) return;
        const duplicateOrderReference = await tx.order.findFirst({
          where: { id: { not: id }, paymentGatewayId: current.paymentGatewayId, paymentReference: ref },
          select: { id: true }
        });
        if (duplicateOrderReference) return;
        const changed = await tx.order.updateMany({
          where: { id, paymentStatus: "PENDING", status: "PENDING", paymentReference: ref },
          data: { paymentStatus: "PAID", status: "CONFIRMED" }
        });
        if (changed.count !== 1) return;
        await tx.paymentTransaction.create({
          data: { orderId: id, gatewayId: current.paymentGatewayId, reference: ref, providerTransactionId: ref, amount: current.total, status: "PAID", rawResponse: { source: "admin_dashboard_confirmation" }, verifiedAt: new Date() }
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
        for (const r of rs) {
          // Claim each reservation before restoring inventory. Concurrent reject/cancel
          // requests can increment stock only when this conditional transition wins.
          const released = await tx.stockReservation.updateMany({
            where: { id: r.id, status: "HELD" },
            data: { status: "RELEASED" }
          });
          if (released.count === 1) {
            await tx.product.update({ where: { id: r.productId }, data: { stock: { increment: r.quantity } } });
          }
        }
        await tx.auditLog.create({ data: { action: "ADMIN_PAYMENT_REJECTED", entity: "Order", entityId: id, metadata: { source: "dashboard" } } });
      }
      done = true;
    });

    if (!done) return NextResponse.json({ error: "Order already processed or not found." }, { status: 409 });
    try { await notifyStatus(id); } catch {}
    return NextResponse.json({ ok: true, status: action === "confirm" ? "CONFIRMED" : "CANCELLED" });
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "This transaction has already been processed." }, { status: 409 });
    }
    return NextResponse.json({ error: "Payment update failed." }, { status: 400 });
  }
}
