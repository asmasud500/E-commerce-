import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {paymentAdapters} from "@/lib/payments/adapters";
import {decryptSecrets} from "@/lib/security/gateway-secrets";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {rateLimit} from "@/lib/security/rate-limit";
import {verifyOrderAccessToken} from "@/lib/auth/order-access";

export async function POST(req:NextRequest){
 try{
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
  const rl=rateLimit("payment:"+ip,15,60_000);if(!rl.ok)return NextResponse.json({error:"Too many payment attempts. Try again later."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
  const body=await req.json();const orderId=typeof body?.orderId==="string"?body.orderId:"";const accessToken=typeof body?.accessToken==="string"?body.accessToken:"";if(!orderId)return NextResponse.json({error:"Order ID is required."},{status:400});
  const token=req.cookies.get("customer_session")?.value;const session=token?await verifyCustomerToken(token):null;
  const order=await db.order.findUnique({where:{id:orderId},include:{paymentGateway:true}});
  if(!order||!order.paymentGateway)return NextResponse.json({error:"Order or payment gateway not found."},{status:404});
  if(order.userId && (!session||session.userId!==order.userId))return NextResponse.json({error:"You do not have access to this order."},{status:403});
  if(!order.userId && !session && !(await verifyOrderAccessToken(order.id,accessToken)))return NextResponse.json({error:"Invalid order payment access."},{status:403});
  if(order.status==="CANCELLED"||order.status==="REFUNDED")return NextResponse.json({error:"This order cannot accept payment."},{status:409});
  if(order.paymentStatus==="PAID")return NextResponse.json({error:"Order is already paid."},{status:409});
  const gateway=order.paymentGateway;if(!gateway.enabled)return NextResponse.json({error:"Payment gateway is no longer available."},{status:409});
  const adapter=paymentAdapters[gateway.type];if(!adapter)return NextResponse.json({error:"Payment adapter unavailable."},{status:400});
  const secrets=gateway.encryptedSecrets?decryptSecrets(gateway.encryptedSecrets):{};
  const config={...((gateway.publicConfig||{}) as Record<string,unknown>),apiBaseUrl:gateway.apiBaseUrl||undefined,qrImageUrl:gateway.qrImageUrl||undefined,qrMerchantName:gateway.qrMerchantName||undefined};
  const result=await adapter.init({orderId:order.id,orderNumber:order.orderNumber,amount:Number(order.total),customerName:order.customerName,customerPhone:order.customerPhone,customerEmail:order.customerEmail||undefined,callbackBaseUrl:new URL("/",req.url).origin},config,secrets);
  return NextResponse.json(result,result.ok?{status:200}:{status:400});
 }catch{return NextResponse.json({error:"Payment initiation failed."},{status:400});}
}