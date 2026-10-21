import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {buildTimeline,contactMatches,normalizeOrderNumber} from "@/lib/tracking";

const schema=z.object({identifier:z.string().trim().min(4).max(254)});
const NOT_FOUND={error:"We could not find an order with those details. Check the order number and the phone number or email used at checkout."};
const iso=(v:any)=>{const raw=v&&typeof v==="object"&&"toDate" in v?v.toDate():v;const d=raw instanceof Date?raw:new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null};

export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
    const rl=rateLimit("track:"+ip,15,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute and try again."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:"Enter an order number, mobile number, or email address."},{status:400});
    const identifier=parsed.data.identifier.trim();
    const trackingSelect={id:true,orderNumber:true,status:true,paymentStatus:true,createdAt:true,courierName:true,trackingNumber:true,paymentProofSubmittedAt:true,shippedAt:true,deliveredAt:true,paymentProvider:true,customerPhone:true,customerEmail:true} as const;
    let o:any=null;
    const normalized=normalizeOrderNumber(identifier);
    o=await db.order.findFirst({where:{orderNumber:normalized},select:trackingSelect});
    if(!o){
      const recent:any[]=await db.order.findMany({take:500,orderBy:{createdAt:"desc"},select:trackingSelect});
      if(identifier.includes("@")){
        const email=identifier.toLowerCase();
        o=recent.find(row=>String(row.customerEmail||"").trim().toLowerCase()===email)||null;
      }else{
        o=recent.find(row=>contactMatches({customerPhone:row.customerPhone},identifier))||null;
      }
    }
    if(!o)return NextResponse.json(NOT_FOUND,{status:404});
    const ret:any=await db.returnRequest.findFirst({where:{orderId:o.id}}).catch(()=>null);
    return NextResponse.json({returnStatus:ret?.status||null,orderNumber:o.orderNumber,status:o.status,paymentStatus:o.paymentStatus,createdAt:iso(o.createdAt),courierName:o.courierName||null,trackingNumber:o.trackingNumber||null,canCancel:!["SHIPPED","DELIVERED","CANCELLED","REFUNDED"].includes(String(o.status||"").toUpperCase()),requiresContact:!identifier.includes("@")&&!/\d{7,}/.test(identifier),timeline:buildTimeline(o)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Order tracking error:",error instanceof Error?error.message:String(error));
    return NextResponse.json({error:"Tracking is temporarily unavailable. Please try again."},{status:500});
  }
}
