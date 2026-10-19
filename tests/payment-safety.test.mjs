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
