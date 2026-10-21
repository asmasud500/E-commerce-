import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin return list and decision endpoints require a valid admin session", async () => {
  const list = await read("../app/api/admin/returns/route.ts");
  const update = await read("../app/api/admin/returns/[id]/route.ts");
  assert.match(list, /readAdminSession/);
  assert.match(list, /if\(!session\)return NextResponse\.json\(\{error:"Admin authentication required\."\},\{status:401\}\)/);
  assert.match(update, /readAdminSession/);
  assert.match(update, /if\(!session\)return NextResponse\.json\(\{error:"Admin authentication required\."\},\{status:401\}\)/);
});

test("return workflow requires item receipt and a completed refund reference", async () => {
  const update = await read("../app/api/admin/returns/[id]/route.ts");
  assert.match(update, /APPROVED:\["RECEIVED","REJECTED"\]/);
  assert.match(update, /RECEIVED:\["REFUNDED"\]/);
  assert.match(update, /refundReference:z\.string\(\)\.trim\(\)\.min\(2\)\.max\(100\)/);
  assert.match(update, /recordRefundAtomically/);
  assert.match(update, /Only a super admin can record refunds/);
  assert.match(update, /This refund reference has already been processed/);
});

test("standalone order refund endpoint requires manager-level admin authorization", async () => {
  const refund = await read("../app/api/admin/orders/[id]/refund/route.ts");
  assert.match(refund, /readAdminSession/);
  assert.match(refund, /Only a super admin can issue refunds/);
  assert.match(refund, /recordRefundAtomically/);
});

test("admin returns UI exposes the receive-item and refund-reference steps", async () => {
  const page = await read("../app/admin/returns/page.tsx");
  assert.match(page, /Item received/);
  assert.match(page, /Record completed refund/);
  assert.match(page, /actual refund transaction\/reference ID/);
  assert.match(page, /refundReference/);
});

test("customer return requests remain limited to delivered orders within the return window", async () => {
  const route = await read("../app/api/orders/return/route.ts");
  assert.match(route, /rateLimit\("return:"\+ip,6,60_000\)/);
  assert.match(route, /RETURN_WINDOW_DAYS=7/);
  assert.match(route, /o\.status!=="DELIVERED"/);
  assert.match(route, /contactMatches/);
});
