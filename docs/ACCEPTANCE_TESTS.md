# MART E-commerce Platform — Acceptance Tests

**Purpose:** Release gate for customer, admin, payment, security, AI, backup, and deployment workflows.  
**Status convention:** Mark each test PASS / FAIL / BLOCKED / NOT RUN with evidence, date, commit SHA, and environment. Do not pre-mark tests as passed.

## 1. Test environment and evidence
Record before a release:
- Commit SHA and branch:
- Environment (local/staging/production):
- Deployed URL and deployed commit, if applicable:
- Firestore project/index deployment status:
- Payment mode/provider:
- Browser/device and viewport:
- Test date and tester:
- CI run links and logs:
- Known limitations:

Use test accounts and synthetic customer/payment data. Never include secrets or real card/payment credentials in test artifacts.

## 2. Install/build/CI
- [ ] Install dependencies using the lockfile.
- [ ] Security test command `npm run test:security` passes.
- [ ] TypeScript validation passes using the repository's configured command/workflow.
- [ ] `npm run build` passes.
- [ ] `npm run cf:build` passes in the supported deployment environment.
- [ ] GitHub Actions reports the intended commit and expected checks.
- [ ] No secrets appear in logs, build output, or client bundles.
- [ ] A green CI run is not treated as proof of production integration health.

## 3. Storefront and catalogue
- [ ] Home page loads without runtime errors.
- [ ] Category navigation returns the correct products.
- [ ] Search returns matching products and handles empty results.
- [ ] Filters and sorting work together and reset predictably.
- [ ] Pagination is bounded and does not repeat or skip results unexpectedly.
- [ ] Product detail shows the correct price, sale price, images, and availability.
- [ ] Invalid/inactive product IDs return safe not-found/validation responses.
- [ ] Variant selection is required where applicable.
- [ ] Unavailable stock cannot be added/ordered.
- [ ] Wishlist add/remove works for the intended user/session.
- [ ] Product SEO metadata is safe and consistent where implemented.
- [ ] Demo/seed products are stored in the database, not hard-coded as the only production catalogue source.

## 4. Cart and checkout
- [ ] Cart quantity changes update displayed totals.
- [ ] Server recomputes price, discount, delivery fee, and total.
- [ ] Tampered browser price/discount values are ignored or rejected.
- [ ] Coupon validation covers start/end dates, usage limit, minimum order, and eligibility.
- [ ] Gift card validation cannot overdraw or redeem the same balance twice.
- [ ] Customer name/phone/email validation works.
- [ ] Delivery division/district/upazila/postal/full address validation works.
- [ ] Delivery fee matches the configured zone and free-delivery threshold.
- [ ] Gift recipient details do not overwrite the buyer's saved profile.
- [ ] Double-clicking submit does not create duplicate orders.
- [ ] Replaying the same idempotency key is safe.
- [ ] Two concurrent orders for the final unit cannot oversell stock.
- [ ] Order and reservation state remain consistent if a transaction fails.
- [ ] Expired reservations release exactly once.
- [ ] Checkout errors preserve safe form input and explain the recovery path.
- [ ] Confirmation displays the real persisted order and payment status.

## 5. Payment tests
- [ ] Only enabled, implemented payment methods are displayed.
- [ ] SSLCOMMERZ initiation uses a canonical HTTPS callback origin.
- [ ] Valid provider validation with exact order reference, amount, BDT currency, and transaction ID can settle the correct order.
- [ ] Wrong amount is rejected.
- [ ] Wrong order reference is rejected.
- [ ] Missing transaction ID is rejected.
- [ ] Missing or incorrect BDT currency is rejected.
- [ ] Invalid provider response is rejected.
- [ ] Replayed callback does not double-settle or duplicate side effects.
- [ ] Browser redirect alone cannot mark an order paid.
- [ ] Callback failure leaves payment safely pending/failed as designed.
- [ ] Gateway secrets are encrypted and never returned in API responses.
- [ ] Demo mode visibly says “DEMO MODE — NOT PAID”.
- [ ] Demo mode never changes payment status to paid.
- [ ] COD uses the documented state policy and does not claim online payment.
- [ ] Personal-number SMS forwarding, manual transaction IDs, and screenshot proofs cannot settle orders.
- [ ] Other provider fields are not presented as live until their adapters pass independent integration tests.
- [ ] Manual refund record is not falsely described as a confirmed provider refund unless provider status verifies it.

## 6. Order tracking, cancellation, returns, invoice
- [ ] Tracking lookup works by order number.
- [ ] Tracking lookup works by mobile.
- [ ] Tracking lookup works by email.
- [ ] A lookup requiring one identifier does not accidentally require all identifiers.
- [ ] Rate limits/verification prevent order-number enumeration.
- [ ] Tracking response does not expose unnecessary PII, full address, or payment secrets.
- [ ] Timeline reflects persisted state and timestamps, not fabricated future progress.
- [ ] Cancellation is available only in eligible pre-shipping states.
- [ ] Cancellation updates order and inventory consistently.
- [ ] Return request is available only after delivery and when policy allows it.
- [ ] Return quantity cannot exceed eligible purchased quantity.
- [ ] Staff review and return resolution are audited.
- [ ] Invoice prints cleanly on A4 and excludes navigation/interactive controls.
- [ ] Invoice includes “MART / Shop Smarter, Live Better” and store details.
- [ ] Invoice has no legacy “Order Process” section.
- [ ] QR points to a safe order update URL without embedding sensitive data.
- [ ] Private invoice access is authorized and not publicly cacheable.

