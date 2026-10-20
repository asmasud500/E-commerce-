import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { confirmPaymentAtomically } from "@/lib/firestore";
import { notifyStatus, sendPaidOrderTelegram } from "@/lib/notifications/telegram-admin";

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

    const matches = await db.order.findMany({
      where: {
        paymentReference: transactionId,
        paymentSenderLast4: senderLast4,
        paymentProvider: provider,
        paymentStatus: "PENDING",
        status: "PENDING"
      },
      include: { paymentGateway: true },
      take: 2
    });
    if (matches.length === 0) {
      return NextResponse.json({ ok: true, matched: false, message: "No matching pending order." });
    }
    // Never guess which customer paid when a transaction reference is attached to
    // multiple pending orders. Keep both orders pending for manual investigation.
    if (matches.length > 1) {
      return NextResponse.json({
        ok: false,
        matched: false,
        message: "Ambiguous transaction reference; manual review required."
      }, { status: 409 });
    }
    const o = matches[0];
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

    const result = await confirmPaymentAtomically({
      orderId: o.id,
      gatewayId: o.paymentGatewayId,
      providerTransactionId: transactionId,
      reference: transactionId,
      amount,
      rawResponse: { source: "verified_mobile_money_sms_webhook", provider, senderLast4 },
      expectedPaymentReference: transactionId,
      expectedSenderLast4: senderLast4,
      expectedProvider: provider,
      autoConfirmed: true,
      auditAction: "MOBILE_MONEY_SMS_AUTO_CONFIRMED"
    });
    const confirmed = result.confirmed;
    if (!confirmed && result.reason === "duplicate_transaction") {
      return NextResponse.json({ ok: true, matched: false, message: "Transaction ID was already processed." }, { status: 409 });
    }
    if (!confirmed && result.reason === "evidence_mismatch") {
      return NextResponse.json({ ok: true, matched: false, message: "Payment evidence changed; manual review required." }, { status: 409 });
    }
    // Payment confirmation is already committed atomically. Telegram is only a
    // notification channel; its outage must not make the SMS bridge retry a
    // successfully processed payment as though confirmation had failed.
    if (confirmed) {
      try { await sendPaidOrderTelegram(o.id, "SMS auto-match"); }
      catch { console.error("Telegram paid-order notification failed after SMS confirmation."); }
    }
    return NextResponse.json({ ok: true, matched: true, confirmed });
  } catch (error: unknown) {
    // The database unique constraint on (gatewayId, providerTransactionId) is
    // the final concurrency guard. If two webhook deliveries race, the losing
    // transaction rolls back its order update and returns a safe duplicate result.
    if (typeof error === "object" && error !== null && "code" in error &&
        (error as { code?: string }).code === "P2002") {
      return NextResponse.json({
        ok: true,
        matched: false,
        message: "Transaction ID was already processed."
      }, { status: 409 });
    }
    return NextResponse.json({ error: "SMS verification processing failed." }, { status: 400 });
  }
}
