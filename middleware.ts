import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";

function allowed(role: string, path: string) {
  if (role === "SUPER_ADMIN") return true;
  if (path === "/admin" || path === "/admin/unauthorized") return true;
  if (path.startsWith("/admin/staff") || path.startsWith("/api/admin/staff") ||
      path.startsWith("/admin/settings") || path.startsWith("/api/admin/store-settings") ||
      path.startsWith("/admin/activity") || path.startsWith("/api/admin/activity")) return false;
  if (role === "MANAGER") return true;
  const rules: Record<string,string[]> = {
    ORDER_MANAGER: ["/admin/orders","/admin/payment-transactions","/admin/reports","/api/admin/orders","/api/admin/payment-transactions","/api/admin/reports"],
    PRODUCT_MANAGER: ["/admin/products","/admin/categories","/admin/banners","/admin/flash-sales","/admin/delivery-zones","/api/admin/products","/api/admin/categories","/api/admin/banners","/api/admin/flash-sales","/api/admin/delivery-zones"],
    SUPPORT: ["/admin/customers","/admin/reviews","/admin/orders","/api/admin/customers","/api/admin/reviews","/api/admin/orders"]
  };
  return (rules[role] || []).some(prefix => path === prefix || path.startsWith(prefix + "/"));
}

export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path.startsWith("/admin")&&!path.startsWith("/admin/login")){
  const token=req.cookies.get("admin_session")?.value;
  const session=token?await readAdminSession(token):null;
  if(!session)return NextResponse.redirect(new URL("/admin/login",req.url));
  if(!allowed(session.role,path))return NextResponse.redirect(new URL("/admin/unauthorized",req.url));
 }
 if(path.startsWith("/api/admin/")&&!path.startsWith("/api/admin/auth/")){
  const token=req.cookies.get("admin_session")?.value;
  const session=token?await readAdminSession(token):null;
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed(session.role,path))return NextResponse.json({error:"Forbidden: your staff role cannot access this resource."},{status:403});
 }
 return NextResponse.next();
}
export const config={matcher:["/admin/:path*","/api/admin/:path*"]};
