"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {Icon} from "@/components/Icons";
import {getCart} from "@/lib/cart";

const TABS=[
  {href:"/",label:"Home",icon:"store"},
  {href:"/products",label:"Shop",icon:"search"},
  {href:"/wishlist",label:"Wishlist",icon:"heart"},
  {href:"/cart",label:"Bag",icon:"bag"},
  {href:"/account",label:"Account",icon:"user"},
];

/** Thumb-reach navigation for phones. Hidden on admin and checkout screens. */
export default function MobileNav(){
  const path=usePathname()||"/";
  const [count,setCount]=useState(0);
  useEffect(()=>{
    const sync=()=>setCount(getCart().reduce((n,i)=>n+i.quantity,0));
    sync();
    window.addEventListener("cart:updated",sync);
    window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("cart:updated",sync);window.removeEventListener("storage",sync)};
  },[]);
  if(path.startsWith("/admin")||path.startsWith("/checkout"))return null;
  const active=(href:string)=>href==="/"?path==="/":path===href||path.startsWith(href+"/");
  return (
    <nav className="mnav" aria-label="Main">
      {TABS.map(t=>(
        <Link key={t.href} href={t.href} className={"mnav-item"+(active(t.href)?" is-active":"")} aria-current={active(t.href)?"page":undefined}>
          <span className="mnav-ic"><Icon name={t.icon} size={22}/>{t.href==="/cart"&&count>0&&<b className="mnav-badge">{count>99?"99+":count}</b>}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
