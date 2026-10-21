import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {contactMatches,normalizeOrderNumber} from "@/lib/tracking";
import {telegramApi,esc} from "@/lib/notifications/telegram-admin";

const schema=z.object({orderNumber:z.string().trim().min(4).max(60),contact:z.string().trim().min(5).max(254),reason:z.string().trim().min(3).max(120),details:z.string().trim().max(1000).optional()});
const RETURN_WINDOW_DAYS=7;

/** Customer return/refund request. Same proof as tracking (order no + phone/email); only delivered orders, one open request per order. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||"unknown";
    const rl=rateLimit("return:"+ip,6,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const p=schema.safeParse(await req.json().catch(()=>null));
    if(!p.success)return NextResponse.json({error:"Please choose a reason and fill in your order details."},{status:400});
    const normalizedOrderNumber=normalizeOrderNumber(p.data.orderNumber);
    let o:any=await db.order.findFirst({where:{orderNumber:normalizedOrderNumber}});
    if(!o){const recent:any[]=await db.order.findMany({take:500,orderBy:{createdAt:"desc"}});o=recent.find(row=>normalizeOrderNumber(row.orderNumber)===normalizedOrderNumber)||null;}
    // Older/imported orders may keep contact details under legacy aliases, and an empty
    // canonical field must not hide a valid legacy phone/email value.
    const phoneCandidates=o?[o.customerPhone,o.phone,o.mobile,o.contactPhone].filter((v:any)=>String(v??"").trim()):[];
    const emailCandidates=o?[o.customerEmail,o.email,o.contactEmail].filter((v:any)=>String(v??"").trim()):[];
    const contactIsValid=phoneCandidates.some((phone:any)=>contactMatches({customerPhone:phone},p.data.contact))||emailCandidates.some((email:any)=>contactMatches({customerEmail:email},p.data.contact));
    if(!o||!contactIsValid)return NextResponse.json({error:"We could not find an order with those details. Please use the phone number or email saved with the order."},{status:404});
    if(o.status!=="DELIVERED")return NextResponse.json({error:"Return requests can be made after the order is delivered."},{status:409});
    const raw=o.deliveredAt&&typeof o.deliveredAt==="object"&&"toDate" in o.deliveredAt?o.deliveredAt.toDate():o.deliveredAt;
    const d=raw?new Date(raw):null;
    if(d&&Number.isFinite(d.getTime())&&Date.now()-d.getTime()>RETURN_WINDOW_DAYS*86400000)return NextResponse.json({error:"The "+RETURN_WINDOW_DAYS+"-day return window has passed."},{status:409});
    const existing=await db.returnRequest.findFirst({where:{orderId:o.id}});
    if(existing)return NextResponse.json({error:"A return request already exists for this order ("+existing.status.toLowerCase()+")."},{status:409});
    const r=await db.returnRequest.create({data:{orderId:o.id,orderNumber:o.orderNumber,customerName:o.customerName,customerPhone:o.customerPhone,reason:p.data.reason,details:p.data.details||null,status:"REQUESTED",total:Number(o.total),createdAt:new Date()}});
    await telegramApi("sendMessage",{chat_id:process.env.TELEGRAM_CHAT_ID,parse_mode:"HTML",text:"↩️ <b>Return request</b>\nOrder: <code>"+esc(o.orderNumber)+"</code>\n"+esc(o.customerName)+" · "+esc(o.customerPhone)+"\nReason: "+esc(p.data.reason)+(p.data.details?"\n"+esc(p.data.details):"")+"\n\n<code>/return "+esc(r.id)+" approve</code> বা <code>reject</code>"}).catch(()=>{});
    return NextResponse.json({ok:true,status:"REQUESTED"},{status:201});
  }catch(e){console.error("Return request error:",e instanceof Error?e.message:String(e));return NextResponse.json({error:"Could not submit the request. Please try again."},{status:500});}
}
