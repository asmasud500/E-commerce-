import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  title:z.string().trim().min(1).max(120),
  productIds:z.array(z.string().trim().min(1).max(128)).min(1).max(200),
  discountPercent:z.coerce.number().int().min(1).max(90),
  startsAt:z.string().datetime(),
  endsAt:z.string().datetime(),
  active:z.boolean().default(false)
}).strict().refine(v=>new Date(v.startsAt)<new Date(v.endsAt),{message:"End date must be after start date."});

export async function GET(){
  try{return NextResponse.json(await db.flashSale.findMany({orderBy:{startsAt:"desc"}}));}
  catch(error){console.error("Admin flash sales GET failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to load flash sales."},{status:500});}
}
export async function POST(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid flash sale.",details:parsed.error.flatten()},{status:400});
    const data={...parsed.data,startsAt:new Date(parsed.data.startsAt),endsAt:new Date(parsed.data.endsAt)};
    const row=await db.flashSale.create({data});
    await recordAdminAudit(req,{action:"FLASH_SALE_CREATED",entity:"flashSale",entityId:row.id,metadata:{title:row.title,discountPercent:row.discountPercent,active:row.active,productCount:row.productIds.length}});
    return NextResponse.json(row,{status:201});
  }catch(error){console.error("Admin flash sales POST failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to create flash sale."},{status:500});}
}
