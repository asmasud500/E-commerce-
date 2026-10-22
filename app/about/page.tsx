import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
import PolicyBody from "@/components/PolicyBody";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"About us",description:"Learn more about our online store."};
export default async function About(){
  const s=await loadStoreInfo();
  const body=s.aboutBody.trim()||`## What you can expect\n- Clear order details before you pay\n- Local payment options, including mobile banking\n- Order tracking from your phone\n- Support when you need help with an order`;
  return <InfoPage title={s.aboutIntro.trim()||"About "+s.storeName}><PolicyBody text={body}/></InfoPage>;
}
