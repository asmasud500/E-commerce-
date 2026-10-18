import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {hashStaffPassword} from "@/lib/auth/staff-password";
import {recordAdminAudit} from "@/lib/auth/audit";

const roles=["MANAGER","ORDER_MANAGER","PRODUCT_MANAGER","SUPPORT"] as const;
const patchSchema=z.object({
 name:z.string().trim().min(2).max(100).optional(),
 role:z.enum(roles).optional(),
 active:z.boolean().optional(),
 password:z.string().min(12).max(128).optional()
}).strict();
function safe(row:any){if(!row)return row;const {passwordHash,...publicRow}=row;return publicRow;}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const parsed=patchSchema.safeParse(await req.json());
  if(!parsed.success||!Object.keys(parsed.data||{}).length)return NextResponse.json({error:"Invalid staff update."},{status:400});
  const existing=await db.staffAccount.findUnique({where:{id}});
  if(!existing)return NextResponse.json({error:"Staff account not found."},{status:404});
  const data:any={...parsed.data,updatedAt:new Date()};
  if(parsed.data.password){data.passwordHash=await hashStaffPassword(parsed.data.password);delete data.password;}
  const row=await db.staffAccount.update({where:{id},data});
  await recordAdminAudit(req,{action:"STAFF_UPDATED",entity:"staffAccount",entityId:id,metadata:{changedFields:Object.keys(parsed.data).filter(k=>k!=="password"),passwordChanged:!!parsed.data.password}});
  return NextResponse.json(safe(row));
 }catch(error){
  console.error("Staff update failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to update staff account."},{status:500});
 }
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const existing=await db.staffAccount.findUnique({where:{id}});
  if(!existing)return NextResponse.json({error:"Staff account not found."},{status:404});
  const row=await db.staffAccount.update({where:{id},data:{active:false,updatedAt:new Date()}});
  await recordAdminAudit(req,{action:"STAFF_DEACTIVATED",entity:"staffAccount",entityId:id,metadata:{email:existing.email}});
  return NextResponse.json(safe(row));
 }catch(error){
  console.error("Staff deactivate failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to deactivate staff account."},{status:500});
 }
}
