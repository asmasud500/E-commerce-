import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin reports exclude cancelled and refunded orders from paid sales", async () => {
  const source = await read("../app/api/admin/reports/route.ts");
  assert.match(source, /const saleEligible = \(o: any\) => o\.status !== "CANCELLED" && o\.status !== "REFUNDED"/);
  assert.match(source, /o\.paymentStatus === "PAID" && saleEligible\(o\)/);
  assert.match(source, /order\.paymentStatus === "PAID" && saleEligible\(order\)/);
});

test("admin report low-stock list uses each product threshold and only published products", async () => {
  const source = await read("../app/api/admin/reports/route.ts");
  assert.match(source, /where: \{ published: true \}/);
  assert.match(source, /Number\(p\.stock\) <= Number\(p\.lowStockThreshold \?\? 5\)/);
  assert.match(source, /\.slice\(0, 20\)/);
});

test("admin activity endpoint returns a safe generic error and disables caching", async () => {
  const source = await read("../app/api/admin/activity/route.ts");
  assert.match(source, /catch \(error\)/);
  assert.match(source, /Unable to load activity history/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.doesNotMatch(source, /NextResponse\.json\(\{\s*error:.*error\.message/);
});

test("admin resource modules provide loading, retry and empty states", async () => {
  const source = await read("../components/AdminResourceManager.tsx");
  assert.match(source, /admin-resource-skeleton/);
  assert.match(source, /Try again/);
  assert.match(source, /No records yet/);
  assert.match(source, /No records match your search or filter/);
});

test("admin resource tables remain horizontally scrollable on small screens", async () => {
  const source = await read("../app/globals.css");
  assert.match(source, /\.admin-content \.admin-table-wrap\{max-width:100%;overflow-x:auto/);
  assert.match(source, /\.admin-content \.admin-table-wrap table\{min-width:640px;width:100%\}/);
  assert.match(source, /prefers-reduced-motion:reduce\)\{\.admin-resource-skeleton span\{animation:none\}\}/);
});
