"use client";
import {useState} from "react";

type Img={id:string;url:string;alt?:string|null};

export default function Gallery({images,name}:{images:Img[];name:string}){
  const [i,setI]=useState(0);
  const cur=images[i];
  return (
    <div className="pg-card pd-gallery">
      <div className="pd-main">
        {cur?<img src={cur.url} alt={cur.alt||name}/>:<span className="hp-ph" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
      </div>
      {images.length>1&&(
        <div className="pd-thumbs" role="tablist" aria-label="Product images">
          {images.map((im,n)=>(
            <button key={im.id} type="button" role="tab" aria-selected={n===i} aria-label={`Show image ${n+1}`} className={n===i?"on":""} onClick={()=>setI(n)}>
              <img src={im.url} alt="" loading="lazy" decoding="async"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
