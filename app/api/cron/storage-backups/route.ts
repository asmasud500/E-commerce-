import {NextRequest,NextResponse} from "next/server";
import {processStorageBackupQueue} from "@/lib/store/storage-operations";

export async function POST(req:NextRequest){
  const secret=process.env.CRON_SECRET||"";
  const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||req.headers.get("x-cron-secret")||"";
  if(!secret||!supplied||supplied.length!==secret.length||!crypto.subtle){return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});}
  const a=new TextEncoder().encode(secret),b=new TextEncoder().encode(supplied);
  const digestA=await crypto.subtle.digest("SHA-256",Uint8Array.from(a).buffer as ArrayBuffer);
  const digestB=await crypto.subtle.digest("SHA-256",Uint8Array.from(b).buffer as ArrayBuffer);
  const x=new Uint8Array(digestA),y=new Uint8Array(digestB);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  if(diff!==0)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  try{return NextResponse.json({ok:true,...await processStorageBackupQueue(10)},{headers:{"Cache-Control":"no-store"}});}
  catch(error){console.error("Scheduled storage backup processing failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Backup processing failed."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
