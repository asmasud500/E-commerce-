import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";
import {getStorageOverview,processStorageBackupQueue} from "@/lib/store/storage-operations";

async function authorized(req:NextRequest){
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  return !!session&&canAccessAdminPath(session.role,"/api/admin/storage",req.method);
}

export async function GET(req:NextRequest){
  if(!await authorized(req))return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
  try{return NextResponse.json(await getStorageOverview(),{headers:{"Cache-Control":"private, no-store"}});}
  catch(error){console.error("Storage overview failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Storage monitoring is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});}
}

export async function POST(req:NextRequest){
  if(!await authorized(req))return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
  try{const result=await processStorageBackupQueue(10);return NextResponse.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});}
  catch(error){console.error("Storage queue processing failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to process storage backup queue."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
