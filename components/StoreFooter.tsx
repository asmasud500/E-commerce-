"use client";
import Link from "next/link";
import {useEffect,useState} from "react";


const ICONS={
  phone:<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
  mail:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  whatsapp:<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
  facebook:<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>,
  instagram:<><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
  youtube:<><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></>
};

export default function StoreFooter(){
  const [storeName,setStoreName]=useState("MART Store");\n  const [logoUrl,setLogoUrl]=useState("");\n  const [shopHeading,setShopHeading]=useState("Shop");\n  const [accountHeading,setAccountHeading]=useState("Your account");\n  const [supportHeading,setSupportHeading]=useState("Customer support");
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
        if(typeof data.settings.storeName==="string"&&data.settings.storeName.trim())setStoreName(data.settings.storeName.trim());\n        if(typeof data.settings.logoUrl==="string")setLogoUrl(data.settings.logoUrl.trim());\n        if(typeof data.settings.footerShopHeading==="string"&&data.settings.footerShopHeading.trim())setShopHeading(data.settings.footerShopHeading.trim());\n        if(typeof data.settings.footerAccountHeading==="string"&&data.settings.footerAccountHeading.trim())setAccountHeading(data.settings.footerAccountHeading.trim());\n        if(typeof data.settings.footerSupportHeading==="string"&&data.settings.footerSupportHeading.trim())setSupportHeading(data.settings.footerSupportHeading.trim());
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

  const socials:{name:string;label:string;href:string;icon:any;external:boolean}[]=[
    ...(supportPhone?[{name:"Call us",label:"Call our support line",href:"tel:"+supportPhone.replace(/[^0-9+]/g,""),icon:ICONS.phone,external:false}]:[]),
    ...(whatsapp?[{name:"WhatsApp",label:"Chat with us on WhatsApp",href:"https://wa.me/"+whatsapp,icon:ICONS.whatsapp,external:true}]:[]),
    ...(supportEmail?[{name:"Email",label:"Email our support team",href:"mailto:"+supportEmail,icon:ICONS.mail,external:false}]:[]),
    ...(facebookUrl?[{name:"Facebook",label:"Visit our Facebook page",href:facebookUrl,icon:ICONS.facebook,external:true}]:[]),
    ...(instagramUrl?[{name:"Instagram",label:"Visit our Instagram page",href:instagramUrl,icon:ICONS.instagram,external:true}]:[]),
    ...(youtubeUrl?[{name:"YouTube",label:"Visit our YouTube channel",href:youtubeUrl,icon:ICONS.youtube,external:true}]:[]),
  ];
  return (
    <footer className="sf">
      <div className="sf-in">
        <div className="sf-brand">
          <Link href="/" className="sh-logo" aria-label={storeName+" home"}>{logoUrl&&<img className="sh-logo-image" src={logoUrl} alt="" />}<span className="sh-logo-name">{storeName}</span>{!logoUrl&&<span className="sh-logo-dot">.</span>}</Link>
          <p>{tagline}</p>
          <small className="sf-trust-note">{footerNote}</small>
        </div>
        <div>
          <h3>{shopHeading}</h3>
          <Link href="/products">All products</Link>
          <Link href="/products?featured=true">Featured products</Link>
          <Link href="/cart">Shopping cart</Link>
        </div>
        <div>
          <h3>{accountHeading}</h3>
          <Link href="/track">Track your order</Link>
          <Link href="/account">Orders and profile</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/products">Continue shopping</Link>
        </div>
        <div className="sf-contact">
          <h3>{supportHeading}</h3>
          {socials.length>0&&<div className="sf-social">{socials.map(x=><a key={x.name} href={x.href} className="sf-soc" aria-label={x.label} {...(x.external?{target:"_blank",rel:"noopener noreferrer"}:{})}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.icon}</svg><span>{x.name}</span></a>)}</div>}
          {address&&<p>{address}</p>}
          {openingHours&&<p>Hours: {openingHours}</p>}
          {socials.length===0&&!address&&!openingHours&&<p>For order assistance, visit your account or check your order details.</p>}
        </div>
        <nav className="sf-links" aria-label="Store policies"><Link href="/about">About us</Link><Link href="/contact">Contact</Link><Link href="/shipping-policy">Delivery</Link><Link href="/return-policy">Returns &amp; refunds</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
        <small className="sf-copyright">{copyrightText||`© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}</small>
      </div>
    </footer>
  );
}
