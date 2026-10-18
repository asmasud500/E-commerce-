"use client";
import{useEffect,useState}from"react";import Link from"next/link";import StoreHeader from"@/components/StoreHeader";import StoreFooter from"@/components/StoreFooter";import{Icon}from"@/components/Icons";
export default function Wishlist(){
 const[w,setW]=useState<any[]>([]),[loading,setLoading]=useState(true);
 async function load(){const r=await fetch("/api/wishlist");if(r.ok)setW(await r.json());setLoading(false)}
 useEffect(()=>{load()},[]);
 async function remove(id:string){await fetch("/api/wishlist?productId="+encodeURIComponent(id),{method:"DELETE"});load()}
 if(loading)return <><StoreHeader/><main className="pg"><p>Loading wishlist...</p></main><StoreFooter/></>;
 return <><StoreHeader/><main className="pg">
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>Wishlist</b></nav>
  <div className="pg-head"><div><h1>Wishlist</h1><p>Keep your favorite products close.</p></div><Link href="/products" className="hp-more">Continue shopping <Icon name="chevronRight" size={16}/></Link></div>
  {!w.length?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="heart" size={26}/></span><h2>Your wishlist is empty</h2><p>Save products you want to come back to later.</p><Link href="/products" className="pg-btn">Browse products</Link></div>:
  <div className="pc-grid">{w.map(x=><div key={x.id} className="hp-pc">
   <div className="hp-pm"><Link href={"/products/"+x.product.slug} className="hp-pm-link" aria-label={x.product.name}>{x.product.images?.[0]?<img src={x.product.images[0].url} alt={x.product.images[0].alt||x.product.name} loading="lazy" decoding="async"/>:<span className="hp-ph" aria-hidden="true">{x.product.name.charAt(0).toUpperCase()}</span>}</Link></div>
   <div className="hp-pb"><small>{x.product.category?.name||"Product"}</small><Link href={"/products/"+x.product.slug} className="hp-pt">{x.product.name}</Link><div className="hp-price"><strong>৳{Number(x.product.salePrice??x.product.price).toLocaleString("en-BD")}</strong></div>
   <div className="wl-actions"><Link href={"/products/"+x.product.slug} className="pg-btn">View</Link><button type="button" className="pg-btn pg-btn-line" onClick={()=>remove(x.productId)}>Remove</button></div></div></div>)}</div>}
 </main><StoreFooter/></>}
