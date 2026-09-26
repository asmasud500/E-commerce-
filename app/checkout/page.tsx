"use client";
import {useEffect,useState} from "react";
import {getCart,saveCart,type CartItem} from "@/lib/cart";
import Link from "next/link";

export default function Checkout(){
 const [items,setItems]=useState<CartItem[]>([]);
 const [form,setForm]=useState({customerName:"",customerPhone:"",customerEmail:"",shippingAddress:""});
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(false);
 useEffect(()=>setItems(getCart()),[]);
 const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0);
 const shipping=subtotal>=3000?0:120;
 async function submit(e:React.FormEvent){
  e.preventDefault(); setLoading(true); setMessage("");
  const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,items:items.map(i=>({productId:i.productId,quantity:i.quantity}))})});
  const data=await res.json();
  if(res.ok){saveCart([]); window.location.href="/order-success?order="+encodeURIComponent(data.orderNumber);}
  else setMessage(data.error||"Order failed");
  setLoading(false);
 }
 return <main style={{maxWidth:900,margin:"auto",padding:32}}>
  <Link href="/cart">← Cart</Link><h1>Checkout</h1>
  <p>Subtotal: ৳{subtotal.toLocaleString("en-BD")} · Shipping: ৳{shipping.toLocaleString("en-BD")} · <b>Total: ৳{(subtotal+shipping).toLocaleString("en-BD")}</b></p>
  {items.length===0?<p>Your cart is empty. <Link href="/products">Shop products</Link></p>:
  <form onSubmit={submit} style={{display:"grid",gap:14,maxWidth:600}}>
   <input required placeholder="Full name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/>
   <input required placeholder="Phone number" value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/>
   <input type="email" placeholder="Email (optional)" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/>
   <textarea required placeholder="Full shipping address" rows={5} value={form.shippingAddress} onChange={e=>setForm({...form,shippingAddress:e.target.value})}/>
   {message&&<p>{message}</p>}
   <button disabled={loading} type="submit">{loading?"Creating order...":"Place Order"}</button>
  </form>}
 </main>
}
