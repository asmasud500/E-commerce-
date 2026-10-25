# MART E-commerce Platform — Application Flow

**Last updated:** 2026-10-25  
**Scope:** Customer storefront, checkout, tracking, admin, AI Studio, and operations

## 1. Storefront navigation
Home → Category / Search / Product listing → Product detail → Select variant and quantity → Add to cart → Cart → Checkout.

Global navigation may include categories, search, account, wishlist, and cart, according to the existing UI. Do not invent routes during implementation; map these flow nodes to current routes first.

## 2. Product discovery flow
1. Shopper opens home or category.
2. Shopper searches, filters, sorts, or paginates.
3. API validates query values and returns bounded product results.
4. Shopper opens product detail.
5. UI displays price, sale price, images, available variants, and stock status.
6. Shopper selects a valid variant/quantity and adds to cart.
7. Server revalidates product and variant availability; UI updates cart count and gives feedback.
8. If product is unavailable or changed, show the real reason and allow the shopper to revise the cart.

AI-ranked suggestions are optional enhancements. If AI is unavailable, the catalogue's deterministic search must remain usable.

## 3. Checkout flow
The intended checkout journey is sequential:

### Step 1 — Order Summary
- Show cart items, variants, quantity, unit price, subtotal, eligible coupon/promotion, gift card if enabled, delivery fee estimate, and final total.
- Allow quantity changes/removal and coupon validation.
- Recompute the final total on the server; never trust browser-calculated prices.

### Step 2 — Customer Info
- Collect the required buyer name, phone, and email fields according to current validation policy.
- Normalize phone/email and show field-level errors.
- Do not expose a customer's profile to another user.

### Step 3 — Delivery Info
- Collect division, district, upazila/area, postal code, and full address as configured.
- Apply the matching delivery zone/rule and show fee/estimated days.
- Saved profiles, if enabled, may be selected, edited, or removed with authorization.
- Gift recipient details must be stored separately from buyer profile data.

### Step 4 — Payment
- Display only enabled and implemented payment methods.
- For SSLCOMMERZ, create a server-side payment intent/session using the canonical HTTPS callback origin.
- Cash on Delivery must follow its configured payment state.
- If demo mode is enabled, display “DEMO MODE — NOT PAID” clearly and never mark payment as paid.
- Do not display personal-number send-money proof or manual transaction ID flows.

### Step 5 — Confirmation
- Show order number, real current order status, payment status, delivery summary, and next steps.
- Avoid saying “paid” until provider validation is complete.
- If payment is pending or failed, provide a safe retry/continue path without creating duplicate orders.

### Checkout failure branches
- Invalid cart/variant → return to cart with affected items identified.
- Stock changed → reject or update reservation and ask shopper to review.
- Invalid coupon/gift card → explain why; do not apply it.
- Delivery zone unavailable → ask for corrected address or state that delivery is unavailable.
- Payment initiation fails → retain safe order state and provide retry guidance.
- Callback mismatch/replay → do not settle; record a safe audit event.
- Repeated submit → same idempotent result or safe conflict; never duplicate order or stock deduction.

## 4. Order tracking flow
1. Shopper opens the tracking page.
2. Shopper enters one supported lookup value: order number OR mobile OR email.
3. Server returns only matching authorized/public tracking information.
4. Page displays persisted order status, timestamps, payment state, and the seven customer-facing milestones where mapped to actual status history:
   - Order placed
   - We received your order
   - Payment
   - Confirmed
   - Packing
   - On the way
   - Delivered
5. Cancellation appears only when the order is in an eligible pre-shipping state.
6. Return request appears only after delivery and when the return policy permits it.
7. A cancellation or return request is saved and the shopper receives a real confirmation.

Tracking must not manufacture future milestones or reveal full address/payment details to a user who only knows an order number. Apply an appropriate verification/rate limit to lookup endpoints.

