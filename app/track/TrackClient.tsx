"use client";
import {useState} from "react";
import Link from "next/link";
import {Icon} from "@/components/Icons";

type Step={key:string;label:string;detail:string;state:"done"|"current"|"todo"|"failed";at:string|null};
type Result={
  orderNumber:string;status:string;paymentStatus:string;createdAt:string|null;paymentMethod:string|null;
  courierName:string|null;trackingNumber:string|null;deliveryArea:string|null;
  subtotal:number;discount:number;shippingFee:number;taxAmount:number;total:number;
  items:{name:string;quantity:number;lineTotal:number}[];timeline:Step[];returnStatus?:string|null;
};

const tk=(n:number)=>"৳"+Number(n).toLocaleString("en-BD");
const when=(iso:string|null)=>iso?new Date(iso).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"}):"";
const label:Record<string,string>={PENDING:"Waiting for payment",CONFIRMED:"Confirmed",PROCESSING:"Being packed",SHIPPED:"On the way",DELIVERED:"Delivered",CANCELLED:"Cancelled",REFUNDED:"Refunded"};

export default function TrackClient({initialOrder}:{initialOrder:string}){
  const [orderNumber,setOrderNumber]=useState(initialOrder);
  const [contact,setContact]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [reason,setReason]=useState("Wrong or damaged item"),[details,setDetails]=useState(""),[retMsg,setRetMsg]=useState("");
  async function requestReturn(e:React.FormEvent){
    e.preventDefault();setRetMsg("");
    try{
      const r=await fetch("/api/orders/return",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber,contact,reason,details})});
      const d=await r.json().catch(()=>({}));
      if(r.ok){setRetMsg("Return request submitted. We will contact you soon.");setResult(x=>x?{...x,returnStatus:"REQUESTED"}:x)}else setRetMsg(d.error||"Could not submit.");
    }catch{setRetMsg("Unable to connect. Please try again.")}
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError("");setResult(null);
    try{
      const r=await fetch("/api/orders/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber,contact})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)setError(d.error||"Could not find that order.");
      else setResult(d);
    }catch{setError("Unable to connect. Please try again.")}
    finally{setBusy(false)}
  }

  const status=result?(result.paymentStatus==="FAILED"&&result.status==="CANCELLED"?"Payment rejected":label[result.status]||result.status):"";

  return (
    <div className="trk">
      <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>Track order</b></nav>
      <section className="pg-card trk-form">
        <h1>Track your order</h1>
        <p>Enter your order number and the phone number or email you used when ordering.</p>
        <form onSubmit={submit}>
          <label className="fld"><span>Order number</span><input required value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="ORD-XXXXXXXX-XXXXX" autoComplete="off" autoCapitalize="characters" maxLength={60}/></label>
          <label className="fld"><span>Phone number or email</span><input required value={contact} onChange={e=>setContact(e.target.value)} placeholder="01XXXXXXXXX or you@example.com" autoComplete="off" maxLength={254}/></label>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button className="pg-btn pg-btn-block" disabled={busy} type="submit">{busy?"Checking...":"Track order"}{!busy&&<Icon name="arrowRight" size={18}/>}</button>
        </form>
      </section>

      {result&&<section className="pg-card trk-result" aria-live="polite">
        <div className="trk-top">
          <div><small>Order</small><h2>{result.orderNumber}</h2><span className="trk-date">Placed {when(result.createdAt)}</span></div>
          <span className={"tag "+(result.status==="DELIVERED"?"ok":result.status==="CANCELLED"||result.status==="REFUNDED"?"bad":"wait")}>{status}</span>
        </div>
        {(result.courierName||result.trackingNumber)&&<div className="trk-courier"><Icon name="truck" size={20}/><div><b>{result.courierName||"Courier"}</b>{result.trackingNumber&&<span>Tracking no. <code>{result.trackingNumber}</code></span>}</div></div>}
        <ol className="trk-steps">
          {result.timeline.map(s=><li key={s.key} className={"trk-step "+s.state}>
            <span className="trk-dot" aria-hidden="true">{s.state==="done"?<Icon name="check" size={14} strokeWidth={3}/>:s.state==="failed"?"!":""}</span>
            <div><b>{s.label}</b><small>{s.detail}</small>{s.at&&<em>{when(s.at)}</em>}</div>
          </li>)}
        </ol>
        <div className="trk-sum">
          <h3>Items</h3>
          <ul>{result.items.map((i,n)=><li key={n}><span>{i.name} × {i.quantity}</span><b>{tk(i.lineTotal)}</b></li>)}</ul>
          <div className="checkout-summary-row"><span>Subtotal</span><b>{tk(result.subtotal)}</b></div>
          {result.discount>0&&<div className="checkout-summary-row"><span>Voucher</span><b>−{tk(result.discount)}</b></div>}
          <div className="checkout-summary-row"><span>Delivery</span><b>{result.shippingFee>0?tk(result.shippingFee):"Free"}</b></div>
          {result.taxAmount>0&&<div className="checkout-summary-row"><span>Tax</span><b>{tk(result.taxAmount)}</b></div>}
          <div className="checkout-total"><span>Total</span><strong>{tk(result.total)}</strong></div>
          <small>{result.paymentMethod?"Paid with "+result.paymentMethod+". ":""}{result.deliveryArea?"Delivering to "+result.deliveryArea+".":""}</small>
        </div>
        {result.status==="DELIVERED"&&(result.returnStatus?<p className="trk-return"><b>Return request:</b> {result.returnStatus.toLowerCase()}</p>:<form onSubmit={requestReturn} className="trk-return">
          <h3>Need to return something?</h3>
          <select value={reason} onChange={e=>setReason(e.target.value)}><option>Wrong or damaged item</option><option>Not as described</option><option>Changed my mind</option><option>Other</option></select>
          <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Tell us more (optional)" rows={3} maxLength={1000}/>
          <button className="pg-btn" type="submit">Request return</button>
          {retMsg&&<small>{retMsg}</small>}
        </form>)}
      </section>}
    </div>
  );
}
