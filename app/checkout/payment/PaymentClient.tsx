"use client";
import{useEffect,useState}from"react";import{useSearchParams}from"next/navigation";
type PaymentResult={ok:boolean;status?:string;demo?:boolean;paymentUrl?:string;amount?:number;gatewayName?:string;reference?:string;message?:string;error?:string};
export default function PaymentClient(){
 const search=useSearchParams();const[orderId,setOrderId]=useState(""),[loading,setLoading]=useState(false),[confirmingDemo,setConfirmingDemo]=useState(false),[result,setResult]=useState<PaymentResult|null>(null),[message,setMessage]=useState("");
 useEffect(()=>{const id=search.get("order")||sessionStorage.getItem("lastOrderId")||"";setOrderId(id)},[search]);
 useEffect(()=>{if(orderId)void pay(orderId)},[orderId]);
 async function pay(id=orderId){if(!id)return;setLoading(true);setMessage("");setResult(null);try{const r=await fetch("/api/payments/initiate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:id,accessToken:sessionStorage.getItem("orderPaymentToken")||""})});const d=await r.json() as PaymentResult;setResult(d);if(!r.ok||!d.ok)setMessage(d.message||d.error||"Automatic payment could not be started. Please try again.");}catch{setMessage("Unable to connect. Check your internet connection and try again.")}finally{setLoading(false)}}
 function continuePayment(){if(result?.paymentUrl){window.location.assign(result.paymentUrl)}else setMessage("Secure payment link is unavailable. Please retry.")}
 async function confirmDemoOrder(){if(!orderId||confirmingDemo)return;setConfirmingDemo(true);setMessage("");try{const r=await fetch("/api/payments/demo-confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,accessToken:sessionStorage.getItem("orderPaymentToken")||""})});const d=await r.json();if(!r.ok||!d.ok){setMessage(d.error||"Could not confirm demo order. Please try again.");return}window.location.href="/order-success?demo=true&order="+encodeURIComponent(d.orderNumber)}catch{setMessage("Unable to connect. Please retry demo confirmation.")}finally{setConfirmingDemo(false)}}
 const tk=(n:number)=>"৳"+Number(n).toLocaleString("en-BD");
 return <div className="pay" style={{maxWidth:720,margin:"0 auto",paddingBottom:32}}>
 <ol className="steps" aria-label="Checkout progress"><li className="done"><i>✓</i>Information</li><li className="on"><i>2</i>Payment</li><li><i>3</i>Confirmation</li></ol>
 <section className="pg-card pay-card" style={{overflow:"hidden",padding:0}}>
 <header style={{background:"linear-gradient(135deg,#101d35,#172b4d)",color:"#fff",padding:"clamp(22px,5vw,36px)",position:"relative"}}>
  <div style={{display:"flex",alignItems:"center",gap:12}}>
   <div aria-hidden="true" style={{width:46,height:46,borderRadius:14,display:"grid",placeItems:"center",background:"#ff6801",fontWeight:900,fontSize:20}}>M</div>
   <div><div style={{fontWeight:800,fontSize:21,letterSpacing:"-.03em"}}>MART Pay</div><div style={{fontSize:12,opacity:.78}}>Secure payment hub</div></div>
   <span style={{marginLeft:"auto",border:"1px solid #ffffff35",borderRadius:999,padding:"7px 10px",fontSize:12,display:"flex",alignItems:"center",gap:5}}><span aria-hidden="true">🔒</span> Secure checkout</span>
  </div>
  <h1 style={{fontSize:"clamp(24px,4vw,32px)",lineHeight:1.15,margin:"26px 0 8px",color:"#fff"}}>Complete your payment</h1>
  <p style={{margin:0,color:"#d7dfec",fontSize:14,lineHeight:1.6}}>Pay safely through the enabled payment partners. Your payment details are handled by the payment provider.</p>
 </header>
 <div style={{padding:"clamp(20px,5vw,32px)"}}>
 {!orderId?<div role="alert"><h2>Order not found</h2><p>Return to checkout and open your order payment link again.</p><a className="pg-btn pg-btn-line" href="/checkout">Back to checkout</a></div>:<>
  <div style={{border:"1px solid var(--border, #e5e7eb)",borderRadius:14,padding:16,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><div style={{fontSize:12,color:"var(--muted,#64748b)",marginBottom:5}}>ORDER REFERENCE</div><b style={{overflowWrap:"anywhere"}}>{orderId}</b></div>
   {result?.amount!=null&&<div style={{textAlign:"right"}}><div style={{fontSize:12,color:"var(--muted,#64748b)",marginBottom:5}}>TOTAL TO PAY</div><strong style={{fontSize:25,color:"#ff6801"}}>{tk(result.amount)}</strong></div>}
  </div>
  <div style={{marginTop:22,border:"1px solid var(--border,#e5e7eb)",borderRadius:14,padding:16}}>
   <h2 style={{fontSize:18,margin:"0 0 8px"}}>Automatic merchant payment</h2>
   <p style={{fontSize:13,lineHeight:1.7,color:"var(--muted,#64748b)",margin:0}}>Continue to the secure merchant checkout. Only payment channels enabled on the store's approved merchant account will appear there. No personal-number Send Money transfer, screenshot upload, sender digits, or manual transaction-ID verification is required.</p>
  </div>
  {loading&&<div role="status" style={{marginTop:20,padding:14,borderRadius:12,background:"var(--surface-secondary,#f8fafc)"}}>Preparing your secure payment session…</div>}
  {result?.ok&&result.status==="DEMO"&&result.demo===true&&<div role="status" style={{marginTop:22,border:"1px solid #fcd34d",background:"#fffbeb",borderRadius:14,padding:16}}><b style={{color:"#92400e"}}>DEMO MODE — No real payment</b><p style={{fontSize:13,lineHeight:1.7,color:"#92400e",margin:"8px 0 14px"}}>Use this test action to confirm the order workflow without charging money. The order will be marked DEMO CONFIRMED, but its payment status will remain unpaid. Do not use demo mode for real customer payments.</p><button type="button" className="pg-btn pg-btn-block" disabled={confirmingDemo||loading} onClick={()=>void confirmDemoOrder()} style={{background:"#ff6801",borderColor:"#ff6801",color:"#fff",minHeight:48}}>{confirmingDemo?"Confirming demo order…":"Confirm demo order (no real payment)"}</button></div>}
  {result?.ok&&result.paymentUrl&&<div style={{marginTop:22,border:"1px solid #bbf7d0",background:"#f0fdf4",borderRadius:14,padding:16}}>
   <b style={{color:"#166534"}}>Your secure payment session is ready</b>
   <p style={{fontSize:13,lineHeight:1.6,color:"#166534",margin:"6px 0 14px"}}>Continue to the payment partner to choose your preferred enabled method and complete payment.</p>
   <button type="button" className="pg-btn pg-btn-block" onClick={continuePayment} style={{background:"#ff6801",borderColor:"#ff6801",color:"#fff",minHeight:48}}>Continue securely to payment <span aria-hidden="true">→</span></button>
   <div style={{textAlign:"center",fontSize:11,color:"#166534",marginTop:10}}>Payment partner: {result.gatewayName||"Configured gateway"}</div>
  </div>}
  {result&&!result.ok&&<div role="alert" style={{marginTop:20,padding:16,borderRadius:12,border:"1px solid #fecaca",background:"#fef2f2"}}><b style={{color:"#991b1b"}}>Payment session unavailable</b><p style={{color:"#991b1b",fontSize:13,lineHeight:1.6}}>{message||result.message||"Please check the gateway configuration and try again."}</p><button type="button" className="pg-btn pg-btn-line" disabled={loading} onClick={()=>void pay()}>{loading?"Trying…":"Try again"}</button></div>}
  {message&&<p role="alert" className="form-error">{message}</p>}
  <div style={{display:"flex",alignItems:"center",gap:9,marginTop:22,fontSize:12,lineHeight:1.6,color:"var(--muted,#64748b)"}}><span aria-hidden="true">🛡️</span><span>We never ask for your mobile banking PIN, OTP or card PIN on this website. Complete sensitive payment steps only on the secure payment partner page.</span></div>
 </>}
 </div></section></div>
}
