/** Helpers for the customer order-tracking page. Pure (no imports) so they can be unit tested. */

/** Reduce a Bangladeshi phone number to its 10 national digits (01712345678 / +8801712345678 / 8801712345678 -> 1712345678). */
export function normalizePhone(value:unknown):string{
  let d=String(value??"").replace(/\D+/g,"");
  if(d.startsWith("00"))d=d.slice(2);
  if(d.startsWith("880"))d=d.slice(3);
  if(d.startsWith("0"))d=d.slice(1);
  return d;
}

export function normalizeOrderNumber(value:unknown):string{
  return String(value??"").trim().toUpperCase().replace(/\s+/g,"");
}

/** True when `contact` is the phone number or the e-mail address the order was placed with. */
export function contactMatches(order:{customerPhone?:unknown;customerEmail?:unknown},contact:unknown):boolean{
  const raw=String(contact??"").trim();
  if(!raw)return false;
  if(raw.includes("@")){
    const email=String(order.customerEmail??"").trim().toLowerCase();
    return !!email&&email===raw.toLowerCase();
  }
  const a=normalizePhone(raw),b=normalizePhone(order.customerPhone);
  return a.length>=9&&a===b;
}

export type TimelineStep={key:string;label:string;detail:string;state:"done"|"current"|"todo"|"failed";at:string|null};

const iso=(v:unknown)=>{
  if(!v)return null;
  const raw:any=v&&typeof v==="object"&&"toDate" in (v as any)?(v as any).toDate():v;
  const d=raw instanceof Date?raw:new Date(raw as any);
  return Number.isFinite(d.getTime())?d.toISOString():null;
};

export function buildTimeline(o:{status?:string;paymentStatus?:string;createdAt?:unknown;paymentProofSubmittedAt?:unknown;shippedAt?:unknown;deliveredAt?:unknown;courierName?:unknown;trackingNumber?:unknown;paymentProvider?:unknown}):TimelineStep[]{
  const cod=o.paymentProvider==="COD";
  const status=String(o.status||"PENDING"),pay=String(o.paymentStatus||"PENDING");
  const ended=status==="CANCELLED"||status==="REFUNDED"||pay==="FAILED";
  const rank:Record<string,number>={PENDING:0,CONFIRMED:1,PROCESSING:2,SHIPPED:3,DELIVERED:4};
  const r=rank[status]??0;
  const paid=pay==="PAID"||pay==="REFUNDED"||r>=1||cod;

  const steps:TimelineStep[]=[
    {key:"placed",label:"Order placed",detail:"We received your order.",state:"done",at:iso(o.createdAt)},
    {key:"payment",label:"Payment",detail:cod&&pay!=="PAID"?"Cash on delivery — pay when your parcel arrives.":paid?"Payment verified.":o.paymentProofSubmittedAt?"Payment details received. We are verifying them.":"Waiting for your payment details.",state:paid?"done":"current",at:paid?null:iso(o.paymentProofSubmittedAt)},
    {key:"confirmed",label:"Confirmed",detail:"Your order is confirmed.",state:r>=1?"done":"todo",at:null},
    {key:"processing",label:"Packing",detail:"We are preparing your items.",state:r>=2?"done":"todo",at:null},
    {key:"shipped",label:"On the way",detail:[o.courierName,o.trackingNumber].filter(Boolean).join(" · ")||"Handed to the courier.",state:r>=3?"done":"todo",at:iso(o.shippedAt)},
    {key:"delivered",label:"Delivered",detail:"Enjoy your purchase!",state:r>=4?"done":"todo",at:iso(o.deliveredAt)}
  ];

  if(ended){
    const label=status==="REFUNDED"?"Refunded":pay==="FAILED"?"Payment rejected":"Cancelled";
    const detail=status==="REFUNDED"?"Your payment was refunded.":pay==="FAILED"?"We could not verify your payment, so the order was cancelled.":"This order was cancelled.";
    return [...steps.filter(s=>s.state==="done"&&s.key!=="payment"||s.key==="placed"),{key:"ended",label,detail,state:"failed",at:null}];
  }
  const next=steps.findIndex(s=>s.state==="todo"||s.state==="current");
  return steps.map((s,i)=>i===next&&s.state==="todo"?{...s,state:"current"}:s);
}
