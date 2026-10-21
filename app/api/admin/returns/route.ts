import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";

export async function GET(req:NextRequest){
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
  try{return NextResponse.json(await db.returnRequest.findMany({orderBy:{createdAt:"desc"},take:200}))}
  catch(e){console.error("Admin returns GET failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Unable to load returns."},{status:500})}
}
