import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/wishlist/route.ts", import.meta.url), "utf8");

test("wishlist API requires an authenticated customer for every operation", () => {
  assert.equal((route.match(/if \(!session\) return jsonError/g) || []).length, 3);
  assert.match(route, /verifyCustomerToken/);
});

test("wishlist API validates product IDs and verifies products exist before saving", () => {
  assert.match(route, /productSchema = z\.object/);
  assert.match(route, /productId: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(128\)/);
  assert.match(route, /db\.product\.findUnique/);
  assert.match(route, /Product not found/);
});

test("wishlist operations are rate-limited and private responses are not cached", () => {
  assert.match(route, /rateLimit\("wishlist:"/);
  assert.match(route, /status, headers: \{ "Cache-Control": "no-store" \}/);
  assert.match(route, /"Cache-Control": "no-store"/);
});

test("wishlist reads and writes are scoped to the authenticated customer's user ID", () => {
  assert.match(route, /where: \{ userId: session\.userId \}/);
  assert.match(route, /userId_productId: \{ userId: session\.userId, productId: product\.id \}/);
  assert.match(route, /where: \{ userId: session\.userId, productId: parsed\.data\.productId \}/);
});
