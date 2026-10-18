import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";

const schema=z.object({
  name:z.string().trim().min(1).max(100),
  district:z.string().trim().min(1).max(100),
  fee:z.coerce.number().min(0).max(100000),
  freeAbove:z.coerce.number().min(0).max(10000000).nullable().optional(),
  estimatedDays:z.coerce.number().int().min(0).max(60).default(3),
  active:z.boolean().default(true)
}).strict();

export async function GET(){
  try{return NextResponse.json(await db.deliveryZone.findMany({orderBy:[{district:"asc"},{name:"asc"}]}));}
  catch(error){console.error("Admin delivery zones GET failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to load delivery zones."},{status:500});}
}

export async function POST(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid delivery zone.",details:parsed.error.flatten()},{status:400});
    const zone=await db.deliveryZone.create({data:{...parsed.data,freeAbove:parsed.data.freeAbove??null}});
    return NextResponse.json(zone,{status:201});
  }catch(error){
    console.error("Admin delivery zone POST failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Unable to create delivery zone."},{status:500});
  }
}
