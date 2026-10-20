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
    // Resolve by the canonical order number first. Older orders may have been
    // created by the previous checkout schema, which used phone/email aliases.
    let o:any=await db.order.findFirst({where:{orderNumber},include:{items:true,paymentGateway:true}});
    // Legacy records may contain different contact aliases or a formatted order number.
    // Fall back to a bounded read and compare normalized order numbers; still require
    // the exact checkout phone/email so this does not expose orders to other customers.
    if(!o){
      const recent:any[]=await db.order.findMany({take:500,orderBy:{createdAt:"desc"}});
      o=recent.find(row=>normalizeOrderNumber(row.orderNumber)===orderNumber)||null;
    }
    const contactMatchesOrder=!!o&&contactMatches({
      customerPhone:o.customerPhone??o.phone??o.mobile??o.contactPhone??o.shippingPhone,
      customerEmail:o.customerEmail??o.email??o.contactEmail??o.billingEmail
    },parsed.data.contact);
    if(!o||!contactMatchesOrder)return NextResponse.json(NOT_FOUND,{status:404});
    // Fetch related records separately for Firestore compatibility.
    const items:any[]=await db.orderItem.findMany({where:{orderId:o.id}});
    const gateway:any=o.paymentGatewayId?await db.paymentGateway.findUnique({where:{id:o.paymentGatewayId}}):null;
    const ret:any=await db.returnRequest.findFirst({where:{orderId:o.id}}).catch(()=>null);
    return NextResponse.json({
      returnStatus:ret?.status||null,orderNumber:o.orderNumber,status:o.status,paymentStatus:o.paymentStatus,createdAt:iso(o.createdAt),
      paymentMethod:gateway?.name||o.paymentMethod||null,
      courierName:o.courierName||null,trackingNumber:o.trackingNumber||null,
      deliveryArea:[o.shippingUpazila,o.shippingDistrict].filter(Boolean).join(", ")||null,
      subtotal:Number(o.subtotal),discount:Number(o.discount||0),shippingFee:Number(o.shippingFee||0),taxAmount:Number(o.taxAmount||0),total:Number(o.total),
      items:(items.length?items:(o.items||[])).map((i:any)=>({name:i.name,quantity:Number(i.quantity||0),lineTotal:Number(i.lineTotal??(Number(i.unitPrice||0)*Number(i.quantity||0)))})),
      timeline:buildTimeline(o)
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Order tracking error:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Tracking is temporarily unavailable. Please try again."},{status:500});
  }
}
