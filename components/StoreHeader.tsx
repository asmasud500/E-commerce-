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
  const [announcement,setAnnouncement]=useState("");
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    const sync=()=>setCount(getCart().reduce((n,i)=>n+i.quantity,0));
    sync();
    window.addEventListener("cart:updated",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("cart:updated",sync);window.removeEventListener("storage",sync)};
  },[]);

  useEffect(()=>{
    let off=false;
    fetch("/api/storefront/config",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(off||!d?.settings)return;const name=typeof d.settings.storeName==="string"?d.settings.storeName.trim():"";if(name)setStoreName(name);if(typeof d.settings.announcement==="string")setAnnouncement(d.settings.announcement.trim())}).catch(()=>{});
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
        <button type="button" className="sh-mobile-menu-toggle" aria-label={menuOpen?"Close shopping menu":"Open shopping menu"} aria-expanded={menuOpen} aria-controls="sh-mobile-menu" onClick={()=>setMenuOpen(v=>!v)}><Icon name="menu" size={21}/><span>Menu</span></button>
        <Link href="/" className="sh-logo" aria-label={`${storeName} home`}><span className="sh-logo-name">{storeName}</span><span className="sh-logo-dot">.</span></Link>
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
    {menuOpen&&<nav id="sh-mobile-menu" className="sh-mobile-menu" aria-label="Mobile shopping menu">
      <div className="sh-mobile-menu-head"><strong>Shop by category</strong><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close menu">×</button></div>
      <Link href="/products" className="sh-mobile-menu-all" onClick={()=>setMenuOpen(false)}>Browse all products <span>→</span></Link>
      <div className="sh-mobile-menu-section">
        <p>Categories</p>
        {cats.length>0?cats.map(c=><Link key={c.slug} href={"/products?category="+encodeURIComponent(c.slug)} onClick={()=>setMenuOpen(false)}><span className="sh-mobile-menu-category-icon">▦</span><span>{c.name}</span><span className="sh-mobile-menu-arrow">›</span></Link>):<Link href="/products" onClick={()=>setMenuOpen(false)}><span>All products</span><span className="sh-mobile-menu-arrow">›</span></Link>}
      </div>
      <div className="sh-mobile-menu-section">
        <p>Discover</p>
        <Link href="/products?featured=true" onClick={()=>setMenuOpen(false)}>Featured <span className="sh-mobile-menu-arrow">›</span></Link>
        <Link href="/products" onClick={()=>setMenuOpen(false)}>New Arrivals <span className="sh-mobile-menu-arrow">›</span></Link>
        <Link href="/products" onClick={()=>setMenuOpen(false)}>Deals &amp; Offers <span className="sh-mobile-menu-arrow">›</span></Link>
      </div>
      <div className="sh-mobile-menu-section sh-mobile-menu-account">
        <p>Your shopping</p>
        <Link href="/track" onClick={()=>setMenuOpen(false)}>Track an order <span className="sh-mobile-menu-arrow">›</span></Link>
        <Link href="/account" onClick={()=>setMenuOpen(false)}>My account <span className="sh-mobile-menu-arrow">›</span></Link>
        <Link href="/wishlist" onClick={()=>setMenuOpen(false)}>Wishlist <span className="sh-mobile-menu-arrow">›</span></Link>
        <Link href="/cart" onClick={()=>setMenuOpen(false)}>Shopping cart <span className="sh-mobile-menu-arrow">›</span></Link>
      </div>
    </nav>}
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
