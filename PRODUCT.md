# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Families and middle-aged shoppers in Bangladesh, buying on phones and on desktop. They want to see a few well-chosen items clearly, trust the seller, and pay the way they already do (bKash, Nagad, cash on delivery). Interface language is Bangla and English.

## Product Purpose
An online store for a single brand or a small curated collection. Customers browse the products, add them to a bag, check out, and track the order. Success is a customer who trusts the shop enough to order, and orders that are delivered quickly and returned easily when needed.

## Positioning
A curated range of good-quality products rather than a huge catalogue, with fast delivery, easy returns, secure local payment (bKash, Nagad, COD), and attractive product presentation that feels like a premium brand.

## Operating Context
Store owner manages products, orders, branding and settings from the built-in admin panel. Branding (name, colors, fonts, layout preset) is admin-controlled and must stay configurable. Delivery is nationwide; orders are fulfilled and tracked from the admin.

## Capabilities and Constraints
- Next.js 15 on Cloudflare Workers, Firestore database.
- Cart is called "Bag" in all customer-facing copy (route stays /cart).
- Admin panel keeps its existing orange look; this remake is for the customer-facing storefront.
- Brand name, logo and product photography come from admin settings; none are fixed here.

## Brand Commitments
Premium, curated, trustworthy. Light and clean look (the owner's choice). Storefront must stay admin-themeable via CSS variables.

## Evidence on Hand
No testimonials, review counts, press, or customer numbers have been supplied; none may be invented. Delivery and return claims must use the store's own policy content (lib/store/policy-content.ts).

## Product Principles
1. Few products, shown well: every item gets room and clear photography.
2. Trust before cleverness: delivery, return and payment facts stay visible near the buy action.
3. Phone first: one-hand reach, large touch targets, Bangla text that reads well.
4. Owner control: branding stays editable from admin, never hard-coded.

## Accessibility & Inclusion
Bangla and English text, readable on low-end phones; WCAG AA contrast, 44px touch targets, visible focus.
