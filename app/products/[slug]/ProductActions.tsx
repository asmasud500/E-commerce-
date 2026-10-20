"use client";
import Link from "next/link";
import {useState} from "react";
import {addToCart} from "@/lib/cart";
import {Icon} from "@/components/Icons";
import {resolveProductVariant} from "@/lib/product-variants";
type P={id:string;name:string;slug:string;sku:string;price:number;salePrice:any;stock:number;description:string|null;compareAtPrice:any;imageUrl?:string|null;variants?:any[]};
type Opt={name:string;values:string[]};
export default function ProductActions({p,options=[]}:{p:P;options?:Opt[]}){
 const [sel,setSel]=useState<Record<string,string>>({}),[err,setErr]=useState("");
 const [qty,setQty]=useState(1),[added,setAdded]=useState(false);
 const hasVariants=Array.isArray(p.variants)&&p.variants.length>0;
 const variant=resolveProductVariant(p.variants,sel);
 const activeStock=hasVariants?(variant?Number(variant.stock):0):p.stock;
 const activePrice=hasVariants?(variant?Number(variant.salePrice!=null&&Number(variant.salePrice)<Number(variant.price)?variant.salePrice:variant.price):null):Number(p.price);
 const maxQty=Math.max(1,Math.min(100,activeStock));
 function put(){
  const miss=options.find(o=>!sel[o.name]);
  if(miss){setErr("Please choose "+miss.name);return false}
  if(hasVariants&&!variant){setErr("This size/colour combination is unavailable.");return false}
  if(activeStock<1){setErr("This variant is out of stock.");return false}
  setErr("");
  addToCart({productId:p.id,name:p.name,price:Number(activePrice??p.price),quantity:Math.min(qty,maxQty),sku:variant?.sku||p.sku,imageUrl:p.imageUrl,stock:activeStock,...(options.length?{options:sel}:{})});
  return true;
 }
 function add(){if(put())setAdded(true)}
 function buyNow(){if(put())window.location.href="/checkout"}
 return <div>
  {options.map(o=><div key={o.name} className="pd-qty-row"><span className="pd-label">{o.name}</span><div className="pd-opts">{o.values.map(v=><button key={v} type="button" className={"pd-opt"+(sel[o.name]===v?" on":"")} aria-pressed={sel[o.name]===v} onClick={()=>{setSel({...sel,[o.name]:v});setErr("");setAdded(false)}}>{v}</button>)}</div></div>)}
  {hasVariants&&<div className="pd-variant-summary" aria-live="polite">{variant?<><strong>৳{Number(activePrice).toLocaleString("en-BD")}</strong><span>{activeStock>0?activeStock+" available":"Out of stock"}</span></>:<span>Choose options to see variant price and availability.</span>}</div>}
  {err&&<p role="alert" className="form-error">{err}</p>}
  <div className="pd-qty-row"><span className="pd-label">Quantity</span><div className="pd-qty"><button type="button" disabled={qty<=1} aria-label="Decrease quantity" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span aria-live="polite">{qty}</span><button type="button" disabled={qty>=maxQty} aria-label="Increase quantity" onClick={()=>setQty(Math.min(maxQty,qty+1))}>+</button></div></div>
  <div className="pd-actions"><button type="button" className="pg-btn pg-btn-line" disabled={hasVariants?!variant||activeStock<1:p.stock<1} onClick={add}><Icon name="cart" size={18}/>{added?"Added to cart":"Add to cart"}</button><button type="button" className="pg-btn" disabled={hasVariants?!variant||activeStock<1:p.stock<1} onClick={buyNow}>Buy now</button></div>
  {added&&<p className="pd-added" role="status"><Icon name="check" size={16}/> Added to your cart. <Link href="/cart">View cart →</Link></p>}
 </div>
}
