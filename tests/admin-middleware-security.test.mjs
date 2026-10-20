import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canAccessAdminPath, ADMIN_SAFE_METHODS } from "../lib/auth/permissions.ts";

const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

test("middleware covers every admin page and API route", () => {
  assert.match(middleware, /matcher:\s*\[["']\/admin\/:path\*["'],\s*["']\/api\/admin\/:path\*["']\]/);
  assert.match(middleware, /path\.startsWith\("\/api\/admin\/"\)/);
  assert.match(middleware, /if \(!session\).*status:\s*401/s);
});

test("admin API requests require a valid session and role authorization", () => {
  assert.match(middleware, /readAdminSession\(token\)/);
  assert.match(middleware, /canAccessAdminPath\(session\.role, path, req\.method\)/);
  assert.match(middleware, /status:\s*403/);
  assert.equal(canAccessAdminPath("UNKNOWN_ROLE", "/api/admin/orders", "GET"), false);
  assert.equal(canAccessAdminPath("SUPPORT", "/api/admin/orders", "GET"), true);
  assert.equal(canAccessAdminPath("SUPPORT", "/api/admin/orders/order-1", "PATCH"), false);
});

test("admin mutations reject cross-origin browser requests", () => {
  assert.match(middleware, /fetchSite === "cross-site"/);
  assert.match(middleware, /new URL\(origin\)\.host === req\.nextUrl\.host/);
  assert.match(middleware, /!ADMIN_SAFE_METHODS\.has\(req\.method\) && !hasValidSameOrigin\(req\)/);
  assert.equal(ADMIN_SAFE_METHODS.has("GET"), true);
  assert.equal(ADMIN_SAFE_METHODS.has("POST"), false);
});

test("production responses configure baseline browser security headers", () => {
  assert.match(config, /X-Content-Type-Options["'],value:["']nosniff/);
  assert.match(config, /X-Frame-Options["'],value:["']DENY/);
  assert.match(config, /Referrer-Policy["'],value:["']strict-origin-when-cross-origin/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /poweredByHeader:false/);
});

test("high-impact admin modules remain restricted to super admins", () => {
  for (const role of ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "SUPPORT"]) {
    assert.equal(canAccessAdminPath(role, "/api/admin/payment-gateways", "GET"), false);
    assert.equal(canAccessAdminPath(role, "/api/admin/payment-gateways", "POST"), false);
    assert.equal(canAccessAdminPath(role, "/api/admin/orders/order-1/refund", "POST"), false);
  }
  assert.equal(canAccessAdminPath("SUPER_ADMIN", "/api/admin/payment-gateways", "POST"), true);
});
