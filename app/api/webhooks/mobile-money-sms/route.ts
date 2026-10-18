import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { notifyStatus } from "@/lib/notifications/telegram-admin";

const PROVIDERS = new Set(["BKASH", "NAGAD", "ROCKET"]);

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.MOBILE_MONEY_SMS_WEBHOOK_SECRET;
    if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const b = await req.json();
    const transactionId = typeof b.transactionId === "string" ? b.transactionId.trim().toUpperCase() : "";
    const senderLast4 = typeof b.senderLast4 === "string" ? b.senderLast4 : "";
    const provider = typeof b.provider === "string" ? b.provider.trim().toUpperCase() : "";
    const amount = Number(b.amount);
    const direction = String(b.direction || "").toLowerCase();
    if (!PROVIDERS.has(provider) || direction !== "credit" ||
        transactionId.length < 4 || transactionId.length > 100 ||
        !/^[0-9]{4}$/.test(senderLast4) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid normalized incoming payment SMS." }, { status: 400 });
    }

    const o = await db.order.findFirst({
      where: {
        paymentReference: transactionId,
        paymentSenderLast4: senderLast4,
        paymentProvider: provider,
        paymentStatus: "PENDING",
        status: "PENDING"
      },
      include: { paymentGateway: true }
    });
    if (!o) return NextResponse.json({ ok: true, matched: false, message: "No matching pending order." });
    if (!o.paymentGatewayId || !o.paymentGateway || String(o.paymentGateway.type) !== provider) {
      return NextResponse.json({ ok: true, matched: false, message: "Payment provider does not match the order." });
    }
    if (Math.abs(Number(o.total) - amount) > 0.009) {
      return NextResponse.json({ ok: true, matched: false, message: "Payment amount does not match." });
    }

    const duplicate = await db.paymentTransaction.findFirst({
      where: { gatewayId: o.paymentGatewayId, providerTransactionId: transactionId }
    });
    if (duplicate) return NextResponse.json({ ok: true, matched: false, message: "Transaction ID was already processed." });

    let confirmed = false;
    await db.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: o.id, paymentStatus: "PENDING", status: "PENDING", paymentReference: transactionId, paymentSenderLast4: senderLast4, paymentProvider: provider },
        data: { paymentStatus: "PAID", status: "CONFIRMED", paymentAutoConfirmedAt: new Date() }
      });
      if (changed.count !== 1) return;
      await tx.paymentTransaction.create({
        data: {
          orderId: o.id, gatewayId: o.paymentGatewayId!, reference: transactionId,
          providerTransactionId: transactionId, amount: o.total, status: "PAID",
          rawResponse: { source: "verified_mobile_money_sms_webhook", provider, senderLast4 },
          verifiedAt: new Date()
        }
      });
      await tx.stockReservation.updateMany({ where: { orderId: o.id, status: "HELD" }, data: { status: "CONFIRMED" } });
      await tx.auditLog.create({
        data: { action: "MOBILE_MONEY_SMS_AUTO_CONFIRMED", entity: "Order", entityId: o.id, metadata: { transactionId, provider, senderLast4, amount } }
      });
      confirmed = true;
    });
    if (confirmed) await notifyStatus(o.id);
    return NextResponse.json({ ok: true, matched: true, confirmed });
  } catch {
    return NextResponse.json({ error: "SMS verification processing failed." }, { status: 400 });
  }
}
