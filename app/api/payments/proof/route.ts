import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { verifyOrderAccessToken } from "@/lib/auth/order-access";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit("payment-proof:" + ip, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many payment proof attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  try {
    const b = await req.json();
    const orderId = typeof b.orderId === "string" ? b.orderId : "";
    const transactionId = typeof b.transactionId === "string" ? b.transactionId.trim().toUpperCase() : "";
    const senderLast4 = typeof b.senderLast4 === "string" ? b.senderLast4 : "";
    const screenshot = typeof b.screenshot === "string" ? b.screenshot : "";
    if (!orderId || transactionId.length < 4 || transactionId.length > 100 ||
        !/^[0-9]{4}$/.test(senderLast4) ||
        !screenshot.startsWith("data:image/jpeg;base64,") || screenshot.length > 900000) {
      return NextResponse.json({ error: "Please provide a valid transaction ID, last 4 digits, and image screenshot." }, { status: 400 });
    }
    if (!(await verifyOrderAccessToken(orderId, String(b.accessToken || "")))) {
      return NextResponse.json({ error: "Invalid order payment access." }, { status: 403 });
    }
    const o = await db.order.findUnique({ where: { id: orderId }, include: { paymentGateway: true } });
    if (!o) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (o.paymentStatus === "PAID" || o.status !== "PENDING") {
      return NextResponse.json({ error: "This order has already been processed." }, { status: 409 });
    }
    if (!o.paymentGatewayId || !o.paymentGateway) {
      return NextResponse.json({ error: "No payment gateway is attached to this order." }, { status: 409 });
    }
    if (!["BKASH", "NAGAD", "ROCKET"].includes(String(o.paymentGateway.type))) {
      return NextResponse.json({ error: "This payment method is not supported for SMS auto-confirmation." }, { status: 400 });
    }
    const prior = await db.paymentTransaction.findFirst({
      where: { gatewayId: o.paymentGatewayId, providerTransactionId: transactionId }
    });
    if (prior) return NextResponse.json({ error: "This transaction ID has already been submitted." }, { status: 409 });

    // A transaction reference must not be attached to a second order while the
    // incoming SMS is still pending and no PaymentTransaction row exists yet.
    const reusedReference = await db.order.findFirst({
      where: {
        id: { not: orderId },
        paymentReference: transactionId,
        paymentProvider: String(o.paymentGateway.type)
      },
      select: { id: true }
    });
    if (reusedReference) {
      return NextResponse.json({ error: "This transaction ID is already linked to another order." }, { status: 409 });
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentReference: transactionId,
        paymentSenderLast4: senderLast4,
        paymentProvider: String(o.paymentGateway.type),
        paymentProofSubmittedAt: new Date()
      }
    });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (token && chat) {
      const caption = "🧾 PAYMENT PROOF SUBMITTED\nOrder: " + o.orderNumber +
        "\nCustomer: " + o.customerName + "\nPhone: " + o.customerPhone +
        "\nGateway: " + o.paymentGateway.name + "\nAmount: BDT " +
        Number(o.total).toLocaleString("en-BD") + "\nTransaction ID: " + transactionId +
        "\nSender last 4 digits: " + senderLast4 +
        "\n\nAutomatic confirmation only occurs after matching the incoming credit SMS. Verify any uncertain payment manually.";
      const bytes = Uint8Array.from(atob(screenshot.split(",")[1]), c => c.charCodeAt(0));
      const form = new FormData();
      form.set("chat_id", chat);
      form.set("caption", caption);
      form.set("reply_markup", JSON.stringify({ inline_keyboard: [
        [{ text: "✅ Confirm Payment", callback_data: "pay_confirm:" + o.id }, { text: "❌ Reject Payment", callback_data: "pay_reject:" + o.id }],
        [{ text: "👁 View Order", callback_data: "order_view:" + o.id }]
      ] }));
      form.set("photo", new Blob([bytes], { type: "image/jpeg" }), "payment-proof.jpg");
      const tg = await fetch("https://api.telegram.org/bot" + token + "/sendPhoto", { method: "POST", body: form });
      if (!tg.ok) {
        await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: caption + "\nScreenshot upload failed; ask customer to resend it." })
        });
      }
    }
    try {
      await db.auditLog.create({ data: { action: "PAYMENT_PROOF_SUBMITTED", entity: "Order", entityId: o.id, metadata: { transactionId, senderLast4 } } });
    } catch {}
    return NextResponse.json({ ok: true, orderNumber: o.orderNumber });
  } catch {
    return NextResponse.json({ error: "Unable to submit payment proof." }, { status: 400 });
  }
}
