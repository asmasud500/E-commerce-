# Production Readiness Runbook

This runbook separates source-code checks from operations that must be verified against the real Firebase and Cloudflare projects.

## 1. GitHub Actions

After pushing to `main`, monitor both workflows:

- CI: https://github.com/asmasud500/E-commerce-/actions/workflows/ci.yml
- Cloudflare deployment: https://github.com/asmasud500/E-commerce-/actions/workflows/deploy.yml

A run in `queued` state has not executed its steps yet. Do not treat a queued run as a successful build or deployment. If runs remain queued, inspect the repository's Actions settings, GitHub service status, runner availability, and any concurrency limits before changing application code.

## 2. Required GitHub repository secrets

The deployment workflow checks for these values without printing them:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `PAYMENT_ENCRYPTION_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `CRON_SECRET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Use unique, high-entropy secrets for session, encryption, webhook, and scheduled-job authentication. Never commit secret values to source control or paste them into public issues/logs.

Telegram and mobile-money SMS bridge values are optional for deployment, but their features require valid configuration. A skipped secret update does not remove an older secret already configured on Cloudflare; verify the intended runtime configuration explicitly.

## 3. Firestore indexes

The repository's index configuration is `firestore.indexes.json`. Deploy it to the intended Firebase project only after confirming the service account has the required Firebase/Firestore index-management permissions:

```bash
npx firebase-tools deploy --only firestore:indexes --project "$FIREBASE_PROJECT_ID"
```

Authenticate the Firebase CLI securely first. The Cloudflare deployment workflow does not by itself prove that indexes are deployed. Check the Firebase console for index build status before production checkout/payment tests.

## 4. Demo catalogue data

The idempotent demo catalogue script is `scripts/seed-demo-products.ts` and the package command is `npm run db:seed-demo`. It creates or updates 6 categories and 12 demo products, including stock and image records.

Run it only after confirming the environment points to the intended Firebase project. The script updates existing demo SKUs (including their stock), so do not rerun it against a live store after real inventory has replaced demo inventory. Verify the storefront's `/api/products?limit=1` and `/api/categories` responses after seeding. Demo records are illustrative, not real supplier listings.

## 5. Deployment smoke tests

The deploy workflow checks:

- the storefront homepage returns a successful response;
- `/api/health` can reach the configured Firestore adapter;
- storefront configuration returns the expected shape;
- product and category APIs return valid response shapes.

These checks are necessary but do not prove a complete purchase works. A valid API response can still contain zero products or categories; verify the actual catalogue in the admin panel/storefront.

## 6. Before accepting real orders

Complete a staging test with non-production payment credentials first:

- customer registration, login, session expiry, and password/error handling;
- product browse/search, cart totals, delivery fees, coupons, and stock contention;
- duplicate checkout/idempotency and expired stock release;
- manual payment proof, SSLCOMMERZ provider verification, duplicate transaction rejection, refund workflow;
- Telegram admin actions and authorization;
- Android SMS bridge authentication, sender/provider/amount/reference matching, and duplicate SMS handling;
- Firestore indexes, backups/restore, least-privilege service account, alerting, and rollback procedure.

Do not mark payment integrations production-ready until provider credentials, callbacks, and actual transaction flows have been tested end-to-end.
