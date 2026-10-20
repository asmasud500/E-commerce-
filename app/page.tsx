import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import {Icon,categoryIcon} from "@/components/Icons";
import HeroSlider from "@/components/home/HeroSlider";
import FlashCountdown from "@/components/home/FlashCountdown";
import {FlashCard,ProductCard,type HomeProduct} from "@/components/home/ProductCard";
import {db} from "@/lib/prisma";
import {getEffectivePrice} from "@/lib/products/pricing";
import {isFreeDelivery} from "@/lib/shipping";

// Prices, stock and sales change constantly, so this page is rendered per request.
export const dynamic="force-dynamic";

const num=(v:any)=>v==null||v===""?null:Number(v);
const time=(v:any)=>{const t=new Date(v?.toDate?.()??v).getTime();return Number.isFinite(t)?t:0};

async function loadHome(){
  let categories:any[]=[],products:any[]=[],images:any[]=[],banners:any[]=[],flashSales:any[]=[];
  let reviews:any[]=[],paidOrders:any[]=[],orderItems:any[]=[];
  try{
    [categories,products,images,flashSales]=await Promise.all([
      db.category.findMany({orderBy:{name:"asc"}}),
      db.product.findMany({where:{published:true,stock:{gt:0}},orderBy:[{featured:"desc"},{createdAt:"desc"}]}),
      db.productImage.findMany({orderBy:{sortOrder:"asc"}}),
      db.flashSale.findMany({where:{active:true}})
    ]);
  }catch(error){
    console.error("Home catalog error:",error instanceof Error?error.message:String(error));
  }
  // Store banners are optional merchandising content; a failure must not break the catalog.
  try{
    const rows=await db.banner.findMany({where:{active:true},orderBy:{sortOrder:"asc"}});
    const now=Date.now();
    banners=rows.filter((b:any)=>(!b.startsAt||time(b.startsAt)<=now)&&(!b.endsAt||time(b.endsAt)>=now)&&typeof b.imageUrl==="string"&&b.imageUrl)
      .sort((a:any,b:any)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)).slice(0,6);
  }catch(error){console.error("Home banners error:",error instanceof Error?error.message:String(error));}
  // Ratings and sales only decorate the cards, so a failure here must not break the page.
  try{
    [reviews,paidOrders,orderItems]=await Promise.all([
      db.review.findMany({where:{approved:true}}),
      db.order.findMany({where:{paymentStatus:"PAID"},select:{id:true}}),
      db.orderItem.findMany()
    ]);
  }catch(error){
    console.error("Home stats error:",error instanceof Error?error.message:String(error));
  }

  const firstImage=new Map<string,string>();
  for(const im of images)if(im?.url&&!firstImage.has(im.productId))firstImage.set(im.productId,im.url);

  const rating=new Map<string,{sum:number;n:number}>();
  for(const r of reviews){const e=rating.get(r.productId)||{sum:0,n:0};e.sum+=Number(r.rating)||0;e.n+=1;rating.set(r.productId,e)}

  const paid=new Set(paidOrders.map((o:any)=>o.id));
  const soldBy=new Map<string,number>();
  for(const it of orderItems)if(paid.has(it.orderId))soldBy.set(it.productId,(soldBy.get(it.productId)||0)+Number(it.quantity||0));

  const catName=new Map<string,string>(categories.map((c:any)=>[c.id,c.name]));

  const list:HomeProduct[]=products.map((p:any)=>{
    const regular=Number(p.price);
    const sale=num(p.salePrice),compare=num(p.compareAtPrice);
    const price=getEffectivePrice(p,flashSales);
    const original=price<regular?regular:(compare&&compare>price?compare:null);
    const discount=original?Math.round((1-price/original)*100):0;
    const r=rating.get(p.id);
    const sold=soldBy.get(p.id)||0;
    return {
      id:p.id,slug:p.slug,name:p.name,sku:p.sku,stock:Number(p.stock),
      price,original:discount>0?original:null,discount,image:firstImage.get(p.id)||null,
      rating:r?r.sum/r.n:0,reviews:r?.n||0,
      sold,soldPct:Math.min(100,Math.round((sold/(sold+Number(p.stock)))*100)),
      categoryId:p.categoryId||null,category:p.categoryId?catName.get(p.categoryId)||null:null,
      freeDelivery:isFreeDelivery(p),hasVariants:Array.isArray(p.variants)&&p.variants.length>0
    };
  });

  const createdAt=new Map<string,number>(products.map((p:any)=>[p.id,time(p.createdAt)]));
  // A running flash sale (set in the admin panel or Telegram) decides what is shown here and when it ends;
  // with none running we fall back to any discounted product and a midnight countdown.
  const nowMs=Date.now();
  const running=flashSales.filter((f:any)=>f.active&&time(f.startsAt)<=nowMs&&nowMs<=time(f.endsAt));
  const flashIds=new Set<string>(running.flatMap((f:any)=>Array.isArray(f.productIds)?f.productIds:[]));
  const flashPool=flashIds.size?list.filter(p=>flashIds.has(p.id)):list.filter(p=>p.discount>0);
  const flashEndsAt=running.length?Math.min(...running.map((f:any)=>time(f.endsAt))):null;
  const flash=flashPool.sort((a,b)=>b.discount-a.discount).slice(0,12);
  const newest=[...list].sort((a,b)=>(createdAt.get(b.id)||0)-(createdAt.get(a.id)||0));
  const forYou=list.slice(0,20);
  const trending=[...list].sort((a,b)=>b.sold-a.sold||b.rating-a.rating||b.reviews-a.reviews).slice(0,8);
  const arrivals=newest.slice(0,8);

  const stores=categories.map((c:any)=>{
    const items=list.filter(p=>p.categoryId===c.id);
    return {id:c.id,name:c.name,slug:c.slug,count:items.length,cover:items.find(p=>p.image)?.image||null};
  }).filter(s=>s.count>0).sort((a,b)=>b.count-a.count).slice(0,6);

  return {categories,flash,flashEndsAt,forYou,trending,arrivals,stores,banners,
    flashImages:flash.map(p=>p.image).filter(Boolean) as string[],
    newImages:newest.map(p=>p.image).filter(Boolean) as string[]};
}

