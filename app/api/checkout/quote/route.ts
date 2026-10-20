import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {buildQuote,QuoteError} from "@/lib/checkout";
import {rateLimit} from "@/lib/security/rate-limit";

const schema=z.object({
  couponCode:z.string().trim().max(50).optional(),
  shippingDivision:z.string().trim().max(80).optional(),
  shippingDistrict:z.string().trim().max(100).optional(),
  shippingUpazila:z.string().trim().max(100).optional(),
  items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().positive().max(100),options:z.record(z.string().max(40),z.string().max(40)).optional()})).min(1).max(100)
});

/** Live price preview for the checkout page: prices, voucher, delivery and total exactly as the order will be charged. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
    const rl=rateLimit("quote:"+ip,60,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many requests. Try again shortly."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const input=schema.parse(await req.json());
    const q=await buildQuote(input);
    const {products:_products,...rest}=q;
    return NextResponse.json(rest,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof QuoteError)return NextResponse.json({error:error.message},{status:error.status});
    return NextResponse.json({error:"Could not calculate the total."},{status:400});
  }
}
