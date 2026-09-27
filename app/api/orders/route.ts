import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {z} from "zod";
const orderSchema=z.object({customerName:z.string().min(2),customerPhone:z.string().min(8),customerEmail:z.string().email().optional().or(z.literal("")),shippingAddress:z.string().min(5),paymentGatewayId:z.string().min(1),items:z.array(z.object({productId:z.string(),quantity:z.coerce.number().int().positive()})).min(1)});
export async function POST(request:NextRequest){
 try{const input=orderSchema.parse(await request.json());const gateway=await db.paymentGateway.findFirst({where:{id:input.paymentGatewayId,enabled:true}});
  if(!gateway)return NextResponse.json({error:"Selected payment gateway is unavailable."},{status:400});
  const ids=input.items.map(i=>i.productId),products=await db.product.findMany({where:{id:{in:ids},published:true}});if(products.length!==ids.length)return NextResponse.json({error:"One or more products are unavailable."},{status:400});
  const byId=new Map(products.map(p=>[p.id,p]));let subtotal=0;const orderItems:{productId:string;name:string;unitPrice:number;quantity:number;lineTotal:number}[]=[];const reservations:{orderId:string;productId:string;quantity:number;expiresAt:Date}[]=[];for(const item of input.items){const p=byId.get(item.productId)!;if(p.stock<item.quantity)return NextResponse.json({error:`Insufficient stock for ${p.name}`},{status:400});const unitPrice=Number(p.price),lineTotal=unitPrice*item.quantity;subtotal+=lineTotal;orderItems.push({productId:p.id,name:p.name,unitPrice,quantity:item.quantity,lineTotal});}
  const shippingFee=subtotal>=3000?0:120,total=subtotal+shippingFee,orderNumber="ORD-"+Date.now().toString(36).toUpperCase(),expiresAt=new Date(Date.now()+30*60*1000);
  const order=await db.$transaction(async tx=>{for(const item of input.items){const held=await tx.product.updateMany({where:{id:item.productId,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});if(held.count!==1)throw new Error("Stock changed during checkout");}
   const created=await tx.order.create({data:{orderNumber,customerName:input.customerName,customerPhone:input.customerPhone,customerEmail:input.customerEmail||null,shippingAddress:input.shippingAddress,subtotal,shippingFee,total,paymentGatewayId:gateway.id,items:{create:orderItems}}});
   for(const item of input.items)reservations.push({orderId:created.id,productId:item.productId,quantity:item.quantity,expiresAt});
   await tx.stockReservation.createMany({data:reservations});return created;
  });
  return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,total:Number(order.total),gateway:{id:gateway.id,type:gateway.type,mode:gateway.mode},reservationExpiresAt:expiresAt},{status:201});
 }catch{return NextResponse.json({error:"Unable to create order. Please check your information and try again."},{status:400})}
}
