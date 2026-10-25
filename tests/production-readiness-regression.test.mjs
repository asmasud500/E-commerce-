import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("banner create/update validation returns field-specific errors and safe no-store responses", async () => {
  const create = await read("../app/api/admin/banners/route.ts");
  const update = await read("../app/api/admin/banners/[id]/route.ts");
  for (const source of [create, update]) {
    assert.match(source, /fieldErrors/);
    assert.match(source, /End date must be on or after start date/);
    assert.match(source, /Cache-Control.*private, no-store/);
    assert.match(source, /safeDestination/);
    assert.match(source, /Use a relative store path or an HTTP\(S\) destination URL/);
  }
  assert.match(create, /BANNER_CREATED/);
  assert.match(update, /BANNER_UPDATED/);
  assert.match(update, /BANNER_DELETED/);
});

test("Telegram setup is best-effort and cannot fail the core deployment job", async () => {
  const workflow = await read("../.github/workflows/deploy.yml");
  const block = workflow.split("name: Register store Telegram webhook and commands")[1]?.split("name: Verify production storefront")[0] || "";
  assert.match(block, /continue-on-error: true/);
  assert.match(block, /::warning::Telegram webhook registration failed/);
  assert.match(block, /website deployment remains available/);
  assert.doesNotMatch(block, /::error::Telegram webhook registration requires/);
  assert.doesNotMatch(block, /tee \/dev\/stderr/);
});
