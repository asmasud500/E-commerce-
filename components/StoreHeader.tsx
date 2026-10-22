"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Icon} from "@/components/Icons";
import {getCart} from "@/lib/cart";

type Cat={name:string;slug:string};

export default function StoreHeader({categories}:{categories?:Cat[]}){
  const [count,setCount]=useState(0);
  const [cats,setCats]=useState<Cat[]>(categories||[]);
  const [storeName,setStoreName]=useState("MART Store");
  const [logoUrl,setLogoUrl]=useState("");
  const [announcement,setAnnouncement]=useState("");

  useEffect(()=>{
    const sync=()=>setCount(getCart().reduce((n,i)=>n+i.quantity,0));
    sync();
    window.addEventListener("cart:updated",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("cart:updated",sync);window.removeEventListener("storage",sync)};
  },[]);

  useEffect(()=>{
    let off=false;
    fetch("/api/storefront/config",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(off||!d?.settings)return;const name=typeof d.settings.storeName==="string"?d.settings.storeName.trim():"";if(name)setStoreName(name);if(typeof d.settings.logoUrl==="string")setLogoUrl(d.settings.logoUrl.trim());if(typeof d.settings.announcement==="string")setAnnouncement(d.settings.announcement.trim())}).catch(()=>{});
    return()=>{off=true};
  },[]);

  useEffect(()=>{
    if(categories?.length)return;
    let off=false;
    fetch("/api/categories").then(r=>r.ok?r.json():[]).then(d=>{if(!off&&Array.isArray(d))setCats(d)}).catch(()=>{});
    return()=>{off=true};
  },[categories]);

  return (
    <>
    {announcement&&<div className="sh-announcement"><span aria-hidden="true">✦</span>{announcement}</div>}
    <header className="sh">
      <div className="sh-in">
        <Link href="/" className="sh-logo" aria-label={`${storeName} home`}>{logoUrl&&<img className="sh-logo-image" src={logoUrl} alt="" /> }<span className="sh-logo-name">{storeName}</span>{!logoUrl&&<span className="sh-logo-dot">.</span>}</Link>
        <form action="/products" method="get" role="search" className="sh-search">
          <select name="category" defaultValue="" aria-label="Search category">
            <option value="">All categories</option>
            {cats.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <input name="q" type="search" placeholder="Search for products, brands and more" aria-label="Search products" autoComplete="off"/>
          <button type="submit" aria-label="Search"><Icon name="search" size={18}/><span>Search</span></button>
        </form>
        <nav className="sh-actions" aria-label="Account and cart">
          <Link href="/track" className="sh-act"><Icon name="truck" size={22}/><span>Track</span></Link>
          <Link href="/account" className="sh-act"><Icon name="user" size={22}/><span>Account</span></Link>
          <Link href="/wishlist" className="sh-act"><Icon name="heart" size={22}/><span>Wishlist</span></Link>
          <Link href="/cart" className="sh-act" aria-label={count?`Cart, ${count} items`:"Cart"}>
            <Icon name="cart" size={22}/><span>Cart</span>
            {count>0&&<b className="sh-badge">{count>99?"99+":count}</b>}
          </Link>
        </nav>
      </div>
    </header>
    <nav className="sh-subnav" aria-label="Main shopping navigation">
      <div className="sh-subnav-in">
        <Link href="/products" className="sh-all-cats"><Icon name="menu" size={17}/> All Categories</Link>
        <Link href="/products?featured=true">Featured</Link>
        <Link href="/products">New Arrivals</Link>
        <Link href="/products">Deals & Offers</Link>
        <span className="sh-subnav-spacer"/>
        <span className="sh-delivery"><Icon name="mapPin" size={15}/> Shopping across Bangladesh</span>
      </div>
    </nav>
    </>
  );
}
