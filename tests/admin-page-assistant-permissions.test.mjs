import test from "node:test";
import assert from "node:assert/strict";
import { canAccessAdminPath } from "../lib/auth/permissions.ts";

const pages = {
  orders: "/admin/orders",
  returns: "/admin/returns",
  products: "/admin/products",
  inventory: "/admin/inventory",
  categories: "/admin/categories",
  customers: "/admin/customers",
  reviews: "/admin/reviews",
  "mart-pay": "/admin/mart-pay",
  transactions: "/admin/payment-transactions",
  coupons: "/admin/coupons",
  "gift-cards": "/admin/gift-cards",
  marketing: "/admin/marketing",
  "flash-sales": "/admin/flash-sales",
  "delivery-zones": "/admin/delivery-zones",
  banners: "/admin/banners",
  storage: "/admin/storage",
  settings: "/admin/settings",
  integrations: "/admin/integrations",
  staff: "/admin/staff",
};

test("all assistant page permissions are checked using read-only GET access", () => {
  assert.equal(Object.keys(pages).length, 19);
  for (const path of Object.values(pages)) {
    assert.equal(canAccessAdminPath("SUPER_ADMIN", path, "GET"), true, path);
  }
});

test("least-privilege roles can access only permitted assistant contexts", () => {
  assert.equal(canAccessAdminPath("ORDER_MANAGER", pages.orders, "GET"), true);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", pages.returns, "GET"), true);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", pages.transactions, "GET"), true);
  assert.equal(canAccessAdminPath("ORDER_MANAGER", pages.products, "GET"), false);

  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", pages.products, "GET"), true);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", pages.banners, "GET"), true);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", pages.orders, "GET"), false);
  assert.equal(canAccessAdminPath("PRODUCT_MANAGER", pages.settings, "GET"), false);

  assert.equal(canAccessAdminPath("SUPPORT", pages.orders, "GET"), true);
  assert.equal(canAccessAdminPath("SUPPORT", pages.customers, "GET"), true);
  assert.equal(canAccessAdminPath("SUPPORT", pages.products, "GET"), false);

  assert.equal(canAccessAdminPath("MANAGER", pages.coupons, "GET"), true);
  assert.equal(canAccessAdminPath("MANAGER", pages.settings, "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", pages.integrations, "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", pages.staff, "GET"), false);
});

test("unknown roles and unknown routes fail closed", () => {
  assert.equal(canAccessAdminPath("ADMIN", pages.orders, "GET"), false);
  assert.equal(canAccessAdminPath("UNKNOWN", pages.orders, "GET"), false);
  assert.equal(canAccessAdminPath("MANAGER", "/admin/unlisted-module", "GET"), false);
});

test("role-specific read-only access does not grant mutation access to assistant contexts", () => {
  assert.equal(canAccessAdminPath("ORDER_MANAGER", pages.transactions, "POST"), false);
  assert.equal(canAccessAdminPath("SUPPORT", pages.orders, "POST"), false);
});
