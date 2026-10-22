import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";
import {checkStorageProviders,sendStorageAlert} from "@/lib/store/storage-health";
async function authorized(req:NextRequest){const s=await readAdminSession(req.cookies.get("admin_session")?.value||"");return !!s&&canAccessAdminPath(s.role,"/api/admin/storage",req.method);}
export async function GET(req:NextRequest){
 if(!await authorized(req))return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
 try{const result=await checkStorageProviders();const bad=result.providers.filter(p=>p.status!=="HEALTHY");if(bad.length)await sendStorageAlert("Storage provider degraded",bad.map(p=>p.name+": "+("error"in p?p.error:"probe failed")).join("\n"));return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});}
 catch{ return NextResponse.json({error:"Unable to check storage providers."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
