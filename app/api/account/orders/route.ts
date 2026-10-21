import {NextRequest,NextResponse} from "next/server";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {getCustomerOrders} from "@/lib/customer-orders";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(req:NextRequest){
  const token=req.cookies.get("customer_session")?.value;
  const session=token?await verifyCustomerToken(token):null;
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});

  try {
    const orders=await getCustomerOrders(session.userId);
    return NextResponse.json(orders,{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    console.error("Customer orders lookup failed:", error);
    return NextResponse.json(
      {error:"Orders are temporarily unavailable. Please try again."},
      {status:503,headers:{"Cache-Control":"no-store","Retry-After":"3"}}
    );
  }
}
