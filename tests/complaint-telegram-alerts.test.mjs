import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("MART customer complaint flow is wired to Telegram reporting", async () => {
  const route = await readFile(new URL("../app/api/ai/[feature]/route.ts", import.meta.url), "utf8");
  const helper = await readFile(new URL("../lib/notifications/complaints.ts", import.meta.url), "utf8");
  assert.match(route, /sendComplaintTelegramReport/);
  assert.match(route, /feature === "customer-support" \|\| feature === "shopping-assistant"/);
  assert.match(helper, /TELEGRAM_CHAT_ID/);
  assert.match(helper, /TELEGRAM_BOT_TOKEN/);
  assert.match(helper, /Refund \/ Return/);
  assert.match(helper, /Payment/);
  assert.match(helper, /Delivery/);
  assert.match(helper, /HIGH/);
  assert.match(helper, /redacted/);
  assert.match(helper, /manually/);
});

test("complaint Telegram alert does not claim to execute irreversible actions", async () => {
  const helper = await readFile(new URL("../lib/notifications/complaints.ts", import.meta.url), "utf8");
  assert.match(helper, /human approval required/);
  assert.match(helper, /do not mark paid without provider evidence/);
  assert.match(helper, /no irreversible action without verification/);
});
