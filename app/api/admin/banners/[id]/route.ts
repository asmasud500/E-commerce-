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
const schema=z.object({
  title:z.string().trim().min(1,"Enter a banner title.").max(120,"Banner title must be 120 characters or fewer.").optional(),
  imageUrl:z.string().trim().min(1,"Add an image URL or upload a banner image.").max(420000,"Banner image is too large.").refine(safeImage,{message:"Provide a valid HTTP(S) image URL or a supported uploaded image."}).optional(),
  href:z.string().trim().max(500,"Destination must be 500 characters or fewer.").refine(safeDestination,{message:"Use a relative store path or an HTTP(S) destination URL."}).optional(),
  startsAt:z.string().datetime().nullable().optional(),
  endsAt:z.string().datetime().nullable().optional(),
  active:z.boolean().optional(),
  sortOrder:z.coerce.number().int("Sort order must be a whole number.").min(0,"Sort order cannot be negative.").max(10000,"Sort order must be 10000 or less.").optional()
}).strict();
const invalid=(issues:Array<{path:PropertyKey[];message:string}>)=>{
  const fieldErrors=issues.map(issue=>({field:issue.path.map(String).join(".")||"form",message:issue.message}));
  return NextResponse.json({error:fieldErrors[0]?.message||"Please review the banner fields.",fieldErrors},{status:400,headers:{"Cache-Control":"private, no-store"}});
};
const noStore={"Cache-Control":"private, no-store"};
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return invalid(parsed.error.issues);
    const current=await db.banner.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Banner not found."},{status:404,headers:noStore});
    const data={...parsed.data,startsAt:parsed.data.startsAt===undefined?undefined:parsed.data.startsAt?new Date(parsed.data.startsAt):null,endsAt:parsed.data.endsAt===undefined?undefined:parsed.data.endsAt?new Date(parsed.data.endsAt):null,updatedAt:new Date()};
    const next={...current,...data};
    if(next.startsAt&&next.endsAt&&new Date(next.startsAt)>new Date(next.endsAt)){
      const fieldErrors=[{field:"endsAt",message:"End date must be on or after start date."}];
      return NextResponse.json({error:fieldErrors[0].message,fieldErrors},{status:400,headers:noStore});
    }
    const row=await db.banner.update({where:{id},data});
    await recordAdminAudit(req,{action:"BANNER_UPDATED",entity:"banner",entityId:row.id,metadata:{title:row.title,active:row.active,changedFields:Object.keys(parsed.data)}});
    return NextResponse.json(row,{headers:noStore});
  }catch(error){console.error("Admin banner PATCH failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to update banner."},{status:500,headers:noStore});}
}
export async function DELETE(req:NextRequest,ctx:Ctx){
  try{
    const {id}=await ctx.params;const current=await db.banner.findUnique({where:{id}});
    if(!current)return NextResponse.json({error:"Banner not found."},{status:404,headers:noStore});
    await db.banner.delete({where:{id}});
    await recordAdminAudit(req,{action:"BANNER_DELETED",entity:"banner",entityId:id,metadata:{title:current.title,active:current.active}});
    return NextResponse.json({success:true},{headers:noStore});
  }catch(error){console.error("Admin banner DELETE failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to delete banner."},{status:500,headers:noStore});}
}
