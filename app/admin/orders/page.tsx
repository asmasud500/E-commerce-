import Link from "next/link";

const orders=[
 {id:"#ORD-1001",customer:"Demo Customer",total:"৳2,450",payment:"Paid",status:"Processing"},
 {id:"#ORD-1002",customer:"Demo Customer 2",total:"৳1,200",payment:"Pending",status:"Pending"}
];

export default function Orders(){
 return <main style={{maxWidth:1180,margin:"auto",padding:32}}>
  <Link href="/admin">← Dashboard</Link><h1>Orders</h1><p>Monitor payment and fulfilment status.</p>
  <div style={{marginTop:24,border:"1px solid #ddd",borderRadius:12,overflow:"hidden",background:"#fff"}}>
   {orders.map(o=><div key={o.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:16,padding:18,borderBottom:"1px solid #eee"}}><b>{o.id}</b><span>{o.customer}</span><span>{o.total}</span><span>{o.payment}</span><span>{o.status}</span></div>)}
  </div>
 </main>
}