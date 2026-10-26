import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/firestore";

const schema=z.object({
  title:z.string().trim().min(1).max(120).optional(),
  productIds:z.array(z.string().trim().min(1).max(128)).min(1).max(200).optional(),
  discountPercent:z.coerce.number().int().min(1).max(90).optional(),
  startsAt:z.string().datetime().optional(),
  endsAt:z.string().datetime().optional(),
  active:z.boolean().optional()
}).strict();
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid flash sale.",details:parsed.error.flatten()},{status:400});
    const current=await db.flashSale.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Flash sale not found."},{status:404});
    const data={...parsed.data,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):undefined,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):undefined,updatedAt:new Date()};
    const next={...current,...data};
    if(new Date(next.startsAt)>=new Date(next.endsAt))return NextResponse.json({error:"End date must be after start date."},{status:400});
    return NextResponse.json(await db.flashSale.update({where:{id},data}));
  }catch(error){console.error("Admin flash sale PATCH failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to update flash sale."},{status:500});}
}
export async function DELETE(_req:NextRequest,ctx:Ctx){
  try{const {id}=await ctx.params;const current=await db.flashSale.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Flash sale not found."},{status:404});await db.flashSale.delete({where:{id}});return NextResponse.json({success:true});}
  catch(error){console.error("Admin flash sale DELETE failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to delete flash sale."},{status:500});}
}
