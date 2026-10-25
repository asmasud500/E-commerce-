# MART E-commerce Platform — Implementation Plan

**Purpose:** A safe, verifiable roadmap for improving the existing repository without replacing working features or changing the brand theme.  
**Last updated:** 2026-10-25

## Working rules
- Preserve the current Navy–Orange theme and existing user-facing behavior unless a specific bug or approved requirement calls for a change.
- Inspect the current code before editing; documentation describes intent, not proof that a feature is implemented.
- Do not run destructive migrations or change production secrets as part of ordinary feature work.
- Do not claim a build, merge, deployment, backup, or integration succeeded without checking the actual result.
- Separate core deployment from optional integrations where possible, but never hide a required integration failure.
- Make one focused change set at a time and run the relevant tests.

## Phase 0 — Repository baseline and inventory
1. Read README, package scripts, environment example, workflow files, Firestore adapter, index configuration, Prisma schema/migration scripts, route handlers, admin auth, and existing tests.
2. Capture current branch/commit and working state.
3. Build a route inventory for storefront, admin pages, and APIs.
4. Map real Firestore collection names and schemas to `BACKEND_SCHEMA.md`.
5. Identify existing design tokens and record exact Navy–Orange values.
6. Record baseline CI/build/test status and current deployed commit if verifiable.

**Exit gate:** No planned implementation assumes a route, field, provider adapter, or deployment setting that has not been located or explicitly labelled as missing.

## Phase 1 — Quality and security foundation
1. Run dependency install, security tests, type validation, production build, and Cloudflare/OpenNext build.
2. Fix reproducible failures with minimal, isolated changes.
3. Verify every admin API checks session and role server-side.
4. Audit public tracking, profile, invoice, review, and media access for data leakage.
5. Review input validation, error messages, rate limits, headers, cookies, and secret handling.
6. Add tests for privilege escalation, invalid input, and secret non-disclosure.

**Exit gate:** No unresolved critical security regression; all required CI checks pass.

## Phase 2 — Checkout, inventory, and order integrity
1. Trace cart → checkout → order creation → stock reservation → expiry release.
2. Verify server-side price, promotion, delivery-fee, variant, and quantity calculations.
3. Verify idempotency behavior for repeated requests and race conditions.
4. Ensure order, order items, and stock reservation/decrement are atomic.
5. Review reservation expiry, cancellation, and stock release for exactly-once behavior.
6. Verify customer and delivery snapshots, including gift recipient separation.
7. Add tests for insufficient stock, concurrent orders, expired reservations, and duplicate submits.

**Exit gate:** No overselling or duplicate order under tested concurrent/replay scenarios; totals match server calculation.

## Phase 3 — Payment correctness
1. Inventory actual adapters and their supported methods.
2. Keep SSLCOMMERZ as the only automatically verified provider unless another adapter is implemented and independently tested.
3. Verify canonical HTTPS callback configuration.
4. Test provider validation for amount mismatch, order-reference mismatch, missing transaction ID, wrong/missing BDT currency, invalid response, and replay.
5. Confirm settlement is idempotent and only server-verified callbacks can mark an order paid.
6. Confirm COD state semantics and demo-mode labels.
7. Confirm no personal-number proof or manual transaction screenshot flow can settle an order.
8. Verify encrypted gateway credentials and that API responses never reveal secrets.

**Exit gate:** Negative payment tests all fail closed; no demo or browser redirect can mark payment paid.

## Phase 4 — Customer journey and responsive UI
1. Verify search/filter/sort/pagination, product details, variants, wishlist, and cart validation.
2. Verify checkout's five steps and mobile/desktop stepper behavior.
3. Verify Bangladesh delivery fields, delivery zone calculation, coupons, and gift-card behavior if enabled.
4. Verify order tracking using order number OR mobile OR email with appropriate privacy/rate limits.
5. Verify eligible cancellation before shipping and return request after delivery.
6. Verify A4 invoice, brand line, QR update link, and print styles.
7. Test at 320, 360, 390, 768, 1024, 1280, and 1440 px.
8. Fix mobile scroll traps, horizontal overflow, and desktop admin overlays without changing the theme.

