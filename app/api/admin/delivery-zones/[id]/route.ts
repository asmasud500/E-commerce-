import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";

const schema=z.object({
  name:z.string().trim().min(1).max(100).optional(),
  district:z.string().trim().min(1).max(100).optional(),
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
    return NextResponse.json(await db.deliveryZone.update({where:{id},data:{...parsed.data,updatedAt:new Date()}}));
  }catch(error){console.error("Admin delivery zone PATCH failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to update delivery zone."},{status:500});}
}
export async function DELETE(_req:NextRequest,ctx:Ctx){
  try{const {id}=await ctx.params;const current=await db.deliveryZone.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Delivery zone not found."},{status:404});await db.deliveryZone.delete({where:{id}});return NextResponse.json({success:true});}
  catch(error){console.error("Admin delivery zone DELETE failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to delete delivery zone."},{status:500});}
}
