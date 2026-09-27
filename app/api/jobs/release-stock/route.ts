import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
export async function POST(req:NextRequest){
 const auth=req.headers.get("authorization"),secret=process.env.CRON_SECRET;
 if(!secret||auth!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const expired=await db.stockReservation.findMany({where:{status:"HELD",expiresAt:{lt:new Date()}},select:{id:true,orderId:true}});
 const orderIds=[...new Set(expired.map(r=>r.orderId))];let released=0;
 for(const orderId of orderIds){
  await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id:orderId},select:{status:true,paymentStatus:true}});
   if(!order||order.status!=="PENDING"||order.paymentStatus!=="PENDING")return;
   const rs=await tx.stockReservation.findMany({where:{orderId,status:"HELD",expiresAt:{lt:new Date()}}});
   for(const r of rs){
    const changed=await tx.stockReservation.updateMany({where:{id:r.id,status:"HELD"},data:{status:"RELEASED"}});
    if(changed.count!==1)continue;
    await tx.product.update({where:{id:r.productId},data:{stock:{increment:r.quantity}}});released++;
   }
   await tx.order.updateMany({where:{id:orderId,status:"PENDING",paymentStatus:"PENDING"},data:{status:"CANCELLED"}});
  });
 }
 return NextResponse.json({ok:true,released,orders:orderIds.length});
}