import {NextRequest,NextResponse} from "next/server";
import {verifyAdminToken} from "@/lib/auth/admin";
export function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path.startsWith("/admin")&&!path.startsWith("/admin/login")){
  const token=req.cookies.get("admin_session")?.value;
  if(!token||!verifyAdminToken(token))return NextResponse.redirect(new URL("/admin/login",req.url));
 }
 if(path.startsWith("/api/admin/")&&!path.startsWith("/api/admin/auth/")){
  const token=req.cookies.get("admin_session")?.value;
  if(!token)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!verifyAdminToken(token))return NextResponse.json({error:"Unauthorized"},{status:401});
 }
 return NextResponse.next();
}
export const config={matcher:["/admin/:path*","/api/admin/:path*"]};
