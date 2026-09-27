import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function POST(req:NextRequest){
 const auth=req.headers.get("authorization"),secret=process.env.CRON_SECRET;
 if(!secret||auth!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const expired=await db.stockReservation.findMany({where:{status:"HELD",expiresAt:{lt:new Date()}}});
 let released=0;
 for(const r of expired){
  await db.$transaction(async tx=>{
   const current=await tx.stockReservation.findUnique({where:{id:r.id}});
   if(!current||current.status!=="HELD")return;
   const order=await tx.order.findUnique({where:{id:r.orderId},select:{status:true,paymentStatus:true}});
   if(!order||order.status!=="PENDING"||order.paymentStatus!=="PENDING")return;
   await tx.product.update({where:{id:r.productId},data:{stock:{increment:r.quantity}}});
   await tx.stockReservation.update({where:{id:r.id},data:{status:"RELEASED"}});
   await tx.order.updateMany({where:{id:r.orderId,status:"PENDING",paymentStatus:"PENDING"},data:{status:"CANCELLED"}});
   released++;
  });
 }
 return NextResponse.json({ok:true,released});
}