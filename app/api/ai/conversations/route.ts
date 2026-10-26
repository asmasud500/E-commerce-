import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firestore";

export const dynamic = "force-dynamic";
const schema = z.object({
  conversationId: z.string().regex(/^[a-f0-9-]{16,64}$/i),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(2000)
  })).min(1).max(20)
});
const rate = new Map<string, { count: number; until: number }>();
function redact(text: string) {
  return text.slice(0, 2000)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[redacted phone/number]")
    .replace(/\b(?:otp|password|passcode|pin|api key|secret)\s*[:=]?\s*\S+/gi, "[redacted secret]");
}
export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const current = rate.get(ip);
  if (current && current.until > now && current.count >= 20) return NextResponse.json({ error: "Conversation logging rate limit reached." }, { status: 429 });
  if (!current || current.until <= now) rate.set(ip, { count: 1, until: now + 60000 }); else current.count++;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation history." }, { status: 400 });
  const messages = parsed.data.messages.slice(-20).map(m => ({ role: m.role, text: redact(m.text), createdAt: new Date().toISOString() }));
  try {
    const existing = await db.aiConversation.findUnique({ where: { id: parsed.data.conversationId } });
    const data = { messages, source: "storefront", updatedAt: new Date(), ...(existing ? {} : { createdAt: new Date() }) };
    const conversation = await db.aiConversation.upsert({
      where: { id: parsed.data.conversationId },
      create: { id: parsed.data.conversationId, ...data },
      update: data
    });
    return NextResponse.json({ ok: true, id: conversation.id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Conversation history is temporarily unavailable." }, { status: 503 });
  }
}
