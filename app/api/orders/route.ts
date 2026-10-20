import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {createOrderWithStockReservation} from "@/lib/firestore";
import {z} from "zod";
import {sendNewOrderTelegram,notifyLowStock} from "@/lib/notifications/telegram-admin";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {buildQuote,QuoteError} from "@/lib/checkout";
import {rateLimit} from "@/lib/security/rate-limit";
import {normalizePhone} from "@/lib/tracking";
import {COD_PROVIDER,COD_RESERVATION_EXPIRY} from "@/lib/firestore";
import {createOrderAccessToken} from "@/lib/auth/order-access";

const schema=z.object({customerName:z.string().trim().min(2).max(100),customerPhone:z.string().trim().min(6).max(30),customerEmail:z.string().email().optional().or(z.literal("")),shippingAddress:z.string().trim().min(5).max(1000),shippingDistrict:z.string().trim().min(2).max(100),shippingDivision:z.string().trim().max(80).optional().default(""),shippingUpazila:z.string().trim().max(100).optional().default(""),shippingPostalCode:z.string().trim().max(20).optional().default(""),shippingLocationDescription:z.string().trim().max(500).optional().default(""),shippingLatitude:z.coerce.number().min(-90).max(90).nullable().optional(),shippingLongitude:z.coerce.number().min(-180).max(180).nullable().optional(),paymentGatewayId:z.string().min(1),couponCode:z.string().trim().max(50).optional(),items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().positive().max(100),options:z.record(z.string().max(40),z.string().max(40)).optional()})).min(1).max(100)});

export async function POST(req:NextRequest){
 try{
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
  const rl=rateLimit("order:"+ip,10,60_000);if(!rl.ok)return NextResponse.json({error:"Too many order attempts. Try again later."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
  const input=schema.parse(await req.json());
  const idempotencyKey=req.headers.get("idempotency-key")?.trim();
  if(idempotencyKey&&!/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey))return NextResponse.json({error:"Invalid idempotency key."},{status:400});
  const sessionToken=req.cookies.get("customer_session")?.value;const session=sessionToken?await verifyCustomerToken(sessionToken):null;
  if(idempotencyKey){
   const existing=await db.order.findUnique({where:{idempotencyKey},include:{reservations:true}});
   if(existing){
    if((existing.userId||null)!==(session?.userId||null))return NextResponse.json({error:"Idempotency key is already in use."},{status:409});
    const expiry=existing.reservations.filter(r=>r.status==="HELD").reduce((min,r)=>r.expiresAt<min?r.expiresAt:min,new Date(8640000000000000));
    return NextResponse.json({orderId:existing.id,orderNumber:existing.orderNumber,total:Number(existing.total),discount:Number(existing.discount),reservationExpiresAt:expiry.toISOString(),paymentToken:await createOrderAccessToken(existing.id),replayed:true},{status:200});
   }
  }
  const uniqueSelections=input.items.map(i=>i.productId+"|"+Object.entries(i.options||{}).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("|"));if(new Set(uniqueSelections).size!==uniqueSelections.length)return NextResponse.json({error:"Duplicate product variants are not allowed."},{status:400});
  const gateway=await db.paymentGateway.findFirst({where:{id:input.paymentGatewayId,enabled:true}});if(!gateway)return NextResponse.json({error:"Selected payment gateway is unavailable."},{status:400});
  const quote=await buildQuote({items:input.items,couponCode:input.couponCode,shippingDivision:input.shippingDivision,shippingDistrict:input.shippingDistrict,shippingUpazila:input.shippingUpazila},{strictCoupon:true});
  const {subtotal,discount,shipping:shippingFee,taxAmount,total}=quote;
  const orderItems=quote.lines.map(l=>({productId:l.productId,name:l.name,unitPrice:l.unitPrice,quantity:l.quantity,lineTotal:l.lineTotal,options:l.options||{},variantId:l.variantId||null}));
  const orderNumber="ORD-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomUUID().slice(0,5).toUpperCase(),expiresAt=new Date(Date.now()+30*60*1000);
  const isCod=(gateway as any).publicConfig?.cod===true;
  const order=await createOrderWithStockReservation({
   orderData:{orderNumber,idempotencyKey:idempotencyKey||null,userId:session?.userId||null,customerName:input.customerName,customerPhone:input.customerPhone,customerEmail:input.customerEmail||null,shippingAddress:input.shippingAddress,shippingDistrict:input.shippingDistrict,shippingDivision:input.shippingDivision,shippingUpazila:input.shippingUpazila,shippingPostalCode:input.shippingPostalCode,shippingLocationDescription:input.shippingLocationDescription,shippingLatitude:input.shippingLatitude??null,shippingLongitude:input.shippingLongitude??null,subtotal,shippingFee,taxAmount,discount,total,couponCode:quote.couponCode||null,paymentGatewayId:gateway.id,...(isCod?{paymentProvider:COD_PROVIDER}:{})},
   items:orderItems,
   expiresAt:isCod?COD_RESERVATION_EXPIRY:expiresAt
  });
  sendNewOrderTelegram(order.id).catch(()=>{});
  db.abandonedCart.update({where:{id:"c"+normalizePhone(input.customerPhone)},data:{recovered:true}}).catch(()=>{});
  notifyLowStock(input.items.map(i=>i.productId)).catch(()=>{});
  return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,total:Number(order.total),discount:Number(order.discount),shippingFee,taxAmount,gateway:{id:gateway.id,type:gateway.type,mode:gateway.mode},reservationExpiresAt:expiresAt,cod:isCod,paymentToken:await createOrderAccessToken(order.id)},{status:201});
 }catch(error){if(error instanceof QuoteError)return NextResponse.json({error:error.message},{status:error.status});console.error("Order creation error:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Unable to create order. Please check your information and try again."},{status:400});}
}