import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";
import {recordAdminAudit} from "@/lib/auth/audit";
import {parseDataUrl,saveProductImage} from "@/lib/store/images";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
  const {id}=await params;
  try{
    const b=await req.json();
    const img=parseDataUrl(typeof b?.dataUrl==="string"?b.dataUrl:"");
    if(!img)return NextResponse.json({error:"Please choose a JPEG, PNG or WebP image."},{status:400});
    const product=await db.product.findUnique({where:{id}});
    if(!product)return NextResponse.json({error:"Product not found."},{status:404});
    const row=await saveProductImage(id,img.bytes,img.mime,typeof b?.alt==="string"?b.alt.slice(0,200):null);
    await recordAdminAudit(req,{action:"PRODUCT_IMAGE_UPLOADED",entity:"Product",entityId:id,metadata:{imageId:row.id}});
    return NextResponse.json(row,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Upload failed."},{status:400})}
}
