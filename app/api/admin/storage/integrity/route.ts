import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {canAccessAdminPath} from "@/lib/auth/permissions";
import {runStorageIntegrityScan,sendStorageAlert} from "@/lib/store/storage-health";
async function authorized(req:NextRequest){const s=await readAdminSession(req.cookies.get("admin_session")?.value||"");return !!s&&canAccessAdminPath(s.role,"/api/admin/storage",req.method);}
export async function POST(req:NextRequest){
 if(!await authorized(req))return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
 try{const body=await req.json().catch(()=>({}));const result=await runStorageIntegrityScan(Number(body?.limit)||25);const issues=result.missingPrimary+result.checksumMismatch+result.missingBackupReference+result.errors;if(issues)await sendStorageAlert("Storage integrity scan found issues",JSON.stringify({scanned:result.scanned,missingPrimary:result.missingPrimary,checksumMismatch:result.checksumMismatch,missingBackupReference:result.missingBackupReference,errors:result.errors}));return NextResponse.json({ok:true,...result},{headers:{"Cache-Control":"private, no-store"}});}
 catch{return NextResponse.json({error:"Storage integrity scan failed."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
