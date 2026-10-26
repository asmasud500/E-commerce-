import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {z} from "zod";
import {recordAdminAudit} from "@/lib/auth/audit";

const schema=z.object({
 name:z.string().max(100).nullable().optional(),
 campaignName:z.string().max(120).nullable().optional(),
 campaignDescription:z.string().max(500).nullable().optional(),
 code:z.string().trim().min(2).max(50).transform(v=>v.toUpperCase().replace(/\s+/g,"")),
 type:z.enum(["PERCENT","FIXED"]),
 value:z.coerce.number().positive(),
 minOrder:z.coerce.number().nonnegative().nullable().optional(),
 startsAt:z.string().datetime().nullable().optional(),
 expiresAt:z.string().datetime().nullable().optional(),
 usageLimit:z.coerce.number().int().positive().nullable().optional(),
 perCustomerLimit:z.coerce.number().int().positive().nullable().optional(),
 active:z.boolean().default(true)
}).strict();
export async function GET(){const rows=await db.coupon.findMany({orderBy:{expiresAt:"asc"}});return NextResponse.json(rows.map(x=>({...x,value:Number(x.value),minOrder:x.minOrder==null?null:Number(x.minOrder)})))}
export async function POST(req:NextRequest){try{const b=schema.parse(await req.json());if(b.type==="PERCENT"&&b.value>100)return NextResponse.json({error:"Percent cannot exceed 100."},{status:400});const row=await db.coupon.create({data:{name:b.name||null,campaignName:b.campaignName||null,campaignDescription:b.campaignDescription||null,code:b.code,type:b.type,value:b.value,minOrder:b.minOrder??null,startsAt:b.startsAt?new Date(b.startsAt):null,expiresAt:b.expiresAt?new Date(b.expiresAt):null,usageLimit:b.usageLimit??null,perCustomerLimit:b.perCustomerLimit??null,active:b.active}});await recordAdminAudit(req,{action:"COUPON_CREATED",entity:"coupon",entityId:row.id,metadata:{code:row.code,type:row.type,active:row.active}});return NextResponse.json(row,{status:201})}catch{return NextResponse.json({error:"Invalid coupon or duplicate code."},{status:400})}}
