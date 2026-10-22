"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Icon} from "@/components/Icons";

type Props={flashImages:string[];newImages:string[];flashHref:string;settings?:Record<string,any>};

export default function HeroSlider({flashImages,newImages,flashHref}:Props){
  const slides=[
    {theme:"hp-s1",pill:"Limited-time deals",title:"Mega Flash Sale",big:"Up to 70% Off",text:"Selected products at their lowest prices. Grab them before stock runs out.",cta:"Shop flash deals",href:flashHref,images:flashImages},
    {theme:"hp-s2",pill:"New in store",title:"Fresh arrivals just landed",big:"",text:"Browse the newest products added to the catalog.",cta:"Shop new arrivals",href:"/products",images:newImages},
    {theme:"hp-s3",pill:"Easy checkout",title:"Pay with bKash, Nagad or Rocket",big:"",text:"Send the amount, submit your transaction ID, and we confirm your order.",cta:"Start shopping",href:"/products",images:[] as string[]},
  ];
  const n=slides.length;
  const [i,setI]=useState(0);
  const [paused,setPaused]=useState(false);

  useEffect(()=>{
    if(paused)return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const id=setInterval(()=>setI(v=>(v+1)%n),5500);
    return()=>clearInterval(id);
  },[paused,n]);

  return (
    <div className="hp-slider" role="region" aria-roledescription="carousel" aria-label="Promotions"
      onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
      onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
      <div className="hp-track" style={{transform:`translateX(-${i*100}%)`}}>
        {slides.map((s,k)=>(
          <div className={"hp-slide "+s.theme} key={s.title} role="group" aria-roledescription="slide" aria-label={`${k+1} of ${n}`} inert={k!==i}>
            <div className="hp-slide-copy">
              <span className="hp-pill">{s.pill}</span>
              <h2>{s.title}</h2>
              {s.big&&<div className="hp-big">{s.big}</div>}
              <p>{s.text}</p>
              <Link href={s.href} className="hp-btn">{s.cta} <Icon name="arrowRight" size={18}/></Link>
            </div>
            <div className="hp-art" aria-hidden="true">
              <span className="hp-art-ring"/>
              {s.images.slice(0,3).map((src,j)=>(
                <span className={"hp-art-card hp-art-c"+j} key={src+j}><img src={src} alt="" loading={k===0?"eager":"lazy"} decoding="async"/></span>
              ))}
              {k===2&&<div className="hp-art-pays"><span>bKash</span><span>Nagad</span><span>Rocket</span></div>}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="hp-arrow hp-prev" aria-label="Previous slide" onClick={()=>setI((i-1+n)%n)}><Icon name="chevronLeft" size={20}/></button>
      <button type="button" className="hp-arrow hp-next" aria-label="Next slide" onClick={()=>setI((i+1)%n)}><Icon name="chevronRight" size={20}/></button>
      <div className="hp-dots">
        {slides.map((s,k)=><button type="button" key={s.title} className={k===i?"on":""} aria-label={`Go to slide ${k+1}`} aria-current={k===i} onClick={()=>setI(k)}/>)}
      </div>
    </div>
  );
}