## 5. Invoice flow
Order details → Generate invoice → A4 print layout → Print/save as PDF.
- Brand: “MART / Shop Smarter, Live Better”.
- Include order ID/date, customer/delivery details according to privacy policy, item lines, totals, payment/order status, store contact details, and QR code to the order update page.
- Omit the legacy “Order Process” section.
- Private invoices must not be served from a public cache.

## 6. Account flow
Sign in / account verification → Profile and saved addresses → Orders / wishlist / reviews as implemented.
- Enforce ownership on every profile/order endpoint.
- Editing delivery recipient details for a gift order must not silently modify the account's saved address.
- Account timeout or expired session should show a safe re-authentication state, not an endless spinner.

## 7. Admin navigation
Protected admin sign-in → Role/permission check → Admin dashboard → permitted module → validated action → persistence → audit event → result feedback.

Expected modules, where present:
- Dashboard / Reports
- Orders
- Returns
- Products
- Inventory
- Categories
- Customers
- Reviews
- Mart Pay / Transactions
- Coupons / Gift cards
- Marketing / Flash sales
- Delivery zones
- Banners
- Storage Health / Backups
- Store Settings
- Integrations & API
- Staff / Permissions
- AI Studio
- Security / Audit Logs

Every module must have loading, empty, error, and success states. Unauthorized requests must fail server-side even if a user manually calls an API.

## 8. Store Settings accordion behavior
- Initial state: no panel open unless the existing product specifies a default.
- Tap/click a closed setting: open it.
- Tap/click a different setting: close the prior panel and open the newly selected panel.
- Tap/click the currently open setting: close it.
- Mobile content must scroll to the full panel; desktop sidebar/navigation must not be covered by a page overlay.
- The setup checklist should query real readiness checks and show last checked time and a clear reason for any incomplete item.

## 9. Banner management flow
Admin → Banners → Add/Edit → enter fields → validate → save → show persisted banner.
- Validate required title, destination/action, image/source, enabled state, date window, and any supported dimensions/constraints.
- Return field-level validation errors.
- Reject unsafe URLs and malformed image references.
- Preview before publish if supported.
- “Invalid banner” must not be the only feedback when a field can be identified.

## 10. Payment/admin operations flow
Admin → Mart Pay/Transactions → select transaction → inspect server-verified status → permitted action.
- Gateway secrets are written server-side and encrypted.
- Secret values are never returned to the browser.
- Manual refunds are recorded only through a protected, audited workflow; recording a refund is not equivalent to initiating a provider refund unless an actual provider API confirms it.
- Demo payment confirmation must remain distinct from real settlement.

## 11. AI Studio flow
Authorized admin → AI Studio → choose capability → configure/test → submit bounded sample → receive result/telemetry.
- Product descriptions and marketing output are drafts until explicitly published.
- Sales analysis receives aggregate data, not customer PII or raw payment records.
- Public shopper assistant uses catalogue-only fallback when model calls fail.
- Model error, disabled feature, timeout, rate limit, or missing key should show a clear fallback state.
- AI cannot execute financial/order/stock actions.

## 12. Storage and backup flow
Admin → Storage Health → inspect actual status → run/inspect backup job → verify artifact and restore test → show result.
- Job states should distinguish queued, running, succeeded, failed, and restore-verified.
- Record timestamps, destination, size/checksum when available, and safe error summary.
- Never report “healthy” only because a job was requested or a file upload returned success.
- Restore requires explicit authorization and a safe target/backup strategy.

## 13. Telegram operations flow
Webhook receives update → verify Telegram secret token → verify allowed admin identity for commands → parse command → authorize operation → perform operation → respond with minimal data → audit sensitive action.
- External notification failure must not corrupt committed order/payment state.
- Do not send credentials or full payment/customer data into Telegram.

## 14. Deployment flow
Pull request / approved branch → install dependencies → security tests → type-check → production build → Cloudflare/OpenNext build → deploy → smoke tests → verify deployment commit and dependencies.
- Missing optional integrations should be visible and should not silently masquerade as a fully healthy release.
- Never claim deployment succeeded until current workflow and deployed runtime have been checked.
