import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/firestore";
import {verifyCustomerToken} from "@/lib/auth/customer";
import {verifyOrderAccessToken} from "@/lib/auth/order-access";
import {rateLimit} from "@/lib/security/rate-limit";

/** Confirms a sandbox order for testing only; it never records a successful payment. */
export async function POST(req:NextRequest){
 try{
  const ip=req.headers.get("cf-connecting-ip")||"unknown";
  const rl=rateLimit("demo-payment:"+ip,10,60_000);
  if(!rl.ok)return NextResponse.json({error:"Too many demo confirmation attempts. Try again later."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
  const body=await req.json();
  const orderId=typeof body?.orderId==="string"?body.orderId:"";
  const accessToken=typeof body?.accessToken==="string"?body.accessToken:"";
  if(!orderId)return NextResponse.json({error:"Order ID is required."},{status:400});
  const token=req.cookies.get("customer_session")?.value;
  const session=token?await verifyCustomerToken(token):null;
  const order=await db.order.findUnique({where:{id:orderId},include:{paymentGateway:true}});
  if(!order||!order.paymentGateway)return NextResponse.json({error:"Order or demo gateway not found."},{status:404});
  if(order.userId&&(!session||session.userId!==order.userId))return NextResponse.json({error:"You do not have access to this order."},{status:403});
  if(!order.userId&&!session&&!(await verifyOrderAccessToken(order.id,accessToken)))return NextResponse.json({error:"Invalid order access."},{status:403});
  const gateway=order.paymentGateway;
  const config=(gateway.publicConfig||{}) as Record<string,unknown>;
  if(!gateway.enabled||gateway.type!=="CUSTOM"||gateway.mode!=="SANDBOX"||config.demo!==true)return NextResponse.json({error:"Demo confirmation is only available for an enabled sandbox demo gateway."},{status:409});
  if(order.status==="CANCELLED"||order.status==="REFUNDED")return NextResponse.json({error:"This order cannot be confirmed."},{status:409});
  if(order.paymentProvider==="DEMO"&&order.status==="CONFIRMED")return NextResponse.json({ok:true,orderNumber:order.orderNumber,status:"CONFIRMED",paymentStatus:order.paymentStatus,demo:true,replayed:true});
  const result=await db.$transaction(async tx=>{
   const changed=await tx.order.updateMany({where:{id:order.id,status:"PENDING",paymentStatus:"PENDING",paymentGatewayId:gateway.id},data:{status:"CONFIRMED",paymentProvider:"DEMO",paymentReference:"DEMO-"+order.orderNumber,paymentAutoConfirmedAt:new Date()}});
   if(changed.count!==1)return false;
   await tx.stockReservation.updateMany({where:{orderId:order.id,status:"HELD"},data:{status:"CONFIRMED"}});
   return true;
  });
  if(!result)return NextResponse.json({error:"Order is no longer pending. Refresh order status and try again."},{status:409});
  return NextResponse.json({ok:true,orderNumber:order.orderNumber,status:"CONFIRMED",paymentStatus:"PENDING",demo:true});
 }catch(error){
  console.error("Demo payment confirmation error:",error instanceof Error?error.message:String(error));
  return NextResponse.json({error:"Unable to confirm this demo order."},{status:400});
 }
}
