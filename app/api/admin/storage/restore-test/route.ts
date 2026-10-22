import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";
import {verifyStorageRestore,sendStorageAlert} from "@/lib/store/storage-health";
async function authorized(req:NextRequest){const s=await readAdminSession(req.cookies.get("admin_session")?.value||"");return !!s&&canAccessAdminPath(s.role,"/api/admin/storage",req.method);}
export async function POST(req:NextRequest){
 if(!await authorized(req))return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
 try{const result=await verifyStorageRestore(5);if(result.failed)await sendStorageAlert("Storage restore verification failed",JSON.stringify({checked:result.checked,verified:result.verified,failed:result.failed}));return NextResponse.json({ok:result.failed===0,...result},{headers:{"Cache-Control":"private, no-store"}});}
 catch{return NextResponse.json({error:"Backup restore verification failed."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
