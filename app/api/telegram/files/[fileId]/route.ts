import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readTelegramFile} from "@/lib/telegram/file-storage";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";

const mimeFor=(path:string)=>{
  const ext=path.toLowerCase().split(".").pop();
  if(ext==="png")return "image/png";
  if(ext==="webp")return "image/webp";
  if(ext==="gif")return "image/gif";
  return "image/jpeg";
};

export async function GET(req:NextRequest,{params}:{params:Promise<{fileId:string}>}){
  const {fileId}=await params;
  if(!fileId||fileId.length>512||!/^[A-Za-z0-9_-]+$/.test(fileId))return NextResponse.json({error:"Image not found."},{status:404});
  try{
    // Product imagery is public only while attached to a published product.
    const imageUrls=["/api/telegram/files/"+fileId,"/api/telegram/files/"+encodeURIComponent(fileId)];
    const publicImage=await db.productImage.findFirst({
      where:{url:{in:imageUrls},product:{is:{published:true}}},
      select:{id:true}
    });
    const isPublicProductImage=!!publicImage;
    if(!isPublicProductImage){
      const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
      if(!session||!canAccessAdminPath(session.role,"/api/admin/orders/private-file/payment-proof","GET")){
        return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
      }
    }
    const file=await readTelegramFile(fileId);
    if(!file)return NextResponse.json({error:"Image not found."},{status:404});
    const mime=mimeFor(file.filePath);
    if(!mime.startsWith("image/"))return NextResponse.json({error:"Unsupported image file."},{status:415});
    return new Response(file.bytes.buffer.slice(file.bytes.byteOffset,file.bytes.byteOffset+file.bytes.byteLength) as ArrayBuffer,{headers:{
      "Content-Type":mime,
      "Content-Length":String(file.bytes.byteLength),
      "Cache-Control":isPublicProductImage?"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800":"private, no-store, max-age=0",
      "X-Content-Type-Options":"nosniff"
    }});
  }catch(error){
    console.error("Telegram image retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
