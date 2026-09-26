import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {paymentAdapters} from "@/lib/payments/adapters";

export async function POST(req:NextRequest){
 try{
  const {orderId}=await req.json();
  const order=await db.order.findUnique({where:{id:orderId},include:{paymentGateway:true}});
  if(!order||!order.paymentGateway)return NextResponse.json({error:"Order or payment gateway not found."},{status:404});
  if(order.paymentStatus==="PAID")return NextResponse.json({error:"Order is already paid."},{status:409});
  const adapter=paymentAdapters[order.paymentGateway.type];
  if(!adapter)return NextResponse.json({error:"Payment adapter unavailable."},{status:400});
  const result=await adapter.init({
   orderId:order.id,orderNumber:order.orderNumber,amount:Number(order.total),
   customerName:order.customerName,customerPhone:order.customerPhone,customerEmail:order.customerEmail||undefined,
   callbackBaseUrl:new URL("/",req.url).origin
  },(order.paymentGateway.publicConfig||{}) as Record<string,unknown>,{});
  return NextResponse.json(result,result.ok?{status:200}:{status:400});
 }catch{return NextResponse.json({error:"Payment initiation failed."},{status:400})}
}
