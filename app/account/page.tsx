"use client";import {useEffect,useState} from "react";import Link from "next/link";import StoreHeader from "@/components/StoreHeader";import StoreFooter from "@/components/StoreFooter";import {Icon} from "@/components/Icons";
const tone=(s:string)=>s==="PAID"||s==="DELIVERED"||s==="CONFIRMED"?"ok":s==="FAILED"||s==="CANCELLED"||s==="REFUNDED"?"bad":"wait";
export default function Account(){
 const [user,setUser]=useState<any>(null),[isAdmin,setIsAdmin]=useState(false),[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{Promise.all([fetch("/api/customer/auth/me").then(r=>r.json()),fetch("/api/account/orders").then(r=>r.json())]).then(([u,o])=>{setUser(u.user);setIsAdmin(!!u.isAdmin);setOrders(Array.isArray(o)?o:[])}).finally(()=>setLoading(false))},[]);
 async function logout(){await fetch("/api/customer/auth/logout",{method:"POST"});location.href="/account/login"}
 if(loading)return <><StoreHeader/><main className="pg"><p>Loading account...</p></main><StoreFooter/></>;
 if(!user)return <><StoreHeader/><main className="pg"><div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="user" size={26}/></span><h2>My account</h2><p>Please log in to view your orders.</p><Link href="/account/login" className="pg-btn">Log in</Link></div></main><StoreFooter/></>;
 return <><StoreHeader/><main className="pg">
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>My account</b></nav>
  <div className="pg-card ac-me"><span className="ac-av" aria-hidden="true">{String(user.name||user.email||"?").charAt(0).toUpperCase()}</span><div><h1>{user.name}</h1><p>{user.email}</p></div><div className="ac-btns">{isAdmin&&<Link href="/admin/login" className="pg-btn pg-btn-navy">Admin panel</Link>}<button type="button" className="pg-btn pg-btn-line" onClick={logout}>Log out</button></div></div>
  <div className="hp-sec-h hp-tab ac-h"><h2>My orders</h2></div>
  {!orders.length?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="bag" size={26}/></span><h2>No orders yet</h2><p>When you place an order it will appear here.</p><Link href="/products" className="pg-btn">Start shopping</Link></div>:
  <div className="ac-orders">{orders.map(o=><div key={o.id} className="pg-card ac-order">
   <div className="ac-order-top"><b>{o.orderNumber}</b><strong>৳{o.total.toLocaleString("en-BD")}</strong></div>
   <div className="ac-tags"><span className={"tag "+tone(o.paymentStatus)}>Payment: {o.paymentStatus}</span><span className={"tag "+tone(o.status)}>Status: {o.status}</span></div>
   <small>{new Date(o.createdAt).toLocaleString()}</small>
   <ul>{o.items.map((i:any)=><li key={i.id}>{i.name} × {i.quantity}</li>)}</ul></div>)}</div>}
 </main><StoreFooter/></>}
