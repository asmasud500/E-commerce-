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
      return { id: check.id, label: check.label, path: check.path, status: response.status >= 500 ? "FAIL" : "WARN", httpStatus: response.status, latencyMs, message: "Endpoint returned HTTP " + response.status + "." };
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

  const checks = [
    { id: "storefront", label: "Storefront", path: "/", validate: (data: any) => true },
    { id: "health", label: "Application & database health", path: "/api/health", validate: (data: any) => data?.status === "ok" && data?.database === "reachable" },
    { id: "store-config", label: "Store configuration", path: "/api/storefront/config", validate: (data: any) => !!data?.settings && Array.isArray(data?.zones) },
    { id: "products", label: "Product catalogue API", path: "/api/products?limit=1", validate: (data: any) => Array.isArray(data?.items) && typeof data?.total === "number" && typeof data?.pages === "number" },
    { id: "categories", label: "Categories API", path: "/api/categories", validate: (data: any) => Array.isArray(data) },
    { id: "payments", label: "Checkout payment methods API", path: "/api/payment-gateways", validate: (data: any) => Array.isArray(data) }
  ];

  const results = await Promise.all(checks.map(check => probe(req.nextUrl.origin, check)));
  const passed = results.filter(result => result.status === "PASS").length;
  const failed = results.filter(result => result.status === "FAIL").length;
  const warnings = results.filter(result => result.status === "WARN").length;
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    origin: req.nextUrl.origin,
    summary: { total: results.length, passed, warnings, failed, status: failed ? "FAIL" : warnings ? "WARN" : "PASS" },
    results
  }, { headers: noStore() });
}
