import type {Metadata} from "next";
import InfoPage,{loadStoreInfo,tk} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Delivery information",description:"Delivery charges, timing and tracking."};
export default async function Shipping(){
  const s=await loadStoreInfo();
  return <InfoPage title="Delivery information" intro="How and when your order reaches you.">
    <h2>Delivery charge</h2>
    <p>The standard delivery charge is {tk(s.deliveryFee)}{s.freeOver?", and it is free on orders above "+tk(s.freeOver):""}. Some products have free delivery or their own delivery charge; this is shown on the product page and at checkout before you pay. Your area may have a different charge, which checkout calculates for you.</p>
    <h2>Delivery time</h2>
    <p>Orders are confirmed after payment is verified, then packed and handed to our courier. The estimated time for your area is shown at checkout.</p>
    <h2>Tracking</h2>
    <p>Track every order on the <a href="/track">tracking page</a> using your order number. When the courier collects your parcel, the courier name and tracking number appear there.</p>
  </InfoPage>;
}
