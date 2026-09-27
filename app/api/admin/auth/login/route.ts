import {NextRequest,NextResponse} from "next/server";import {rateLimit} from "@/lib/security/rate-limit";
import {adminCredentials,createAdminToken} from "@/lib/auth/admin";
export async function POST(req:NextRequest){
 try{const {email,password}=await req.json();const c=adminCredentials();
  if(!c.email||!c.password||email!==c.email||password!==c.password)return NextResponse.json({error:"Invalid credentials"},{status:401});
  const res=NextResponse.json({ok:true});res.cookies.set("admin_session",await createAdminToken(email),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*12});return res;
 }catch{return NextResponse.json({error:"Login failed"},{status:400})}
}
