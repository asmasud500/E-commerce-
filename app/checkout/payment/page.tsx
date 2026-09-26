"use client";
import {useEffect,useState} from "react";
export default function PaymentPage(){
 const [orderId,setOrderId]=useState("");const [loading,setLoading]=useState(false);const [result,setResult]=useState<any>(null);
 useEffect(()=>{const id=sessionStorage.getItem("lastOrderId");if(id)setOrderId(id)},[]);
 async function pay(){setLoading(true);const r=await fetch("/api/payments/initiate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId})});setResult(await r.json());setLoading(false)}
 return <main style={{maxWidth:650,margin:"60px auto",padding:32}}><h1>Payment</h1>
  {!orderId?<p>Order information not found.</p>:<><p>Choose your configured payment method to continue.</p><button disabled={loading} onClick={pay}>{loading?"Starting payment...":"Continue to payment"}</button>
  {result?.qrImageUrl&&<div><h2>Bangla QR</h2><img src={result.qrImageUrl} alt="Bangla QR" style={{width:260}}/><p>Reference: {result.reference}</p></div>}
  {result?.paymentUrl&&<a href={result.paymentUrl}>Open payment page</a>}{result?.message&&<p>{result.message}</p>}</>}
 </main>
}
