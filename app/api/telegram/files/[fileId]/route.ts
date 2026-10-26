import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {readTelegramFile} from "@/lib/telegram/file-storage";
import {readGoogleDriveImage} from "@/lib/google-drive/file-storage";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";

const mimeFor=(path:string)=>{
  const ext=path.toLowerCase().split(".").pop();
  if(ext==="png")return "image/png";
  if(ext==="webp")return "image/webp";
  if(ext==="gif")return "image/gif";
  return "image/jpeg";
};
async function checksumMatches(bytes:Uint8Array,expected:unknown){
  if(!expected)return true;
  const digest=await crypto.subtle.digest("SHA-256",Uint8Array.from(bytes).buffer as ArrayBuffer);
  const actual=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return actual===String(expected);
}
function imageResponse(bytes:Uint8Array,mime:string,isPublic:boolean,source:"telegram"|"google-drive"){
  return new Response(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,{headers:{
    "Content-Type":mime,
    "Content-Length":String(bytes.byteLength),
    "Cache-Control":isPublic?"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000":"private, no-store, max-age=0",
    "X-Content-Type-Options":"nosniff",
    "X-Image-Storage-Source":source
  }});
}

export async function GET(req:NextRequest,{params}:{params:Promise<{fileId:string}>}){
  const {fileId}=await params;
  if(!fileId||fileId.length>512||!/^[A-Za-z0-9_-]+$/.test(fileId))return NextResponse.json({error:"Image not found."},{status:404});
  try{
    // Product imagery is public only while attached to a published product.
    const imageUrls=["/api/telegram/files/"+fileId,"/api/telegram/files/"+encodeURIComponent(fileId)];
    const publicImage=await db.productImage.findFirst({
      where:{url:{in:imageUrls},product:{is:{published:true}}},
      select:{id:true,checksum:true,driveFileId:true,mime:true}
    });
    const isPublicProductImage=!!publicImage;
    if(!isPublicProductImage){
      const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
      if(!session||!canAccessAdminPath(session.role,"/api/admin/orders/private-file/payment-proof","GET")){
        return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
      }
    }

    // Primary source first; if it is missing, slow, or corrupt, try the verified Drive mirror.
    let primaryError:unknown=null;
    try{
      const file=await readTelegramFile(fileId);
      if(file){
        const mime=mimeFor(file.filePath);
        if(!mime.startsWith("image/"))return NextResponse.json({error:"Unsupported image file."},{status:415});
        if(!isPublicProductImage||await checksumMatches(file.bytes,publicImage?.checksum)){
          return imageResponse(file.bytes,mime,isPublicProductImage,"telegram");
        }
        primaryError=new Error("Primary image checksum mismatch.");
      }else{
        primaryError=new Error("Primary Telegram image not found.");
      }
    }catch(error){primaryError=error;}

    if(isPublicProductImage&&publicImage?.driveFileId){
      try{
        const backup=await readGoogleDriveImage(String(publicImage.driveFileId));
        if(backup&&backup.mime.startsWith("image/")&&await checksumMatches(backup.bytes,publicImage.checksum)){
          return imageResponse(backup.bytes,backup.mime,true,"google-drive");
        }
        console.error("Storage failover: Drive backup missing or checksum invalid.",{fileId});
      }catch(error){
        console.error("Storage failover: Google Drive backup unavailable.",error instanceof Error?error.message:String(error));
      }
    }
    console.error("Image retrieval failed for all available sources.",{fileId,primaryError:primaryError instanceof Error?primaryError.message:String(primaryError)});
    return NextResponse.json({error:"Image is temporarily unavailable from all configured storage sources."},{status:503,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Image retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
