import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function GET(){
  try{return NextResponse.json(await db.returnRequest.findMany({orderBy:{createdAt:"desc"},take:200}))}
  catch(e){console.error("Admin returns GET failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Unable to load returns."},{status:500})}
}
