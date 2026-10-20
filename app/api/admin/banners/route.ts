import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
  title:z.string().trim().min(1).max(120),
  imageUrl:z.string().trim().max(480000).refine(v=>/^https?:\/\//i.test(v)||/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v),{message:"Provide a valid image URL or an uploaded image."}),
  href:z.string().trim().max(500).optional().default(""),
  startsAt:z.string().datetime().nullable().optional(),
  endsAt:z.string().datetime().nullable().optional(),
  active:z.boolean().default(false),
  sortOrder:z.coerce.number().int().min(0).max(10000).default(0)
}).strict().refine(v=>!v.startsAt||!v.endsAt||new Date(v.startsAt)<=new Date(v.endsAt),{message:"Start date must be before end date."});

export async function GET(){
  try{return NextResponse.json(await db.banner.findMany({orderBy:[{sortOrder:"asc"},{createdAt:"desc"}]}));}
  catch(error){console.error("Admin banners GET failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to load banners."},{status:500});}
}
export async function POST(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Invalid banner.",details:parsed.error.flatten()},{status:400});
    const data={...parsed.data,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):null};
    const row=await db.banner.create({data});
    await recordAdminAudit(req,{action:"BANNER_CREATED",entity:"banner",entityId:row.id,metadata:{title:row.title,active:row.active}});
    return NextResponse.json(row,{status:201});
  }catch(error){console.error("Admin banners POST failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to create banner."},{status:500});}
}
