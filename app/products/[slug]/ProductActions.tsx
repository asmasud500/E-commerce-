"use client";
import Link from "next/link";
import {useState} from "react";
import {addToCart} from "@/lib/cart";
type P={id:string;name:string;slug:string;sku:string;price:number;salePrice:any;stock:number;description:string|null;compareAtPrice:any;imageUrl?:string|null};
export default function ProductActions({p}:{p:P}){
 const [qty,setQty]=useState(1),[added,setAdded]=useState(false);
 const maxQty=Math.max(1,Math.min(100,p.stock));
 function add(){if(p.stock<1)return;addToCart({productId:p.id,name:p.name,price:Number(p.price),quantity:Math.min(qty,maxQty),sku:p.sku,imageUrl:p.imageUrl,stock:p.stock});setAdded(true)}
 return <div><div style={{display:"flex",gap:8,alignItems:"center"}}>
   <button type="button" disabled={qty<=1} aria-label="Decrease quantity" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span>
   <button type="button" disabled={qty>=maxQty} aria-label="Increase quantity" onClick={()=>setQty(Math.min(maxQty,qty+1))}>+</button>
 </div><button disabled={!p.stock} onClick={add} style={{marginTop:14,padding:"12px 18px",background:"#111",color:"#fff",border:0,borderRadius:8}}>{added?"Added to cart":"Add to cart"}</button>{added&&<p><Link href="/cart">View cart →</Link></p>}</div>
}