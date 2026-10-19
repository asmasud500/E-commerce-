# MART E-commerce Platform

Next.js 15 + React 19 e-commerce application with a custom Firestore REST data adapter and Cloudflare/OpenNext deployment support.

## Current database architecture

- **Application runtime:** Firebase Cloud Firestore, accessed by `lib/firestore.ts`. Configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
- **Prisma schema:** `prisma/schema.prisma` currently describes a PostgreSQL schema used by the optional PostgreSQL-to-Firestore migration script. It is **not** the application's runtime data adapter.
- **Optional migration source:** `scripts/migrate-postgres-to-firestore.ts` reads an existing PostgreSQL database through Prisma and copies supported collections to Firestore. Back up both databases and test the migration against a staging project first.

Do not run `prisma db push` expecting it to configure the live application's Firestore database; it only affects the PostgreSQL database in `DATABASE_URL`.

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
- SSLCOMMERZ validation plus manual bKash/Nagad/Rocket/Bangla QR flows
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

- Never store gateway credentials in source code. Configure gateway secrets through the admin payment-gateway section.
- SSLCOMMERZ callbacks are validated against the provider validation API. Settlement rejects a missing/mismatched amount, an unexpected order reference, or a missing provider transaction ID.
- bKash/Nagad/Rocket and Bangla QR manual flows do not become provider-verified merely because a customer submits a transaction ID or screenshot. Automatic SMS matching requires the trusted Android bridge to call `/api/webhooks/mobile-money-sms` using `MOBILE_MONEY_SMS_WEBHOOK_SECRET`; validate that bridge and its secret before enabling it.
- Keep payment webhooks and admin endpoints protected by their configured secrets and role checks.

## Production readiness caveat

The current Firestore compatibility adapter implements a Prisma-like `$transaction` wrapper but does not yet use Firestore's native atomic transaction API. Multi-document operations (for example, decrementing stock and creating an order together) are **not guaranteed to be atomic under concurrent requests**. Do not treat the current adapter as production-safe for high-concurrency checkout/payment until native Firestore transactions or a real transactional database adapter are implemented and load-tested.

## CI checks

GitHub Actions runs security tests, TypeScript validation, and the production build. A green CI run is necessary but does not replace staging tests for authentication, stock contention, payment callbacks, Telegram actions, backups, and deployment secrets.
