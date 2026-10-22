import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Contact us",description:"How to reach our support team."};
export default async function Contact(){
  const s=await loadStoreInfo();
  return <InfoPage title="Contact us" intro={s.contactIntro||"We are happy to help with orders, payments and deliveries."}>
    {s.supportPhone&&<p><b>Phone:</b> <a href={"tel:"+s.supportPhone}>{s.supportPhone}</a></p>}
    {s.supportEmail&&<p><b>Email:</b> <a href={"mailto:"+s.supportEmail}>{s.supportEmail}</a></p>}
    {s.whatsapp&&<p><b>WhatsApp:</b> <a href={"https://wa.me/"+s.whatsapp} target="_blank" rel="noopener noreferrer">+{s.whatsapp}</a></p>}
    {s.address&&<p><b>Address:</b> {s.address}</p>}
    {s.openingHours&&<p><b>Hours:</b> {s.openingHours}</p>}
    {s.facebookUrl&&<p><b>Facebook:</b> <a href={s.facebookUrl} target="_blank" rel="noopener noreferrer">{s.facebookUrl}</a></p>}
    {s.instagramUrl&&<p><b>Instagram:</b> <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer">{s.instagramUrl}</a></p>}
    {s.youtubeUrl&&<p><b>YouTube:</b> <a href={s.youtubeUrl} target="_blank" rel="noopener noreferrer">{s.youtubeUrl}</a></p>}
    {!s.supportPhone&&!s.supportEmail&&!s.whatsapp&&<p>Please use order tracking to check your order, or contact us through the store's social pages.</p>}
    <h2>Before you contact us</h2>
    <p>Keep your order number ready. You can check the latest status any time on the <a href="/track">order tracking page</a>.</p>
  </InfoPage>;
}
