import test from "node:test";
import assert from "node:assert/strict";
import {productDelivery,computeDelivery,isFreeDelivery,deliveryLabel} from "../lib/shipping.ts";

test("product delivery modes: free flag, own charge, standard", () => {
  assert.deepEqual(productDelivery({freeShipping:true,shippingFee:99}),{mode:"free",fee:0});
  assert.deepEqual(productDelivery({shippingFee:80}),{mode:"custom",fee:80});
  assert.deepEqual(productDelivery({shippingFee:"80"}),{mode:"custom",fee:80});
  assert.deepEqual(productDelivery({shippingFee:0}),{mode:"free",fee:0});
  assert.deepEqual(productDelivery({}),{mode:"standard",fee:0});
  assert.deepEqual(productDelivery({shippingFee:null}),{mode:"standard",fee:0});
  assert.deepEqual(productDelivery({shippingFee:-5}),{mode:"standard",fee:0});
  assert.deepEqual(productDelivery({shippingFee:"abc"}),{mode:"standard",fee:0});
  assert.equal(isFreeDelivery({freeShipping:true}),true);
  assert.equal(isFreeDelivery({shippingFee:50}),false);
});

test("standard products share one area charge per order", () => {
  const r=computeDelivery({deliveries:[{mode:"standard",fee:0},{mode:"standard",fee:0}],standardFee:120,freeThreshold:3000,payable:1000});
  assert.equal(r.shipping,120);
  assert.equal(r.standardWaived,false);
});

test("threshold waives only the standard charge, never a product's own charge", () => {
  const r=computeDelivery({deliveries:[{mode:"standard",fee:0},{mode:"custom",fee:200}],standardFee:120,freeThreshold:3000,payable:5000});
  assert.equal(r.standardWaived,true);
  assert.equal(r.shipping,200);
  assert.equal(r.customFee,200);
});

test("free-delivery products add nothing and an all-free cart ships free", () => {
  const r=computeDelivery({deliveries:[{mode:"free",fee:0},{mode:"free",fee:0}],standardFee:120,freeThreshold:3000,payable:100});
  assert.equal(r.shipping,0);
  assert.equal(r.hasStandard,false);
  const mixed=computeDelivery({deliveries:[{mode:"free",fee:0},{mode:"standard",fee:0}],standardFee:120,freeThreshold:null,payable:100});
  assert.equal(mixed.shipping,120);
});

test("own delivery charges add up once per product", () => {
  const r=computeDelivery({deliveries:[{mode:"custom",fee:60},{mode:"custom",fee:40}],standardFee:120,freeThreshold:3000,payable:100});
  assert.equal(r.shipping,100);
});

test("threshold is inclusive and null disables it", () => {
  assert.equal(computeDelivery({deliveries:[{mode:"standard",fee:0}],standardFee:120,freeThreshold:3000,payable:3000}).shipping,0);
  assert.equal(computeDelivery({deliveries:[{mode:"standard",fee:0}],standardFee:120,freeThreshold:3000,payable:2999.99}).shipping,120);
  assert.equal(computeDelivery({deliveries:[{mode:"standard",fee:0}],standardFee:120,freeThreshold:null,payable:999999}).shipping,120);
});

test("delivery labels for customers", () => {
  assert.equal(deliveryLabel({freeShipping:true},120,3000),"Free delivery");
  assert.match(deliveryLabel({shippingFee:80},120,3000),/Delivery ৳80/);
  assert.match(deliveryLabel({},120,3000),/Delivery ৳120 · free over ৳3,000/);
  assert.equal(deliveryLabel({},120,null),"Delivery ৳120");
});