const QUICK=[
  {icon:"bolt",label:"Flash Deals",href:"#flash-sale",fallback:"/products"},
  {icon:"ticket",label:"Vouchers",href:"/cart"},
  {icon:"store",label:"Official Stores",href:"#stores",fallback:"/products"},
  {icon:"globe",label:"Global Collection",href:"/products"},
  {icon:"truck",label:"Free Delivery",href:"/products?delivery=free"},
];

export default async function Home(){
  const {categories,flash,flashEndsAt,forYou,trending,arrivals,stores,banners,flashImages,newImages}=await loadHome();
  const hasFlash=flash.length>0,hasStores=stores.length>0;
  const quickHref=(q:typeof QUICK[number])=>q.fallback&&!((q.label==="Flash Deals"&&hasFlash)||(q.label==="Official Stores"&&hasStores))?q.fallback:q.href;

  return (
    <>
      <StoreHeader categories={categories.map((c:any)=>({name:c.name,slug:c.slug}))}/>
      <main className="hp">
        <h1 className="sr-only">Store: online shopping for quality products</h1>

        <div className="hp-hero">
          <aside className="hp-cats" aria-label="Shop by category">
            <div className="hp-cats-h"><Icon name="menu" size={18}/> Categories</div>
            <div className="hp-cats-list">
              {categories.slice(0,10).map((c:any)=>(
                <Link key={c.id} href={"/products?category="+c.slug} className="hp-cat">
                  <Icon name={categoryIcon(c.name)} size={19} className="hp-cat-ic"/>
                  <span>{c.name}</span>
                  <Icon name="chevronRight" size={16} className="hp-cat-go"/>
                </Link>
              ))}
              <Link href="/products" className="hp-cat hp-cat-all"><Icon name="grid" size={19} className="hp-cat-ic"/><span>All products</span><Icon name="chevronRight" size={16} className="hp-cat-go"/></Link>
            </div>
          </aside>
          <HeroSlider flashImages={flashImages} newImages={newImages} flashHref={hasFlash?"#flash-sale":"/products"}/>
        </div>

        <section className="hp-benefits" aria-label="Shopping benefits">
          <div className="hp-benefit"><span className="hp-benefit-icon" aria-hidden="true">✓</span><span><strong>Simple, secure checkout</strong><small>Clear order details before you pay</small></span></div>
          <div className="hp-benefit"><span className="hp-benefit-icon" aria-hidden="true">৳</span><span><strong>Local payment options</strong><small>Choose an available payment method</small></span></div>
          <div className="hp-benefit"><span className="hp-benefit-icon" aria-hidden="true">↗</span><span><strong>Order updates</strong><small>Keep track of your order status</small></span></div>
        </section>

        {banners.length>0&&<section className="hp-promo-section" aria-label="Store promotions">
          <div className="hp-promo-heading"><span>CURATED FOR YOU</span><h2>Offers &amp; Highlights</h2><p>Discover the latest deals from our store.</p></div>
          <div className="hp-promo-grid">
          {banners.map((b:any)=>{const href=typeof b.href==="string"&&b.href.startsWith("/")?b.href:(typeof b.href==="string"&&b.href.startsWith("https://")?b.href:"/products");const external=href.startsWith("https://");return <Link key={b.id} href={href} className="hp-promo-card" {...(external?{target:"_blank",rel:"noopener noreferrer"}:{})}>
            <div className="hp-promo-image"><img src={b.imageUrl} alt={b.title||"Store promotion"} loading="lazy" decoding="async"/><span className="hp-promo-badge">SPECIAL OFFER</span><span className="hp-promo-arrow" aria-hidden="true">↗</span></div>
            <div className="hp-promo-copy"><h3>{b.title||"Explore this offer"}</h3><span>Discover offer <b aria-hidden="true">→</b></span></div>
          </Link>})}
          </div>
        </section>}
        <nav className="hp-quick" aria-label="Shortcuts">
          <div className="hp-quick-in">
            {QUICK.map(q=>(
              <Link key={q.label} href={quickHref(q)} className="hp-q">
                <span className="hp-q-ic"><Icon name={q.icon} size={26}/></span>{q.label}
              </Link>
            ))}
          </div>
        </nav>

        {hasFlash&&(
          <section className="hp-sec" id="flash-sale" aria-labelledby="flash-h">
            <div className="hp-card">
              <div className="hp-sec-h">
                <h2 id="flash-h"><Icon name="bolt" size={24} className="hp-bolt"/> Flash Sale</h2>
                <FlashCountdown endsAt={flashEndsAt}/>
                <Link href="/products" className="hp-more">Shop all <Icon name="chevronRight" size={16}/></Link>
              </div>
              <div className="hp-flash-row">{flash.map(p=><FlashCard key={p.id} p={p}/>)}</div>
            </div>
          </section>
        )}

        {hasStores&&(
          <section className="hp-sec" id="stores" aria-labelledby="stores-h">
            <div className="hp-sec-h hp-plain">
              <h2 id="stores-h">Featured Stores</h2>
              <Link href="/products" className="hp-more">View all <Icon name="chevronRight" size={16}/></Link>
            </div>
            <div className="hp-stores">
              {stores.map(s=>(
                <Link key={s.id} href={"/products?category="+s.slug} className="hp-store">
                  <span className="hp-store-cover">{s.cover?<img src={s.cover} alt="" loading="lazy" decoding="async"/>:<span className="hp-ph" aria-hidden="true">{s.name.charAt(0).toUpperCase()}</span>}</span>
                  <span className="hp-store-logo" aria-hidden="true">{s.name.charAt(0).toUpperCase()}</span>
                  <span className="hp-store-body"><strong>{s.name}</strong><small>{s.count} product{s.count===1?"":"s"}</small><em>Visit store <Icon name="chevronRight" size={14}/></em></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {trending.length>0&&(
          <section className="hp-sec" aria-labelledby="trending-h">
            <div className="hp-sec-h hp-plain">
              <h2 id="trending-h"><Icon name="trendingUp" size={22}/> Trending Now</h2>
              <Link href="/products" className="hp-more">Explore popular <Icon name="chevronRight" size={16}/></Link>
            </div>
            <div className="hp-grid">{trending.map(p=><ProductCard key={p.id} p={p}/>)}</div>
          </section>
        )}

        {arrivals.length>0&&(
          <section className="hp-sec" aria-labelledby="arrivals-h">
            <div className="hp-sec-h hp-plain">
              <h2 id="arrivals-h">New Arrivals</h2>
              <Link href="/products" className="hp-more">See what's new <Icon name="chevronRight" size={16}/></Link>
            </div>
            <div className="hp-grid">{arrivals.map(p=><ProductCard key={p.id} p={p}/>)}</div>
          </section>
        )}

        <section className="hp-sec" aria-labelledby="fy-h">
          <div className="hp-sec-h hp-tab"><h2 id="fy-h">Just For You</h2></div>
          {forYou.length?(
            <>
              <div className="hp-grid">{forYou.map(p=><ProductCard key={p.id} p={p}/>)}</div>
              <div className="hp-center"><Link href="/products" className="hp-btn hp-btn-line">See all products <Icon name="arrowRight" size={18}/></Link></div>
            </>
          ):(
            <div className="hp-card hp-empty"><h3>Products are on their way</h3><p>New items will show up here as soon as they are added to the catalog.</p></div>
          )}
        </section>
      </main>
      <StoreFooter/>
    </>
  );
}
