import {NextResponse} from "next/server";
import {db} from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const today = new Date(now); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate()-6);
  const [orders, products, customers, pending, paid, dailyOrders, lowStock, statuses, transactions] = await Promise.all([
    db.order.count(),
    db.product.count(),
    db.user.count({where:{role:"CUSTOMER"}}),
    db.order.count({where:{status:"PENDING"}}),
    db.order.aggregate({where:{paymentStatus:"PAID"},_sum:{total:true}}),
    db.order.findMany({where:{createdAt:{gte:start}},select:{createdAt:true,total:true,paymentStatus:true,status:true},orderBy:{createdAt:"asc"}}),
    db.product.findMany({where:{stock:{lte:5}},select:{id:true,name:true,sku:true,stock:true,lowStockThreshold:true},orderBy:{stock:"asc"},take:20}),
    db.order.groupBy({by:["status"],_count:{_all:true}}),
    db.paymentTransaction.count()
  ]);
  const days = Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {date:d.toISOString().slice(0,10),orders:0,paidRevenue:0};});
  for (const o of dailyOrders) {const day=days.find(x=>x.date===o.createdAt.toISOString().slice(0,10));if(day){day.orders++;if(o.paymentStatus==="PAID")day.paidRevenue+=Number(o.total);}}
  return NextResponse.json({
    summary:{orders,products,customers,pending,paidRevenue:Number(paid._sum.total||0),transactions},
    daily:days, lowStock,
    statuses:statuses.map(s=>({status:s.status,count:s._count._all}))
  });
}