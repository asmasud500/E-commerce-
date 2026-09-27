# E-commerce Platform

Next.js + Prisma + PostgreSQL e-commerce platform with Cloudflare/OpenNext support.

## Included

- Product catalog, categories, cart and checkout
- Customer registration/login and order history
- Stock reservations with expiry release
- Checkout idempotency
- Payment gateway management and encrypted gateway secrets
- SSLCOMMERZ adapter + manual bKash/Nagad/Rocket/Bangla QR flows
- Payment transaction records and manual refund recording
- Admin order/status management
- Telegram admin notifications and commands
- Product search, filtering and pagination
- Product media, featured/sale pricing
- Wishlist and verified-purchase reviews
- Security headers and CI validation

## Local setup

1. Copy `.env.example` to `.env`.
2. Configure PostgreSQL `DATABASE_URL` and required secrets.
3. Run:

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Production

Use Prisma migrations for controlled schema changes when your deployment process supports them. The repository also includes a Cloudflare/OpenNext build configuration.

Required production secrets include database access, payment encryption, admin session, Telegram secrets, webhook secret and cron secret.

## Telegram

Configure the bot webhook to:

`https://YOUR-DOMAIN/api/telegram/webhook`

Use Telegram's secret-token header and set `TELEGRAM_ADMIN_USER_IDS`.

Useful admin commands:

```
/orders
/pending
/today
/sales
/stock
/search ORDER123
/help
```

## Stock release

Call:

`POST /api/jobs/release-stock`

with:

`Authorization: Bearer CRON_SECRET`

Schedule it every few minutes in your deployment platform.

## Payment

Never put gateway secrets in source code. Configure them through the admin payment-gateway section. Automated bKash/Nagad/Rocket provider APIs still require the official merchant API contracts and credentials; the current adapters intentionally use manual verification rather than inventing provider endpoints.
