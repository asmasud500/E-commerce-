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

test("mobile-money webhook only confirms a still-pending order with matching payment details", () => {
  assert.match(smsWebhook, /paymentStatus: "PENDING", status: "PENDING", paymentReference: transactionId, paymentSenderLast4: senderLast4, paymentProvider: provider/);
  assert.match(smsWebhook, /changed\.count !== 1/);
});

test("payment proof route rejects a transaction reference already attached to another order", () => {
  assert.match(paymentProof, /paymentReference/);
  assert.match(paymentProof, /paymentProvider/);
  assert.match(paymentProof, /status: 409/);
});

const adminPayment = await readFile(new URL("../app/api/admin/orders/[id]/payment/route.ts", import.meta.url), "utf8");

test("admin payment confirmation checks duplicate transaction IDs before confirming", () => {
  assert.match(adminPayment, /duplicateTransaction/);
  assert.match(adminPayment, /duplicateOrderReference/);
  assert.match(adminPayment, /providerTransactionId: ref/);
});

const refundRoute = await readFile(new URL("../app/api/admin/orders/[id]/refund/route.ts", import.meta.url), "utf8");
const adminPaymentRoute = await readFile(new URL("../app/api/admin/orders/[id]/payment/route.ts", import.meta.url), "utf8");

test("refund uses a conditional paid-state transition and reports concurrent attempts as conflicts", () => {
  assert.match(refundRoute, /where:\{id,paymentStatus:"PAID"\}/);
  assert.match(refundRoute, /changed\.count!==1/);
  assert.match(refundRoute, /Order state changed/);
  assert.match(refundRoute, /status:409/);
});

test("admin payment route returns conflict for duplicate transaction database errors", () => {
  assert.match(adminPaymentRoute, /e\.code === "P2002"/);
  assert.match(adminPaymentRoute, /status: 409/);
});

test("refund transaction stores the refund reference in the gateway-unique transaction ID field", () => {
  assert.match(refundRoute, /providerTransactionId:input\.reference/);
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
