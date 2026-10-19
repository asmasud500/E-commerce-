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
