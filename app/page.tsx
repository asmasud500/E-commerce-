import Link from "next/link";

export default function Home() {
  return <main style={{maxWidth:1100,margin:"0 auto",padding:32}}>
    <nav style={{display:"flex",justifyContent:"space-between",padding:"16px 0"}}><b>STORE</b><div style={{display:"flex",gap:20}}><Link href="/">Home</Link><Link href="/products">Products</Link><Link href="/admin">Admin</Link></div></nav>
    <section style={{padding:"15vh 0"}}><small>NEW COLLECTION</small><h1 style={{fontSize:"clamp(48px,8vw,92px)",lineHeight:.95}}>Your store.<br/>Fully automated.</h1><p style={{maxWidth:650,fontSize:19,lineHeight:1.6}}>A production-ready e-commerce platform with catalog, cart, checkout, payments, order management and an admin control center.</p><Link href="/products" style={{display:"inline-block",marginTop:18,padding:"14px 22px",background:"#111",color:"#fff",borderRadius:8}}>Shop products</Link></section>
  </main>
}