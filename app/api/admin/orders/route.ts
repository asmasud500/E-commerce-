import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function GET(){
 const orders=await db.order.findMany({
  include:{items:true,paymentGateway:{select:{id:true,name:true,type:true,mode:true,enabled:true}}},
  orderBy:{createdAt:"desc"},take:100
 });
 return NextResponse.json(orders.map(o=>({...o,
  total:Number(o.total),subtotal:Number(o.subtotal),shippingFee:Number(o.shippingFee),discount:Number(o.discount),
  items:o.items.map(i=>({...i,unitPrice:Number(i.unitPrice),lineTotal:Number(i.lineTotal)})),
  gateway:o.paymentGateway?.name||null
 })));
}