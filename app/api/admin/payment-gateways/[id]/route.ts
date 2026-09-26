import { NextRequest,NextResponse } from "next/server";
import { db } from "@/lib/prisma";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;try{const body=await req.json();const g=await db.paymentGateway.update({where:{id},data:body});return NextResponse.json(g)}catch{return NextResponse.json({error:"Gateway update failed"},{status:400})}}
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;try{await db.paymentGateway.delete({where:{id}});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Gateway delete failed"},{status:400})}}
