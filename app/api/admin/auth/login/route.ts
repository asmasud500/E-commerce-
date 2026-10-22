import {NextRequest,NextResponse} from "next/server";
import {rateLimit} from "@/lib/security/rate-limit";
import {adminCredentials,createAdminToken} from "@/lib/auth/admin";
import {verifyStaffPassword} from "@/lib/auth/staff-password";
import {db} from "@/lib/prisma";

const STAFF_ROLES=["MANAGER","ORDER_MANAGER","PRODUCT_MANAGER","SUPPORT"] as const;

function hasValidSameOrigin(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // Non-browser clients may omit Origin.
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(req:NextRequest){
 try{
  if (!hasValidSameOrigin(req)) {
    return NextResponse.json({error:"Cross-origin admin login is not allowed."},{status:403});
  }
  const ip=req.headers.get("cf-connecting-ip")||"unknown";
  const rl=rateLimit("admin-login:"+ip,10,60_000);
  if(!rl.ok)return NextResponse.json({error:"Too many attempts. Try again later."},{status:429});
  const body=await req.json();
  const email=String(body.email||"").trim().toLowerCase();
  const password=String(body.password||"");
  if(!email||!password)return NextResponse.json({error:"Email and password are required."},{status:400});
  const c=adminCredentials();
  let role="";let staffId:string|undefined;
  if(c.email&&c.password&&email===c.email&&password===c.password){
    role="SUPER_ADMIN";
  }else{
    const staff=await db.staffAccount.findFirst({where:{email,active:true}});
    if(!staff?.passwordHash||!(STAFF_ROLES as readonly string[]).includes(staff.role)||!(await verifyStaffPassword(password,String(staff.passwordHash)))){
      try{await db.auditLog.create({data:{actorId:email||"UNKNOWN",action:"ADMIN_LOGIN_FAILED",entity:"adminSession",entityId:null,metadata:{reason:"invalid_credentials"}}});}catch{}
      return NextResponse.json({error:"Invalid credentials"},{status:401});
    }
    role=staff.role;staffId=staff.id;
    await db.staffAccount.update({where:{id:staff.id},data:{lastLoginAt:new Date()}});
  }
  const res=NextResponse.json({ok:true,role});
  res.cookies.set("admin_session",await createAdminToken(email,role,staffId),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:role==="SUPER_ADMIN"?60*60*12:60*60});
  try{await db.auditLog.create({data:{actorId:staffId||email,action:"ADMIN_LOGIN",entity:"staffAccount",entityId:staffId||null,metadata:{role}}});}catch{}
  return res;
 }catch(error){
  console.error("Admin login error:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Login failed"},{status:400});
 }
}
