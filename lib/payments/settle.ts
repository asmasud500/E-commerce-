import {db} from "@/lib/prisma";import {paymentAdapters} from "@/lib/payments/adapters";import {decryptSecrets} from "@/lib/security/gateway-secrets";import {sendTelegramOrderNotification} from "@/lib/notifications/telegram";
export async function settlePayment(orderNumber:string,payload:Record<string,unknown>){
 const order=await db.order.findUnique({where:{orderNumber},include:{paymentGateway:true}});
 if(!order||!order.paymentGateway)throw new Error("Order not found");
 if(order.paymentStatus==="PAID")return {paid:true,duplicate:true};
 if(order.status!=="PENDING")return {paid:false,duplicate:false};
 const gateway=order.paymentGateway,adapter=paymentAdapters[gateway.type];
 if(!adapter)throw new Error("Adapter unavailable");
 const secrets=gateway.encryptedSecrets?decryptSecrets(gateway.encryptedSecrets):{};
 const config={...((gateway.publicConfig||{}) as Record<string,unknown>),apiBaseUrl:gateway.apiBaseUrl||undefined,qrImageUrl:gateway.qrImageUrl||undefined};
 const verification=await adapter.verify(payload,config,secrets);
 if(!verification.ok)return {paid:false};
 if(verification.amount!==undefined&&Math.abs(verification.amount-Number(order.total))>0.01)throw new Error("Payment amount mismatch");
 const reference=verification.reference||String(payload.reference||"");
 let settled=false;
 await db.$transaction(async tx=>{
  const changed=await tx.order.updateMany({where:{id:order.id,status:"PENDING",paymentStatus:"PENDING"},data:{paymentStatus:"PAID",status:"CONFIRMED",paymentReference:reference||null}});
  if(changed.count!==1)return;
  await tx.paymentTransaction.create({data:{orderId:order.id,gatewayId:gateway.id,reference:reference||null,providerTransactionId:reference||null,amount:order.total,status:"PAID",rawResponse:verification.raw||payload,verifiedAt:new Date()}});
  await tx.stockReservation.updateMany({where:{orderId:order.id,status:"HELD"},data:{status:"CONFIRMED"}});
  settled=true;
 });
 if(!settled)return {paid:false,duplicate:false};
 await sendTelegramOrderNotification("<b>Payment Received</b>\nOrder: <code>"+order.orderNumber+"</code>\nAmount: ৳"+Number(order.total).toLocaleString("en-BD")+"\nGateway: "+gateway.name+"\nReference: <code>"+(reference||"verified")+"</code>");
 return {paid:true,duplicate:false};
}