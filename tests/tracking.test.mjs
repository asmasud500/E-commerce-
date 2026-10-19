import test from "node:test";
import assert from "node:assert/strict";
import {normalizePhone,contactMatches,normalizeOrderNumber,buildTimeline} from "../lib/tracking.ts";

test("phone numbers match across Bangladeshi formats", () => {
  for(const v of ["01712345678","+8801712345678","8801712345678","017-1234 5678","008801712345678"])
    assert.equal(normalizePhone(v),"1712345678",v);
  const order={customerPhone:"01712345678",customerEmail:null};
  assert.equal(contactMatches(order,"+880 1712-345678"),true);
  assert.equal(contactMatches(order,"01812345678"),false);
});

test("email matches case-insensitively and never matches an empty email", () => {
  const order={customerPhone:"01712345678",customerEmail:"Buyer@Example.com"};
  assert.equal(contactMatches(order,"buyer@example.com"),true);
  assert.equal(contactMatches(order,"other@example.com"),false);
  assert.equal(contactMatches({customerPhone:"01712345678",customerEmail:null},"@"),false);
  assert.equal(contactMatches({customerPhone:"01712345678",customerEmail:""},"x@y.z"),false);
});

test("short or empty contacts never match", () => {
  const order={customerPhone:"01712345678",customerEmail:"a@b.co"};
  assert.equal(contactMatches(order,""),false);
  assert.equal(contactMatches(order,"1234"),false);
  assert.equal(contactMatches(order,"   "),false);
});

test("order numbers are normalised", () => {
  assert.equal(normalizeOrderNumber("  ord-abc 123 "),"ORD-ABC123");
});

test("timeline for a fresh unpaid order", () => {
  const t=buildTimeline({status:"PENDING",paymentStatus:"PENDING",createdAt:"2026-10-19T10:00:00Z"});
  assert.equal(t.find(s=>s.key==="placed").state,"done");
  assert.equal(t.find(s=>s.key==="payment").state,"current");
  assert.equal(t.find(s=>s.key==="delivered").state,"todo");
});

test("timeline for a shipped order shows the courier and the next step", () => {
  const t=buildTimeline({status:"SHIPPED",paymentStatus:"PAID",courierName:"Pathao",trackingNumber:"PT123",shippedAt:"2026-10-20T10:00:00Z"});
  assert.equal(t.find(s=>s.key==="shipped").state,"done");
  assert.match(t.find(s=>s.key==="shipped").detail,/Pathao · PT123/);
  assert.equal(t.find(s=>s.key==="delivered").state,"current");
});

test("cancelled and rejected-payment orders end with a failed step", () => {
  const c=buildTimeline({status:"CANCELLED",paymentStatus:"FAILED"});
  assert.equal(c.at(-1).state,"failed");
  assert.equal(c.at(-1).label,"Payment rejected");
  const r=buildTimeline({status:"REFUNDED",paymentStatus:"REFUNDED"});
  assert.equal(r.at(-1).label,"Refunded");
  assert.equal(buildTimeline({status:"CANCELLED",paymentStatus:"PENDING"}).at(-1).label,"Cancelled");
});
