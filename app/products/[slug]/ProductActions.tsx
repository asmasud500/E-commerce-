"use client";
import Link from "next/link";
import {useState} from "react";
import {addToCart} from "@/lib/cart";
import {Icon} from "@/components/Icons";
import {resolveProductVariant} from "@/lib/product-variants";
type P={id:string;name:string;slug:string;sku:string;price:number;salePrice:any;stock:number;description:string|null;compareAtPrice:any;imageUrl?:string|null;variants?:any[]};
type Opt={name:string;values:string[]};
type BulkRow={id:number;options:Record<string,string>;quantity:number};
export default function ProductActions({p,options=[]}:{p:P;options?:Opt[]}){
 const [sel,setSel]=useState<Record<string,string>>({}),[err,setErr]=useState("");
 const [qty,setQty]=useState(1),[added,setAdded]=useState(false),[bulkOpen,setBulkOpen]=useState(false),[bulkRows,setBulkRows]=useState<BulkRow[]>([{id:1,options:{},quantity:1}]),[bulkMessage,setBulkMessage]=useState("");
 const hasVariants=Array.isArray(p.variants)&&p.variants.length>0;
 const variant=resolveProductVariant(p.variants,sel);
 const activeStock=hasVariants?(variant?Number(variant.stock):0):p.stock;
 const activePrice=hasVariants?(variant?Number(variant.salePrice!=null&&Number(variant.salePrice)<Number(variant.price)?variant.salePrice:variant.price):null):Number(p.salePrice!=null&&Number(p.salePrice)<Number(p.price)?p.salePrice:p.price);
 const maxQty=Math.max(1,Math.min(100,activeStock));
 function put(){const miss=options.find(o=>!sel[o.name]);if(miss){setErr("Please choose "+miss.name);return false}if(hasVariants&&!variant){setErr("This variant combination is unavailable.");return false}if(activeStock<1){setErr("This variant is out of stock.");return false}setErr("");addToCart({productId:p.id,name:p.name,price:Number(activePrice??p.price),quantity:Math.min(qty,maxQty),sku:variant?.sku||p.sku,imageUrl:p.imageUrl,stock:activeStock,...(options.length?{options:sel}:{})});return true}
 function add(){if(put())setAdded(true)}
 function buyNow(){if(put())window.location.href="/checkout"}
 function changeBulk(id:number,key:string,value:string){setBulkRows(rows=>rows.map(r=>r.id===id?{...r,options:{...r.options,[key]:value}}:r));setBulkMessage("")}
 function addBulkRow(){if(bulkRows.length>=20)return;setBulkRows(rows=>[...rows,{id:Math.max(0,...rows.map(r=>r.id))+1,options:{},quantity:1}]);setBulkMessage("")}
 function addAllVariants(){if(!options.length){setBulkMessage("This product has no configurable options.");return}const prepared: {row:BulkRow;v:any;price:number;stock:number}[]=[];for(let i=0;i<bulkRows.length;i++){const row=bulkRows[i];const missing=options.find(o=>!row.options[o.name]);if(missing){setBulkMessage("Combination "+(i+1)+": choose "+missing.name+".");return}const v=resolveProductVariant(p.variants,row.options);if(hasVariants&&!v){setBulkMessage("Combination "+(i+1)+" is unavailable. Please choose another option combination.");return}const stock=hasVariants?Number(v?.stock||0):Number(p.stock);if(stock<1){setBulkMessage("Combination "+(i+1)+" is out of stock.");return}if(row.quantity<1||row.quantity>Math.min(100,stock)){setBulkMessage("Combination "+(i+1)+" quantity exceeds available stock.");return}const price=hasVariants?Number(v?.salePrice!=null&&Number(v.salePrice)<Number(v.price)?v.salePrice:v?.price??p.price):Number(p.salePrice!=null&&Number(p.salePrice)<Number(p.price)?p.salePrice:p.price);prepared.push({row,v,price,stock})}const keys=prepared.map(x=>Object.entries(x.row.options).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("|"));if(new Set(keys).size!==keys.length){setBulkMessage("Duplicate combinations found. Each row must use a different variant.");return}for(const x of prepared)addToCart({productId:p.id,name:p.name,price:x.price,quantity:x.row.quantity,sku:x.v?.sku||p.sku,imageUrl:p.imageUrl,stock:x.stock,...(options.length?{options:x.row.options}:{})});setBulkMessage(prepared.length+" variant combination(s) added to cart.");setAdded(true)}
 return <div>
  {options.map(o=><div key={o.name} className="pd-qty-row"><span className="pd-label">{o.name}</span><div className="pd-opts">{o.values.map(v=><button key={v} type="button" className={"pd-opt"+(sel[o.name]===v?" on":"")} aria-pressed={sel[o.name]===v} onClick={()=>{setSel({...sel,[o.name]:v});setErr("");setAdded(false)}}>{v}</button>)}</div></div>)}
  {hasVariants&&<div className="pd-variant-summary" aria-live="polite">{variant?<><strong>৳{Number(activePrice).toLocaleString("en-BD")}</strong><span>{activeStock>0?activeStock+" available":"Out of stock"}</span></>:<span>Choose options to see variant price and availability.</span>}</div>}
  {err&&<p role="alert" className="form-error">{err}</p>}
  <div className="pd-qty-row"><span className="pd-label">Quantity</span><div className="pd-qty"><button type="button" disabled={qty<=1} aria-label="Decrease quantity" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span aria-live="polite">{qty}</span><button type="button" disabled={qty>=maxQty} aria-label="Increase quantity" onClick={()=>setQty(Math.min(maxQty,qty+1))}>+</button></div></div>
  <div className="pd-actions"><button type="button" className="pg-btn pg-btn-line" disabled={hasVariants?!variant||activeStock<1:p.stock<1} onClick={add}><Icon name="cart" size={18}/>{added?"Added to Cart":"Add to Cart"}</button><button type="button" className="pg-btn" disabled={hasVariants?!variant||activeStock<1:p.stock<1} onClick={buyNow}>Buy Now</button></div>
  {options.length>0&&<section className="pd-card" style={{marginTop:16,padding:16,border:"1px solid var(--border, #e5e7eb)",borderRadius:12}}>
   <button type="button" className="pg-btn pg-btn-line" style={{width:"100%"}} onClick={()=>{setBulkOpen(!bulkOpen);setBulkMessage("")}}>{bulkOpen?"Hide multiple variants":"Buy multiple variants together"}</button>
   {bulkOpen&&<div style={{marginTop:14,display:"grid",gap:12}}>
    <p style={{margin:0,fontSize:14}}>Choose different combinations and quantities, then add them all to your cart in one step.</p>
    {bulkRows.map((row,index)=><div key={row.id} style={{display:"grid",gap:10,padding:12,border:"1px solid var(--border, #e5e7eb)",borderRadius:10}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong>Combination {index+1}</strong>{bulkRows.length>1&&<button type="button" className="remove-button" onClick={()=>setBulkRows(rows=>rows.filter(r=>r.id!==row.id))}>Remove Variant</button>}</div>
     {options.map(o=><label key={o.name} style={{display:"grid",gap:5,fontSize:13,fontWeight:600}}>{o.name}<select value={row.options[o.name]||""} onChange={e=>changeBulk(row.id,o.name,e.target.value)} style={{width:"100%",minHeight:42,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border, #d1d5db)",background:"var(--card, #fff)",color:"inherit"}}><option value="">Select {o.name}</option>{o.values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}
     <label style={{display:"grid",gap:5,fontSize:13,fontWeight:600}}>Quantity<input type="number" min={1} max={100} value={row.quantity} onChange={e=>{const n=Number(e.target.value);setBulkRows(rows=>rows.map(r=>r.id===row.id?{...r,quantity:Number.isFinite(n)?Math.max(1,Math.min(100,n)):1}:r));setBulkMessage("")}} style={{width:"100%",minHeight:42,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border, #d1d5db)",background:"var(--card, #fff)",color:"inherit"}}/></label>
    </div>)}
    <button type="button" className="pg-btn pg-btn-line" disabled={bulkRows.length>=20} onClick={addBulkRow}>+ Add another combination</button>
    <button type="button" className="pg-btn" onClick={addAllVariants}>Add all combinations to cart</button>
    {bulkMessage&&<p role="status" aria-live="polite" style={{margin:0,fontSize:14}}>{bulkMessage}</p>}
   </div>}
  </section>}
  {added&&<p className="pd-added" role="status"><Icon name="check" size={16}/> Added to your cart. <Link href="/cart">View cart →</Link></p>}
 </div>
}
