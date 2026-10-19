import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {buildTimeline,contactMatches,normalizeOrderNumber} from "@/lib/tracking";

const schema=z.object({orderNumber:z.string().trim().min(4).max(60),contact:z.string().trim().min(5).max(254)});
const NOT_FOUND={error:"We could not find an order with those details. Check the order number and the phone number or email you used."};

const iso=(v:any)=>{const raw=v&&typeof v==="object"&&"toDate" in v?v.toDate():v;const d=raw instanceof Date?raw:new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null};

/** Public order lookup. Needs the order number AND the phone/email used at checkout, and never returns the full address or contact details. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
    const rl=rateLimit("track:"+ip,15,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute and try again."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:"Enter your order number and the phone number or email you ordered with."},{status:400});
    const orderNumber=normalizeOrderNumber(parsed.data.orderNumber);
    const o:any=await db.order.findUnique({where:{orderNumber},include:{items:true,paymentGateway:true}});
    if(!o||!contactMatches(o,parsed.data.contact))return NextResponse.json(NOT_FOUND,{status:404});
    return NextResponse.json({
      orderNumber:o.orderNumber,status:o.status,paymentStatus:o.paymentStatus,createdAt:iso(o.createdAt),
      paymentMethod:o.paymentGateway?.name||null,
      courierName:o.courierName||null,trackingNumber:o.trackingNumber||null,
      deliveryArea:[o.shippingUpazila,o.shippingDistrict].filter(Boolean).join(", ")||null,
      subtotal:Number(o.subtotal),discount:Number(o.discount||0),shippingFee:Number(o.shippingFee||0),taxAmount:Number(o.taxAmount||0),total:Number(o.total),
      items:(o.items||[]).map((i:any)=>({name:i.name,quantity:i.quantity,lineTotal:Number(i.lineTotal)})),
      timeline:buildTimeline(o)
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Order tracking error:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Tracking is temporarily unavailable. Please try again."},{status:500});
  }
}
