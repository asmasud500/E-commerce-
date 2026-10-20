import test from "node:test";
import assert from "node:assert/strict";
import {buildTimeline} from "../lib/tracking.ts";

test("COD orders do not wait for online payment", () => {
  const t = buildTimeline({status:"PENDING",paymentStatus:"PENDING",paymentProvider:"COD",createdAt:new Date()});
  const pay = t.find(s => s.key === "payment");
  assert.equal(pay.state, "done");
  assert.match(pay.detail, /Cash on delivery/);
  assert.equal(t.find(s => s.key === "confirmed").state, "current");
});

test("non-COD pending orders still wait for payment", () => {
  const t = buildTimeline({status:"PENDING",paymentStatus:"PENDING",createdAt:new Date()});
  assert.equal(t.find(s => s.key === "payment").state, "current");
});
