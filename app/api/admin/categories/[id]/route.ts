import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;try{const b=await req.json();return NextResponse.json(await db.category.update({where:{id},data:{name:String(b.name).trim(),slug:String(b.slug||b.name).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}}))}catch{return NextResponse.json({error:"Category update failed"},{status:400})}}
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;try{await db.category.delete({where:{id}});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Category delete failed; move products first"},{status:400})}}
