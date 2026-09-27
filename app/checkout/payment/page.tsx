import{Suspense}from"react";import PaymentClient from "./PaymentClient";
export default function PaymentPage(){return <Suspense fallback={<main style={{maxWidth:650,margin:"60px auto",padding:32}}>Loading payment...</main>}><PaymentClient/></Suspense>}
