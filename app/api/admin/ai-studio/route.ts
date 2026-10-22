import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/prisma";
import { AI_FEATURES, DEFAULT_GEMINI_MODEL, SUPPORTED_GEMINI_MODELS, geminiGenerate, getAiSettings, saveAiSettings, recordAiRequest, safeAiError } from "@/lib/ai/gemini";
import { recordAdminAudit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";
const updateSchema = z.object({
  action: z.enum(["save", "test"]),
  enabled: z.boolean().optional(),
  model: z.enum(SUPPORTED_GEMINI_MODELS).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  dailyRequestLimit: z.coerce.number().int().min(1).max(5000).optional(),
  maxOutputTokens: z.coerce.number().int().min(128).max(4096).optional()
});
async function admin(req: NextRequest) {
  return readAdminSession(req.cookies.get("admin_session")?.value || "");
}
function noStore() { return { "Cache-Control": "private, no-store, max-age=0" }; }

export async function GET(req: NextRequest) {
  const session = await admin(req);
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401, headers: noStore() });
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "AI Studio access requires a manager or super admin role." }, { status: 403, headers: noStore() });
  const settings = await getAiSettings();
  const since = new Date(Date.now() - 7 * 86400000);
  let logs: any[] = [], drafts: any[] = [], counts: any[] = [];
  try {
    [logs, drafts] = await Promise.all([
      db.aiRequestLog.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 3000 }),
      db.aiDraft.findMany({ orderBy: { createdAt: "desc" }, take: 30 })
    ]);
    counts = await Promise.all(AI_FEATURES.map(async feature => {
      const featureLogs = logs.filter((r:any)=>r.feature===feature);
      return { feature, total: featureLogs.length, success: featureLogs.filter((r:any)=>r.status==="SUCCESS").length, errors: featureLogs.filter((r:any)=>r.status==="ERROR").length, avgLatencyMs: featureLogs.length ? Math.round(featureLogs.reduce((s:number,r:any)=>s+Number(r.latencyMs||0),0)/featureLogs.length) : 0, inputTokens: featureLogs.reduce((s:number,r:any)=>s+Number(r.inputTokens||0),0), outputTokens: featureLogs.reduce((s:number,r:any)=>s+Number(r.outputTokens||0),0) };
    }));
  } catch (error) { console.error("AI Studio telemetry read failed", error instanceof Error ? error.message : "unknown"); }
  const successes = logs.filter(r=>r.status==="SUCCESS").length;
  const errors = logs.filter(r=>r.status==="ERROR").length;
  return NextResponse.json({
    settings: { enabled: settings.enabled !== false, model: settings.model || DEFAULT_GEMINI_MODEL, features: settings.features || {}, dailyRequestLimit: settings.dailyRequestLimit || 300, maxOutputTokens: settings.maxOutputTokens || 900, updatedAt: settings.updatedAt || null, updatedBy: settings.updatedBy || null },
    metrics: { window: "7 days", recordLimit: 3000, sampled: logs.length >= 3000, total: logs.length, successes, errors, successRate: logs.length ? Math.round(successes / logs.length * 100) : null, avgLatencyMs: logs.length ? Math.round(logs.reduce((s:number,r:any)=>s+Number(r.latencyMs||0),0)/logs.length) : null, inputTokens: logs.reduce((s:number,r:any)=>s+Number(r.inputTokens||0),0), outputTokens: logs.reduce((s:number,r:any)=>s+Number(r.outputTokens||0),0), quota: "Provider quota is not exposed by this API; check Google AI Studio." },
    features: counts,
    logs: logs.slice(0,60).map(r=>({id:r.id,feature:r.feature,model:r.model,status:r.status,latencyMs:r.latencyMs,inputTokens:r.inputTokens,outputTokens:r.outputTokens,errorCode:r.errorCode,actorType:r.actorType,createdAt:r.createdAt})),
    drafts: drafts.map(d=>({id:d.id,feature:d.feature,title:d.title,status:d.status,createdBy:d.createdBy,createdAt:d.createdAt,updatedAt:d.updatedAt,content:d.content,metadata:d.metadata}))
  }, { headers: noStore() });
}

export async function POST(req: NextRequest) {
  const session = await admin(req);
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  if (session.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only a super admin can change AI configuration." }, { status: 403 });
  const parsed = updateSchema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid AI Studio settings." }, { status: 400 });
  const body = parsed.data;
  if (body.action === "test") {
    const started = Date.now();
    try {
      const generated = await geminiGenerate({ feature: "customer-support", prompt: "Reply with exactly: MART Gemini connection test successful.", model: body.model || (await getAiSettings()).model, maxOutputTokens: 128, skipFeatureCheck: true });
      await recordAiRequest({ feature: "connection-test", model: generated.model, status: "SUCCESS", latencyMs: Date.now()-started, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, actorType: "admin" });
      return NextResponse.json({ ok: true, model: generated.model, latencyMs: generated.latencyMs, message: generated.text }, { headers: noStore() });
    } catch (error) {
      const safe = safeAiError(error);
      await recordAiRequest({ feature: "connection-test", status: "ERROR", errorCode: safe.code, actorType: "admin" });
      return NextResponse.json({ ok: false, error: safe.message, code: safe.code }, { status: safe.code === "AI_QUOTA_EXHAUSTED" ? 429 : 502, headers: noStore() });
    }
  }
  const previous = await getAiSettings();
  const next = {
    enabled: body.enabled ?? previous.enabled ?? true,
    model: body.model || previous.model || DEFAULT_GEMINI_MODEL,
    features: { ...(previous.features || {}), ...(body.features || {}) },
    dailyRequestLimit: body.dailyRequestLimit ?? previous.dailyRequestLimit ?? 300,
    maxOutputTokens: body.maxOutputTokens ?? previous.maxOutputTokens ?? 900
  };
  await saveAiSettings(next, session.email);
  await recordAdminAudit(req, { action: "AI_SETTINGS_UPDATED", entity: "AiSetting", entityId: "global", metadata: { enabled: next.enabled, model: next.model, featureFlags: next.features, dailyRequestLimit: next.dailyRequestLimit, maxOutputTokens: next.maxOutputTokens } });
  return NextResponse.json({ ok: true, settings: next }, { headers: noStore() });
}
