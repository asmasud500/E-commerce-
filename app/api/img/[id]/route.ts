import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readTelegramFile} from "@/lib/telegram/file-storage";
import {readGoogleDriveImage} from "@/lib/google-drive/file-storage";

const digestHex=async(bytes:Uint8Array)=>{
  const digest=await crypto.subtle.digest("SHA-256",Uint8Array.from(bytes).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const imageResponse=(bytes:Uint8Array,mime:string,source:"telegram"|"drive")=>new Response(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,{headers:{
  "Content-Type":mime.startsWith("image/")?mime:"application/octet-stream",
  "Content-Length":String(bytes.byteLength),
  "Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
  "X-Content-Type-Options":"nosniff",
  "X-Storage-Source":source
}});

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-z0-9]{10,40}$/.test(id))return NextResponse.json({error:"Not found"},{status:404});
  try{
    const row=await db.imageBlob.findUnique({where:{id}});
    if(!row)return NextResponse.json({error:"Not found"},{status:404});
    if(row.telegramFileId){
      let primaryError:unknown=null;
      try{
        const file=await readTelegramFile(String(row.telegramFileId));
        if(file?.bytes?.length){
          if(row.checksum&&await digestHex(file.bytes)!==String(row.checksum))throw new Error("Primary image checksum mismatch.");
          const path=file.filePath.toLowerCase();
          const mime=path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":"image/jpeg";
          return imageResponse(file.bytes,mime,"telegram");
        }
        primaryError=new Error("Primary Telegram image is unavailable.");
      }catch(error){primaryError=error;}
      // Automatic read failover: serve a verified Drive copy without changing or deleting the primary reference.
      if(row.driveFileId){
        try{
          const backup=await readGoogleDriveImage(String(row.driveFileId));
          if(backup?.bytes?.length&&(!row.checksum||await digestHex(backup.bytes)===String(row.checksum))){
            return imageResponse(backup.bytes,backup.mime,"drive");
          }
        }catch(error){console.error("Drive image failover failed:",error instanceof Error?error.message:"Unknown error");}
      }
      if(primaryError instanceof Error&&primaryError.message.includes("checksum mismatch"))return NextResponse.json({error:"Image integrity check failed; backup unavailable or invalid."},{status:502,headers:{"Cache-Control":"no-store"}});
      return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
    }
    if(row.data){
      const bytes=new Uint8Array(Buffer.from(String(row.data),"base64"));
      return imageResponse(bytes,String(row.mime||"image/jpeg"),"telegram");
    }
    return NextResponse.json({error:"Not found"},{status:404});
  }catch(error){
    console.error("Image blob retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
