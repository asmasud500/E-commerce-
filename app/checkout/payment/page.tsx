import{Suspense}from"react";import PaymentClient from "./PaymentClient";import StoreHeader from "@/components/StoreHeader";import StoreFooter from "@/components/StoreFooter";
export default function PaymentPage(){return <><StoreHeader/><main className="pg"><Suspense fallback={<p>Loading payment...</p>}><PaymentClient/></Suspense></main><StoreFooter/></>}
