import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET(){
 const rows=await db.paymentTransaction.findMany({
  include:{order:true,gateway:true},
  orderBy:{createdAt:"desc"},take:100
 });
 return NextResponse.json(rows.map(x=>({
  id:x.id,orderNumber:x.order.orderNumber,gateway:x.gateway.name,
  amount:Number(x.amount),status:x.status,reference:x.reference,
  providerTransactionId:x.providerTransactionId,verifiedAt:x.verifiedAt,createdAt:x.createdAt
 })));
}
