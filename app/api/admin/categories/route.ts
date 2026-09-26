import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function GET(){return NextResponse.json(await db.category.findMany({include:{_count:{select:{products:true}}},orderBy:{name:"asc"}}))}
export async function POST(req:NextRequest){try{const b=await req.json();const name=String(b.name||"").trim();if(!name)return NextResponse.json({error:"Name is required"},{status:400});const slug=(String(b.slug||name).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));return NextResponse.json(await db.category.create({data:{name,slug}}),{status:201})}catch{return NextResponse.json({error:"Category creation failed"},{status:400})}}
