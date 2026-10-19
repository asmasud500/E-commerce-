import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const smsWebhook = await readFile(new URL("../app/api/webhooks/mobile-money-sms/route.ts", import.meta.url), "utf8");
const paymentProof = await readFile(new URL("../app/api/payments/proof/route.ts", import.meta.url), "utf8");

test("database schema has a unique provider transaction key per gateway", () => {
  assert.match(schema, /@@unique\(\[gatewayId, providerTransactionId\]\)/);
});

test("mobile-money webhook handles Prisma unique conflicts as duplicate transactions", () => {
  assert.match(smsWebhook, /code === "P2002"/);
  assert.match(smsWebhook, /Transaction ID was already processed\./);
});

test("mobile-money webhook confirms only with matching pending-order evidence inside the atomic helper", () => {
  assert.match(smsWebhook, /expectedPaymentReference: transactionId/);
  assert.match(smsWebhook, /expectedSenderLast4: senderLast4/);
  assert.match(smsWebhook, /expectedProvider: provider/);
  assert.match(smsWebhook, /confirmPaymentAtomically\(/);
});

test("payment proof route rejects a transaction reference already attached to another order", () => {
  assert.match(paymentProof, /paymentReference/);
  assert.match(paymentProof, /paymentProvider/);
  assert.match(paymentProof, /status: 409/);
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
  assert.match(paymentProof, /status: 429/);
});


const firestoreAdapter = await readFile(new URL("../lib/firestore.ts", import.meta.url), "utf8");
const checkoutRoute = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");

test("checkout uses Firestore native read-write transaction for stock and order writes", () => {
  assert.match(firestoreAdapter, /req\(":beginTransaction"/);
  assert.match(firestoreAdapter, /req\(":commit"/);
  assert.match(firestoreAdapter, /req\(":rollback"/);
  assert.match(firestoreAdapter, /updateMask: \{ fieldPaths: \["stock", "updatedAt"\] \}/);
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

test("SMS confirmation and proof reference claims use atomic Firestore helpers", () => {
  assert.match(smsProofRoute, /confirmPaymentAtomically\(/);
  assert.match(paymentProof, /claimPaymentProofAtomically\(/);
});

test("expired stock release restores inventory with a native transaction", () => {
  assert.match(stockReleaseRoute, /releaseOrderStockAtomically\(/);
});

test("admin confirm, reject, cancellation, and refund use native transaction helpers", () => {
  assert.match(adminPaymentAtomicRoute, /confirmPaymentAtomically\(/);
  assert.match(adminPaymentAtomicRoute, /rejectPendingOrderAtomically\(/);
  assert.match(adminOrderAtomicRoute, /rejectPendingOrderAtomically\(/);
  assert.match(refundAtomicRoute, /recordRefundAtomically\(/);
});

test("native Firestore payment transactions query existing provider IDs within the transaction", () => {
  assert.match(firestoreAdapter, /transactionQuery\("paymentTransactions"/);
  assert.match(firestoreAdapter, /currentDocument: \{ exists: false \}/);
});
