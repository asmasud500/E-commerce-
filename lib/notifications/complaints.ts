import { telegramApi, esc } from "@/lib/notifications/telegram-admin";

export type ComplaintReport = { detected: boolean; category: string; severity: "HIGH" | "NORMAL"; action: string };

/** Conservative keyword triage; this is a notification aid, not an automatic refund/order mutation. */
export function classifyComplaint(message: string): ComplaintReport {
  const s = message.toLowerCase().normalize("NFKC");
  const urgent = /\b(fraud|scam|stolen|charged twice|double charged|money stolen|threat|unsafe|injur|harass|data leak|account hacked)\b|প্রতারণা|জালিয়াতি|চুরি|দুইবার টাকা|হ্যাক|হুমকি|নিরাপত্তা|হয়রানি/.test(s);
  const categories: [RegExp, string, string][] = [
    [/refund|return|money back|রিফান্ড|ফেরত চাই|টাকা ফেরত/, "Refund / Return", "Check order eligibility and return/refund policy; human approval required before any refund."],
    [/payment|paid|transaction|bkash|nagad|rocket|টাকা কেটেছে|পেমেন্ট|লেনদেন/, "Payment", "Verify gateway transaction and order payment status; do not mark paid without provider evidence."],
    [/delivery|late|not delivered|courier|shipping|ডেলিভারি|পার্সেল|কুরিয়ার|পৌঁছায়নি/, "Delivery", "Check fulfilment timeline, courier tracking and address; contact courier/customer if needed."],
    [/damaged|broken|defect|wrong item|missing item|quality|ভাঙা|নষ্ট|ভুল পণ্য|পণ্য পাইনি|মান খারাপ/, "Product / Order issue", "Verify order items and evidence; arrange replacement/return review under store policy."],
    [/complaint|complain|bad service|angry|unhappy|খারাপ ব্যবহার|অভিযোগ|সমস্যা|বিরক্ত|অসন্তুষ্ট/, "General complaint", "Review the customer's message, identify the responsible team, and follow up with the customer."]
  ];
  const found = categories.find(([re]) => re.test(s));
  return { detected: urgent || !!found, category: urgent ? "URGENT — Safety / Fraud" : (found?.[1] || "General complaint"), severity: urgent ? "HIGH" : "NORMAL", action: urgent ? "Escalate to the store owner immediately. Review account/payment/security evidence; take no irreversible action without verification." : (found?.[2] || "Review the complaint and contact the customer with a verified resolution.") };
}

export async function sendComplaintTelegramReport(message: string, aiResponse: string, channel = "MART Assistant") {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return { sent: false, reason: "telegram_not_configured" };
  const report = classifyComplaint(message);
  if (!report.detected) return { sent: false, reason: "not_a_complaint" };
  const clean = (value: string) => value.slice(0, 1100)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[number redacted]")
    .replace(/\b(?:otp|password|passcode|pin|api[_ -]?key|token|secret)\s*[:=]?\s*\S+/gi, "[secret redacted]");
  const text = [
    report.severity === "HIGH" ? "🚨 <b>URGENT CUSTOMER COMPLAINT</b>" : "📣 <b>NEW CUSTOMER COMPLAINT</b>",
    "━━━━━━━━━━━━━━━━━━",
    "<b>Channel:</b> " + esc(channel),
    "<b>Category:</b> " + esc(report.category),
    "<b>Priority:</b> " + esc(report.severity),
    "",
    "<b>Customer message (redacted):</b>",
    esc(clean(message)),
    "",
    "<b>AI triage / response:</b>",
    esc(clean(aiResponse)),
    "",
    "<b>Recommended next steps:</b>",
    esc(report.action),
    "",
    "<i>Automated triage only. Verify facts and approve any refund, payment, cancellation, or account action manually.</i>"
  ].join("\n");
  try {
    const result = await telegramApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
    return { sent: !!result?.ok, reason: result?.ok ? "sent" : "telegram_api_failed" };
  } catch {
    return { sent: false, reason: "telegram_network_failed" };
  }
}
