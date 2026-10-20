import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordAdminAudit} from "@/lib/auth/audit";
const schema=z.object({status:z.enum(["APPROVED","REJECTED","REFUNDED"]),adminNote:z.string().trim().max(500).optional()}).strict();
const flow:Record<string,string[]>={REQUESTED:["APPROVED","REJECTED"],APPROVED:["REFUNDED","REJECTED"],REJECTED:[],REFUNDED:[]};
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;const p=schema.safeParse(await req.json().catch(()=>null));
    if(!p.success)return NextResponse.json({error:"Invalid update."},{status:400});
    const r:any=await db.returnRequest.findUnique({where:{id}});
    if(!r)return NextResponse.json({error:"Not found."},{status:404});
    if(!flow[r.status]?.includes(p.data.status))return NextResponse.json({error:"Cannot change "+r.status+" → "+p.data.status},{status:409});
    const row=await db.returnRequest.update({where:{id},data:{status:p.data.status,adminNote:p.data.adminNote||r.adminNote||null,updatedAt:new Date()}});
    await recordAdminAudit(req,{action:"RETURN_"+p.data.status,entity:"returnRequest",entityId:id,metadata:{orderNumber:r.orderNumber}});
    return NextResponse.json(row);
  }catch(e){console.error("Admin return PATCH failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Update failed."},{status:500})}
}
