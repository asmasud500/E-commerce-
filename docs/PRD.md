# MART E-commerce Platform — Product Requirements Document

**Status:** Planning baseline  
**Repository:** [asmasud500/E-commerce-](https://github.com/asmasud500/E-commerce-)  
**Product:** MART — “Shop Smarter, Live Better”  
**Primary market:** Bangladesh  
**Currency:** BDT (৳)  
**Last updated:** 2026-10-25

## 1. Product vision
Build a trustworthy, responsive, production-oriented e-commerce storefront and operations dashboard. Customers should be able to discover products, place an order, pay through explicitly supported methods, and track or manage an order. Store staff should manage the catalogue, inventory, orders, returns, marketing, payments, and settings from a protected admin workspace.

This document describes product intent and acceptance expectations. The repository README is the source for currently documented implementation details; features marked as planned or requiring verification must not be treated as live merely because they appear here.

## 2. Goals
- Provide a polished mobile-first shopping experience without changing the established Navy–Orange visual identity.
- Make catalogue, cart, checkout, inventory, payment, and order state consistent and auditable.
- Support Bangladeshi address fields and BDT pricing.
- Provide role-aware admin tools with meaningful status, validation, and error feedback.
- Deploy through the existing GitHub Actions and Cloudflare/OpenNext workflow without exposing secrets.
- Keep demo/sandbox behavior explicit; never represent a demo order as paid.
- Make AI assistance useful but bounded: AI cannot settle payments, issue refunds, change stock, or place/confirm orders.
- Document tests and production-readiness gaps rather than implying unverified capabilities.

## 3. Non-goals
- Do not redesign the product around a different theme or replace the current Navy–Orange colors.
- Do not claim that every payment provider is integrated. The README documents SSLCOMMERZ as the verified automatic merchant adapter; other provider credential fields do not by themselves constitute an integration.
- Do not accept personal-number “send money” proofs, screenshots, or manual transaction IDs as payment settlement.
- Do not activate paid AI billing automatically when free quota is exhausted.
- Do not treat a successful build as proof of production readiness.
- Do not move live data to a new database or run destructive migrations as part of documentation work.

## 4. Users and roles
### Shopper
- Browse, search, filter, sort, view product details and variants.
- Manage cart and wishlist; see accurate price, availability, discount, and delivery estimates.
- Check out with customer and delivery information.
- Choose an enabled payment method and understand whether payment is pending, paid, failed, or in demo mode.
- Look up an order using a supported identifier, view progress, cancel when eligible, and request a return when eligible.
- Access account/profile features where implemented.

### Administrator / staff
- View operational summaries and manage permitted resources.
- Manage products, categories, inventory, orders, customers, reviews, coupons, returns, transactions, and store configuration according to role.
- Review audit records and integration/backup health.
- Use AI Studio within role and safety constraints.

### Super admin
- Manage sensitive global settings, staff access, integration credentials, and AI configuration.
- All sensitive actions must be authorized server-side and audited.

## 5. Core customer requirements
1. **Catalogue:** Product listing/detail pages show correct name, price, sale price, images, stock/availability, category, variants, and descriptive metadata.
2. **Search and discovery:** Search, filtering, sorting, pagination, and category navigation must work with validation and predictable empty/error states.
3. **Cart:** Quantity and variant selections are validated server-side; unavailable stock cannot be purchased.
4. **Checkout:** Use a clear, sequential journey: Order Summary → Customer Info → Delivery Info → Payment → Confirmation. Desktop may use a horizontal stepper; small screens must remain readable and scrollable.
5. **Order summary:** Show items, quantity, discounts/coupon, gift card where supported, delivery fee, and final total. The server recomputes all prices.
6. **Delivery information:** Support Bangladesh division, district, upazila/area, postal code, phone, and full address as configured. If saved customer profiles exist, allow safe edit/remove. Gift recipient details must not overwrite the buyer profile.
7. **Payment:** Show only enabled methods. SSLCOMMERZ payment is marked paid only after server-side provider validation confirms order reference, exact amount, BDT currency, and provider transaction ID. Cash on Delivery follows its explicit order/payment-state policy. Demo mode must show “DEMO MODE — NOT PAID”; it must never be labelled paid.
8. **Duplicate protection:** Repeated checkout requests with the same idempotency key must not create duplicate orders or double-reserve stock.
9. **Tracking:** Provide accurate order state and timestamps. The intended customer-facing milestones are Order placed, We received your order, Payment, Confirmed, Packing, On the way, and Delivered; map these to actual persisted states rather than fabricated progress.
10. **Cancellation/returns:** Cancellation is allowed only in configured eligible states before shipping. Return requests are allowed only after delivery and within the configured policy window; actions must be recorded.
11. **Invoice:** A4 print-ready invoice branded “MART / Shop Smarter, Live Better”, with order summary and a QR code for order update. Do not include an obsolete “Order Process” section; include store contact/details instead.
12. **Notifications:** Send useful Telegram/admin notifications without leaking credentials or unnecessary customer/payment data.

## 6. Admin requirements
- Responsive SPA-style admin shell with stable navigation, scrollable content, and accessible mobile behavior.
- Dashboard/reporting: 7/30-day sales, daily orders, best sellers, low-stock products, and cancellations where data supports these metrics.
- Resource management: Orders, Returns, Products, Inventory, Categories, Customers, Reviews, Mart Pay/Transactions, Coupons, Gift cards, Marketing/Flash sales, Delivery zones, Banners, Storage Health, Store Settings, Integrations & API, and Staff, according to implemented routes and permissions.
- Every create/edit form validates input and shows actionable errors. Invalid banner data must show field-level reasons, not a generic “Invalid banner”.
- Store Settings sections should act as accordions: selecting a closed section opens it; selecting another closes the previous section and opens the new one; selecting the same section closes it.
- Setup checklists and storage/backup statuses must reflect actual checks and timestamps; never hard-code success.
- Sensitive values are written and read only through protected server routes. Secret fields should not reveal stored values.
- Audit security-relevant configuration and staff actions.

## 7. AI Studio requirements
The documented workspace supports six intended capabilities: product descriptions, smart product search, customer support, sales analysis, marketing drafts, and shopping assistance.
- Generated product/marketing content remains a draft until a human publishes it.
- Sales analysis uses server-side aggregates and excludes customer names, addresses, emails, and raw payment data.
- AI endpoints must not confirm payment, change order status, issue refunds, place orders, or alter stock.
- Provide feature enable/disable controls, model/limit configuration where authorized, connection tests, usage telemetry, timeouts, input bounds, and deterministic fallbacks.
- Do not automatically switch to paid billing when free quota is exhausted. Clearly report provider quota limitations.

## 8. Design requirements
- Preserve the current Navy–Orange palette; the documented prior palette references include #131921 and #FF6801, with #F5F5F7 as a light surface. Confirm exact existing tokens in source before modifying CSS.
- Premium, clean, responsive layout inspired by established commerce usability patterns, without copying another brand's protected assets.
- Consistent typography, spacing, focus states, button hierarchy, form errors, loading states, empty states, and confirmation feedback.
- Avoid horizontal overflow, clipped admin navigation, trapped scroll, and overlays covering the desktop content area.
- Respect reduced-motion preferences and semantic accessibility.

## 9. Operational requirements
- Runtime documented as Next.js 15 + React 19 with Cloudflare/OpenNext deployment support.
- Runtime data adapter documented as custom Firestore REST adapter in `lib/firestore.ts`. Prisma schema describes an optional PostgreSQL migration source, not the live Firestore adapter.
- CI includes security tests, TypeScript validation, and production build; staging verification remains necessary.
- Keep Firebase service-account credentials, payment encryption key, admin/session secrets, webhook secrets, Gemini key, and OAuth tokens out of source control and client bundles.
- Backups and restore procedures must be testable and report real outcomes.

## 10. Success metrics
- No duplicate orders from repeated checkout submissions.
- No paid status without verified provider evidence.
- No negative stock caused by concurrent checkout.
- Critical customer journeys pass on mobile and desktop.
- No critical authorization or secret-exposure findings.
- Build, security tests, type-check, and staging smoke tests pass.
- Backup restore is periodically verified.
- Admin status indicators agree with the underlying data/check result.

## 11. Release acceptance
A release is acceptable only when the relevant checks in `ACCEPTANCE_TESTS.md` pass, critical issues are resolved or explicitly documented, and staging confirms the deployed environment. CI green alone is insufficient.

## 12. Known cautions from repository documentation
- The generic Prisma-compatible `db.$transaction` wrapper is documented as not being a real transaction; non-core multi-document paths need review.
- The README says checkout, verified merchant-payment settlement, expired-stock release, admin payment confirm/reject, pending-order cancellation, and manual refund recording use dedicated native Firestore transactions. Verify current code before relying on this list.
- Other direct payment providers are not live merely because their credentials can be entered.
- Google AI model IDs, free quotas, and provider terms can change; verify the current provider console before release.
- Deployment and external integration success must be checked from current workflow/runtime results, not assumed from documentation.
