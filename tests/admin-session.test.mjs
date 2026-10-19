import test from "node:test";
import assert from "node:assert/strict";
import { createAdminToken, readAdminSession } from "../lib/auth/admin.ts";

process.env.ADMIN_SESSION_SECRET = "unit-test-secret-that-is-long-enough";

test("valid signed admin session preserves its least-privilege role", async () => {
  const token = await createAdminToken("staff@example.com", "SUPPORT", "staff-123");
  const session = await readAdminSession(token);
  assert.equal(session?.email, "staff@example.com");
  assert.equal(session?.role, "SUPPORT");
  assert.equal(session?.staffId, "staff-123");
});

test("tampered admin session is rejected", async () => {
  const token = await createAdminToken("staff@example.com", "MANAGER");
  const [payload, signature] = token.split(".");
  const tampered = payload.slice(0, -1) + (payload.endsWith("a") ? "b" : "a") + "." + signature;
  assert.equal(await readAdminSession(tampered), null);
});

test("unknown roles are rejected rather than upgraded to SUPER_ADMIN", async () => {
  await assert.rejects(() => createAdminToken("staff@example.com", "ROOT"));
});

test("malformed tokens are rejected", async () => {
  assert.equal(await readAdminSession(""), null);
  assert.equal(await readAdminSession("payload.signature.extra"), null);
});

test("legacy signed sessions without an explicit role are rejected", async () => {
  const payload = Buffer.from(JSON.stringify({
    email: "admin@example.com",
    exp: Date.now() + 60_000
  })).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = Buffer.from(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  )).toString("base64url");
  assert.equal(await readAdminSession(payload + "." + signature), null);
});

test("expired signed sessions are rejected", async () => {
  const payload = Buffer.from(JSON.stringify({
    email: "admin@example.com",
    role: "SUPER_ADMIN",
    exp: Date.now() - 1
  })).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = Buffer.from(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  )).toString("base64url");
  assert.equal(await readAdminSession(payload + "." + signature), null);
});

import { canAccessAdminPath } from "../lib/auth/permissions.ts";

test("support role is read-only for orders and cannot mutate them", () => {
  assert.equal(canAccessAdminPath("SUPPORT", "/api/admin/orders", "GET"), true);
  assert.equal(canAccessAdminPath("SUPPORT", "/api/admin/orders/order-1", "PATCH"), false);
  assert.equal(canAccessAdminPath("SUPPORT", "/api/admin/payment-gateways", "GET"), false);
});

test("order manager can update orders but cannot mutate payment gateway configuration", () => {
  assert.equal(canAccessAdminPath("ORDER_MANAGER", "/api/admin/orders/order-1", "PATCH"), true);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", "/api/admin/orders", "DELETE"), false);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", "/api/admin/payment-gateways", "POST"), false);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", "/api/admin/reports", "GET"), true);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", "/api/admin/reports", "POST"), false);
});

test("product manager can manage catalogue and delivery zones only", () => {
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", "/api/admin/products", "POST"), true);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", "/api/admin/delivery-zones/zone-1", "PATCH"), true);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", "/api/admin/orders", "GET"), false);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", "/api/admin/payment-gateways", "POST"), false);
});

test("manager cannot manage staff, global settings, or audit history", () => {
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/products", "POST"), true);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/staff", "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/store-settings", "PATCH"), false);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/activity", "GET"), false);
});

test("super admin can access administrative modules", () => {
  assert.equal(canAccessAdminPath("SUPER_ADMIN", "/api/admin/staff", "GET"), true);
  assert.equal(canAccessAdminPath("SUPER_ADMIN", "/api/admin/payment-gateways", "POST"), true);
});

test("unknown roles fail closed", () => {
  assert.equal(canAccessAdminPath("UNKNOWN_ROLE", "/api/admin/products", "GET"), false);
});

test("non-super-admin roles cannot change gateway configuration or execute refunds", () => {
  for (const role of ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "SUPPORT"]) {
    assert.equal(canAccessAdminPath(role, "/api/admin/payment-gateways", "POST"), false);
    assert.equal(canAccessAdminPath(role, "/admin/payment-gateways", "GET"), false);
    assert.equal(canAccessAdminPath(role, "/api/admin/orders/order-1/refund", "POST"), false);
  }
  assert.equal(canAccessAdminPath("SUPER_ADMIN", "/api/admin/orders/order-1/refund", "POST"), true);
});

test("manager permissions fail closed for unknown modules while preserving store operations", () => {
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/coupons", "POST"), true);
  assert.equal(canAccessAdminPath("MANAGER", "/admin/marketing", "GET"), true);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/payment-transactions", "GET"), true);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/secrets", "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", "/admin/future-module", "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", "/api/admin/auth/login", "POST"), false);
});

import { readFile } from "node:fs/promises";

const adminLoginRoute = await readFile(new URL("../app/api/admin/auth/login/route.ts", import.meta.url), "utf8");
const adminLogoutRoute = await readFile(new URL("../app/api/admin/auth/logout/route.ts", import.meta.url), "utf8");

test("admin login rejects cross-origin browser requests before credential checks", () => {
  assert.match(adminLoginRoute, /sec-fetch-site/);
  assert.match(adminLoginRoute, /Cross-origin admin login is not allowed/);
  assert.match(adminLoginRoute, /new URL\(origin\)\.host === req\.nextUrl\.host/);
});

test("admin logout rejects cross-origin browser requests before clearing the session", () => {
  assert.match(adminLogoutRoute, /sec-fetch-site/);
  assert.match(adminLogoutRoute, /Cross-origin admin logout is not allowed/);
  assert.match(adminLogoutRoute, /new URL\(origin\)\.host === req\.nextUrl\.host/);
});
