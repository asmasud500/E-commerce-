import Link from "next/link";

export default async function OrderSuccess({searchParams}:{searchParams:Promise<{order?:string}>}){
 const params=await searchParams;
 return <main style={{maxWidth:700,margin:"80px auto",padding:32,textAlign:"center"}}>
  <h1>Order received</h1>
  <p>Your order has been created successfully.</p>
  {params.order&&<p><strong>Order: {params.order}</strong></p>}
  <p>Payment can now be completed through the configured payment gateway.</p>
  <Link href="/products">Continue shopping</Link>
 </main>;
}
