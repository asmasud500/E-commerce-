"use client";
import Link from "next/link";
import {useState} from "react";
import {addToCart} from "@/lib/cart";
import {Icon} from "@/components/Icons";
type P={id:string;name:string;slug:string;sku:string;price:number;salePrice:any;stock:number;description:string|null;compareAtPrice:any;imageUrl?:string|null};
export default function ProductActions({p}:{p:P}){
 const [qty,setQty]=useState(1),[added,setAdded]=useState(false);
 const maxQty=Math.max(1,Math.min(100,p.stock));
 function put(){addToCart({productId:p.id,name:p.name,price:Number(p.price),quantity:Math.min(qty,maxQty),sku:p.sku,imageUrl:p.imageUrl,stock:p.stock})}
 function add(){if(p.stock<1)return;put();setAdded(true)}
 function buyNow(){if(p.stock<1)return;put();window.location.href="/checkout"}
 return <div>
  <div className="pd-qty-row"><span className="pd-label">Quantity</span>
   <div className="pd-qty">
    <button type="button" disabled={qty<=1} aria-label="Decrease quantity" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span aria-live="polite">{qty}</span>
    <button type="button" disabled={qty>=maxQty} aria-label="Increase quantity" onClick={()=>setQty(Math.min(maxQty,qty+1))}>+</button>
   </div>
  </div>
  <div className="pd-actions">
   <button type="button" className="pg-btn pg-btn-line" disabled={!p.stock} onClick={add}><Icon name="cart" size={18}/>{added?"Added to cart":"Add to cart"}</button>
   <button type="button" className="pg-btn" disabled={!p.stock} onClick={buyNow}>Buy now</button>
  </div>
  {added&&<p className="pd-added" role="status"><Icon name="check" size={16}/> Added to your cart. <Link href="/cart">View cart →</Link></p>}
 </div>
}
