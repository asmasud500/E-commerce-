import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/firestore";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const allowedRoles = ["SUPER_ADMIN", "MANAGER"];
const resultSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  path: z.string().min(1).max(300),
  status: z.enum(["PASS", "WARN", "FAIL"]),
  httpStatus: z.number().nullable(),
  latencyMs: z.number().min(0),
  message: z.string().max(500)
});
const reportSchema = z.object({
  checkedAt: z.string().datetime(),
  origin: z.string().url(),
  summary: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    status: z.enum(["PASS", "WARN", "FAIL"])
  }),
  results: z.array(resultSchema).max(30)
});
const statusSchema = z.object({
  issueId: z.string().regex(/^issue-[a-z0-9-]{1,80}$/i),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"])
});
async function authorize(req: NextRequest) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return { error: NextResponse.json({ error: "Admin authentication required." }, { status: 401, headers: noStore }) };
  if (!allowedRoles.includes(session.role)) return { error: NextResponse.json({ error: "Maintenance Center requires a manager or super admin role." }, { status: 403, headers: noStore }) };
  return { session };
}
function safeDate(value: any) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if (auth.error) return auth.error;
  try {
    const rows = await db.aiMaintenanceRecord.findMany({ orderBy: { updatedAt: "desc" }, take: 300 });
    const reports = rows.filter((row: any) => row.recordType === "report").slice(0, 50).map((row: any) => ({
      id: row.id, checkedAt: safeDate(row.checkedAt), origin: row.origin, summary: row.summary, results: row.results || []
    }));
    const issues = rows.filter((row: any) => row.recordType === "issue").map((row: any) => ({
      id: row.id, checkId: row.checkId, title: row.title, endpoint: row.endpoint, severity: row.severity,
      status: row.status || "OPEN", message: row.message, firstSeen: safeDate(row.firstSeen), lastSeen: safeDate(row.lastSeen),
      latencyMs: row.latencyMs, httpStatus: row.httpStatus, source: row.source, updatedAt: safeDate(row.updatedAt),
      timeline: Array.isArray(row.timeline) ? row.timeline : []
    }));
    return NextResponse.json({ reports, issues }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Maintenance records could not be loaded. Check the configured Firestore connection." }, { status: 503, headers: noStore });
  }
}
export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (auth.error) return auth.error;
  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid health report payload." }, { status: 400, headers: noStore });
  const report = parsed.data;
  const reportId = "report-" + report.checkedAt.replace(/[^0-9]/g, "").slice(0, 17);
  const now = new Date(report.checkedAt);
  try {
    await db.aiMaintenanceRecord.upsert({
      where: { id: reportId },
      create: { id: reportId, recordType: "report", checkedAt: now, origin: report.origin, summary: report.summary, results: report.results, actorRole: auth.session.role, createdAt: now, updatedAt: now },
      update: { checkedAt: now, origin: report.origin, summary: report.summary, results: report.results, actorRole: auth.session.role, updatedAt: now }
    });
    for (const result of report.results.filter(item => item.status !== "PASS")) {
      const issueId = "issue-" + result.id.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
      const prior = await db.aiMaintenanceRecord.findUnique({ where: { id: issueId } });
      const timeline = Array.isArray(prior?.timeline) ? prior.timeline : [];
      const event = { status: prior?.status || "OPEN", at: report.checkedAt, observation: result.status };
      await db.aiMaintenanceRecord.upsert({
        where: { id: issueId },
        create: {
          id: issueId, recordType: "issue", checkId: result.id, title: result.label, endpoint: result.path,
          severity: result.status === "FAIL" ? "HIGH" : "MEDIUM", status: "OPEN", message: result.message,
          firstSeen: now, lastSeen: now, latencyMs: result.latencyMs, httpStatus: result.httpStatus,
          source: "Automated health audit", timeline: [{ ...event, status: "OPEN" }], createdAt: now, updatedAt: now
        },
        update: {
          title: result.label, endpoint: result.path, severity: result.status === "FAIL" ? "HIGH" : "MEDIUM",
          message: result.message, lastSeen: now, latencyMs: result.latencyMs, httpStatus: result.httpStatus,
          timeline: [...timeline, event].slice(-50), updatedAt: now,
          ...(prior?.status === "RESOLVED" ? { status: "OPEN", timeline: [...timeline, { ...event, status: "OPEN" }].slice(-50) } : {})
        }
      });
    }
    const rows = await db.aiMaintenanceRecord.findMany({ orderBy: { updatedAt: "desc" }, take: 300 });
    return NextResponse.json({
      ok: true,
      report: { id: reportId, ...report },
      reports: rows.filter((row: any) => row.recordType === "report").slice(0, 50),
      issues: rows.filter((row: any) => row.recordType === "issue")
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not persist the health report. Verify Firestore service credentials and collection access." }, { status: 503, headers: noStore });
  }
}
export async function PATCH(req: NextRequest) {
  const auth = await authorize(req);
  if (auth.error) return auth.error;
  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid maintenance issue update." }, { status: 400, headers: noStore });
  try {
    const existing = await db.aiMaintenanceRecord.findUnique({ where: { id: parsed.data.issueId } });
    if (!existing || existing.recordType !== "issue") return NextResponse.json({ error: "Maintenance issue not found." }, { status: 404, headers: noStore });
    const now = new Date();
    const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
    const updated = await db.aiMaintenanceRecord.update({
      where: { id: existing.id },
      data: { status: parsed.data.status, updatedByRole: auth.session.role, updatedAt: now, timeline: [...timeline, { status: parsed.data.status, at: now.toISOString(), actorRole: auth.session.role }].slice(-50) }
    });
    return NextResponse.json({ ok: true, issue: updated }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not update maintenance issue." }, { status: 503, headers: noStore });
  }
}
