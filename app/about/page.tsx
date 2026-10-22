import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"About us",description:"Learn more about our online store."};
export default async function About(){
  const s=await loadStoreInfo();
  const paragraphs=s.aboutBody.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  return <InfoPage title={"About "+s.storeName} intro={s.aboutIntro||"Quality products, simple shopping and delivery across Bangladesh."}>
    {paragraphs.length?paragraphs.map((t,i)=><p key={i} style={{whiteSpace:"pre-line"}}>{t}</p>):<>
      <p>{s.storeName} is an online store that brings carefully selected products to your door. We focus on clear prices, honest product information and a checkout that is easy to follow.</p>
      <h2>What you can expect</h2>
      <ul><li>Clear order details before you pay</li><li>Local payment options, including mobile banking</li><li>Order tracking from your phone</li><li>Support when you need help with an order</li></ul>
    </>}
  </InfoPage>;
}
