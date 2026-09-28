import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {z} from "zod";
import {sendNewOrderTelegram} from "@/lib/notifications/telegram-admin";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {getEffectivePrice} from "@/lib/products/pricing";
import {rateLimit} from "@/lib/security/rate-limit";
import {createOrderAccessToken} from "@/lib/auth/order-access";

const schema=z.object({customerName:z.string().trim().min(2).max(100),customerPhone:z.string().trim().min(6).max(30),customerEmail:z.string().email().optional().or(z.literal("")),shippingAddress:z.string().trim().min(5).max(1000),paymentGatewayId:z.string().min(1),couponCode:z.string().trim().max(50).optional(),items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().positive().max(100)})).min(1).max(100)});

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
  const unique=[...new Set(input.items.map(i=>i.productId))];if(unique.length!==input.items.length)return NextResponse.json({error:"Duplicate products are not allowed."},{status:400});
  const gateway=await db.paymentGateway.findFirst({where:{id:input.paymentGatewayId,enabled:true}});if(!gateway)return NextResponse.json({error:"Selected payment gateway is unavailable."},{status:400});
  const products=await db.product.findMany({where:{id:{in:unique},published:true}});if(products.length!==unique.length)return NextResponse.json({error:"One or more products are unavailable."},{status:400});
  const byId=new Map<string, any>(products.map((p:any)=>[p.id,p] as [string, any]));let subtotal=0;const orderItems:Array<{productId:string;name:string;unitPrice:number;quantity:number;lineTotal:number}>=[];
  for(const item of input.items){const p=byId.get(item.productId)!;const unitPrice=getEffectivePrice(p),lineTotal=unitPrice*item.quantity;subtotal+=lineTotal;orderItems.push({productId:p.id,name:p.name,unitPrice,quantity:item.quantity,lineTotal});}
  let discount=0;
  if(input.couponCode){
   const c=await db.coupon.findFirst({where:{code:input.couponCode.toUpperCase(),active:true}});
   if(!c||(c.expiresAt&&c.expiresAt<new Date())||(c.minOrder&&subtotal<Number(c.minOrder)))return NextResponse.json({error:"Invalid or unavailable coupon."},{status:400});
   discount=c.type==="PERCENT"?Math.min(subtotal,subtotal*Number(c.value)/100):c.type==="FIXED"?Math.min(subtotal,Number(c.value)):0;
   if(c.type!=="PERCENT"&&c.type!=="FIXED")return NextResponse.json({error:"Unsupported coupon type."},{status:400});
  }
  const shippingFee=Math.max(0,subtotal-discount)>=3000?0:120,total=Math.max(0,subtotal-discount)+shippingFee;
  const orderNumber="ORD-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomUUID().slice(0,5).toUpperCase(),expiresAt=new Date(Date.now()+30*60*1000);
  const order=await db.$transaction(async tx=>{
   for(const item of input.items){const held=await tx.product.updateMany({where:{id:item.productId,published:true,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});if(held.count!==1)throw new Error("Stock changed during checkout");}
   const created=await tx.order.create({data:{orderNumber,idempotencyKey:idempotencyKey||null,userId:session?.userId||null,customerName:input.customerName,customerPhone:input.customerPhone,customerEmail:input.customerEmail||null,shippingAddress:input.shippingAddress,subtotal,shippingFee,discount,total,paymentGatewayId:gateway.id,items:{create:orderItems}}});
   await tx.stockReservation.createMany({data:input.items.map(i=>({orderId:created.id,productId:i.productId,quantity:i.quantity,expiresAt}))});return created;
  });
  sendNewOrderTelegram(order.id).catch(()=>{});
  return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,total:Number(order.total),discount:Number(order.discount),gateway:{id:gateway.id,type:gateway.type,mode:gateway.mode},reservationExpiresAt:expiresAt,paymentToken:await createOrderAccessToken(order.id)},{status:201});
 }catch{return NextResponse.json({error:"Unable to create order. Please check your information and try again."},{status:400});}
}