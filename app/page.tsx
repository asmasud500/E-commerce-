import Link from "next/link";

export default function Home() {
  return <main style={{maxWidth:1180,margin:"0 auto",padding:"0 28px"}}>
    <nav style={{display:"flex",justifyContent:"space-between",padding:"22px 0",borderBottom:"1px solid #e5e7eb"}}>
      <Link href="/" style={{fontWeight:800,fontSize:22,letterSpacing:"-.05em"}}>STORE<span style={{color:"#2563eb"}}>.</span></Link>
      <div style={{display:"flex",gap:22,alignItems:"center"}}><Link href="/">Home</Link><Link href="/products">Products</Link><Link href="/cart">Cart</Link><Link href="/account">Account</Link></div>
    </nav>
    <section style={{padding:"clamp(70px,13vw,150px) 0 100px",maxWidth:900}}>
      <span style={{display:"inline-flex",padding:"7px 12px",borderRadius:999,background:"#e8f0ff",color:"#1d4ed8",fontWeight:700,fontSize:12,letterSpacing:".08em"}}>NEW COLLECTION</span>
      <h1 style={{fontSize:"clamp(50px,8vw,94px)",margin:"22px 0",lineHeight:.94}}>Simple shopping.<br/><span style={{color:"#2563eb"}}>Better experience.</span></h1>
      <p style={{maxWidth:680,fontSize:19,lineHeight:1.7}}>Discover quality products with a smooth catalog, secure checkout, flexible payment options and reliable order tracking.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>
        <Link href="/products" style={{display:"inline-block",padding:"14px 22px",background:"#111827",color:"#fff",borderRadius:12}}>Shop products →</Link>
        <Link href="/cart" style={{display:"inline-block",padding:"14px 22px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12}}>View cart</Link>
      </div>
    </section>
  </main>
}