**Exit gate:** Critical customer tasks pass on mobile and desktop with no fabricated order/payment progress.

## Phase 5 — Admin operations
1. Verify all listed admin routes exist and classify each as complete, partial, or missing.
2. Apply a permission matrix to each API and UI action.
3. Verify CRUD forms, server validation, pagination, loading/empty/error states, and audit events.
4. Fix banner validation to identify the exact invalid field.
5. Verify Store Settings accordion behavior: one open at a time, same panel toggles closed, mobile scrolling works, desktop content remains visible.
6. Ensure setup checklist, Storage Health, integration state, and backup state are derived from actual checks.
7. Verify Mart Pay and Transactions clearly distinguish configured, enabled, sandbox, pending, paid, failed, and refunded states.
8. Verify staff roles and deactivation/session revocation.

**Exit gate:** No unauthorized API mutation; no false success/health indicator; every visible action has a real result.

## Phase 6 — AI Studio
1. Verify the server-only Gemini key path and model configuration.
2. Test all six documented capabilities: product descriptions, smart search, customer support, sales analysis, marketing drafts, shopping assistance.
3. Test missing key, disabled feature, invalid model, quota/rate limit, timeout, and provider error.
4. Ensure product/marketing content stays draft until human publication.
5. Verify sales analysis uses aggregates without customer PII or raw payment data.
6. Confirm AI endpoints cannot modify order, payment, refund, or inventory state.
7. Confirm no automatic paid fallback; application telemetry is not represented as provider-authoritative quota.
8. Verify safe deterministic fallback and mobile/desktop layouts.

**Exit gate:** AI failures degrade safely and no privileged business operation is delegated to the model.

## Phase 7 — Integrations, backups, and operations
1. Verify Telegram webhook secret, allowed admin IDs, command authorization, and notification behavior.
2. Ensure notification failure cannot corrupt a committed order.
3. Verify Google Drive OAuth scopes, token refresh, quota/error reporting, and destination permissions.
4. Verify backup completeness, checksums where available, retention, and an actual restore test in a safe target.
5. Ensure private invoices/payment files are not public and public media cache contains only intended assets.
6. Add operational alerts for repeated webhook, payment, AI, and backup failures.
7. Ensure health dashboards show dependency status and last-check timestamps.

**Exit gate:** At least one documented restore drill succeeds; integration health matches observed outcomes.

## Phase 8 — CI/CD and deployment
1. Verify GitHub Actions workflow permissions and secret mapping.
2. Ensure tests/builds run before production deployment.
3. Keep secret values out of logs and artifacts.
4. Deploy an approved commit to staging first where available.
5. Run smoke tests for storefront, admin login, product listing, checkout path, payment callback safeguards, and health endpoints.
6. Verify the deployed commit SHA and runtime logs.
7. Deploy production only after gates pass; keep a rollback path.
8. Verify external integrations independently from core deploy status.

**Exit gate:** Current deployment is confirmed healthy by observable evidence; a queued workflow or successful build is not called a completed deployment.

## Phase 9 — Release and maintenance
- Review acceptance-test report and unresolved issues.
- Confirm backups and restore procedures.
- Review dependency vulnerabilities and provider terms/quotas.
- Update README and operational runbooks when behavior changes.
- Monitor error rates, checkout conversion, stock conflicts, payment failures, and backup health.
- Re-run regression tests after changes to auth, checkout, payment, schema, or deployment.

## Priority order
1. Security and data integrity.
2. Checkout, inventory, payment correctness.
3. Mobile/desktop critical UX.
4. Admin permission and status correctness.
5. Backup/restore and deployment verification.
6. AI features and polish.

## Definition of done
A task is done only when code is reviewed, relevant tests pass, the user-visible state is accurate, no secret is exposed, and deployment status is verified when deployment was part of the task.
