import { NextRequest, NextResponse } from "next/server";
import { readAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type CheckResult = {
  id: string;
  label: string;
  path: string;
  status: "PASS" | "WARN" | "FAIL";
  httpStatus: number | null;
  latencyMs: number;
  message: string;
  recommendation?: string;
};

function noStore() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}

async function probe(origin: string, check: { id: string; label: string; path: string; validate: (data: any) => boolean }): Promise<CheckResult> {
  const started = Date.now();
  try {
    const response = await fetch(new URL(check.path, origin), {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const isNotFound = response.status === 404;
      return { id: check.id, label: check.label, path: check.path, status: response.status >= 500 ? "FAIL" : "WARN", httpStatus: response.status, latencyMs, message: isNotFound ? "HTTP 404: this path was not found on the selected host. If several checks show 404 together, the health checker may be targeting the wrong deployment hostname or the API routes may not be deployed." : "Endpoint returned HTTP " + response.status + ".", recommendation: isNotFound ? "Verify the production hostname and deployment, then open this path directly. If every path returns 404, check the canonical site URL and Cloudflare Worker route configuration before changing individual APIs." : undefined };
    }
    if (check.id === "storefront") {
      return { id: check.id, label: check.label, path: check.path, status: "PASS", httpStatus: response.status, latencyMs, message: "Storefront page returned a successful HTTP response." };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return { id: check.id, label: check.label, path: check.path, status: "WARN", httpStatus: response.status, latencyMs, message: "Endpoint responded, but did not return JSON." };
    }
    const data = await response.json();
    if (!check.validate(data)) {
      return { id: check.id, label: check.label, path: check.path, status: "WARN", httpStatus: response.status, latencyMs, message: "Response was received but its expected data shape did not match." };
    }
    return { id: check.id, label: check.label, path: check.path, status: "PASS", httpStatus: response.status, latencyMs, message: "Endpoint responded with the expected data shape." };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { id: check.id, label: check.label, path: check.path, status: "FAIL", httpStatus: null, latencyMs: Date.now() - started, message: timedOut ? "Request timed out after 8 seconds." : "Request failed before a valid response was received." };
  }
}

export async function GET(req: NextRequest) {
  const session = await readAdminSession(req.cookies.get("admin_session")?.value || "");
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401, headers: noStore() });
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Website health access requires a manager or super admin role." }, { status: 403, headers: noStore() });

  const configuredOrigin = process.env.MART_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const origin = (configuredOrigin || req.nextUrl.origin).replace(/\\/$/, "");
  let originSource = configuredOrigin ? "environment configuration" : "current admin request host";

  const checks = [
    { id: "storefront", label: "Storefront", path: "/", validate: (data: any) => true },
    { id: "health", label: "Application & database health", path: "/api/health", validate: (data: any) => data?.status === "ok" && data?.database === "reachable" },
    { id: "store-config", label: "Store configuration", path: "/api/storefront/config", validate: (data: any) => !!data?.settings && Array.isArray(data?.zones) },
    { id: "products", label: "Product catalogue API", path: "/api/products?limit=1", validate: (data: any) => Array.isArray(data?.items) && typeof data?.total === "number" && typeof data?.pages === "number" },
    { id: "categories", label: "Categories API", path: "/api/categories", validate: (data: any) => Array.isArray(data) },
    { id: "payments", label: "Checkout payment methods API", path: "/api/payment-gateways", validate: (data: any) => Array.isArray(data) }
  ];

  const results = await Promise.all(checks.map(check => probe(origin, check)));
  const notFoundCount = results.filter(result => result.httpStatus === 404).length;
  const allNotFound = notFoundCount >= Math.max(3, Math.ceil(results.length * 0.75));
  const diagnosis = allNotFound
    ? { code: "HOST_OR_ROUTING_MISMATCH", severity: "HIGH", title: "Most checks returned HTTP 404", summary: "This pattern usually means the health checker is reaching a host/deployment that does not serve these routes, or the latest application routes are not deployed. It does not prove that every API implementation is broken.", targetOrigin: origin, originSource, steps: [
      "Open the target host's home page and /api/health directly in a browser. Confirm both are served by the same MART deployment.",
      "If the storefront works on another domain, set MART_PUBLIC_SITE_URL to that canonical HTTPS storefront origin in Cloudflare Worker environment variables, then redeploy.",
      "In Cloudflare, verify the Worker deployment and custom-domain/route binding for the hostname used by the storefront. Check that /api/* requests are routed to the same application Worker.",
      "Check the latest GitHub Actions deployment and build output. Confirm the deployed commit includes app/api/health/route.ts and the API route files.",
      "Run the health check again. Do not mark the issue resolved until the expected endpoints return successful responses."
    ] }
    : { code: "ENDPOINT_CHECK", severity: results.some(result => result.status === "FAIL") ? "HIGH" : "INFO", title: "Review individual endpoint results", summary: "The failures do not all share a 404 pattern. Use each endpoint's response and recommendation to investigate the specific route or service.", targetOrigin: origin, originSource, steps: ["Open each failed endpoint directly on the target host.", "Check Cloudflare deployment logs and application logs for the corresponding request.", "Apply a minimal fix, run CI, deploy, and repeat this read-only health check."] };
  const passed = results.filter(result => result.status === "PASS").length;
  const failed = results.filter(result => result.status === "FAIL").length;
  const warnings = results.filter(result => result.status === "WARN").length;
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    origin,
    originSource,
    diagnosis,
    summary: { total: results.length, passed, warnings, failed, status: failed ? "FAIL" : warnings ? "WARN" : "PASS" },
    results
  }, { headers: noStore() });
}
