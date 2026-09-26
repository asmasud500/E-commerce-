import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {paymentAdapters} from "@/lib/payments/adapters";
import {decryptSecrets} from "@/lib/security/gateway-secrets";
import {sendTelegramOrderNotification} from "@/lib/notifications/telegram";
export async function POST(req:NextRequest){
 try{const payload=await req.json();const orderId=String(payload.orderId||payload.order_id||"");if(!orderId)return NextResponse.json({error:"Missing order reference"},{status:400});
  const order=await db.order.findUnique({where:{id:orderId},include:{paymentGateway:true}});if(!order||!order.paymentGateway)return NextResponse.json({error:"Order not found"},{status:404});
  const gateway=order.paymentGateway,adapter=paymentAdapters[gateway.type];if(!adapter)return NextResponse.json({error:"Adapter unavailable"},{status:400});
  const secrets=gateway.encryptedSecrets?decryptSecrets(gateway.encryptedSecrets):{};const verification=await adapter.verify(payload,(gateway.publicConfig||{}) as Record<string,unknown>,secrets);const reference=verification.reference||String(payload.reference||payload.transactionId||"");
  if(!verification.ok)return NextResponse.json({ok:true,paid:false});
  const existing=reference?await db.paymentTransaction.findFirst({where:{gatewayId:gateway.id,providerTransactionId:reference}}):null;if(existing)return NextResponse.json({ok:true,paid:true,duplicate:true});
  if(Number(order.total)!==Number(payload.amount||order.total))return NextResponse.json({error:"Payment amount mismatch"},{status:400});
  await db.$transaction(async tx=>{
   await tx.paymentTransaction.create({data:{orderId:order.id,gatewayId:gateway.id,reference:reference||null,providerTransactionId:reference||null,amount:order.total,status:"PAID",rawResponse:payload,verifiedAt:new Date()}});
   await tx.order.update({where:{id:order.id},data:{paymentStatus:"PAID",status:"CONFIRMED",paymentReference:reference||null}});
   await tx.stockReservation.updateMany({where:{orderId:order.id,status:"HELD"},data:{status:"CONFIRMED"}});
  });
  await sendTelegramOrderNotification(`<b>Payment Received</b>\nOrder: <code>${order.orderNumber}</code>\nAmount: ৳${Number(order.total).toLocaleString("en-BD")}\nGateway: ${gateway.name}\nReference: <code>${reference||"verified"}</code>`);
  return NextResponse.json({ok:true,paid:true});
 }catch{return NextResponse.json({error:"Webhook processing failed"},{status:400})}
}
