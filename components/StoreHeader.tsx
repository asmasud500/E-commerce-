"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Icon} from "@/components/Icons";
import {getCart} from "@/lib/cart";

type Cat={name:string;slug:string};

export default function StoreHeader({categories}:{categories?:Cat[]}){
  const [count,setCount]=useState(0);
  const [cats,setCats]=useState<Cat[]>(categories||[]);

  useEffect(()=>{
    const sync=()=>setCount(getCart().reduce((n,i)=>n+i.quantity,0));
    sync();
    window.addEventListener("cart:updated",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("cart:updated",sync);window.removeEventListener("storage",sync)};
  },[]);

  useEffect(()=>{
    if(categories?.length)return;
    let off=false;
    fetch("/api/categories").then(r=>r.ok?r.json():[]).then(d=>{if(!off&&Array.isArray(d))setCats(d)}).catch(()=>{});
    return()=>{off=true};
  },[categories]);

  return (
    <header className="sh">
      <div className="sh-in">
        <Link href="/" className="sh-logo" aria-label="Store home">STORE<span>.</span></Link>
        <form action="/products" method="get" role="search" className="sh-search">
          <select name="category" defaultValue="" aria-label="Search category">
            <option value="">All categories</option>
            {cats.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <input name="q" type="search" placeholder="Search for products, brands and more" aria-label="Search products" autoComplete="off"/>
          <button type="submit" aria-label="Search"><Icon name="search" size={18}/><span>Search</span></button>
        </form>
        <nav className="sh-actions" aria-label="Account and cart">
          <Link href="/account" className="sh-act"><Icon name="user" size={22}/><span>Account</span></Link>
          <Link href="/wishlist" className="sh-act"><Icon name="heart" size={22}/><span>Wishlist</span></Link>
          <Link href="/cart" className="sh-act" aria-label={count?`Cart, ${count} items`:"Cart"}>
            <Icon name="cart" size={22}/><span>Cart</span>
            {count>0&&<b className="sh-badge">{count>99?"99+":count}</b>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
