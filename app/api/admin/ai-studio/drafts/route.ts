import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/firestore";
import { recordAdminAudit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";
const schema = z.object({ id: z.string().trim().min(1).max(100), status: z.enum(["APPROVED", "REJECTED", "ARCHIVED"]) });

export async function PATCH(req: NextRequest) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid content review action." }, { status: 400 });
  try {
    const existing = await db.aiDraft.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    const updated = await db.aiDraft.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, reviewedBy: session.email, reviewedAt: new Date(), updatedAt: new Date() } });
    await recordAdminAudit(req, { action: "AI_DRAFT_" + parsed.data.status, entity: "AiDraft", entityId: parsed.data.id, metadata: { feature: existing.feature, title: existing.title } });
    return NextResponse.json({ ok: true, draft: { id: updated.id, status: updated.status } }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("AI draft review failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not update this draft." }, { status: 500 });
  }
}
