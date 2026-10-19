/**
 * Delivery-charge rules. Pure on purpose (no imports) so the server quote, the checkout page and the tests all share one definition.
 *
 *  - a product marked free delivery (or with a custom charge of 0) adds nothing
 *  - a product with its own delivery charge adds that charge once per product (not per unit)
 *  - every other product is "standard": one area/default charge per order covers all of them
 *  - the free-delivery threshold waives only the standard charge, never a product's own charge
 */
export type DeliveryMode="free"|"custom"|"standard";
export type ProductDelivery={mode:DeliveryMode;fee:number};

const asFee=(v:unknown):number|null=>{
  if(v===null||v===undefined||v==="")return null;
  const n=Number(v);
  return Number.isFinite(n)&&n>=0?n:null;
};

export function productDelivery(p:{freeShipping?:unknown;shippingFee?:unknown}|null|undefined):ProductDelivery{
  if(p?.freeShipping===true||p?.freeShipping==="true")return {mode:"free",fee:0};
  const fee=asFee(p?.shippingFee);
  if(fee===null)return {mode:"standard",fee:0};
  return fee===0?{mode:"free",fee:0}:{mode:"custom",fee};
}

export const isFreeDelivery=(p:{freeShipping?:unknown;shippingFee?:unknown}|null|undefined)=>productDelivery(p).mode==="free";

export type DeliveryResult={shipping:number;customFee:number;standardFee:number;standardWaived:boolean;hasStandard:boolean};

export function computeDelivery(input:{
  deliveries:ProductDelivery[];
  /** Area (delivery zone) charge, or the store default when no zone matches. */
  standardFee:number;
  /** Subtotal at which the standard charge is waived, or null when there is no threshold. */
  freeThreshold:number|null;
  /** Amount the customer pays for goods (subtotal minus voucher). */
  payable:number;
}):DeliveryResult{
  let customFee=0,hasStandard=false;
  for(const d of input.deliveries){
    if(d.mode==="custom")customFee+=d.fee;
    else if(d.mode==="standard")hasStandard=true;
  }
  const standardWaived=hasStandard&&input.freeThreshold!=null&&input.payable>=input.freeThreshold;
  const standardFee=hasStandard&&!standardWaived?Math.max(0,input.standardFee):0;
  return {shipping:customFee+standardFee,customFee,standardFee,standardWaived,hasStandard};
}

const tk=(n:number)=>"৳"+Number(n).toLocaleString("en-BD",{maximumFractionDigits:2});

/** Short customer-facing delivery note for one product. */
export function deliveryLabel(p:{freeShipping?:unknown;shippingFee?:unknown},standardFee:number,freeThreshold:number|null):string{
  const d=productDelivery(p);
  if(d.mode==="free")return "Free delivery";
  if(d.mode==="custom")return "Delivery "+tk(d.fee);
  const base="Delivery "+tk(standardFee);
  return freeThreshold!=null&&freeThreshold>0?base+" · free over "+tk(freeThreshold):base;
}
