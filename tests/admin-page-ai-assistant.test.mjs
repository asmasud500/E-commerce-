import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("../app/api/ai/admin-assistant/route.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../components/AdminPageAiAssistant.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../components/AdminSidebar.tsx", import.meta.url), "utf8");

test("page assistant is restricted to authenticated privileged admin roles", () => {
  assert.match(api, /if \(!session\)/);
  assert.match(api, /SUPER_ADMIN.*MANAGER.*ORDER_MANAGER.*PRODUCT_MANAGER.*SUPPORT/);
});

test("page assistant is read-only and redacts sensitive input", () => {
  assert.match(api, /function redact\(/);
  assert.match(api, /Never execute actions/);
  assert.match(api, /getReadOnlyContext/);
  assert.match(api, /feature: "admin-page-assistant"/);
  assert.match(api, /paymentGateway\.findMany/);
  assert.match(api, /case "returns"/);
  assert.match(api, /case "gift-cards"/);
  assert.match(api, /case "flash-sales"/);
  assert.match(api, /case "delivery-zones"/);
  assert.match(api, /case "banners"/);
  assert.match(api, /case "settings"/);
  assert.match(api, /case "integrations"/);
  assert.match(api, /case "storage"/);
  assert.match(api, /case "marketing"/);
  assert.match(api, /case "staff"/);
  assert.match(api, /canAccessAdminPath\(session\.role, pagePaths\[pageKey\], "GET"\)/);
  assert.match(api, /provider payloads excluded/i);
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

test("live assistant context avoids payment references and redacts free-text return notes", () => {
  assert.equal((api.match(/case "staff":/g) || []).length, 1);
  assert.match(api, /reason: r\.reason \? redact\(String\(r\.reason\)\)/);
  assert.match(api, /resolution: r\.resolution \? redact\(String\(r\.resolution\)\)/);
  assert.doesNotMatch(api, /providerTransactionId: true/);
  assert.doesNotMatch(api, /reference: true, providerTransactionId: true/);
});

test("live aggregates use the Firestore compatibility API", () => {
  // The Firestore adapter exposes findMany/count/aggregate but not Prisma groupBy/distinct.
  assert.doesNotMatch(api, /\.groupBy\(/);
  assert.doesNotMatch(api, /distinct:\s*\[/);
  assert.match(api, /sampledOrderCount/);
  assert.match(api, /sampledTransactionCount/);
  assert.match(api, /sampledReviewCount/);
  assert.match(api, /productCount/);
});
