import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const provider = await readFile(new URL("../lib/ai/gemini.ts", import.meta.url), "utf8");
const featureRoute = await readFile(new URL("../app/api/ai/[feature]/route.ts", import.meta.url), "utf8");
const adminRoute = await readFile(new URL("../app/api/admin/ai-studio/route.ts", import.meta.url), "utf8");
const draftsRoute = await readFile(new URL("../app/api/admin/ai-studio/drafts/route.ts", import.meta.url), "utf8");
const firestore = await readFile(new URL("../lib/firestore.ts", import.meta.url), "utf8");
const storefrontAssistant = await readFile(new URL("../components/StoreAiAssistant.tsx", import.meta.url), "utf8");

test("Gemini API key is read server-side and sent in a request header, never exposed in a public variable", () => {
  assert.match(provider, /GEMINI_API_KEY/);
  assert.match(provider, /x-goog-api-key/);
  assert.doesNotMatch(provider, /NEXT_PUBLIC_GEMINI_API_KEY/);
});

test("AI routes validate feature IDs, bound input, and protect admin-only analysis/content generation", () => {
  assert.match(featureRoute, /AI_FEATURES/);
  assert.match(featureRoute, /max\(4000\)/);
  assert.match(featureRoute, /ADMIN_REQUIRED/);
  assert.match(featureRoute, /SUPER_ADMIN.*MANAGER/);
});

test("personal identifiers are redacted and order/payment status questions are not sent to Gemini", () => {
  assert.match(featureRoute, /redactSensitive/);
  assert.match(featureRoute, /local-policy/);
  assert.match(featureRoute, /Track an order/);
});

test("AI Studio configuration is super-admin-only and the API connection test is recorded", () => {
  assert.match(adminRoute, /session\.role !== "SUPER_ADMIN"/);
  assert.match(adminRoute, /AI_SETTINGS_UPDATED/);
  assert.match(adminRoute, /connection-test/);
});

test("generated drafts require explicit review and never auto-publish", () => {
  assert.match(featureRoute, /status: "PENDING"/);
  assert.match(draftsRoute, /APPROVED.*REJECTED.*ARCHIVED/);
  assert.doesNotMatch(draftsRoute, /published:\s*true/);
});

test("AI telemetry and draft collections are mapped to the existing Firestore adapter", () => {
  assert.match(firestore, /aiSetting:"aiSettings"/);
  assert.match(firestore, /aiRequestLog:"aiRequestLogs"/);
  assert.match(firestore, /aiDraft:"aiDrafts"/);
});

test("storefront assistant warns users not to share authentication or payment secrets", () => {
  assert.match(storefrontAssistant, /Don't share OTPs, passwords, or payment secrets/);
  assert.match(storefrontAssistant, /customer-support/);
  assert.match(storefrontAssistant, /shopping-assistant/);
});
