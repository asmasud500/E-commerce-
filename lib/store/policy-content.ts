export type PolicyKey="privacy"|"terms"|"returns"|"shipping";
export const POLICY_FIELD:Record<PolicyKey,"privacyContent"|"termsContent"|"returnsContent"|"shippingContent">={privacy:"privacyContent",terms:"termsContent",returns:"returnsContent",shipping:"shippingContent"};
export const POLICY_TITLES:Record<PolicyKey,string>={privacy:"Privacy policy",terms:"Terms of service",returns:"Returns & refunds",shipping:"Delivery information"};
export const POLICY_INTROS:Record<PolicyKey,string>={privacy:"What we collect and why.",terms:"By placing an order with {storeName} you agree to these terms.",returns:"If something is not right, we will help.",shipping:"How and when your order reaches you."};

// Format: "## Heading" starts a section, "- item" makes a bullet list, a blank line separates paragraphs,
// and [text](/link) makes a link. Placeholders: {storeName} {supportEmail} {supportPhone} {deliveryFee} {freeOver}
export const POLICY_DEFAULTS:Record<PolicyKey,string>={
privacy:`## Information we collect
When you order we collect your name, phone number, email (optional), delivery address and the order details, so we can deliver your parcel and contact you about it. If you share your location at checkout it is used only for delivery.

## How we use it
We use your information to process payments, deliver orders, send order updates and give support. If you enter your phone number at checkout and do not finish the order, we may keep your cart so our team can help you complete it.

## Sharing
We share only what is needed with delivery couriers and payment providers to complete your order. We do not sell your personal information.

## Your choices
You can ask us to correct or delete your information by writing to {supportEmail} or through our [contact page](/contact).`,
terms:`## Orders
An order is confirmed once payment is verified (or accepted by us for cash on delivery). We may cancel an order if an item is out of stock or payment cannot be verified; paid orders are refunded in that case.

## Prices and payment
Prices are shown in Bangladeshi Taka and may change without notice. The price you see at checkout is the price you pay, including any delivery charge shown.

## Delivery and returns
See our [delivery information](/shipping-policy) and [returns policy](/return-policy).

## Accuracy
We try to keep product information accurate, but descriptions and images may occasionally differ slightly from the item.`,
returns:`## Return window
You can request a return within 7 days after your order is delivered, for example if the item is damaged, wrong or not as described.

## How to request a return
Open the [tracking page](/track), enter your order number and use the return form shown for delivered orders. Our team reviews every request and contacts you.

## Refunds
Once a return is approved, the refund is sent to you using the payment method you used for the order. Cash on delivery orders are refunded after the returned item is received.`,
shipping:`## Delivery charge
The standard delivery charge is {deliveryFee}{freeOver}. Some products have free delivery or their own delivery charge; this is shown on the product page and at checkout before you pay. Your area may have a different charge, which checkout calculates for you.

## Delivery time
Orders are confirmed after payment is verified, then packed and handed to our courier. The estimated time for your area is shown at checkout.

## Tracking
Track every order on the [tracking page](/track) using your order number. When the courier collects your parcel, the courier name and tracking number appear there.`
};
