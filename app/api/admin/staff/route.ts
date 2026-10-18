import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {hashStaffPassword} from "@/lib/auth/staff-password";
import {readAdminSession} from "@/lib/auth/admin";

const roles=["MANAGER","ORDER_MANAGER","PRODUCT_MANAGER","SUPPORT"] as const;
const createSchema=z.object({
 name:z.string().trim().min(2).max(100),
 email:z.string().trim().email().max(160).transform(v=>v.toLowerCase()),
 role:z.enum(roles),
 password:z.string().min(12).max(128)
});
function safe(row:any){const {passwordHash,...publicRow}=row;return publicRow;}

export async function GET(){
 try{
  const rows=await db.staffAccount.findMany({orderBy:{createdAt:"desc"}});
  return NextResponse.json(rows.map(safe));
 }catch(error){
  console.error("Staff list failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to load staff accounts."},{status:500});
 }
}

export async function POST(req:NextRequest){
 try{
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  const actorId=session?.staffId||session?.email||"SUPER_ADMIN";
  const parsed=createSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid staff details. Password must be at least 12 characters.",details:parsed.error.flatten()},{status:400});
  const existing=await db.staffAccount.findFirst({where:{email:parsed.data.email}});
  if(existing)return NextResponse.json({error:"A staff account with this email already exists."},{status:409});
  const row=await db.staffAccount.create({data:{
   name:parsed.data.name,email:parsed.data.email,role:parsed.data.role,
   passwordHash:await hashStaffPassword(parsed.data.password),active:true,createdAt:new Date()
  }});
  try{await db.auditLog.create({data:{actorId,action:"STAFF_CREATED",entity:"staffAccount",entityId:row.id,metadata:{email:row.email,role:row.role}}});}catch{}
  return NextResponse.json(safe(row),{status:201});
 }catch(error){
  console.error("Staff create failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to create staff account."},{status:500});
 }
}
