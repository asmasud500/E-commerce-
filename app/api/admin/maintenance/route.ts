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
  message: z.string().max(500),
  recommendation: z.string().max(1000).optional()
});
const reportSchema = z.object({
  checkedAt: z.string().datetime(),
  origin: z.string().url(),
  originSource: z.string().max(100).optional(),
  diagnosis: z.object({
    code: z.string().max(100), severity: z.string().max(30), title: z.string().max(200),
    summary: z.string().max(1000), targetOrigin: z.string().url(), originSource: z.string().max(100),
    steps: z.array(z.string().max(1000)).max(20)
  }).optional(),
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
function improvementFor(checkId: string, status: string) {
  const plans: Record<string, { action: string; verification: string }> = {
    health: { action: "Inspect the health route logs and verify Firestore service-account credentials, project ID and read access. Do not expose secrets in logs.", verification: "GET /api/health must return HTTP 200 with status=ok and database=reachable." },
    "store-config": { action: "Review storefront configuration loading, store settings and delivery-zone data. Check server logs for Firestore permission or parsing errors.", verification: "GET /api/storefront/config must return HTTP 200 with settings and a zones array." },
    products: { action: "Inspect product API query validation, catalogue collection availability and response serialization. Confirm seeded products exist if the catalogue is expected to be populated.", verification: "GET /api/products?limit=1 must return items array and numeric total/pages fields." },
    categories: { action: "Inspect category collection reads and API error handling; confirm category documents use the expected shape.", verification: "GET /api/categories must return HTTP 200 and a JSON array." },
    payments: { action: "Review payment-gateway configuration and API permissions. Confirm only intentionally enabled gateways are exposed; never log credentials or payment secrets.", verification: "GET /api/payment-gateways must return HTTP 200 and a JSON array without secret values." },
    storefront: { action: "Inspect the production response, recent deployment logs, routing and static asset errors. Reproduce the issue on mobile and desktop before changing code.", verification: "The production storefront must return a successful HTTP response and render without console/runtime errors." }
  };
  const plan = plans[checkId] || { action: "Reproduce the failing check, inspect the matching server logs, identify the smallest root-cause fix, and add a regression test before merging.", verification: "Repeat the same health check and run the relevant automated tests; only mark resolved after the production response passes." };
  return { ...plan, priority: status === "FAIL" ? "HIGH" : "MEDIUM", mode: "Human-reviewed recommendation; no production code changed automatically." };
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
      id: row.id, checkedAt: safeDate(row.checkedAt), origin: row.origin, originSource: row.originSource, diagnosis: row.diagnosis, summary: row.summary, results: row.results || []
    }));
    const issues = rows.filter((row: any) => row.recordType === "issue").map((row: any) => ({
      id: row.id, checkId: row.checkId, title: row.title, endpoint: row.endpoint, severity: row.severity, improvement: row.improvement || improvementFor(row.checkId, row.severity === "HIGH" ? "FAIL" : "WARN"),
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
      create: { id: reportId, recordType: "report", checkedAt: now, origin: report.origin, originSource: report.originSource, diagnosis: report.diagnosis, summary: report.summary, results: report.results, actorRole: auth.session.role, createdAt: now, updatedAt: now },
      update: { checkedAt: now, origin: report.origin, originSource: report.originSource, diagnosis: report.diagnosis, summary: report.summary, results: report.results, actorRole: auth.session.role, updatedAt: now }
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
          severity: result.status === "FAIL" ? "HIGH" : "MEDIUM", improvement: improvementFor(result.id, result.status), status: "OPEN", message: result.message,
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
