import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowed(role: string, path: string, method: string) {
  if (role === "SUPER_ADMIN") return true;

  // Staff administration, security settings and audit history are super-admin only.
  if (path === "/admin" || path === "/admin/unauthorized") return true;
  const superAdminOnly = [
    "/admin/staff", "/api/admin/staff",
    "/admin/settings", "/api/admin/store-settings",
    "/admin/activity", "/api/admin/activity"
  ];
  if (superAdminOnly.some(prefix => path === prefix || path.startsWith(prefix + "/"))) return false;

  // Support staff are read-only, including order details and customer/review APIs.
  if (role === "SUPPORT") {
    const supportPaths = [
      "/admin/customers", "/admin/reviews", "/admin/orders",
      "/api/admin/customers", "/api/admin/reviews", "/api/admin/orders"
    ];
    return SAFE_METHODS.has(method) &&
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
      return SAFE_METHODS.has(method);
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

function hasValidSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return true; // Non-browser clients may omit Origin; authentication is still required.
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_session")?.value;
    const session = token ? await readAdminSession(token) : null;
    if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
    if (!allowed(session.role, path, req.method)) {
      return NextResponse.redirect(new URL("/admin/unauthorized", req.url));
    }
  }

  if (path.startsWith("/api/admin/") && !path.startsWith("/api/admin/auth/")) {
    const token = req.cookies.get("admin_session")?.value;
    const session = token ? await readAdminSession(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowed(session.role, path, req.method)) {
      return NextResponse.json({ error: "Forbidden: your staff role cannot perform this action." }, { status: 403 });
    }
    if (!SAFE_METHODS.has(req.method) && !hasValidSameOrigin(req)) {
      return NextResponse.json({ error: "Cross-origin admin requests are not allowed." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
