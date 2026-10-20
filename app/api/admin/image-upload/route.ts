import {NextRequest,NextResponse} from "next/server";
import {parseDataUrl,saveBlobImage} from "@/lib/store/images";
import {recordAdminAudit} from "@/lib/auth/audit";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const image=parseDataUrl(typeof body?.dataUrl==="string"?body.dataUrl:"");
    if(!image)return NextResponse.json({error:"Choose a JPEG, PNG or WebP image."},{status:400});
    const url=await saveBlobImage(image.bytes,image.mime);
    await recordAdminAudit(req,{action:"ADMIN_IMAGE_UPLOADED",entity:"imageBlob",entityId:url.split("/").pop()||"",metadata:{mime:image.mime,bytes:image.bytes.length}});
    return NextResponse.json({url},{status:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Image upload failed."},{status:400});
  }
}
