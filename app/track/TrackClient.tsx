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
        <section className="trk-live-map" aria-label="Seven-stage order journey map">
          <div className="trk-map-top"><div><span className="trk-map-kicker">MART DELIVERY JOURNEY</span><h3>{result.status==="DELIVERED"?"Your parcel has arrived":result.status==="SHIPPED"?"Your parcel is on the way":"Your order journey"}</h3><p>Seven milestones from order receipt to your doorstep.</p></div><span className={"trk-map-live "+(result.status==="SHIPPED"?"moving":"")}>{result.status==="SHIPPED"?"IN TRANSIT":result.status==="DELIVERED"?"DELIVERED":"ORDER TRACKING"}</span></div>
          <div className="trk-map-canvas trk-map-seven">
            <div className="trk-map-grid"></div>
            <svg className="trk-map-art" viewBox="0 0 700 320" role="img" aria-label="Illustrative route with seven separate milestone locations">
              <path className="trk-map-road" d="M58 250 C95 220 80 170 150 175 S205 250 265 210 S315 115 365 135 S425 205 475 155 S550 60 600 90 S640 140 665 45"/>
              <path className="trk-map-route" d="M58 250 C95 220 80 170 150 175 S205 250 265 210 S315 115 365 135 S425 205 475 155 S550 60 600 90 S640 140 665 45"/>
              {result.timeline.slice(0,7).map((s,i)=>{const pts=[[58,250],[150,175],[265,210],[365,135],[475,155],[600,90],[665,45]];const [x,y]=pts[i];return <g key={s.key} className={"trk-map-stop "+(s.state==="done"?"is-done":s.state==="current"?"is-current":s.state==="failed"?"is-failed":"is-todo")} transform={"translate("+x+" "+y+")"}><circle className="trk-map-stop-halo" r="17"/><circle className="trk-map-stop-core" r="10"/><text className="trk-map-stop-number" y="4">{i+1}</text></g>})}
              {result.status==="SHIPPED"&&<g className="trk-courier-marker" aria-label="Illustrative courier movement"><circle r="16" className="trk-courier-glow"/><circle r="10" className="trk-courier-disc"/><text x="0" y="4" textAnchor="middle" className="trk-courier-glyph">➤</text><animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path="M58 250 C95 220 80 170 150 175 S205 250 265 210 S315 115 365 135 S425 205 475 155 S550 60 600 90 S640 140 665 45"/></g>}
            </svg>
            <div className="trk-map-stop-labels">
              {result.timeline.slice(0,7).map((s,i)=><div key={s.key} className={"trk-map-label-point point-"+(i+1)+" "+(s.state==="done"?"is-done":s.state==="current"?"is-current":s.state==="failed"?"is-failed":"is-todo")}><span>{String(i+1).padStart(2,"0")}</span><b>{s.label}</b><small>{s.state==="done"?"Completed":s.state==="current"?"In progress":s.state==="failed"?"Stopped":"Upcoming"}</small></div>)}
            </div>
          </div>
          <div className="trk-map-legend"><span><i className="origin-dot"></i>Completed</span><span><i className="route-dot"></i>Journey route</span><span><i className="destination-dot"></i>Upcoming</span></div>
          <p className="trk-map-note">Map view shows the seven order milestones, not live GPS courier coordinates. Location tracking can become live when courier GPS data is connected.</p>
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
