"use client";
import {useEffect,useState} from "react";
import {getCart,saveCart,type CartItem} from "@/lib/cart";
import Link from "next/link";
type Gateway={id:string;name:string;type:string;mode:string;qrImageUrl:string|null};
export default function Checkout(){
 const [items,setItems]=useState<CartItem[]>([]),[gateways,setGateways]=useState<Gateway[]>([]);
 const [gatewayId,setGatewayId]=useState("");
 const [form,setForm]=useState({customerName:"",customerPhone:"",customerEmail:"",shippingAddress:""});
 const [message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{setItems(getCart());fetch("/api/payment-gateways").then(r=>r.json()).then((g:Gateway[])=>{setGateways(g);if(g[0])setGatewayId(g[0].id)})},[]);
 const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0),shipping=subtotal>=3000?0:120,total=subtotal+shipping;
 async function submit(e:React.FormEvent){e.preventDefault();if(!gatewayId){setMessage("Please select a payment method.");return}setLoading(true);setMessage("");
  const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,paymentGatewayId:gatewayId,items:items.map(i=>({productId:i.productId,quantity:i.quantity}))})});
  const data=await res.json();if(res.ok){sessionStorage.setItem("lastOrderId",data.orderId);saveCart([]);window.location.href="/checkout/payment?order="+encodeURIComponent(data.orderId)}else setMessage(data.error||"Order failed");setLoading(false);
 }
 return <main style={{maxWidth:900,margin:"auto",padding:32}}><Link href="/cart">← Cart</Link><h1>Checkout</h1>
  <p>Subtotal: ৳{subtotal.toLocaleString("en-BD")} · Shipping: ৳{shipping.toLocaleString("en-BD")} · <b>Total: ৳{total.toLocaleString("en-BD")}</b></p>
  {items.length===0?<p>Your cart is empty. <Link href="/products">Shop products</Link></p>:<form onSubmit={submit} style={{display:"grid",gap:14,maxWidth:600}}>
   <input required placeholder="Full name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/>
   <input required placeholder="Phone number" value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/>
   <input type="email" placeholder="Email (optional)" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/>
   <textarea required placeholder="Full shipping address" rows={5} value={form.shippingAddress} onChange={e=>setForm({...form,shippingAddress:e.target.value})}/>
   <fieldset><legend>Payment method</legend>{gateways.length?gateways.map(g=><label key={g.id} style={{display:"block",padding:10}}><input type="radio" name="gateway" checked={gatewayId===g.id} onChange={()=>setGatewayId(g.id)}/> {g.name} {g.mode==="SANDBOX"?"(Sandbox)":""}</label>):<p>No payment method is currently available.</p>}</fieldset>
   {message&&<p>{message}</p>}<button disabled={loading||!gateways.length} type="submit">{loading?"Creating order...":"Continue to payment"}</button>
  </form>}</main>
}
