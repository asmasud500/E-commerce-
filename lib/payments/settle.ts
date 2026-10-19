import {db} from "@/lib/prisma";import {confirmPaymentAtomically} from "@/lib/firestore";import {paymentAdapters} from "@/lib/payments/adapters";import {decryptSecrets} from "@/lib/security/gateway-secrets";import {sendTelegramOrderNotification} from "@/lib/notifications/telegram";
export async function settlePayment(orderNumber:string,payload:Record<string,unknown>){
 const order=await db.order.findUnique({where:{orderNumber},include:{paymentGateway:true}});
 if(!order||!order.paymentGateway)throw new Error("Order not found");
 if(order.paymentStatus==="PAID")return {paid:true,duplicate:true};
 if(order.status!=="PENDING")return {paid:false,duplicate:false};
 const gateway=order.paymentGateway,adapter=paymentAdapters[gateway.type];if(!adapter)throw new Error("Adapter unavailable");
 const secrets=gateway.encryptedSecrets?decryptSecrets(gateway.encryptedSecrets):{};
 const config={...((gateway.publicConfig||{}) as Record<string,unknown>),apiBaseUrl:gateway.apiBaseUrl||undefined,qrImageUrl:gateway.qrImageUrl||undefined};
 const verification=await adapter.verify(payload,config,secrets);if(!verification.ok)return {paid:false};
 const verifiedAmount=Number(verification.amount);if(!Number.isFinite(verifiedAmount)||Math.abs(verifiedAmount-Number(order.total))>0.01)throw new Error("Payment amount missing or mismatch");
 const reference=verification.reference||String(payload.reference||"");if(gateway.type==="SSLCOMMERZ"&&reference!==order.orderNumber)throw new Error("Verified transaction reference mismatch");const providerId=verification.providerTransactionId||String(payload.providerTransactionId||payload.tran_id||"");
 if(!providerId)throw new Error("Verified provider transaction ID is missing");
 const result=await confirmPaymentAtomically({
  orderId:order.id,gatewayId:gateway.id,providerTransactionId:providerId,
  reference:reference||null,amount:verifiedAmount,rawResponse:(verification.raw||payload) as Record<string,unknown>
 });
 if(!result.confirmed)return {paid:result.reason==="duplicate",duplicate:result.reason==="duplicate"};
 await sendTelegramOrderNotification("<b>Payment Received</b>\nOrder: <code>"+order.orderNumber+"</code>\nAmount: ৳"+Number(order.total).toLocaleString("en-BD")+"\nGateway: "+gateway.name+"\nReference: <code>"+(reference||"verified")+"</code>");
 return {paid:true,duplicate:false};
}