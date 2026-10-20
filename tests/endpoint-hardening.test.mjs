import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("order creation, checkout quote, invoice and payment-proof rate limits do not trust x-forwarded-for", async () => {
  for (const path of [
    "../app/api/orders/route.ts",
    "../app/api/checkout/quote/route.ts",
    "../app/api/orders/[id]/invoice/route.ts",
    "../app/api/payments/proof/route.ts"
  ]) {
    const source = await read(path);
    assert.match(source, /cf-connecting-ip/);
    assert.match(source, /rateLimit\(/);
    assert.doesNotMatch(source, /x-forwarded-for/);
  }
});

test("admin API middleware denies unauthenticated requests and checks role before mutation", async () => {
  const source = await read("../middleware.ts");
  assert.match(source, /if \(!session\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);
  assert.match(source, /canAccessAdminPath\(session\.role, path, req\.method\)/);
  assert.match(source, /status: 403/);
  assert.match(source, /!ADMIN_SAFE_METHODS\.has\(req\.method\) && !hasValidSameOrigin\(req\)/);
});

test("admin permissions fail closed for unknown roles and restrict sensitive modules", async () => {
  const permissions = await read("../lib/auth/permissions.ts");
  assert.match(permissions, /return false/);
  assert.match(permissions, /\/api\/admin\/staff/);
  assert.match(permissions, /\/api\/admin\/payment-gateways/);
  assert.match(permissions, /orders.*refund/);
});

test("generic Telegram file route does not expose private files to unauthenticated visitors", async () => {
  const source = await read("../app/api/telegram/files/[fileId]/route.ts");
  assert.match(source, /product:\{is:\{published:true\}\}/);
  assert.match(source, /readAdminSession/);
  assert.match(source, /canAccessAdminPath/);
  assert.match(source, /Authentication required/);
  assert.match(source, /isPublicProductImage\?"public, max-age=3600/);
  assert.match(source, /"private, no-store, max-age=0"/);
});

test("Telegram webhook requires secret token and an allow-listed admin identity", async () => {
  const source = await read("../app/api/telegram/webhook/route.ts");
  assert.match(source, /x-telegram-bot-api-secret-token/);
  assert.match(source, /if\(!allowed\(req\)\)/);
  assert.match(source, /if\(!isAdminUpdate\(u\)\)/);
});

test("payment webhook requires its configured secret and a non-empty order reference", async () => {
  const source = await read("../app/api/payments/webhook/route.ts");
  assert.match(source, /PAYMENT_WEBHOOK_SECRET/);
  assert.match(source, /x-payment-webhook-secret/);
  assert.match(source, /status:401/);
  assert.match(source, /if\(!orderNumber\)/);
});

test("payment provider settlement verifies provider evidence, amount, and duplicate transaction atomically", async () => {
  const settlement = await read("../lib/payments/settle.ts");
  const adapter = await read("../lib/payments/adapters.ts");
  const atomic = await read("../lib/firestore.ts");
  assert.match(settlement, /adapter\.verify\(payload,config,secrets\)/);
  assert.match(settlement, /mode:gateway\.mode/);
  assert.match(settlement, /Number\.isFinite\(verifiedAmount\)/);
  assert.match(settlement, /confirmPaymentAtomically\(/);
  assert.match(adapter, /validStatus/);
  assert.match(atomic, /transactionQuery\("paymentTransactions"/);
  assert.match(atomic, /currentDocument: \{ exists: false \}/);
});

test("order creation validates idempotency keys and replays matching existing orders", async () => {
  const source = await read("../app/api/orders/route.ts");
  assert.match(source, /idempotency-key/);
  assert.match(source, /Invalid idempotency key/);
  assert.match(source, /existing\)/);
  assert.match(source, /replayed:true/);
  assert.match(source, /Duplicate product variants are not allowed/);
});

test("customer invoice is private, no-store and requires owner session or signed order token", async () => {
  const source = await read("../app/api/orders/[id]/invoice/route.ts");
  assert.match(source, /verifyCustomerToken/);
  assert.match(source, /verifyOrderAccessToken/);
  assert.match(source, /if\(!isOwner&&!hasOrderAccess\)/);
  assert.match(source, /Cache-Control.*private, no-store/);
});

test("payment proof retrieval is admin-session protected and never publicly cacheable", async () => {
  const source = await read("../app/api/admin/orders/[id]/payment-proof/route.ts");
  assert.match(source, /readAdminSession/);
  assert.match(source, /if \(!session\)/);
  assert.match(source, /private, no-store/);
});

test("checkout disables manual payment instructions and uses gateway mode for automated SSLCOMMERZ", async () => {
  const adapter = await read("../lib/payments/adapters.ts");
  const initiate = await read("../app/api/payments/initiate/route.ts");
  assert.match(adapter, /BKASH:unavailable\("bKash"\)/);
  assert.match(adapter, /NAGAD:unavailable\("Nagad"\)/);
  assert.match(adapter, /ROCKET:unavailable\("Rocket"\)/);
  assert.match(adapter, /BANGLA_QR:unavailable\("Bangla QR"\)/);
  assert.match(adapter, /securepay\.sslcommerz\.com/);
  assert.match(adapter, /sandbox\.sslcommerz\.com/);
  assert.match(adapter, /data\?\.GatewayPageURL\.startsWith\(base\+"\/"\)/);
  assert.match(adapter, /validationserverAPI\.php/);
  assert.match(initiate, /mode:gateway\.mode/);
});
