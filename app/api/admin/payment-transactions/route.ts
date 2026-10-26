import {NextRequest,NextResponse} from "next/server";
import {readAdminSession} from "@/lib/auth/admin";
import {db} from "@/lib/firestore";

export async function GET(req:NextRequest){
 const session=await readAdminSession(req.cookies.get("admin_session")?.value||"");
 if(!session)return NextResponse.json({error:"Admin authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
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
