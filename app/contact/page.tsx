import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Contact us",description:"How to reach our support team."};
export default async function Contact(){
  const s=await loadStoreInfo();
  return <InfoPage title="Contact us" intro="We are happy to help with orders, payments and deliveries.">
    {s.supportPhone&&<p><b>Phone:</b> <a href={"tel:"+s.supportPhone}>{s.supportPhone}</a></p>}
    {s.supportEmail&&<p><b>Email:</b> <a href={"mailto:"+s.supportEmail}>{s.supportEmail}</a></p>}
    {!s.supportPhone&&!s.supportEmail&&<p>Please use order tracking to check your order, or contact us through the store's social pages.</p>}
    <h2>Before you contact us</h2>
    <p>Keep your order number ready. You can check the latest status any time on the <a href="/track">order tracking page</a>.</p>
  </InfoPage>;
}
