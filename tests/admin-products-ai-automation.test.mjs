import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessAdminPath } from "../lib/auth/permissions.ts";

const apiPath = "/api/admin/products/ai-automation";

test("product AI automation is limited to product-authorized roles", () => {
  assert.equal(canAccessAdminPath("SUPER_ADMIN", apiPath, "POST"), true);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", apiPath, "POST"), true);
  assert.equal(canAccessAdminPath("MANAGER", apiPath, "POST"), true);
  assert.equal(canAccessAdminPath("SUPPORT", apiPath, "POST"), false);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", apiPath, "POST"), false);
  assert.equal(canAccessAdminPath("UNKNOWN", apiPath, "POST"), false);
});

test("AI product endpoint is suggestion-only and validates bounded requests", () => {
  const source = readFileSync("app/api/admin/products/ai-automation/route.ts", "utf8");
  assert.match(source, /max\(30\)/);
  assert.match(source, /max\(2500\)/);
  assert.match(source, /published:\s*Boolean\(p\.published\)/);
  assert.match(source, /does not execute or claim to execute changes/i);
  assert.match(source, /AI_PRODUCT_ANALYSIS/);
  assert.match(source, /allowedIds/);
  assert.match(source, /metaKeywords/);
  assert.doesNotMatch(source, /db\.product\.(create|update|delete)\(/);
});

test("product AI UI requires explicit approval before saving an unpublished draft", () => {
  const source = readFileSync("components/AdminProductAIStudio.tsx", "utf8");
  assert.match(source, /Approve & save as unpublished draft/);
  assert.match(source, /published:\s*false/);
  assert.match(source, /Human approval required/);
  assert.match(source, /publishing changes require review/);
  assert.match(source, /Approve & apply SEO to all listed products/);
  assert.match(source, /method: "PATCH"/);
});