## 7. Authentication and authorization
- [ ] Unauthenticated requests cannot access protected admin APIs.
- [ ] A lower-privileged staff account cannot perform super-admin actions.
- [ ] Customer A cannot read/update Customer B's profile, order, or saved address.
- [ ] Staff role changes are authorized and audited.
- [ ] Deactivated staff access is revoked as expected.
- [ ] Session cookies have secure production attributes.
- [ ] Login/session expiry gives a recoverable user experience.
- [ ] CSRF protections are tested where applicable.
- [ ] Rate limits protect login and expensive public endpoints.
- [ ] Error responses do not expose stack traces, service-account details, or secret values.
- [ ] Private media and invoice routes verify ownership/permission.

## 8. Admin operations
- [ ] Dashboard metrics match source data for the selected date range.
- [ ] Orders list/filter/detail/status changes work and are permission-checked.
- [ ] Products CRUD and stock updates validate data.
- [ ] Categories CRUD rejects invalid slugs/relationships.
- [ ] Inventory cannot be reduced below valid constraints without an explicit policy.
- [ ] Customer access is role-scoped and privacy-aware.
- [ ] Reviews moderation and media references work.
- [ ] Transactions clearly show actual provider verification status.
- [ ] Coupons and gift cards enforce date/usage/balance limits.
- [ ] Delivery zones and fee rules are deterministic.
- [ ] Banner form reports field-level validation errors instead of only “Invalid banner”.
- [ ] Store Settings accordion opens one panel, switches panels, and closes when the open panel is selected again.
- [ ] Store Settings mobile page scroll reaches all content.
- [ ] Store Settings desktop navigation and content remain visible; no accidental full-screen overlay.
- [ ] Setup checklist and integration statuses reflect real checks and timestamps.
- [ ] Storage Health never reports success when a backup/auth/quota check failed.
- [ ] Staff permissions are enforced by API, not only UI visibility.
- [ ] Security-sensitive actions create audit records without storing secrets.

## 9. AI Studio
- [ ] Missing Gemini key produces a safe, clear state.
- [ ] Disabled capability is not callable through a direct API request.
- [ ] Invalid model, timeout, rate limit, and provider errors are handled.
- [ ] Product description generation saves a draft.
- [ ] Marketing generation saves a draft.
- [ ] Draft is not published without explicit authorized approval.
- [ ] Sales analysis uses aggregate data and excludes customer PII/raw payment data.
- [ ] AI cannot place/confirm orders, settle payment, issue refunds, or change inventory.
- [ ] Deterministic catalogue fallback works when designed and does not invent stock/order status.
- [ ] AI request logs do not store raw API keys or unnecessary raw prompts.
- [ ] Application telemetry is not presented as authoritative provider quota.
- [ ] No paid fallback activates automatically after free quota exhaustion.
- [ ] Mobile and desktop AI Studio layouts are usable.

## 10. Telegram and external integrations
- [ ] Telegram webhook rejects requests without the expected secret-token header.
- [ ] Admin commands reject unauthorized Telegram user IDs.
- [ ] Command arguments are validated and cannot bypass role checks.
- [ ] Notification failure does not roll back or corrupt an already committed order.
- [ ] Telegram messages do not expose credentials or unnecessary customer/payment data.
- [ ] Gemini secret is server-side and not exposed via any `NEXT_PUBLIC_*` variable.
- [ ] Google Drive OAuth refresh and backup upload work with the intended account.
- [ ] Quota/auth failures are reported as failures, not healthy status.
- [ ] Backup artifact completeness is checked.
- [ ] A restore drill succeeds in a safe test target and restored data is verified.
- [ ] Backup status distinguishes upload success from restore verification.

## 11. Responsive and accessibility
- [ ] Test at 320, 360, 390, 768, 1024, 1280, and 1440 px widths.
- [ ] No unintended page-level horizontal overflow.
- [ ] Mobile header/navigation is operable.
- [ ] Admin sidebar/drawer does not trap scroll or obscure content.
- [ ] Checkout fields and final action remain reachable when the mobile keyboard is open.
- [ ] Tables have a usable mobile strategy.
- [ ] Store Settings accordion works by touch and keyboard.
- [ ] Dialogs can be dismissed and maintain sensible focus.
- [ ] Inputs have labels and associated errors.
- [ ] Focus states are visible and contrast is sufficient.
- [ ] Reduced-motion preference is respected.

## 12. Performance and resilience
- [ ] Catalogue/admin queries are paginated and bounded.
- [ ] Images have suitable dimensions/cache policy.
- [ ] Private content is not publicly cached.
- [ ] Optional provider failure does not crash unrelated core flows.
- [ ] Timeouts and bounded retries prevent hung requests.
- [ ] Concurrent checkout and payment callback tests do not corrupt state.
- [ ] Logs contain safe request/job identifiers and actionable error classes.

## 13. Deployment smoke tests
- [ ] Deployment workflow completed successfully for the intended commit.
- [ ] Deployed commit SHA matches the approved source.
- [ ] Production health endpoint returns the expected response.
- [ ] Storefront home and product pages load.
- [ ] Admin login and role checks work.
- [ ] Read-only product/catalogue API works.
- [ ] Test checkout in sandbox/demo mode without marking payment paid.
- [ ] Payment callback safeguards are confirmed in staging.
- [ ] Telegram webhook status is verified independently.
- [ ] Firestore indexes are deployed to the intended project.
- [ ] Backup/restore status is checked independently.
- [ ] Rollback procedure is documented and available.

## 14. Release decision
Release status: **NOT EVALUATED** until the checklist is filled with actual results.

- Critical failures: 
- High-severity failures:
- Accepted known limitations:
- Evidence links:
- Approver:
- Release date:

A release must not be called production-ready while critical security, order-integrity, or payment-validation tests fail. Blocked tests must be listed explicitly; they are not passes.
