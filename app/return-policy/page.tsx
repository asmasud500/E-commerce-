import type {Metadata} from "next";
import InfoPage from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Returns & refunds",description:"How returns and refunds work."};
export default function Returns(){
  return <InfoPage title="Returns & refunds" intro="If something is not right, we will help.">
    <h2>Return window</h2>
    <p>You can request a return within 7 days after your order is delivered, for example if the item is damaged, wrong or not as described.</p>
    <h2>How to request a return</h2>
    <p>Open the <a href="/track">tracking page</a>, enter your order number and use the return form shown for delivered orders. Our team reviews every request and contacts you.</p>
    <h2>Refunds</h2>
    <p>Once a return is approved, the refund is sent to you using the payment method you used for the order. Cash on delivery orders are refunded after the returned item is received.</p>
  </InfoPage>;
}
