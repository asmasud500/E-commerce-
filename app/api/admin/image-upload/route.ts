import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {parseDataUrl,saveBlobImage} from "@/lib/store/images";
import {recordAdminAudit} from "@/lib/auth/audit";

export async function POST(req:NextRequest){
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
  try{
    const body=await req.json();
    const image=parseDataUrl(typeof body?.dataUrl==="string"?body.dataUrl:"");
    if(!image)return NextResponse.json({error:"Choose a JPEG, PNG or WebP image."},{status:400});
    const url=await saveBlobImage(image.bytes,image.mime);
    await recordAdminAudit(req,{action:"ADMIN_IMAGE_UPLOADED",entity:"imageBlob",entityId:url.split("/").pop()||"",metadata:{mime:image.mime,bytes:image.bytes.length}});
    return NextResponse.json({url},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Image upload failed."},{status:400});
  }
}
