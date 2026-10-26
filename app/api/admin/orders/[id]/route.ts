import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/firestore";
import {rejectPendingOrderAtomically,updateOrderAdminFieldsAtomically,confirmCodOrderAtomically,cancelCodOrderAtomically} from "@/lib/firestore";
import {smsOrderStatus} from "@/lib/integrations/sms";
import {readAdminSession} from "@/lib/auth/admin";
const next:Record<string,string[]>={PENDING:["CONFIRMED","CANCELLED"],CONFIRMED:["PROCESSING","CANCELLED"],PROCESSING:["SHIPPED"],SHIPPED:["DELIVERED"],DELIVERED:[],CANCELLED:[],REFUNDED:[]};
const inputSchema=z.object({
 status:z.enum(["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"]).optional(),
 courierName:z.string().trim().max(120).optional(),
 trackingNumber:z.string().trim().max(160).optional()
}).strict().refine(v=>v.status!==undefined||v.courierName!==undefined||v.trackingNumber!==undefined,{message:"Provide an order status or tracking details."});
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
 if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
 const {id}=await params;
 try{
  const order=await db.order.findUnique({
   where:{id},
   include:{
    items:true,
    paymentGateway:{select:{id:true,name:true,type:true,mode:true,enabled:true}},
    transactions:{orderBy:{createdAt:"desc"},include:{gateway:{select:{name:true,type:true}}}}
   }
  });
  if(!order)return NextResponse.json({error:"Order not found."},{status:404});
  return NextResponse.json({
   ...order,total:Number(order.total),subtotal:Number(order.subtotal),shippingFee:Number(order.shippingFee),discount:Number(order.discount),
   items:order.items.map(i=>({...i,unitPrice:Number(i.unitPrice),lineTotal:Number(i.lineTotal)})),
   transactions:order.transactions.map(t=>({...t,amount:Number(t.amount),gatewayName:t.gateway.name,gatewayType:t.gateway.type})),
   gateway:order.paymentGateway?.name||null
  });
 }catch(error){
  console.error("Admin order details failed:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to load order details."},{status:500});
 }
}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 try{
  const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
  if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401});
  const parsed=inputSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid order update.",details:parsed.error.flatten()},{status:400});
  const input=parsed.data,actorId=session.staffId||session.email||null;
  const before=await db.order.findUnique({where:{id},select:{status:true,paymentStatus:true,paymentProvider:true,courierName:true,trackingNumber:true}});
  if(!before)return NextResponse.json({error:"Order not found"},{status:404});
  if(input.status&&input.status!==before.status&&!next[before.status]?.includes(input.status))return NextResponse.json({error:`Invalid transition: ${before.status} → ${input.status}`},{status:409});
  if((before as any).paymentProvider==="COD"&&(input.status==="CONFIRMED"||input.status==="CANCELLED")){
   const r=input.status==="CONFIRMED"?await confirmCodOrderAtomically(id,actorId):await cancelCodOrderAtomically(id,actorId);
   if(!r.ok)return NextResponse.json({error:"Order was already updated. Refresh and try again."},{status:409});
   await smsOrderStatus(id);
   return NextResponse.json(await db.order.findUnique({where:{id}}));
  }
  if(input.status==="CONFIRMED"&&before.paymentStatus!=="PAID")return NextResponse.json({error:"Payment must be paid before confirmation."},{status:409});
  if((input.courierName!==undefined||input.trackingNumber!==undefined)&&!["PROCESSING","SHIPPED","DELIVERED"].includes(input.status||before.status))return NextResponse.json({error:"Courier and tracking details can be saved after an order enters fulfilment."},{status:409});
  if(input.status==="CANCELLED"&&before.paymentStatus==="PENDING"){
   const result=await rejectPendingOrderAtomically(id,"ADMIN_ORDER_CANCELLED");
   if(!result.rejected)return NextResponse.json({error:"Order was already updated. Refresh and try again."},{status:409});
   await smsOrderStatus(id);
   return NextResponse.json(await db.order.findUnique({where:{id}}));
  }
  const result=await updateOrderAdminFieldsAtomically({
   orderId:id,actorId,
   ...(input.status!==undefined?{status:input.status}:{}),
   ...(input.courierName!==undefined?{courierName:input.courierName||null}:{}),
   ...(input.trackingNumber!==undefined?{trackingNumber:input.trackingNumber||null}:{})
  });
  if(!result.updated){
   const status=result.reason==="not_found"?404:409;
   return NextResponse.json({error:result.reason==="payment_not_paid"?"Payment must be paid before confirmation.":"Order state changed or the requested transition is not allowed."},{status});
  }
  if(input.status)await smsOrderStatus(id);
  return NextResponse.json(await db.order.findUnique({where:{id}}));
 }catch(error){console.error("Admin order update failed:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Order update failed."},{status:400})}
}
