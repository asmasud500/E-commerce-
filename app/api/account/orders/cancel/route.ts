import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/prisma";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {rejectPendingOrderAtomically} from "@/lib/firestore";
import {rateLimit} from "@/lib/security/rate-limit";

export async function POST(req:NextRequest){
  try{
    const token=req.cookies.get("customer_session")?.value;
    const session=token?await verifyCustomerToken(token):null;
    if(!session)return NextResponse.json({error:"Please log in to cancel an order."},{status:401});
    const ip=req.headers.get("cf-connecting-ip")||"unknown";
    const rl=rateLimit("customer-cancel:"+ip,8,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute."},{status:429});
    const body=await req.json().catch(()=>null);
    const orderNumber=typeof body?.orderNumber==="string"?body.orderNumber.trim().toUpperCase():"";
    if(!orderNumber)return NextResponse.json({error:"Order number is required."},{status:400});
    const order=await db.order.findFirst({where:{orderNumber,userId:session.userId},select:{id:true,status:true,paymentStatus:true}});
    if(!order)return NextResponse.json({error:"Order not found in your account."},{status:404});
    if(order.status!=="PENDING"||order.paymentStatus!=="PENDING")return NextResponse.json({error:"Only pending, unpaid orders can be cancelled here. Please contact support for other orders."},{status:409});
    const result=await rejectPendingOrderAtomically(order.id,"CUSTOMER_ORDER_CANCELLED");
    if(!result.rejected)return NextResponse.json({error:"This order has changed and can no longer be cancelled. Refresh your orders."},{status:409});
    return NextResponse.json({ok:true,message:"Order cancelled successfully."});
  }catch(error){
    console.error("Customer order cancellation failed:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Could not cancel this order right now. Please try again."},{status:500});
  }
}