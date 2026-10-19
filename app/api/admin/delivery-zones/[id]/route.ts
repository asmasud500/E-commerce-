import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  name:z.string().trim().min(1).max(150).optional(),
  division:z.string().trim().min(1).max(80).optional(),
  district:z.string().trim().min(1).max(100).optional(),
  upazila:z.string().trim().min(1).max(100).optional(),
  postalCode:z.string().trim().max(20).optional(),
  locationDescription:z.string().trim().max(500).optional(),
  latitude:z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude:z.coerce.number().min(-180).max(180).nullable().optional(),
  fee:z.coerce.number().min(0).max(100000).optional(),
  freeAbove:z.coerce.number().min(0).max(10000000).nullable().optional(),
  estimatedDays:z.coerce.number().int().min(0).max(60).optional(),
  active:z.boolean().optional()
}).strict();

type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid delivery zone.",details:parsed.error.flatten()},{status:400});
    const current=await db.deliveryZone.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Delivery zone not found."},{status:404});
    const row=await db.deliveryZone.update({where:{id},data:{...parsed.data,updatedAt:new Date()}});
    await recordAdminAudit(req,{action:"DELIVERY_ZONE_UPDATED",entity:"deliveryZone",entityId:id,metadata:{changedFields:Object.keys(parsed.data)}});
    return NextResponse.json(row);
  }catch(error){console.error("Admin delivery zone PATCH failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to update delivery zone."},{status:500});}
}
export async function DELETE(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;const current=await db.deliveryZone.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Delivery zone not found."},{status:404});
    await db.deliveryZone.delete({where:{id}});
    await recordAdminAudit(req,{action:"DELIVERY_ZONE_DELETED",entity:"deliveryZone",entityId:id,metadata:{name:current.name,division:current.division,district:current.district,upazila:current.upazila}});
    return NextResponse.json({success:true});
  }catch(error){console.error("Admin delivery zone DELETE failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to delete delivery zone."},{status:500});}
}
