"use client";
import {useEffect,useRef,useState} from "react";
import {addToCart} from "@/lib/cart";
import {Icon} from "@/components/Icons";
import Link from "next/link";

type Props={p:{id:string;name:string;price:number;sku:string;image:string|null;stock:number;hasVariants?:boolean;slug?:string}};

export default function AddToCart({p}:Props){
  const [done,setDone]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  function add(){
    addToCart({productId:p.id,name:p.name,price:p.price,quantity:1,sku:p.sku,imageUrl:p.image,stock:p.stock});
    setDone(true);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>setDone(false),1600);
  }
  return (
    <button type="button" className="hp-atc" onClick={add} aria-label={`Add ${p.name} to cart`}>
      {done?<><Icon name="check" size={16}/> Added</>:<><Icon name="cart" size={16}/> Add to Cart</>}
    </button>
  );
}
