import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
const allowed=["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"] as const;
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;try{const {status}=await req.json();if(!allowed.includes(status))return NextResponse.json({error:"Invalid status"},{status:400});
  const before=await db.order.findUnique({where:{id},select:{status:true}});if(!before)return NextResponse.json({error:"Order not found"},{status:404});
  const order=await db.$transaction(async tx=>{const updated=await tx.order.update({where:{id},data:{status}});await tx.auditLog.create({data:{action:"ORDER_STATUS_CHANGED",entity:"Order",entityId:id,metadata:{from:before.status,to:status}}});return updated});
  return NextResponse.json(order);
 }catch{return NextResponse.json({error:"Order update failed"},{status:400})}
}
