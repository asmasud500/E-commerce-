import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
 name:z.string().max(100).nullable().optional(),
 code:z.string().trim().min(2).max(50).transform(v=>v.toUpperCase().replace(/\\s+/g,"")).optional(),
 type:z.enum(["PERCENT","FIXED"]).optional(),
 value:z.coerce.number().positive().optional(),
 minOrder:z.coerce.number().nonnegative().nullable().optional(),
 expiresAt:z.string().datetime().nullable().optional(),
 active:z.boolean().optional()
}).strict();
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Ctx){
 try{
  const {id}=await ctx.params;const parsed=schema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid coupon update.",details:parsed.error.flatten()},{status:400});
  const b=parsed.data;
  if(b.type==="PERCENT"&&b.value!==undefined&&b.value>100)return NextResponse.json({error:"Percent cannot exceed 100."},{status:400});
  const existing=await db.coupon.findUnique({where:{id}});
  if(!existing)return NextResponse.json({error:"Coupon not found."},{status:404});
  const row=await db.coupon.update({where:{id},data:{...b,expiresAt:b.expiresAt===undefined?undefined:b.expiresAt?new Date(b.expiresAt):null}});
  await recordAdminAudit(req,{action:"COUPON_UPDATED",entity:"coupon",entityId:id,metadata:{code:row.code,active:row.active,changedFields:Object.keys(b)}});
  return NextResponse.json(row);
 }catch(error){console.error("Coupon update failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Could not update coupon. Check for a duplicate code or invalid value."},{status:400});}
}
export async function DELETE(req:NextRequest,ctx:Ctx){
 try{
  const {id}=await ctx.params;const existing=await db.coupon.findUnique({where:{id}});
  if(!existing)return NextResponse.json({error:"Coupon not found."},{status:404});
  await db.coupon.delete({where:{id}});
  await recordAdminAudit(req,{action:"COUPON_DELETED",entity:"coupon",entityId:id,metadata:{code:existing.code}});
  return NextResponse.json({ok:true});
 }catch(error){console.error("Coupon delete failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Coupon delete failed."},{status:400});}
}
