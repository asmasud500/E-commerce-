import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";

const safeImage=(value:string)=>{
  if(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value.length<=420000;
  try{const url=new URL(value);return (url.protocol==="https:"||url.protocol==="http:")&&Boolean(url.hostname);}
  catch{return false;}
};
const safeDestination=(value:string)=>{
  if(!value)return true;
  if(value.startsWith("/"))return !value.startsWith("//")&&!value.startsWith("/\\");
  try{const url=new URL(value);return (url.protocol==="https:"||url.protocol==="http:")&&Boolean(url.hostname);}
  catch{return false;}
};
const dateFields={
  startsAt:z.string().datetime().nullable().optional(),
  endsAt:z.string().datetime().nullable().optional()
};
const schema=z.object({
  title:z.string().trim().min(1,"Enter a banner title.").max(120,"Banner title must be 120 characters or fewer."),
  imageUrl:z.string().trim().min(1,"Add an image URL or upload a banner image.").max(420000,"Banner image is too large.").refine(safeImage,{message:"Provide a valid HTTP(S) image URL or a supported uploaded image."}),
  href:z.string().trim().max(500,"Destination must be 500 characters or fewer.").refine(safeDestination,{message:"Use a relative store path or an HTTP(S) destination URL."}).optional().default(""),
  ...dateFields,
  active:z.boolean().default(false),
  sortOrder:z.coerce.number().int("Sort order must be a whole number.").min(0,"Sort order cannot be negative.").max(10000,"Sort order must be 10000 or less.").default(0)
}).strict().superRefine((v,ctx)=>{
  if(v.startsAt&&v.endsAt&&new Date(v.startsAt)>new Date(v.endsAt)){
    ctx.addIssue({code:"custom",path:["endsAt"],message:"End date must be on or after start date."});
  }
});
const invalid=(error:{issues:Array<{path:(string|number)[];message:string}>;flatten:()=>unknown})=>{
  const fieldErrors=error.issues.map(issue=>({field:issue.path.join(".")||"form",message:issue.message}));
  return NextResponse.json(
    {error:fieldErrors[0]?.message||"Please review the banner fields.",fieldErrors,details:error.flatten()},
    {status:400,headers:{"Cache-Control":"private, no-store"}}
  );
};
const noStore={"Cache-Control":"private, no-store"};

export async function GET(){
  try{return NextResponse.json(await db.banner.findMany({orderBy:[{sortOrder:"asc"},{createdAt:"desc"}]}),{headers:noStore});}
  catch(error){console.error("Admin banners GET failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to load banners."},{status:500,headers:noStore});}
}
export async function POST(req:NextRequest){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return invalid(parsed.error);
    const data={...parsed.data,startsAt:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt?new Date(parsed.data.endsAt):null};
    const row=await db.banner.create({data});
    await recordAdminAudit(req,{action:"BANNER_CREATED",entity:"banner",entityId:row.id,metadata:{title:row.title,active:row.active,sortOrder:row.sortOrder}});
    return NextResponse.json(row,{status:201,headers:noStore});
  }catch(error){console.error("Admin banners POST failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to create banner."},{status:500,headers:noStore});}
}
