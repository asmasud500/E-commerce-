import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const smsWebhook = await readFile(new URL("../app/api/webhooks/mobile-money-sms/route.ts", import.meta.url), "utf8");
const paymentProof = await readFile(new URL("../app/api/payments/proof/route.ts", import.meta.url), "utf8");
const firestoreAdapter = await readFile(new URL("../lib/firestore.ts", import.meta.url), "utf8");

test("database schema has a unique provider transaction key per gateway", () => {
  assert.match(schema, /@@unique\(\[gatewayId, providerTransactionId\]\)/);
});

test("personal-number SMS webhook is disabled and cannot auto-confirm Send Money receipts", () => {
  assert.match(smsWebhook, /Personal-number SMS payment confirmation is disabled/);
  assert.match(smsWebhook, /status:\s*410/);
  assert.doesNotMatch(smsWebhook, /confirmPaymentAtomically\(/);
});

test("manual payment proof route is permanently disabled in favor of provider verification", () => {
  assert.match(paymentProof, /Manual payment proof is disabled/);
  assert.match(paymentProof, /status:\s*410/);
  assert.doesNotMatch(paymentProof, /claimPaymentProofAtomically/);
});

const adminPayment = await readFile(new URL("../app/api/admin/orders/[id]/payment/route.ts", import.meta.url), "utf8");

test("admin payment confirmation delegates duplicate transaction checks to the native transaction helper", () => {
  assert.match(adminPayment, /confirmPaymentAtomically\(/);
  assert.match(firestoreAdapter, /transactionQuery\("paymentTransactions"/);
  assert.match(firestoreAdapter, /providerTransactionId: args\.providerTransactionId/);
});

const refundRoute = await readFile(new URL("../app/api/admin/orders/[id]/refund/route.ts", import.meta.url), "utf8");
const adminPaymentRoute = await readFile(new URL("../app/api/admin/orders/[id]/payment/route.ts", import.meta.url), "utf8");

test("refund uses a native transaction with a paid-state check and reports concurrent attempts as conflicts", () => {
  assert.match(refundRoute, /recordRefundAtomically\(/);
  assert.match(firestoreAdapter, /order\.paymentStatus !== "PAID"/);
  assert.match(refundRoute, /status: 409/);
});

test("admin payment route returns conflict for duplicate transaction database errors", () => {
  assert.match(adminPaymentRoute, /e\.code === "P2002"/);
  assert.match(adminPaymentRoute, /status: 409/);
});

test("refund transaction stores the refund reference in the gateway-unique transaction ID field", () => {
  assert.match(firestoreAdapter, /providerTransactionId: args\.reference/);
  assert.match(firestoreAdapter, /deterministicId\("refund:" \+ args\.gatewayId \+ ":" \+ args\.reference\)/);
  assert.match(schema, /@@unique\(\[gatewayId, providerTransactionId\]\)/);
});


const paymentSettlement = await readFile(new URL("../lib/payments/settle.ts", import.meta.url), "utf8");
const paymentAdapters = await readFile(new URL("../lib/payments/adapters.ts", import.meta.url), "utf8");

test("provider settlement requires a finite verified amount and rejects amount mismatches", () => {
  assert.match(paymentSettlement, /Number\.isFinite\(verifiedAmount\)/);
  assert.match(paymentSettlement, /Payment amount missing or mismatch/);
});

test("SSLCOMMERZ settlement requires the verified order reference and provider transaction ID", () => {
  assert.match(paymentSettlement, /reference!==order\.orderNumber/);
  assert.match(paymentSettlement, /Verified provider transaction ID is missing/);
});

test("SSLCOMMERZ adapter refuses validation responses without a valid amount and transaction reference", () => {
  assert.match(paymentAdapters, /validStatus&&transaction\.length>0&&Number\.isFinite\(amount\)&&amount>0/);
});


test("payment proof route rate-limits upload attempts", () => {
  assert.match(paymentProof, /rateLimit\("payment-proof:"/);
  assert.match(paymentProof, /status:\s*429/);
});


const checkoutRoute = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");

test("checkout uses Firestore native read-write transaction for stock and order writes", () => {
  assert.match(firestoreAdapter, /req\(":beginTransaction"/);
  assert.match(firestoreAdapter, /req\(":commit"/);
  assert.match(firestoreAdapter, /req\(":rollback"/);
  assert.match(firestoreAdapter, /updateMask:\s*\{\s*fieldPaths:\s*\["stock","updatedAt",\.\.\.\(variants\?\["variants"\]:\[\]\)\]\s*\}/);
  assert.match(checkoutRoute, /createOrderWithStockReservation\(/);
  assert.doesNotMatch(checkoutRoute, /const order=await db\.\$transaction\(async tx=>/);
});

test("checkout idempotency keys map to deterministic order IDs inside the atomic commit", () => {
  assert.match(firestoreAdapter, /deterministicId\("order:" \+ String\(args\.orderData\.idempotencyKey\)\)/);
  assert.match(firestoreAdapter, /currentDocument: \{ exists: false \}/);
});


const settlementRoute = await readFile(new URL("../lib/payments/settle.ts", import.meta.url), "utf8");
const smsProofRoute = await readFile(new URL("../app/api/webhooks/mobile-money-sms/route.ts", import.meta.url), "utf8");
const stockReleaseRoute = await readFile(new URL("../app/api/jobs/release-stock/route.ts", import.meta.url), "utf8");
const adminPaymentAtomicRoute = await readFile(new URL("../app/api/admin/orders/[id]/payment/route.ts", import.meta.url), "utf8");
const adminOrderAtomicRoute = await readFile(new URL("../app/api/admin/orders/[id]/route.ts", import.meta.url), "utf8");
const refundAtomicRoute = await readFile(new URL("../app/api/admin/orders/[id]/refund/route.ts", import.meta.url), "utf8");

test("verified gateway settlement uses the native Firestore payment transaction", () => {
  assert.match(settlementRoute, /confirmPaymentAtomically\(/);
  assert.doesNotMatch(settlementRoute, /db\.\$transaction/);
});

test("merchant settlement remains atomic while personal SMS and manual proof endpoints stay disabled", () => {
  assert.match(settlementRoute, /confirmPaymentAtomically\(/);
  assert.match(smsProofRoute, /status:\s*410/);
  assert.match(paymentProof, /status:\s*410/);
});

test("expired stock release restores inventory with a native transaction", () => {
  assert.match(stockReleaseRoute, /releaseOrderStockAtomically\(/);
});

test("admin confirm, reject, cancellation, and refund use native transaction helpers", () => {
  assert.match(adminPaymentAtomicRoute, /confirmPaymentAtomically\(/);
  assert.match(adminPaymentAtomicRoute, /rejectPendingOrderAtomically\(/);
  assert.match(adminOrderAtomicRoute, /rejectPendingOrderAtomically\(/);
  assert.match(adminOrderAtomicRoute, /updateOrderAdminFieldsAtomically\(/);
  assert.doesNotMatch(adminOrderAtomicRoute, /db\.\$transaction/);
  assert.match(refundAtomicRoute, /recordRefundAtomically\(/);
});

test("native Firestore payment transactions query existing provider IDs within the transaction", () => {
  assert.match(firestoreAdapter, /transactionQuery\("paymentTransactions"/);
  assert.match(firestoreAdapter, /currentDocument: \{ exists: false \}/);
});


const customerCancelRoute = await readFile(new URL("../app/api/account/orders/cancel/route.ts", import.meta.url), "utf8");
const customerOrdersRoute = await readFile(new URL("../app/api/account/orders/route.ts", import.meta.url), "utf8");
const orderCreateRoute = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");

test("customer cancellation requires a valid customer session and scopes the order lookup to that customer", () => {
  assert.match(customerCancelRoute, /verifyCustomerToken/);
  assert.match(customerCancelRoute, /where:\{orderNumber,userId:session\.userId\}/);
});

test("customer cancellation is restricted to pending unpaid orders and uses an atomic state change", () => {
  assert.match(customerCancelRoute, /order\.status!=="PENDING"\|\|order\.paymentStatus!=="PENDING"/);
  assert.match(customerCancelRoute, /rejectPendingOrderAtomically\(/);
  assert.match(customerCancelRoute, /status:409/);
});

test("order creation validates checkout totals server-side through the shared quote builder", () => {
  assert.match(orderCreateRoute, /buildQuote\(/);
  assert.match(orderCreateRoute, /idempotencyKey/);
});

test("customer order listing is scoped to the authenticated customer's own orders", () => {
  assert.match(customerOrdersRoute, /verifyCustomerToken/);
  assert.match(customerOrdersRoute, /userId:s\.userId/);
});
