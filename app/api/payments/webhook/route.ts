import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {paymentAdapters} from "@/lib/payments/adapters";
import {sendTelegramOrderNotification} from "@/lib/notifications/telegram";

export async function POST(req:NextRequest){
 try{
  const payload=await req.json();const orderId=String(payload.orderId||payload.order_id||"");
  if(!orderId)return NextResponse.json({error:"Missing order reference"},{status:400});
  const order=await db.order.findUnique({where:{id:orderId},include:{paymentGateway:true}});
  if(!order||!order.paymentGateway)return NextResponse.json({error:"Order not found"},{status:404});
  const adapter=paymentAdapters[order.paymentGateway.type];if(!adapter)return NextResponse.json({error:"Adapter unavailable"},{status:400});
  const verification=await adapter.verify(payload,(order.paymentGateway.publicConfig||{}) as Record<string,unknown>,{});
  const reference=verification.reference||String(payload.reference||payload.transactionId||"");
  const transaction=await db.paymentTransaction.create({data:{orderId:order.id,gatewayId:order.paymentGateway.id,reference:reference||null,providerTransactionId:reference||null,amount:order.total,status:verification.ok?"PAID":"FAILED",rawResponse:payload,verifiedAt:verification.ok?new Date():null}});
  if(verification.ok && order.paymentStatus!=="PAID"){
   await db.order.update({where:{id:order.id},data:{paymentStatus:"PAID",status:"CONFIRMED",paymentReference:reference||null}});
   await sendTelegramOrderNotification(`<b>Payment Received</b>\nOrder: <code>${order.orderNumber}</code>\nAmount: ৳${Number(order.total).toLocaleString("en-BD")}\nGateway: ${order.paymentGateway.name}\nReference: <code>${reference||transaction.id}</code>`);
  }
  return NextResponse.json({ok:true,paid:verification.ok});
 }catch{return NextResponse.json({error:"Webhook processing failed"},{status:400})}
}