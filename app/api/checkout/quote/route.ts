import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {buildQuote,QuoteError} from "@/lib/checkout";
import {db} from "@/lib/prisma";
import {rateLimit} from "@/lib/security/rate-limit";

const schema=z.object({
  couponCode:z.string().trim().max(50).optional(),
  giftCardCode:z.string().trim().max(80).optional(),
  shippingDivision:z.string().trim().max(80).optional(),
  shippingDistrict:z.string().trim().max(100).optional(),
  shippingUpazila:z.string().trim().max(100).optional(),
  items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().positive().max(100),options:z.record(z.string().max(40),z.string().max(40)).optional()})).min(1).max(100)
});

/** Live price preview for the checkout page: prices, voucher, delivery and total exactly as the order will be charged. */
export async function POST(req:NextRequest){
  try{
    const ip=req.headers.get("cf-connecting-ip")||"unknown";
    const rl=rateLimit("quote:"+ip,60,60_000);
    if(!rl.ok)return NextResponse.json({error:"Too many requests. Try again shortly."},{status:429,headers:{"Retry-After":String(rl.retryAfter)}});
    const input=schema.parse(await req.json());
    const q=await buildQuote(input);
    const {products:_products,...rest}=q;
    const code=(input.giftCardCode||"").trim().toUpperCase();
    let giftCardDiscount=0,giftCardError:string|null=null,giftCardBalance=0;
    if(code){
      const card=await db.giftCard.findFirst({where:{code}});
      if(!card)giftCardError="Gift card code was not found.";
      else if(card.status!=="ACTIVE")giftCardError="This gift card is not active.";
      else if(card.expiresAt&&new Date(card.expiresAt).getTime()<Date.now())giftCardError="This gift card has expired.";
      else {
        giftCardBalance=Math.max(0,Number(card.balance||0));
        if(giftCardBalance<=0)giftCardError="This gift card has no remaining balance.";
        else giftCardDiscount=Math.min(giftCardBalance,Number(q.total||0));
      }
    }
    return NextResponse.json({...rest,giftCardCode:code||null,giftCardBalance,giftCardDiscount,giftCardError,total:Math.max(0,Number(q.total||0)-giftCardDiscount)},{headers:{"Cache-Control":"no-store"}});

  }catch(error){
    if(error instanceof QuoteError)return NextResponse.json({error:error.message},{status:error.status});
    return NextResponse.json({error:"Could not calculate the total."},{status:400});
  }
}
