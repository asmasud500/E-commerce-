import ReviewForm from "./ReviewForm";
import type{Metadata}from"next";import Link from "next/link";import {notFound} from "next/navigation";import {db} from "@/lib/prisma";import ProductActions from "./ProductActions";import Gallery from "./Gallery";import {deliveryLabel,isFreeDelivery} from "@/lib/shipping";import {Icon} from "@/components/Icons";import {ProductCard,money,Stars,type HomeProduct} from "@/components/home/ProductCard";import StoreHeader from "@/components/StoreHeader";import StoreFooter from "@/components/StoreFooter";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const{slug}=await params;let p:any=null;try{p=await db.product.findUnique({where:{slug},include:{images:{orderBy:{sortOrder:"asc"},take:1}}});}catch(error){console.error("Product metadata error:",error instanceof Error?error.message:String(error));}if(!p)return{};const description=p.description||("Shop "+p.name+" at Store.");return{title:p.name,description,openGraph:{title:p.name,description,images:p.images?.[0]?.url?[{url:p.images[0].url}]:undefined}}}
export default async function ProductDetails({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const p=await db.product.findUnique({where:{slug},include:{category:true,images:{orderBy:{sortOrder:"asc"}}}});
  if(!p||!p.published)return notFound();
  const regular=Number(p.price);
  const baseEffective=p.salePrice!=null&&Number(p.salePrice)<regular?Number(p.salePrice):regular;
  const variantPrices=Array.isArray((p as any).variants)?(p as any).variants.map((v:any)=>Number(v.salePrice!=null&&Number(v.salePrice)<Number(v.price)?v.salePrice:v.price)).filter((n:number)=>Number.isFinite(n)&&n>=0):[];
  const effective=variantPrices.length?Math.min(...variantPrices):baseEffective;
  const compare=p.compareAtPrice!=null&&Number(p.compareAtPrice)>effective?Number(p.compareAtPrice):null;
  const original=effective<regular?regular:compare;
  const discount=original?Math.round((1-effective/original)*100):0;

  // Rating and related items only decorate the page, so failures here must not break it.
  let reviewList:any[]=[];let rating={sum:0,n:0};let related:HomeProduct[]=[];
  try{
    const rs=await db.review.findMany({where:{productId:p.id,approved:true},include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"}});reviewList=rs.slice(0,20);
    for(const r of rs as any[]){rating.sum+=Number(r.rating)||0;rating.n+=1}
  }catch(error){console.error("Product reviews error:",error instanceof Error?error.message:String(error))}
  try{
    if(p.categoryId){
      const [others,imgs]=await Promise.all([
        db.product.findMany({where:{published:true,stock:{gt:0},categoryId:p.categoryId},orderBy:{createdAt:"desc"}}),
        db.productImage.findMany({orderBy:{sortOrder:"asc"}})
      ]);
      const first=new Map<string,string>();
      for(const im of imgs as any[])if(im?.url&&!first.has(im.productId))first.set(im.productId,im.url);
      related=(others as any[]).filter(o=>o.id!==p.id).slice(0,5).map(o=>{
        const reg=Number(o.price),sale=o.salePrice!=null?Number(o.salePrice):null;
        const price=sale!=null&&sale>0&&sale<reg?sale:reg;
        const orig=price<reg?reg:(o.compareAtPrice!=null&&Number(o.compareAtPrice)>price?Number(o.compareAtPrice):null);
        const disc=orig?Math.round((1-price/orig)*100):0;
        return {id:o.id,slug:o.slug,name:o.name,sku:o.sku,stock:Number(o.stock),price,original:disc>0?orig:null,discount:disc,image:first.get(o.id)||null,rating:0,reviews:0,sold:0,soldPct:0,categoryId:o.categoryId||null,category:p.category?.name||null,freeDelivery:isFreeDelivery(o)};
      });
    }
  }catch(error){console.error("Related products error:",error instanceof Error?error.message:String(error))}

  let storeSettings:any=null;
  try{storeSettings=await db.storeSetting.findUnique({where:{id:"store"}})}catch{}
  const defaultFee=Number(storeSettings?.defaultDeliveryFee??120);
  const threshold=storeSettings&&storeSettings.freeShippingThreshold===null?null:Number(storeSettings?.freeShippingThreshold??3000);
  const delivery=deliveryLabel(p,defaultFee,threshold);
  const totalStock=Array.isArray((p as any).variants)&&p.variants.length?p.variants.reduce((n:number,v:any)=>n+Math.max(0,Number(v.stock)||0),0):Number(p.stock||0);
  const inStock=totalStock>0;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({ "@context":"https://schema.org","@type":"Product",name:p.name,description:p.description||undefined,sku:p.sku,image:p.images.map(i=>i.url),category:p.category?.name,offers:{"@type":"Offer",price:effective,currency:"BDT",availability:inStock?"https://schema.org/InStock":"https://schema.org/OutOfStock"}}).replace(/</g,"\\u003c")}}/>
    <StoreHeader/>
    <main className="pg">
      <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><Link href="/products">Products</Link>{p.category&&<><Icon name="chevronRight" size={14}/><Link href={"/products?category="+p.category.slug}>{p.category.name}</Link></>}<Icon name="chevronRight" size={14}/><b>{p.name}</b></nav>
      <div className="pd">
        <Gallery images={p.images.map(i=>({id:i.id,url:i.url,alt:i.alt}))} name={p.name}/>
        <div className="pg-card pd-info">
          <div className="pd-meta">{p.category?.name||"Product"} · SKU {p.sku}</div>
          <h1>{p.name}</h1>
          <div className="pd-rate"><Stars value={rating.n?rating.sum/rating.n:0} count={rating.n}/></div>
          <div className="pd-price"><strong>{money(effective)}</strong>{original&&<s>{money(original)}</s>}{discount>0&&<span className="pd-off">-{discount}%</span>}</div>
          <p className={"pd-stock "+(inStock?"ok":"out")}>{inStock?<><Icon name="check" size={16}/> In stock · {totalStock} available</>:"Out of stock"}</p>
          <p className="pd-desc">{p.description||"Premium quality product."}</p>
          <div className="pd-buy"><ProductActions options={(Array.isArray((p as any).options)?(p as any).options:[])} p={{id:p.id,name:p.name,slug:p.slug,sku:p.sku,price:effective,salePrice:p.salePrice,stock:p.stock,description:p.description,compareAtPrice:p.compareAtPrice,imageUrl:p.images[0]?.url||null,variants:(p as any).variants||[]}}/></div>
          <ul className="pd-perks">
            <li><Icon name="truck" size={18}/>{delivery}</li>
            <li><Icon name="ticket" size={18}/>Order is confirmed once your payment is verified</li>
            <li><Icon name="user" size={18}/>Track every order from your account</li>
          </ul>
        </div>
      </div>
      <section className="pg-sec rv" aria-labelledby="rv-h">
        <div className="hp-sec-h hp-tab"><h2 id="rv-h">Customer reviews</h2></div>
        <div className="pg-card rv-box">
          {reviewList.length===0&&<p>No reviews yet. Be the first to review this product.</p>}
          {reviewList.map((r:any)=><article key={r.id} className="rv-item"><b>{r.user?.name||"Customer"}</b> <span aria-label={r.rating+" out of 5"}>{"★".repeat(Number(r.rating)||0)}</span>{r.comment&&<p>{r.comment}</p>}{r.photoUrl&&<img src={r.photoUrl} alt="Customer photo" loading="lazy" style={{maxWidth:160,borderRadius:8}}/>}</article>)}
          <ReviewForm productId={p.id}/>
        </div>
      </section>
      {related.length>0&&<section className="pg-sec" aria-labelledby="rel-h"><div className="hp-sec-h hp-tab"><h2 id="rel-h">More in {p.category?.name}</h2></div><div className="hp-grid">{related.map(r=><ProductCard key={r.id} p={r}/>)}</div></section>}
    </main>
    <StoreFooter/>
  </>
}
