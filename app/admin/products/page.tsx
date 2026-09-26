import Link from "next/link";

const demoProducts = [
  { id:"1", name:"Premium Product", sku:"SKU-001", price:"৳1,490", stock:25, status:"Published" },
  { id:"2", name:"Classic Product", sku:"SKU-002", price:"৳990", stock:8, status:"Draft" }
];

export default function AdminProducts(){
  return <main style={{maxWidth:1180,margin:"auto",padding:32}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:30}}>
      <div><Link href="/admin">← Dashboard</Link><h1>Products</h1><p>Manage catalog, pricing and inventory.</p></div>
      <Link href="/admin/products/new" style={{background:"#111",color:"#fff",padding:"12px 18px",borderRadius:8}}>+ Add Product</Link>
    </header>
    <div style={{border:"1px solid #ddd",borderRadius:12,overflow:"hidden",background:"#fff"}}>
      {demoProducts.map(p=><div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:16,padding:18,borderBottom:"1px solid #eee",alignItems:"center"}}>
        <div><b>{p.name}</b><small style={{display:"block",color:"#777"}}>{p.sku}</small></div><span>{p.price}</span><span>{p.stock} in stock</span><span>{p.status}</span><Link href={"/admin/products/"+p.id}>Manage</Link>
      </div>)}
    </div>
  </main>
}