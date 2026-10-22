"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

export default function StoreFooter(){
  const [storeName,setStoreName]=useState("MART Store");
  const [supportEmail,setSupportEmail]=useState("");
  const [supportPhone,setSupportPhone]=useState("");
  const [tagline,setTagline]=useState("Quality products, simple shopping.");
  const [address,setAddress]=useState("");
  const [whatsapp,setWhatsapp]=useState("");
  const [facebookUrl,setFacebookUrl]=useState("");
  const [instagramUrl,setInstagramUrl]=useState("");
  const [youtubeUrl,setYoutubeUrl]=useState("");
  const [openingHours,setOpeningHours]=useState("");
  const [footerNote,setFooterNote]=useState("A smoother way to shop online.");
  const [copyrightText,setCopyrightText]=useState("");

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/storefront/config",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(cancelled||!data?.settings)return;
        if(typeof data.settings.storeName==="string"&&data.settings.storeName.trim())setStoreName(data.settings.storeName.trim());
        if(typeof data.settings.supportEmail==="string")setSupportEmail(data.settings.supportEmail.trim());
        if(typeof data.settings.supportPhone==="string")setSupportPhone(data.settings.supportPhone.trim());
        if(typeof data.settings.tagline==="string"&&data.settings.tagline.trim())setTagline(data.settings.tagline.trim());
        const link=(v:any)=>typeof v==="string"&&/^https:\/\//.test(v)?v.trim():"";
        setInstagramUrl(link(data.settings.instagramUrl));setYoutubeUrl(link(data.settings.youtubeUrl));
        if(typeof data.settings.openingHours==="string")setOpeningHours(data.settings.openingHours.trim());
        if(typeof data.settings.footerNote==="string"&&data.settings.footerNote.trim())setFooterNote(data.settings.footerNote.trim());
        if(typeof data.settings.copyrightText==="string")setCopyrightText(data.settings.copyrightText.trim());
        if(typeof data.settings.address==="string")setAddress(data.settings.address.trim());
        if(typeof data.settings.whatsapp==="string")setWhatsapp(data.settings.whatsapp.replace(/[^0-9]/g,""));
        if(typeof data.settings.facebookUrl==="string"&&/^https:\/\//.test(data.settings.facebookUrl))setFacebookUrl(data.settings.facebookUrl.trim());
      }).catch(()=>{});
    return()=>{cancelled=true};
  },[]);

  return (
    <footer className="sf">
      <div className="sf-in">
        <div className="sf-brand">
          <Link href="/" className="sh-logo" aria-label={storeName+" home"}><span className="sh-logo-name">{storeName}</span><span className="sh-logo-dot">.</span></Link>
          <p>{tagline}</p>
          <small className="sf-trust-note">{footerNote}</small>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/products">All products</Link>
          <Link href="/products?featured=true">Featured products</Link>
          <Link href="/cart">Shopping cart</Link>
        </div>
        <div>
          <h3>Your account</h3>
          <Link href="/track">Track your order</Link>
          <Link href="/account">Orders and profile</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/products">Continue shopping</Link>
        </div>
        <div className="sf-contact">
          <h3>Customer support</h3>
          {supportPhone&&<a href={"tel:"+supportPhone}>Phone: {supportPhone}</a>}
          {supportEmail&&<a href={"mailto:"+supportEmail}>Email: {supportEmail}</a>}
          {whatsapp&&<a href={"https://wa.me/"+whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp: +{whatsapp}</a>}
          {facebookUrl&&<a href={facebookUrl} target="_blank" rel="noopener noreferrer">Facebook page</a>}
          {instagramUrl&&<a href={instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>}
          {youtubeUrl&&<a href={youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>}
          {openingHours&&<p>Hours: {openingHours}</p>}
          {address&&<p>{address}</p>}
          {!supportPhone&&!supportEmail&&!whatsapp&&!facebookUrl&&!instagramUrl&&!youtubeUrl&&!address&&!openingHours&&<p>For order assistance, visit your account or check your order details.</p>}
        </div>
        <nav className="sf-links" aria-label="Store policies"><Link href="/about">About us</Link><Link href="/contact">Contact</Link><Link href="/shipping-policy">Delivery</Link><Link href="/return-policy">Returns &amp; refunds</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
        <small className="sf-copyright">{copyrightText||`© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}</small>
      </div>
    </footer>
  );
}
