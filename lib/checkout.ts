import {resolveSelection} from "@/lib/options";
import {db} from "@/lib/prisma";
import {getEffectivePrice} from "@/lib/products/pricing";
import {computeDelivery,productDelivery,type DeliveryMode} from "@/lib/shipping";

export class QuoteError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}

export type QuoteInput={
  items:{productId:string;quantity:number;options?:Record<string,string>}[];
  couponCode?:string|null;
  shippingDivision?:string;shippingDistrict?:string;shippingUpazila?:string;
};

export type QuoteLine={productId:string;name:string;unitPrice:number;quantity:number;lineTotal:number;delivery:DeliveryMode;deliveryFee:number};

export type Quote={
  lines:QuoteLine[];
  subtotal:number;discount:number;couponCode:string|null;couponError:string|null;
  shipping:number;customFee:number;standardFee:number;standardWaived:boolean;hasStandard:boolean;freeThreshold:number|null;
  taxAmount:number;total:number;
  zone:{name:string;estimatedDays:number}|null;
  products:Map<string,any>;
};

const norm=(v:unknown)=>String(v??"").trim().toLocaleLowerCase();

/** The most specific active zone wins: an upazila zone beats a district-wide zone. */
export function matchZone(zones:any[],division:string,district:string,upazila:string){
  const d=norm(district),u=norm(upazila),v=norm(division);
  if(!d)return null;
  const hits=zones.filter(z=>norm(z.district)===d&&(!z.upazila||norm(z.upazila)===u)&&(!z.division||norm(z.division)===v));
  hits.sort((a,b)=>(b.upazila?2:0)+(b.division?1:0)-((a.upazila?2:0)+(a.division?1:0)));
  return hits[0]||null;
}

/**
 * Single source of truth for what an order costs: effective prices (sale + flash sale), voucher,
 * delivery (area + per-product rules) and tax. The checkout preview and order creation both use it.
 */
export async function buildQuote(input:QuoteInput,opts:{strictCoupon?:boolean}={}):Promise<Quote>{
  if(!input.items.length)throw new QuoteError("Your cart is empty.");
  const unique=[...new Set(input.items.map(i=>i.productId))];
  if(unique.length!==input.items.length)throw new QuoteError("Duplicate products are not allowed.");
  const [products,flashSales,storedSettings,zones]=await Promise.all([
    db.product.findMany({where:{id:{in:unique},published:true}}),
    db.flashSale.findMany({where:{active:true}}),
    db.storeSetting.findUnique({where:{id:"store"}}),
    db.deliveryZone.findMany({where:{active:true}})
  ]);
  if(products.length!==unique.length)throw new QuoteError("One or more products are unavailable.");
  const byId=new Map<string,any>(products.map((p:any)=>[p.id,p]));

  let subtotal=0;const lines:QuoteLine[]=[];
  for(const item of input.items){
    const p=byId.get(item.productId)!;
    const unitPrice=getEffectivePrice(p,flashSales),lineTotal=unitPrice*item.quantity;
    subtotal+=lineTotal;
    const d=productDelivery(p);
    const sel=resolveSelection(p.options,item.options);if(!sel.ok)throw new QuoteError(sel.error+" ("+p.name+")");
    lines.push({productId:p.id,name:p.name+(sel.label?" ("+sel.label+")":""),unitPrice,quantity:item.quantity,lineTotal,delivery:d.mode,deliveryFee:d.fee});
  }

  let discount=0,couponError:string|null=null;
  const code=(input.couponCode||"").trim().toUpperCase();
  if(code){
    const c=await db.coupon.findFirst({where:{code,active:true}});
    const expired=!!c&&!!c.expiresAt&&c.expiresAt<new Date();
    const belowMin=!!c&&!!c.minOrder&&subtotal<Number(c.minOrder);
    if(!c||expired||belowMin){
      couponError=!c?"This voucher code is not valid.":expired?"This voucher has expired.":"Add more items to use this voucher (minimum order ৳"+Number(c.minOrder).toLocaleString("en-BD")+").";
      if(opts.strictCoupon)throw new QuoteError("Invalid or unavailable coupon.");
    }else if(c.type!=="PERCENT"&&c.type!=="FIXED"){
      throw new QuoteError("Unsupported coupon type.");
    }else{
      discount=c.type==="PERCENT"?Math.min(subtotal,subtotal*Number(c.value)/100):Math.min(subtotal,Number(c.value));
    }
  }

  const settings:any={defaultDeliveryFee:120,freeShippingThreshold:3000,taxEnabled:false,taxRate:0,...(storedSettings||{})};
  const zone=matchZone(zones,input.shippingDivision||"",input.shippingDistrict||"",input.shippingUpazila||"");
  const standardFee=zone?Number(zone.fee||0):Number(settings.defaultDeliveryFee||0);
  const freeThreshold=zone?.freeAbove!=null?Number(zone.freeAbove):settings.freeShippingThreshold==null?null:Number(settings.freeShippingThreshold);
  const payable=Math.max(0,subtotal-discount);
  const delivery=computeDelivery({deliveries:lines.map(l=>({mode:l.delivery,fee:l.deliveryFee})),standardFee,freeThreshold,payable});
  const taxAmount=settings.taxEnabled?Math.round(payable*Number(settings.taxRate||0))/100:0;
  return {
    lines,subtotal,discount,couponCode:code&&!couponError?code:null,couponError,
    shipping:delivery.shipping,customFee:delivery.customFee,standardFee:delivery.standardFee,standardWaived:delivery.standardWaived,hasStandard:delivery.hasStandard,freeThreshold,
    taxAmount,total:payable+delivery.shipping+taxAmount,
    zone:zone?{name:String(zone.name||[zone.upazila,zone.district].filter(Boolean).join(", ")),estimatedDays:Number(zone.estimatedDays||3)}:null,
    products:byId
  };
}
