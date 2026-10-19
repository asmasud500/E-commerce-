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
