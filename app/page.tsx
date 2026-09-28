import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

export default function Home() {
  return <><StoreHeader/><main style={{maxWidth:1180,margin:"0 auto",padding:"0 28px"}}>
    <section style={{padding:"clamp(78px,13vw,150px) 0 110px",maxWidth:930}}>
      <span style={{display:"inline-flex",padding:"8px 12px",borderRadius:999,background:"#e8f0ff",color:"#1d4ed8",fontWeight:800,fontSize:11,letterSpacing:".1em"}}>NEW COLLECTION</span>
      <h1 style={{fontSize:"clamp(52px,8vw,96px)",margin:"22px 0",lineHeight:.94}}>Simple shopping.<br/><span style={{color:"#2563eb"}}>Better experience.</span></h1>
      <p style={{maxWidth:680,fontSize:19,lineHeight:1.7}}>Discover quality products with a smooth catalog, secure checkout, flexible payment options and reliable order tracking.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>
        <Link href="/products" style={{display:"inline-block",padding:"14px 22px",background:"#111827",color:"#fff",borderRadius:12}}>Shop products →</Link>
        <Link href="/cart" style={{display:"inline-block",padding:"14px 22px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12}}>View cart</Link>
      </div>
    </section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,paddingBottom:80}}>
      {[["01","Curated products","A focused catalog built for easy browsing."],["02","Flexible payment","Choose the payment method available to you."],["03","Order tracking","Follow your order from confirmation to delivery."]].map(([n,t,d])=><article key={n} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:22}}><small>{n}</small><h2 style={{fontSize:19,margin:"12px 0 7px"}}>{t}</h2><p style={{margin:0}}>{d}</p></article>)}
    </section>
  </main><StoreFooter/></>;
}
