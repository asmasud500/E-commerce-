import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {readAdminSession} from "@/lib/auth/admin";
const next:Record<string,string[]>={PENDING:["CONFIRMED","CANCELLED"],CONFIRMED:["PROCESSING","CANCELLED"],PROCESSING:["SHIPPED"],SHIPPED:["DELIVERED"],DELIVERED:[],CANCELLED:[],REFUNDED:[]};
const inputSchema=z.object({
 status:z.enum(["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"]).optional(),
 courierName:z.string().trim().max(120).optional(),
 trackingNumber:z.string().trim().max(160).optional()
}).strict().refine(v=>v.status!==undefined||v.courierName!==undefined||v.trackingNumber!==undefined,{message:"Provide an order status or tracking details."});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 try{
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
  const parsed=inputSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid order update.",details:parsed.error.flatten()},{status:400});
  const input=parsed.data,actorId=session.staffId||session.email||null;
  const before=await db.order.findUnique({where:{id},select:{status:true,paymentStatus:true,courierName:true,trackingNumber:true}});
  if(!before)return NextResponse.json({error:"Order not found"},{status:404});
  if(input.status&&input.status!==before.status&&!next[before.status]?.includes(input.status))return NextResponse.json({error:`Invalid transition: ${before.status} → ${input.status}`},{status:409});
  if(input.status==="CONFIRMED"&&before.paymentStatus!=="PAID")return NextResponse.json({error:"Payment must be paid before confirmation."},{status:409});
  if((input.courierName!==undefined||input.trackingNumber!==undefined)&&!["PROCESSING","SHIPPED","DELIVERED"].includes(input.status||before.status))return NextResponse.json({error:"Courier and tracking details can be saved after an order enters fulfilment."},{status:409});
  const data:Record<string,unknown>={};
  if(input.status&&input.status!==before.status){data.status=input.status;if(input.status==="SHIPPED")data.shippedAt=new Date();if(input.status==="DELIVERED")data.deliveredAt=new Date();}
  if(input.courierName!==undefined)data.courierName||=input.courierName||null;
  if(input.trackingNumber!==undefined)data.trackingNumber=input.trackingNumber||null;
  const updated=await db.$transaction(async tx=>{
   const order=await tx.order.update({where:{id},data});
   if(input.status&&input.status!==before.status)await tx.auditLog.create({data:{actorId,action:"ORDER_STATUS_CHANGED",entity:"Order",entityId:id,metadata:{from:before.status,to:input.status}}});
   if(input.courierName!==undefined||input.trackingNumber!==undefined)await tx.auditLog.create({data:{actorId,action:"SHIPMENT_TRACKING_UPDATED",entity:"Order",entityId:id,metadata:{courierName:input.courierName??before.courierName,trackingNumber:input.trackingNumber??before.trackingNumber}}});
   if(input.status==="CANCELLED"&&before.paymentStatus==="PENDING"){const rs=await tx.stockReservation.findMany({where:{orderId:id,status:"HELD"}});for(const r of rs)await tx.product.update({where:{id:r.productId},data:{stock:{increment:r.quantity}}});await tx.stockReservation.updateMany({where:{orderId:id,status:"HELD"},data:{status:"RELEASED"}})}
   return order;
  });
  return NextResponse.json(updated);
 }catch(error){console.error("Admin order update failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Order update failed."},{status:400})}
}
