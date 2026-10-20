import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Privacy policy",description:"How we handle your personal information."};
export default async function Privacy(){
  const s=await loadStoreInfo();
  return <InfoPage title="Privacy policy" intro="What we collect and why.">
    <h2>Information we collect</h2>
    <p>When you order we collect your name, phone number, email (optional), delivery address and the order details, so we can deliver your parcel and contact you about it. If you share your location at checkout it is used only for delivery.</p>
    <h2>How we use it</h2>
    <p>We use your information to process payments, deliver orders, send order updates and give support. If you enter your phone number at checkout and do not finish the order, we may keep your cart so our team can help you complete it.</p>
    <h2>Sharing</h2>
    <p>We share only what is needed with delivery couriers and payment providers to complete your order. We do not sell your personal information.</p>
    <h2>Your choices</h2>
    <p>You can ask us to correct or delete your information{s.supportEmail?" by writing to "+s.supportEmail:" through our contact page"}.</p>
  </InfoPage>;
}
