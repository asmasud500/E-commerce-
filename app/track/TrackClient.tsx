"use client";
import {useState} from "react";
import Link from "next/link";
import {Icon} from "@/components/Icons";

type Step={key:string;label:string;detail:string;state:"done"|"current"|"todo"|"failed";at:string|null};
type Result={
  orderNumber:string;status:string;paymentStatus:string;createdAt:string|null;paymentMethod:string|null;
  courierName:string|null;trackingNumber:string|null;
  timeline:Step[];returnStatus?:string|null;
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
      const r=await fetch("/api/orders/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber})});
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
        <p>Enter your order number to check the latest status and delivery progress. No phone number or email needed.</p>
        <form onSubmit={submit}>
          <label className="fld"><span>Order number</span><input required value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="ORD-XXXXXXXX-XXXXX" autoComplete="off" autoCapitalize="characters" maxLength={60}/></label>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button className="pg-btn pg-btn-block" disabled={busy} type="submit">{busy?"Checking...":"Track order"}{!busy&&<Icon name="arrowRight" size={18}/>}</button>
        </form>
      </section>

      {result&&<section className="pg-card trk-result" aria-live="polite">
        <div className="trk-top">
          <div><small>Order</small><h2>{result.orderNumber}</h2><span className="trk-date">Placed {when(result.createdAt)}</span></div>
          <span className={"tag "+(result.status==="DELIVERED"?"ok":result.status==="CANCELLED"||result.status==="REFUNDED"?"bad":"wait")}>{status}</span>
        </div>
        <section className="trk-live-map" aria-label="Animated order delivery route">
          <div className="trk-map-top"><div><span className="trk-map-kicker">DELIVERY JOURNEY</span><h3>{result.status==="DELIVERED"?"Your parcel has arrived":result.status==="SHIPPED"?"Your parcel is on the way":"Your order journey"}</h3><p>{"Follow your order status from confirmation to delivery."}</p></div><span className={"trk-map-live "+(result.status==="SHIPPED"?"moving":"")}>{result.status==="SHIPPED"?"IN TRANSIT":result.status==="DELIVERED"?"DELIVERED":"TRACKING"}</span></div>
          <div className={"trk-map-canvas "+(result.status==="CANCELLED"||result.status==="REFUNDED"?"is-ended":"")}>
            <div className="trk-map-grid"></div>
            <svg className="trk-map-art" viewBox="0 0 600 190" role="img" aria-label="Animated route from store to delivery destination">
              <path className="trk-map-road" d="M25 150 C85 140 70 65 155 80 S245 165 305 105 S405 25 465 72 S530 115 575 35"/>
              <path className="trk-map-route" d="M25 150 C85 140 70 65 155 80 S245 165 305 105 S405 25 465 72 S530 115 575 35"/>
              <circle cx="25" cy="150" r="7" className="trk-map-origin"/>
              <g className={"trk-map-pin "+(result.status==="SHIPPED"?"pin-moving":"")}><circle cx="305" cy="105" r="17"/><path d="M298 103h14v10h-14zM301 99h8v4h-8z"/><circle cx="302" cy="114" r="1.5"/><circle cx="309" cy="114" r="1.5"/></g>
              <g className="trk-map-destination" transform="translate(575 35)"><circle r="14"/><path d="M-6 -2 0 -8 6 -2 V6 H-3 V0 H2 V6"/></g>
            </svg>
            <div className="trk-map-label store"><span>01</span><b>Order placed</b></div><div className="trk-map-label destination"><span>02</span><b>{result.status==="DELIVERED"?"Delivered":"Your destination"}</b></div>
            <div className="trk-map-van" aria-hidden="true">▰</div>
          </div>
          <div className="trk-map-legend"><span><i className="origin-dot"></i>Store</span><span><i className="route-dot"></i>Delivery route</span><span><i className="destination-dot"></i>Destination</span></div>
        </section>
        {(result.courierName||result.trackingNumber)&&<div className="trk-courier"><Icon name="truck" size={20}/><div><b>{result.courierName||"Courier"}</b>{result.trackingNumber&&<span>Tracking no. <code>{result.trackingNumber}</code></span>}</div></div>}
        <ol className="trk-steps">
          {result.timeline.map(s=><li key={s.key} className={"trk-step "+s.state}>
            <span className="trk-dot" aria-hidden="true">{s.state==="done"?<Icon name="check" size={14} strokeWidth={3}/>:s.state==="failed"?"!":""}</span>
            <div><b>{s.label}</b><small>{s.detail}</small>{s.at&&<em>{when(s.at)}</em>}</div>
          </li>)}
        </ol>
        {result.status==="DELIVERED"&&(result.returnStatus?<p className="trk-return"><b>Return request:</b> {result.returnStatus.toLowerCase()}</p>:<form onSubmit={requestReturn} className="trk-return">
          <h3>Need to return something?</h3>
          <label className="fld"><span>Phone number or email used for this order</span><input required value={contact} onChange={e=>setContact(e.target.value)} placeholder="Phone number or email" autoComplete="off" maxLength={254}/></label>
          <select value={reason} onChange={e=>setReason(e.target.value)}><option>Wrong or damaged item</option><option>Not as described</option><option>Changed my mind</option><option>Other</option></select>
          <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Tell us more (optional)" rows={3} maxLength={1000}/>
          <button className="pg-btn" type="submit">Request return</button>
          {retMsg&&<small>{retMsg}</small>}
        </form>)}
      </section>}
    </div>
  );
}
