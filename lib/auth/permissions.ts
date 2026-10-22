export const ADMIN_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function canAccessAdminPath(role: string, path: string, method: string): boolean {
  if (role === "SUPER_ADMIN") return true;

  // Staff administration, security settings and audit history are super-admin only.
  if (path === "/admin" || path === "/admin/unauthorized") return true;
  const superAdminOnly = [
    "/admin/staff", "/api/admin/staff",
    "/admin/security",
    "/admin/settings", "/api/admin/store-settings",
    "/admin/activity", "/api/admin/activity",
    // Payment gateway credentials/configuration and refund execution are high-impact.
    "/admin/payment-gateways", "/api/admin/payment-gateways",
    // API keys for couriers/SMS are stored encrypted and managed by super admins only.
    "/admin/integrations", "/api/admin/integrations"
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
    const orderPaths = ["/admin/orders", "/api/admin/orders", "/admin/returns", "/api/admin/returns"];
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

  // Managers may operate explicitly supported store modules. Fail closed for new or unknown routes.
  if (role === "MANAGER") {
    const managerPaths = [
      "/admin/products", "/admin/categories", "/admin/banners",
      "/admin/flash-sales", "/admin/delivery-zones", "/admin/coupons",
      "/admin/customers", "/admin/reviews", "/admin/orders", "/admin/returns",
      "/admin/payment-transactions", "/admin/reports", "/admin/marketing",
      "/api/admin/products", "/api/admin/categories", "/api/admin/banners",
      "/api/admin/flash-sales", "/api/admin/delivery-zones", "/api/admin/coupons",
      "/api/admin/customers", "/api/admin/reviews", "/api/admin/orders", "/api/admin/returns",
      "/api/admin/payment-transactions", "/api/admin/reports"
    ];
    return managerPaths.some(prefix => path === prefix || path.startsWith(prefix + "/"));
  }

  // Unknown roles and routes are denied by default.
  return false;
}
