import Link from "next/link";
import AddToCart from "./AddToCart";

export type HomeProduct={
  id:string;slug:string;name:string;sku:string;stock:number;
  price:number;original:number|null;discount:number;image:string|null;
  rating:number;reviews:number;sold:number;soldPct:number;
  categoryId:string|null;category:string|null;
  freeDelivery?:boolean;hasVariants?:boolean;
};

export const money=(n:number)=>"৳"+n.toLocaleString("en-BD",{maximumFractionDigits:2});

const STAR="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

export function Stars({value,count}:{value:number;count:number}){
  if(!count)return <span className="hp-norate">No reviews yet</span>;
  const full=Math.round(value);
  return (
    <span className="hp-rate" role="img" aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} review${count===1?"":"s"}`}>
      <span className="hp-stars">{[1,2,3,4,5].map(n=><svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n<=full?"currentColor":"#d9dce1"} aria-hidden="true"><path d={STAR}/></svg>)}</span>
      <span className="hp-rate-n">({count})</span>
    </span>
  );
}

function Media({p}:{p:HomeProduct}){
  return p.image
    ?<img src={p.image} alt={p.name} loading="lazy" decoding="async"/>
    :<span className="hp-ph" aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>;
}

export function PriceRow({p}:{p:HomeProduct}){
  return (
    <div className="hp-price">
      <strong>{money(p.price)}</strong>
      {p.original&&<s>{money(p.original)}</s>}
    </div>
  );
}

/** Flash sale card: the whole card is one link, so no nested buttons. */
export function FlashCard({p}:{p:HomeProduct}){
  const left=p.stock<=5?`Only ${p.stock} left`:null;
  return (
    <Link href={"/products/"+p.slug} className="hp-fc">
      <span className="hp-fm"><Media p={p}/><span className="hp-off">-{p.discount}%</span></span>
      <span className="hp-fb">
        <span className="hp-pt">{p.name}</span>
        <PriceRow p={p}/>
        <span className="hp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.soldPct} aria-label="Share of stock sold"><i style={{width:Math.max(p.soldPct,4)+"%"}}/></span>
        <span className="hp-sold"><span>{p.soldPct}% sold</span>{left&&<em>{left}</em>}</span>
      </span>
    </Link>
  );
}

export function ProductCard({p}:{p:HomeProduct}){
  return (
    <div className="hp-pc">
      <div className="hp-pm">
        <Link href={"/products/"+p.slug} className="hp-pm-link" aria-label={p.name}><Media p={p}/></Link>
        {p.discount>0&&<span className="hp-off">-{p.discount}%</span>}
        <AddToCart p={{id:p.id,name:p.name,price:p.price,sku:p.sku,image:p.image,stock:p.stock,hasVariants:p.hasVariants,slug:p.slug}}/>
      </div>
      <div className="hp-pb">
        {p.category&&<small>{p.category}</small>}
        <Link href={"/products/"+p.slug} className="hp-pt">{p.name}</Link>
        <Stars value={p.rating} count={p.reviews}/>
        <PriceRow p={p}/>
        {p.freeDelivery&&<span className="hp-free">Free delivery</span>}
      </div>
    </div>
  );
}
