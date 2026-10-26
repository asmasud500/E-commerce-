import { NextRequest, NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/firestore";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Conversation history requires a manager or super admin role." }, { status: 403 });
  try {
    const conversations = await db.aiConversation.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return NextResponse.json({
      conversations: conversations.map((row: any) => ({
        id: row.id,
        source: row.source || "storefront",
        messages: Array.isArray(row.messages) ? row.messages.slice(-20) : [],
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null
      }))
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Conversation history could not be loaded." }, { status: 503 });
  }
}
