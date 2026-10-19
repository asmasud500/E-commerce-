export const ADMIN_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function canAccessAdminPath(role: string, path: string, method: string): boolean {
  if (role === "SUPER_ADMIN") return true;

  // Staff administration, security settings and audit history are super-admin only.
  if (path === "/admin" || path === "/admin/unauthorized") return true;
  const superAdminOnly = [
    "/admin/staff", "/api/admin/staff",
    "/admin/settings", "/api/admin/store-settings",
    "/admin/activity", "/api/admin/activity",
    // Payment gateway credentials/configuration and refund execution are high-impact.
    "/admin/payment-gateways", "/api/admin/payment-gateways"
  ];
  if (
    superAdminOnly.some(prefix => path === prefix || path.startsWith(prefix + "/")) ||
    /^\/api\/admin\/orders\/[^/]+\/refund(?:\/|$)/.test(path)
  ) return false;

  // Support staff are read-only, including order details and customer/review APIs.
  if (role === "SUPPORT") {
    const supportPaths = [
      "/admin/customers", "/admin/reviews", "/admin/orders",
      "/api/admin/customers", "/api/admin/reviews", "/api/admin/orders"
    ];
    return ADMIN_SAFE_METHODS.has(method) &&
      supportPaths.some(prefix => path === prefix || path.startsWith(prefix + "/"));
  }

  // Order managers can read reporting/payment transaction records and update order status,
  // but cannot mutate payment records or other operational modules.
  if (role === "ORDER_MANAGER") {
    const orderReadOnly = [
      "/admin/payment-transactions", "/admin/reports",
      "/api/admin/payment-transactions", "/api/admin/reports"
    ];
    if (orderReadOnly.some(prefix => path === prefix || path.startsWith(prefix + "/"))) {
      return ADMIN_SAFE_METHODS.has(method);
    }
    const orderPaths = ["/admin/orders", "/api/admin/orders"];
    return (method === "GET" || method === "HEAD" || method === "PATCH") &&
      orderPaths.some(prefix => path === prefix || path.startsWith(prefix + "/"));
  }

  // Product managers can manage catalogue and merchandising only.
  if (role === "PRODUCT_MANAGER") {
    const productPaths = [
      "/admin/products", "/admin/categories", "/admin/banners",
      "/admin/flash-sales", "/admin/delivery-zones",
      "/api/admin/products", "/api/admin/categories", "/api/admin/banners",
      "/api/admin/flash-sales", "/api/admin/delivery-zones"
    ];
    return productPaths.some(prefix => path === prefix || path.startsWith(prefix + "/"));
  }

  // Managers may operate the store, but not manage staff, global settings or audit history.
  return role === "MANAGER";
}
