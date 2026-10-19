"use client";
import{useEffect,useState}from"react";import{getCart,removeFromCart,saveCart,type CartItem}from"@/lib/cart";import Link from"next/link";import StoreHeader from"@/components/StoreHeader";import StoreFooter from"@/components/StoreFooter";import{Icon}from"@/components/Icons";
export default function Cart(){
 const[items,setItems]=useState<CartItem[]>([]);
 useEffect(()=>setItems(getCart()),[]);
 function update(id:string,q:number){const item=items.find(i=>i.productId===id);const max=Math.max(1,Math.min(100,item?.stock??100));const next=items.map(i=>i.productId===id?{...i,quantity:Math.min(max,Math.max(1,q))}:i);setItems(next);saveCart(next)}
 function remove(id:string){setItems(removeFromCart(id))}
 const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0);
 const count=items.reduce((n,i)=>n+i.quantity,0);
 return <><StoreHeader/><main className="pg">
  <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>Shopping cart</b></nav>
  <div className="pg-head"><div><h1>Shopping cart</h1><p>Review your items before checkout.</p></div>{items.length>0&&<span className="pg-pill">{count} item{count===1?"":"s"}</span>}</div>
  {!items.length?<div className="pg-card pg-empty"><span className="pg-empty-ic"><Icon name="cart" size={26}/></span><h2>Your cart is empty</h2><p>Add something you like and it will show up here.</p><Link href="/products" className="pg-btn">Browse products</Link></div>:
  <div className="cart-layout">
   <div className="pg-card cart-items">{items.map(i=><div className="cart-item" key={i.productId}>
    <div className="cart-item-art">{i.imageUrl?<img src={i.imageUrl} alt="" loading="lazy" decoding="async"/>:i.name.slice(0,1).toUpperCase()}</div>
    <div className="cart-item-info"><b>{i.name}</b><small>{i.sku}</small><strong>৳{i.price.toLocaleString("en-BD")}</strong>{typeof i.stock==="number"&&<small>{i.stock>0?i.stock+" available":"Out of stock"}</small>}</div>
    <div className="pd-qty"><button type="button" disabled={i.quantity<=1} aria-label="Decrease quantity" onClick={()=>update(i.productId,i.quantity-1)}>−</button><span>{i.quantity}</span><button type="button" disabled={typeof i.stock==="number"&&i.quantity>=i.stock} aria-label="Increase quantity" onClick={()=>update(i.productId,i.quantity+1)}>+</button></div>
    <button type="button" className="remove-button" onClick={()=>remove(i.productId)}>Remove</button></div>)}</div>
   <aside className="pg-card cart-summary"><h2>Order summary</h2><div className="summary-row"><span>Subtotal ({count} item{count===1?"":"s"})</span><strong>৳{subtotal.toLocaleString("en-BD")}</strong></div><p>Delivery charges, vouchers and the final total are calculated at checkout.</p><Link href="/checkout" className="pg-btn pg-btn-block">Proceed to checkout <Icon name="arrowRight" size={18}/></Link><Link href="/products" className="continue-link">Continue shopping</Link></aside>
  </div>}
 </main><StoreFooter/></>}
