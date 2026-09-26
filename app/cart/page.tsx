"use client";
import Link from "next/link";
import {useState} from "react";

export default function Cart(){
 const [items]=useState<{name:string;price:number;qty:number}[]>([]);
 const subtotal=items.reduce((s,i)=>s+i.price*i.qty,0);
 return <main style={{maxWidth:900,margin:"auto",padding:32}}>
  <Link href="/products">← Continue shopping</Link><h1>Shopping Cart</h1>
  {items.length===0?<p>Your cart is empty. Products added from the catalog will appear here.</p>:<>
   {items.map((i,n)=><div key={n}>{i.name} × {i.qty} — ৳{i.price*i.qty}</div>)}
   <h2>Subtotal: ৳{subtotal}</h2><Link href="/checkout">Checkout</Link>
  </>}
 </main>
}