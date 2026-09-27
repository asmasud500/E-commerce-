import {NextRequest,NextResponse} from "next/server";import {db} from "@/lib/prisma";import {z} from "zod";
const input=z.object({name:z.string().trim().min(1).max(100),slug:z.string().trim().max(100).optional()});const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export async function GET(){return NextResponse.json(await db.category.findMany({include:{_count:{select:{products:true}}},orderBy:{name:"asc"}}))}
export async function POST(req:NextRequest){try{const b=input.parse(await req.json());return NextResponse.json(await db.category.create({data:{name:b.name,slug:slugify(b.slug||b.name)}}),{status:201})}catch{return NextResponse.json({error:"Invalid category or duplicate slug"},{status:400})}}
