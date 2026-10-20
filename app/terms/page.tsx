import type {Metadata} from "next";
import InfoPage,{loadStoreInfo} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Terms of service",description:"Terms for using our store."};
export default async function Terms(){
  const s=await loadStoreInfo();
  return <InfoPage title="Terms of service" intro={"By placing an order with "+s.storeName+" you agree to these terms."}>
    <h2>Orders</h2>
    <p>An order is confirmed once payment is verified (or accepted by us for cash on delivery). We may cancel an order if an item is out of stock or payment cannot be verified; paid orders are refunded in that case.</p>
    <h2>Prices and payment</h2>
    <p>Prices are shown in Bangladeshi Taka and may change without notice. The price you see at checkout is the price you pay, including any delivery charge shown.</p>
    <h2>Delivery and returns</h2>
    <p>See our <a href="/shipping-policy">delivery information</a> and <a href="/return-policy">returns policy</a>.</p>
    <h2>Accuracy</h2>
    <p>We try to keep product information accurate, but descriptions and images may occasionally differ slightly from the item.</p>
  </InfoPage>;
}
