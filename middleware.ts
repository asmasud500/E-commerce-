import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";

import { canAccessAdminPath, ADMIN_SAFE_METHODS } from "@/lib/auth/permissions";

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
    if (!canAccessAdminPath(session.role, path, req.method)) {
      return NextResponse.redirect(new URL("/admin/unauthorized", req.url));
    }
  }

  if (path.startsWith("/api/admin/") && !path.startsWith("/api/admin/auth/")) {
    const token = req.cookies.get("admin_session")?.value;
    const session = token ? await readAdminSession(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccessAdminPath(session.role, path, req.method)) {
      return NextResponse.json({ error: "Forbidden: your staff role cannot perform this action." }, { status: 403 });
    }
    if (!ADMIN_SAFE_METHODS.has(req.method) && !hasValidSameOrigin(req)) {
      return NextResponse.json({ error: "Cross-origin admin requests are not allowed." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
