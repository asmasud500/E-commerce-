import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("route error boundary provides retry and safe navigation without exposing exception details", async () => {
  const source = await read("../app/error.tsx");
  assert.match(source, /onClick=\{reset\}/);
  assert.match(source, /href="\/"|href=\{["']\/["']\}/);
  assert.match(source, /Try again/);
  assert.match(source, /Back to home/);
  assert.doesNotMatch(source, /error\.message|error\.stack/);
});

test("health endpoint reports readiness without exposing database exception details", async () => {
  const source = await read("../app/api/health/route.ts");
  assert.match(source, /status: "ok", database: "reachable"/);
  assert.match(source, /status: 503/);
  assert.match(source, /database: "unavailable"/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.doesNotMatch(source, /catch\s*\(\s*\w+\s*\)[\s\S]{0,250}\.message/);
});

test("public order tracking rate-limits requests and returns only delivery progress", async () => {
  const source = await read("../app/api/orders/track/route.ts");
  assert.match(source, /rateLimit\("track:"\+ip,15,60_000\)/);
  assert.match(source, /status:429/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /courierName:o\.courierName/);
  assert.match(source, /trackingNumber:o\.trackingNumber/);
  assert.doesNotMatch(source, /customerPhone:o\.customerPhone|shippingAddress:o\.shippingAddress|total:o\.total/);
});
