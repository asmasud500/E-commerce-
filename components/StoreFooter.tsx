"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

export default function StoreFooter(){
  const [storeName,setStoreName]=useState("MART Store");
  const [supportEmail,setSupportEmail]=useState("");
  const [supportPhone,setSupportPhone]=useState("");

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/storefront/config",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(cancelled||!data?.settings)return;
        if(typeof data.settings.storeName==="string"&&data.settings.storeName.trim())setStoreName(data.settings.storeName.trim());
        if(typeof data.settings.supportEmail==="string")setSupportEmail(data.settings.supportEmail.trim());
        if(typeof data.settings.supportPhone==="string")setSupportPhone(data.settings.supportPhone.trim());
      }).catch(()=>{});
    return()=>{cancelled=true};
  },[]);

  return (
    <footer className="sf">
      <div className="sf-in">
        <div className="sf-brand">
          <Link href="/" className="sh-logo" aria-label={storeName+" home"}><span className="sh-logo-name">{storeName}</span><span className="sh-logo-dot">.</span></Link>
          <p>Quality products, simple shopping.</p>
          <small className="sf-trust-note">A smoother way to shop online.</small>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/products">All products</Link>
          <Link href="/products?featured=true">Featured products</Link>
          <Link href="/cart">Shopping cart</Link>
        </div>
        <div>
          <h3>Your account</h3>
          <Link href="/account">Orders and profile</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/products">Continue shopping</Link>
        </div>
        <div className="sf-contact">
          <h3>Customer support</h3>
          {supportPhone&&<a href={"tel:"+supportPhone}>Phone: {supportPhone}</a>}
          {supportEmail&&<a href={"mailto:"+supportEmail}>Email: {supportEmail}</a>}
          {!supportPhone&&!supportEmail&&<p>For order assistance, visit your account or check your order details.</p>}
        </div>
        <small className="sf-copyright">© {new Date().getFullYear()} {storeName}. All rights reserved.</small>
      </div>
    </footer>
  );
}
