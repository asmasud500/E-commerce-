import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { claimPaymentProofAtomically } from "@/lib/firestore";
import { verifyOrderAccessToken } from "@/lib/auth/order-access";
import { rateLimit } from "@/lib/security/rate-limit";
import { uploadPrivatePaymentProof, deletePrivateStorageObject } from "@/lib/telegram/file-storage";

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
    const o = await db.order.findUnique({ where: { id: orderId }, include: { paymentGateway: true, items: true } });
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

    const imageBytes = Uint8Array.from(atob(screenshot.split(",")[1]), c => c.charCodeAt(0));
    let storagePath: string;
    try {
      storagePath = await uploadPrivatePaymentProof(orderId, imageBytes);
    } catch (storageError) {
      console.error("Payment proof could not be persisted to Telegram storage:", storageError instanceof Error ? storageError.message : String(storageError));
      return NextResponse.json({ error: "Payment proof storage is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const claim = await claimPaymentProofAtomically({
      orderId,
      gatewayId: o.paymentGatewayId,
      provider: String(o.paymentGateway.type),
      transactionId,
      senderLast4
    });
    if (!claim.accepted) {
      await deletePrivateStorageObject(storagePath).catch(() => {});
      return NextResponse.json({
        error: claim.reason === "reference_used" || claim.reason === "duplicate"
          ? "This transaction ID has already been submitted."
          : "Order or payment evidence changed. Refresh and try again."
      }, { status: 409 });
    }

    try {
      await db.order.update({ where: { id: orderId }, data: {
        paymentProofStoragePath: storagePath,
        paymentProofContentType: "image/jpeg",
        paymentProofFileName: "payment-proof.jpg",
        paymentProofSize: imageBytes.byteLength
      } });
    } catch (metadataError) {
      console.error("Payment proof uploaded but order metadata could not be saved:", metadataError instanceof Error ? metadataError.message : String(metadataError));
    }

    // The proof has already been atomically claimed. Telegram is a notification
    // channel, so an outage must not turn a saved proof into a misleading 400
    // response (which would encourage a duplicate resubmission).
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (token && chat) {
      const itemSummary = (o.items || []).map(item =>
        String(item.name) + " ×" + item.quantity + " (৳" + Number(item.lineTotal).toLocaleString("en-BD") + ")"
      ).join("; ") || "No item details available";
      const detailLines = [
        "🧾 PAYMENT PROOF SUBMITTED",
        "Order: " + o.orderNumber,
        "Customer: " + o.customerName,
        "Phone: " + o.customerPhone,
        "Email: " + (o.customerEmail || "Not provided"),
        "Delivery address: " + (o.shippingAddress || "Not provided"),
        "Items: " + itemSummary,
        "Subtotal: ৳" + Number(o.subtotal).toLocaleString("en-BD"),
        "Delivery fee: ৳" + Number(o.shippingFee).toLocaleString("en-BD"),
        "Discount: ৳" + Number(o.discount).toLocaleString("en-BD"),
        "Total to verify: ৳" + Number(o.total).toLocaleString("en-BD"),
        "Gateway: " + o.paymentGateway.name,
        "Transaction ID: " + transactionId,
        "Sender last 4 digits: " + senderLast4,
        "Submitted: " + new Date().toLocaleString("en-BD"),
        "Verify the incoming payment before confirming."
      ];
      // Telegram photo captions are limited to 1,024 characters.
      let caption = detailLines.join("\n");
      if (caption.length > 1000) caption = caption.slice(0, 985) + "\n…Details shortened; open the admin order for full information.";
      try {
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
        const payload = await tg.json().catch(() => null) as { ok?: boolean } | null;
        if (!tg.ok || !payload?.ok) {
          const fallback = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text: caption + "\nScreenshot upload failed; ask customer to resend it." })
          });
          if (!fallback.ok) console.error("Telegram payment-proof notification failed.");
        }
      } catch {
        console.error("Telegram payment-proof notification failed.");
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
