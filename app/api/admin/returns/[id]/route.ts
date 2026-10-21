import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {recordRefundAtomically} from "@/lib/firestore";
import {readAdminSession} from "@/lib/auth/admin";
import {recordAdminAudit} from "@/lib/auth/audit";
const schema=z.object({status:z.enum(["APPROVED","REJECTED","RECEIVED","REFUNDED"]),adminNote:z.string().trim().max(500).optional(),refundReference:z.string().trim().min(2).max(100).optional()}).strict();
const flow:Record<string,string[]>={REQUESTED:["APPROVED","REJECTED"],APPROVED:["RECEIVED","REJECTED"],RECEIVED:["REFUNDED"],REJECTED:[],REFUNDED:[]};
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
    if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
    const {id}=await params;
    const p=schema.safeParse(await req.json().catch(()=>null));
    if(!p.success)return NextResponse.json({error:"Invalid update.",details:p.error.flatten()},{status:400});
    if(p.data.status==="REFUNDED"&&!["SUPER_ADMIN","MANAGER"].includes(session.role))return NextResponse.json({error:"Only a manager or super admin can record refunds."},{status:403});
    const r:any=await db.returnRequest.findUnique({where:{id}});
    if(!r)return NextResponse.json({error:"Return request not found."},{status:404});
    if(!flow[r.status]?.includes(p.data.status))return NextResponse.json({error:"Cannot change "+r.status+" → "+p.data.status},{status:409});
    let refundMethod:string|undefined;
    if(p.data.status==="REFUNDED"){
      if(!p.data.refundReference)return NextResponse.json({error:"A completed refund reference is required."},{status:400});
      const order:any=await db.order.findUnique({where:{id:r.orderId}});
      if(!order)return NextResponse.json({error:"The order linked to this return request was not found."},{status:404});
      if(order.status!=="DELIVERED"&&order.status!=="REFUNDED")return NextResponse.json({error:"Only delivered orders can be refunded through returns."},{status:409});
      if(order.paymentStatus==="REFUNDED"&&order.refundReference===p.data.refundReference&&order.paymentGatewayId){
        // Idempotent retry if the payment refund committed but the return record update failed.
        refundMethod="PAYMENT_GATEWAY";
      }else if(order.paymentStatus==="PAID"&&order.paymentGatewayId){
        const result=await recordRefundAtomically({orderId:r.orderId,gatewayId:order.paymentGatewayId,reference:p.data.refundReference,reason:"Customer return: "+String(r.reason||"Return request")});
        if(!result.refunded)return NextResponse.json({error:result.reason==="duplicate_reference"?"This refund reference has already been processed.":"Order payment state changed. Refresh the order and verify the refund."},{status:409});
        refundMethod="PAYMENT_GATEWAY";
      }else if(String(order.paymentProvider||"").toUpperCase()==="COD"){
        // COD refunds are paid outside the gateway; require the actual completed transfer reference.
        if(order.paymentStatus==="REFUNDED"&&order.refundReference&&order.refundReference!==p.data.refundReference)return NextResponse.json({error:"This order already has a different refund reference."},{status:409});
        refundMethod="MANUAL_COD";
      }else{
        return NextResponse.json({error:"This order has no refundable paid transaction. Verify its payment method and status first."},{status:409});
      }
    }
    const row=await db.returnRequest.update({where:{id},data:{status:p.data.status,adminNote:p.data.adminNote||r.adminNote||null,updatedAt:new Date(),...(p.data.status==="REFUNDED"?{refundReference:p.data.refundReference,refundMethod}: {})}});
    await recordAdminAudit(req,{action:"RETURN_"+p.data.status,entity:"returnRequest",entityId:id,metadata:{orderNumber:r.orderNumber,refundReference:p.data.status==="REFUNDED"?p.data.refundReference:undefined,refundMethod}});
    return NextResponse.json(row);
  }catch(e){console.error("Admin return PATCH failed:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Update failed."},{status:500})}
}
