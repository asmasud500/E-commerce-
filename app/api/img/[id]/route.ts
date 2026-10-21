import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readTelegramFile} from "@/lib/telegram/file-storage";

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-z0-9]{10,40}$/.test(id))return NextResponse.json({error:"Not found"},{status:404});
  try{
    const row=await db.imageBlob.findUnique({where:{id}});
    if(!row)return NextResponse.json({error:"Not found"},{status:404});
    // New uploads store only a Telegram reference; legacy rows keep working until migrated.
    if(row.telegramFileId){
      const file=await readTelegramFile(String(row.telegramFileId));
      if(!file)return NextResponse.json({error:"Image not found"},{status:404});
      const path=file.filePath.toLowerCase();
      const mime=path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":"image/jpeg";
      return new Response(file.bytes.buffer.slice(file.bytes.byteOffset,file.bytes.byteOffset+file.bytes.byteLength) as ArrayBuffer,{headers:{
        "Content-Type":mime,
        "Content-Length":String(file.bytes.byteLength),
        "Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options":"nosniff"
      }});
    }
    // Backward compatibility for older Firestore Base64 image documents.
    if(row.data){
      const bytes=new Uint8Array(Buffer.from(String(row.data),"base64"));
      return new Response(bytes,{headers:{
        "Content-Type":String(row.mime||"image/jpeg"),
        "Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options":"nosniff"
      }});
    }
    return NextResponse.json({error:"Not found"},{status:404});
  }catch(error){
    console.error("Image blob retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
