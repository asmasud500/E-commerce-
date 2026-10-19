import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../lib/security/rate-limit.ts";

test("rate limiter allows requests up to the configured limit", () => {
  const key = "test:allowed:" + crypto.randomUUID();
  assert.deepEqual(rateLimit(key, 2, 60_000), { ok: true, retryAfter: 0 });
  assert.deepEqual(rateLimit(key, 2, 60_000), { ok: true, retryAfter: 0 });
});

test("rate limiter blocks requests over the configured limit", () => {
  const key = "test:blocked:" + crypto.randomUUID();
  assert.equal(rateLimit(key, 1, 60_000).ok, true);
  const blocked = rateLimit(key, 1, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1);
});

test("rate limiter keeps independent keys separate", () => {
  const suffix = crypto.randomUUID();
  assert.equal(rateLimit("test:key-a:" + suffix, 1, 60_000).ok, true);
  assert.equal(rateLimit("test:key-b:" + suffix, 1, 60_000).ok, true);
});
