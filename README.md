# MART E-commerce Platform

Next.js 15 + React 19 e-commerce application with a custom Firestore REST data adapter and Cloudflare/OpenNext deployment support.

## Current database architecture

- **Application runtime:** Firebase Cloud Firestore, accessed by `lib/firestore.ts`. Configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
- **Prisma schema:** `prisma/schema.prisma` currently describes a PostgreSQL schema used by the optional PostgreSQL-to-Firestore migration script. It is **not** the application's runtime data adapter.
- **Optional migration source:** `scripts/migrate-postgres-to-firestore.ts` reads an existing PostgreSQL database through Prisma and copies supported collections to Firestore. Back up both databases and test the migration against a staging project first.

Do not run `prisma db push` expecting it to configure the live application's Firestore database; it only affects the PostgreSQL database in `DATABASE_URL`.

Native payment and stock transactions use compound Firestore queries. Before enabling these paths in a Firebase project, deploy the checked-in indexes with `firebase deploy --only firestore:indexes` from the repository root (after authenticating the Firebase CLI and selecting the intended project). Index deployment is a separate Firebase-project operation and is not performed by the GitHub code commit.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set the Firebase project ID and service-account credentials. Use a dedicated service account with only the required Firestore access.
3. Set unique, strong values for `PAYMENT_ENCRYPTION_KEY`, `ADMIN_SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_SECRET`, and `CRON_SECRET`.
4. Configure `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`.
5. Install dependencies and start the app:

```bash
npm install
npm run dev
```

For a PostgreSQL-to-Firestore migration only, configure `DATABASE_URL`, then run `npm run db:generate` and `npm run db:migrate-firestore` after reviewing the script and testing with a backup.

## Included features

- Product catalogue, categories, cart, checkout and customer accounts
- Stock reservations and expiry-release endpoint
- Checkout idempotency
- Payment gateway management with encrypted gateway secrets
- Branded MART Pay checkout hub with SSLCOMMERZ hosted merchant checkout, provider-side transaction validation, and automatic paid-order settlement
- Payment transaction records and manual refund recording
- Admin order/status management, staff roles and audit records
- Telegram admin notifications, order actions and bot commands
- Product search, filtering, pagination, media, sale pricing, wishlist and reviews
- Security headers and GitHub Actions validation

## Telegram setup

Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ADMIN_USER_IDS`, and `TELEGRAM_WEBHOOK_SECRET`. Configure the webhook at:

`https://YOUR-DOMAIN/api/telegram/webhook`

Use Telegram's secret-token header. Admin commands include:

```
/orders
/pending
/today
/sales
/stock
/search ORDER123
/help
```

## Scheduled stock release

Call `POST /api/jobs/release-stock` with `Authorization: Bearer CRON_SECRET`. Schedule it every few minutes using a trusted scheduler.

## Payments and safety

- Never store gateway credentials in source code. Configure SSLCOMMERZ, bKash, Nagad, Rocket, Upay, and Bangla QR credential fields from Admin → Payment Gateways → Set API credentials. Values are encrypted server-side and never returned to the browser.\n- `PAYMENT_ENCRYPTION_KEY` is the master key used to encrypt those saved credentials and must remain a strong Cloudflare encrypted environment secret; do not put it in the admin database or source code. A compromised/lost key requires rotating/re-entering saved provider credentials.\n- The admin credential form stores provider secrets but does not itself implement a provider API. Currently only SSLCOMMERZ has a verified automatic adapter; other direct providers remain unavailable until their official merchant API integration is built and tested. Personal-number SMS forwarding is disabled and cannot settle orders.
- Set `PAYMENT_CALLBACK_BASE_URL` to the canonical HTTPS origin of your deployed store (for example `https://shop.example.com`). Production payment initiation fails closed when this is missing or not HTTPS, preventing provider callbacks from being generated from an untrusted request host.
- SSLCOMMERZ validation must explicitly report BDT currency; a missing currency field is not accepted as proof of payment.
- SSLCOMMERZ callbacks are validated against the provider validation API. Settlement rejects a missing/mismatched amount, an unexpected order reference, or a missing provider transaction ID.
- MART Pay uses automatic merchant checkout only. Checkout exposes SSLCOMMERZ and Cash on Delivery; SSLCOMMERZ shows only channels enabled on the merchant account (such as mobile financial services, cards, or internet banking where contracted). Direct personal-number Send Money, manual transaction-ID entry, sender-last-four checks, and screenshot proof submission are disabled. Payment is marked paid only after server-side provider validation confirms the exact order reference, amount, BDT currency, and provider transaction ID. Do not advertise individual channels as live until the merchant account has them enabled and they have been tested.
- Keep payment webhooks and admin endpoints protected by their configured secrets and role checks.

