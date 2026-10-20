import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {buildTimeline,normalizeOrderNumber} from "@/lib/tracking";

const schema=z.object({orderNumber:z.string().trim().min(4).max(60)});
const NOT_FOUND={error:"We could not find an order with that order number. Check it and try again."};

const iso=(v:any)=>{const raw=v&&typeof v==="object"&&"toDate" in v?v.toDate():v;const d=raw instanceof Date?raw:new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null};

/** Public order-number-only lookup. Returns only low-sensitivity delivery progress; no customer, item, address, or payment totals. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
    const rl=rateLimit("track:"+ip,15,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute and try again."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:"Enter a valid order number."},{status:400});
    const orderNumber=normalizeOrderNumber(parsed.data.orderNumber);
    // Resolve by the canonical order number first. Older orders may have been
    // created by the previous checkout schema, which used phone/email aliases.
    let o:any=await db.order.findFirst({where:{orderNumber},include:{items:true,paymentGateway:true}});
    // Legacy records may store order numbers with different formatting.
    if(!o){
      const recent:any[]=await db.order.findMany({take:500,orderBy:{createdAt:"desc"}});
      o=recent.find(row=>normalizeOrderNumber(row.orderNumber)===orderNumber)||null;
    }
    if(!o)return NextResponse.json(NOT_FOUND,{status:404});
    const ret:any=await db.returnRequest.findFirst({where:{orderId:o.id}}).catch(()=>null);
    return NextResponse.json({
      returnStatus:ret?.status||null,
      orderNumber:o.orderNumber,
      status:o.status,
      paymentStatus:o.paymentStatus,
      createdAt:iso(o.createdAt),
      courierName:o.courierName||null,
      trackingNumber:o.trackingNumber||null,
      timeline:buildTimeline(o)
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Order tracking error:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Tracking is temporarily unavailable. Please try again."},{status:500});
  }
}
