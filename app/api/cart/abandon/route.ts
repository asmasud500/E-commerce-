import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";
import {normalizePhone} from "@/lib/tracking";

const schema=z.object({phone:z.string().trim().min(6).max(30),name:z.string().trim().max(100).optional(),items:z.array(z.object({productId:z.string().min(1).max(128),quantity:z.coerce.number().int().min(1).max(99)})).min(1).max(30)});

/** Remembers a cart once the shopper has typed a phone number at checkout, so the team can follow up if no order follows. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
    if(!rateLimit("abandon:"+ip,20,60_000).ok)return NextResponse.json({ok:true});
    const p=schema.safeParse(await req.json().catch(()=>null));
    if(!p.success)return NextResponse.json({ok:true});
    const phone=normalizePhone(p.data.phone);if(phone.length<10)return NextResponse.json({ok:true});
    const lines:{productId:string;name:string;quantity:number;price:number}[]=[];
    for(const i of p.data.items){const pr:any=await db.product.findUnique({where:{id:i.productId}}).catch(()=>null);if(pr&&pr.published)lines.push({productId:pr.id,name:pr.name,quantity:i.quantity,price:Number(pr.salePrice??pr.price)})}
    if(!lines.length)return NextResponse.json({ok:true});
    const id="c"+phone;const now=new Date();
    const data={phone,name:p.data.name||null,items:lines,total:lines.reduce((a,l)=>a+l.price*l.quantity,0),updatedAt:now,recovered:false,reminded:false};
    const ex=await db.abandonedCart.findUnique({where:{id}}).catch(()=>null);
    if(ex)await db.abandonedCart.update({where:{id},data});else await db.abandonedCart.create({data:{id,...data,createdAt:now}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:true})}
}
