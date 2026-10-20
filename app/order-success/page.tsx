import Link from"next/link";import StoreHeader from"@/components/StoreHeader";import StoreFooter from"@/components/StoreFooter";import{Icon}from"@/components/Icons";import InvoiceDownloadButton from"@/components/InvoiceDownloadButton";
export default async function OrderSuccess({searchParams}:{searchParams:Promise<{order?:string;paid?:string;submitted?:string;cod?:string}>}){
 const p=await searchParams;const paid=p.paid==="true";const submitted=p.submitted==="true";const cod=p.cod==="true";
 return <><StoreHeader/><main className="pg">
  <ol className="steps" aria-label="Checkout progress"><li className="done"><i>✓</i>Information</li><li className="done"><i>✓</i>Payment</li><li className="on"><i>3</i>Confirmation</li></ol>
  <section className="pg-card done-card">
   <div className="done-ic"><Icon name="check" size={34} strokeWidth={3}/></div>
   <small>{cod?"CASH ON DELIVERY":paid?"PAYMENT CONFIRMED":submitted?"PAYMENT SUBMITTED":"ORDER RECEIVED"}</small>
   <h1>{cod?"Order placed":paid?"Payment successful":submitted?"Payment details received":"Order received"}</h1>
   {p.order&&<p className="done-no">Order <strong>{p.order}</strong></p>}
   <p className="done-msg">{cod?"Thank you! We will confirm your order shortly. Please keep the payment ready when your parcel arrives.":paid?"Your payment has been verified.":submitted?"Thank you! We received your transaction details and sent them to our team. Your order will be confirmed automatically as soon as the payment is verified.":"Your order has been created. Complete payment through the selected gateway or wait for admin confirmation for manual payment."}</p>
   <div className="done-btns">{p.order&&<Link href={"/track?order="+encodeURIComponent(p.order)} className="pg-btn">Track your order</Link>}{p.order&&(paid||cod)&&<InvoiceDownloadButton label="Download invoice"/>}<Link href="/account" className="pg-btn pg-btn-line">My account</Link><Link href="/products" className="pg-btn pg-btn-line">Continue shopping</Link></div>
  </section></main><StoreFooter/></>}
