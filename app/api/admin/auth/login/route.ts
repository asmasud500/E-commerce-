import {NextRequest,NextResponse} from "next/server";import {rateLimit} from "@/lib/security/rate-limit";
import {adminCredentials,createAdminToken} from "@/lib/auth/admin";
export async function POST(req:NextRequest){
 try{const ip=req.headers.get("cf-connecting-ip")||"unknown";const rl=rateLimit("admin-login:"+ip,10,60_000);if(!rl.ok)return NextResponse.json({error:"Too many attempts. Try again later."},{status:429});const body=await req.json();const email=String(body.email||"").trim().toLowerCase();const password=String(body.password||"").trim();const c=adminCredentials();
  if(!c.email||!c.password||email!==c.email||password!==c.password)return NextResponse.json({error:"Invalid credentials"},{status:401});
  const res=NextResponse.json({ok:true});res.cookies.set("admin_session",await createAdminToken(email),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*12});return res;
 }catch(error){console.error("Admin login error:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Login failed"},{status:400})}
}
