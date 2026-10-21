import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {buildTimeline,contactMatches,normalizeOrderNumber} from "@/lib/tracking";

const schema=z.object({orderNumber:z.string().trim().min(4).max(60),contact:z.string().trim().min(5).max(254),reason:z.string().trim().min(3).max(120)});
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
    const rl=rateLimit("cancel:"+ip,6,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many attempts. Please wait a minute and try again."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const p=schema.safeParse(await req.json().catch(()=>null));
    if(!p.success)return NextResponse.json({error:"Enter the order details and cancellation reason."},{status:400});
    const target=normalizeOrderNumber(p.data.orderNumber);
    let o:any=await db.order.findFirst({where:{orderNumber:target}});
    if(!o){const recent:any[]=await db.order.findMany({take:500,orderBy:{createdAt:"desc"}});o=recent.find(row=>normalizeOrderNumber(row.orderNumber)===target)||null;}
    if(!o)return NextResponse.json({error:"We could not find an order with those details."},{status:404});
    const phones=[o.customerPhone,o.phone,o.mobile,o.contactPhone].filter((v:any)=>String(v??"").trim());
    const emails=[o.customerEmail,o.email,o.contactEmail].filter((v:any)=>String(v??"").trim());
    const matches=phones.some((v:any)=>contactMatches({customerPhone:v},p.data.contact))||emails.some((v:any)=>contactMatches({customerEmail:v},p.data.contact));
    if(!matches)return NextResponse.json({error:"We could not find an order with those details."},{status:404});
    const status=String(o.status||"PENDING").toUpperCase();
    if(["SHIPPED","DELIVERED","CANCELLED","REFUNDED"].includes(status))return NextResponse.json({error:status==="SHIPPED"?"This order has already shipped and can no longer be cancelled online.":"This order can no longer be cancelled."},{status:409});
    const updated:any=await db.order.update({where:{id:o.id},data:{status:"CANCELLED",cancellationReason:p.data.reason}});
    return NextResponse.json({ok:true,status:"CANCELLED",timeline:buildTimeline(updated)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Order cancellation error:",error instanceof Error?error.message:String(error));return NextResponse.json({error:"Could not cancel the order. Please try again."},{status:500});}
}
