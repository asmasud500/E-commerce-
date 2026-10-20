import {NextRequest,NextResponse} from "next/server";
import {readTelegramFile} from "@/lib/telegram/file-storage";

const mimeFor=(path:string)=>{
  const ext=path.toLowerCase().split(".").pop();
  if(ext==="png")return "image/png";
  if(ext==="webp")return "image/webp";
  if(ext==="gif")return "image/gif";
  return "image/jpeg";
};

export async function GET(_:NextRequest,{params}:{params:Promise<{fileId:string}>}){
  const {fileId}=await params;
  try{
    const file=await readTelegramFile(fileId);
    if(!file)return NextResponse.json({error:"Image not found."},{status:404});
    const mime=mimeFor(file.filePath);
    if(!mime.startsWith("image/"))return NextResponse.json({error:"Unsupported image file."},{status:415});
    return new Response(file.bytes.buffer.slice(file.bytes.byteOffset,file.bytes.byteOffset+file.bytes.byteLength) as ArrayBuffer,{headers:{
      "Content-Type":mime,
      "Content-Length":String(file.bytes.byteLength),
      "Cache-Control":"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options":"nosniff"
    }});
  }catch(error){
    console.error("Telegram image retrieval failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Image storage is temporarily unavailable."},{status:503});
  }
}
