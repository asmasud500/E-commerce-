import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("../app/api/ai/admin-assistant/route.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../components/AdminPageAiAssistant.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../components/AdminSidebar.tsx", import.meta.url), "utf8");

test("page assistant is restricted to authenticated privileged admin roles", () => {
  assert.match(api, /if \(!session\)/);
  assert.match(api, /\["SUPER_ADMIN", "MANAGER"\]\.includes\(session\.role\)/);
});

test("page assistant is read-only and redacts sensitive input", () => {
  assert.match(api, /function redact\(/);
  assert.match(api, /Never execute actions/);
  assert.match(api, /getReadOnlyContext/);
  assert.match(api, /feature: "admin-page-assistant"/);
  assert.match(api, /paymentGateway\.findMany/);
  assert.match(api, /raw provider payloads are excluded/);
  assert.match(api, /Never confirm payments, issue refunds/);
});

test("all 19 admin modules have page-specific assistant guidance", () => {
  const pageCount = (ui.match(/\["\/admin\//g) || []).length;
  assert.ok(pageCount >= 19, `Expected 19 page mappings; found ${pageCount}`);
  for (const key of ["orders", "returns", "products", "inventory", "categories", "customers", "reviews", "mart-pay", "transactions", "coupons", "gift-cards", "marketing", "flash-sales", "delivery-zones", "banners", "storage", "settings", "integrations", "staff"]) {
    assert.ok(ui.includes(key), `Missing page mapping: ${key}`);
  }
});

test("assistant is mounted in the shared admin navigation", () => {
  assert.match(sidebar, /<AdminPageAiAssistant\s*\/>/);
});
