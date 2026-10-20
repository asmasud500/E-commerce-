import test from "node:test";
import assert from "node:assert/strict";
import {orderSmsText} from "../lib/integrations/sms-text.ts";
import {PROVIDERS} from "../lib/integrations/providers.ts";
import {canAccessAdminPath} from "../lib/auth/permissions.ts";

test("SMS text only for customer-facing statuses", () => {
  assert.match(orderSmsText({status:"SHIPPED",orderNumber:"ORD-1",courierName:"Steadfast",trackingNumber:"T1"}), /ORD-1.*Steadfast T1/);
  assert.equal(orderSmsText({status:"PENDING",orderNumber:"ORD-1"}), null);
  assert.equal(orderSmsText({status:"PROCESSING",orderNumber:"ORD-1"}), null);
});
test("every secret field is marked secret", () => {
  for (const p of PROVIDERS) for (const f of p.secrets) assert.equal(f.secret, true);
});
test("only super admins can read or change API keys", () => {
  for (const role of ["MANAGER","ORDER_MANAGER","PRODUCT_MANAGER","SUPPORT"]) {
    assert.equal(canAccessAdminPath(role, "/api/admin/integrations", "GET"), false, role);
    assert.equal(canAccessAdminPath(role, "/api/admin/integrations/sms", "PUT"), false, role);
    assert.equal(canAccessAdminPath(role, "/admin/integrations", "GET"), false, role);
  }
  assert.equal(canAccessAdminPath("SUPER_ADMIN", "/api/admin/integrations", "GET"), true);
});
