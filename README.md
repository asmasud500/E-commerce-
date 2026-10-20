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
3. Set unique, strong values for `PAYMENT_ENCRYPTION_KEY`, `ADMIN_SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `MOBILE_MONEY_SMS_WEBHOOK_SECRET`, and `CRON_SECRET`.
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

- Never store gateway credentials in source code. Configure SSLCOMMERZ, bKash, Nagad, Rocket, Upay, and Bangla QR credential fields from Admin → Payment Gateways → Set API credentials. Values are encrypted server-side and never returned to the browser.\n- `PAYMENT_ENCRYPTION_KEY` is the master key used to encrypt those saved credentials and must remain a strong Cloudflare encrypted environment secret; do not put it in the admin database or source code. A compromised/lost key requires rotating/re-entering saved provider credentials.\n- The admin credential form stores provider secrets but does not itself implement a provider API. Currently only SSLCOMMERZ has a verified automatic adapter; other providers remain disabled until their official merchant API integration is built and tested.
- Set `PAYMENT_CALLBACK_BASE_URL` to the canonical HTTPS origin of your deployed store (for example `https://shop.example.com`). Production payment initiation fails closed when this is missing or not HTTPS, preventing provider callbacks from being generated from an untrusted request host.
- SSLCOMMERZ validation must explicitly report BDT currency; a missing currency field is not accepted as proof of payment.
- SSLCOMMERZ callbacks are validated against the provider validation API. Settlement rejects a missing/mismatched amount, an unexpected order reference, or a missing provider transaction ID.
- MART Pay uses automatic merchant checkout only. Checkout exposes SSLCOMMERZ and Cash on Delivery; SSLCOMMERZ shows only channels enabled on the merchant account (such as mobile financial services, cards, or internet banking where contracted). Direct personal-number Send Money, manual transaction-ID entry, sender-last-four checks, and screenshot proof submission are disabled. Payment is marked paid only after server-side provider validation confirms the exact order reference, amount, BDT currency, and provider transaction ID. Do not advertise individual channels as live until the merchant account has them enabled and they have been tested.
- Keep payment webhooks and admin endpoints protected by their configured secrets and role checks.

## Production readiness caveat

Checkout inventory reservation now uses Firestore's native read-write transaction: product stock decrements, order creation, order items, and held reservations are committed atomically. A deterministic order document ID also makes a repeated idempotency key fail safely at the atomic commit rather than creating a second order.

**Important remaining limitation:** the generic Prisma-compatible `db.$transaction` wrapper is still not a real transaction and other application paths still use it. Core checkout, verified payment settlement, mobile-money SMS auto-confirmation, proof-reference claiming, expired-stock release, admin payment confirm/reject, pending-order cancellation, and manual refund recording now use dedicated native Firestore transactions. This does not make every endpoint transactional: other admin edits, general order-status updates, and unrelated multi-document operations still need review. The current REST adapter also needs staging/load testing against the configured Firestore project before production traffic.

## CI checks

GitHub Actions runs security tests, TypeScript validation, and the production build. A green CI run is necessary but does not replace staging tests for authentication, stock contention, payment callbacks, Telegram actions, backups, and deployment secrets.
