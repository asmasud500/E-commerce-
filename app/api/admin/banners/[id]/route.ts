import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";

const schema=z.object({
  title:z.string().trim().min(1).max(120).optional(),
  imageUrl:z.string().trim().url().max(2000).optional(),
  href:z.string().trim().max(500).optional(),
  startsAt:z.string().datetime().nullable().optional(),
  endsAt:z.string().datetime().nullable().optional(),
  active:z.boolean().optional(),
  sortOrder:z.coerce.number().int().min(0).max(10000).optional()
}).strict();
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid banner.",details:parsed.error.flatten()},{status:400});
    const current=await db.banner.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Banner not found."},{status:404});
    const data={...parsed.data,startsAt:parsed.data.startsAt===undefined?undefined:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt===undefined?undefined:parsed.data.endsAt?new Date(parsed.data.endsAt):null,updatedAt:new Date()};
    const next={...current,...data};
    if(next.startsAt&&next.endsAt&&new Date(next.startsAt)>new Date(next.endsAt))return NextResponse.json({error:"Start date must be before end date."},{status:400});
    return NextResponse.json(await db.banner.update({where:{id},data}));
  }catch(error){console.error("Admin banner PATCH failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to update banner."},{status:500});}
}
export async function DELETE(_req:NextRequest,ctx:Ctx){
  try{const {id}=await ctx.params;const current=await db.banner.findUnique({where:{id}});if(!current)return NextResponse.json({error:"Banner not found."},{status:404});await db.banner.delete({where:{id}});return NextResponse.json({success:true});}
  catch(error){console.error("Admin banner DELETE failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to delete banner."},{status:500});}
}