## Production readiness caveat

Checkout inventory reservation now uses Firestore's native read-write transaction: product stock decrements, order creation, order items, and held reservations are committed atomically. A deterministic order document ID also makes a repeated idempotency key fail safely at the atomic commit rather than creating a second order.

**Important remaining limitation:** the generic Prisma-compatible `db.$transaction` wrapper is still not a real transaction and other application paths still use it. Core checkout, verified merchant-payment settlement, expired-stock release, admin payment confirm/reject, pending-order cancellation, and manual refund recording use dedicated native Firestore transactions. The legacy personal-number SMS confirmation endpoint and manual payment-proof endpoint are disabled. This does not make every endpoint transactional: other admin edits, general order-status updates, and unrelated multi-document operations still need review. The current REST adapter also needs staging/load testing against the configured Firestore project before production traffic.

## CI checks

GitHub Actions runs security tests, TypeScript validation, and the production build. A green CI run is necessary but does not replace staging tests for authentication, stock contention, payment callbacks, Telegram actions, backups, and deployment secrets.


## Gemini AI Studio

The admin workspace at `/admin/ai-studio` manages six AI capabilities: product descriptions, smart product search, customer support, sales analysis, marketing drafts, and shopping assistance. Storefront pages include a floating shopping/support assistant, and product search results can show AI-ranked catalog suggestions.

### Configuration

- Create an API key in Google AI Studio and configure it as the encrypted Cloudflare Worker secret `GEMINI_API_KEY`. Never use a `NEXT_PUBLIC_*` variable and never commit the real key.
- Default model ID: `gemini-3.5-flash-lite`. Model availability and free-tier limits depend on the Google AI Studio project and can change; verify the current quota dashboard before enabling traffic.
- AI Studio settings are stored in Firestore. Only a super admin can change global settings/model/limits; super admins and managers can review drafts and view telemetry.
- Run a connection test from AI Studio after setting the secret. A successful connection test proves the API key/model can answer a small prompt; it does not prove that the project's quota is sufficient for production traffic.

### Guardrails

- Product description, marketing and sales analysis output is saved as a draft; approval does not automatically publish content.
- Sales analysis uses server-side aggregates and does not send customer names, addresses, email addresses, or raw payment data to Gemini.
- AI endpoints cannot confirm payment, change order status, issue refunds, place orders, or modify stock.
- Public AI endpoints apply input bounds, sensitive-identifier redaction, request timeouts, and per-isolate rate limits. The app-side daily cap is best-effort under concurrency, not a replacement for provider quotas or Cloudflare global rate limiting. This in-memory limiter is not a distributed global rate limiter; apply Cloudflare rate limiting/WAF rules for production-scale abuse protection.
- Search, shopper discovery and general support provide a deterministic catalog-only fallback when the model is unavailable. The fallback does not claim to verify order/payment status or undocumented store policies.
- Usage dashboards show recorded application telemetry. The Gemini API does not expose authoritative provider quota through these application endpoints, so check Google AI Studio for actual limits. No paid billing is activated automatically when free quota is exhausted.
- AI request logs intentionally avoid storing raw prompts and API keys. Generated drafts are retained in the `aiDrafts` Firestore collection and should be reviewed/retained under your store's data policy. Google AI Studio Free-tier prompts may be used to improve Google products; review the current Google data terms before production and never send sensitive customer data.

### Staging checklist

1. Set `GEMINI_API_KEY` as a Cloudflare Worker secret and confirm existing Firebase/Firestore secrets are configured.
2. Deploy the feature branch to a staging environment, then test the connection from Admin → AI Studio.
3. Test all six features with safe sample data, including a missing key, disabled feature, invalid model, quota/rate-limit response, and timeout.
4. Verify product/marketing/sales outputs remain drafts until reviewed; verify admin role checks and public rate limits.
5. Check mobile and desktop AI Studio layout, Firestore logs/drafts, and the existing checkout/order/payment flows before production rollout.
