import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-z0-9]{10,40}$/.test(id))return NextResponse.json({error:"Not found"},{status:404});
  try{
    const row=await db.imageBlob.findUnique({where:{id}});
    if(!row?.data)return NextResponse.json({error:"Not found"},{status:404});
    const bytes=new Uint8Array(Buffer.from(String(row.data),"base64"));
    return new Response(bytes,{headers:{"Content-Type":String(row.mime||"image/jpeg"),"Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"}});
  }catch{return NextResponse.json({error:"Not found"},{status:404})}
}
