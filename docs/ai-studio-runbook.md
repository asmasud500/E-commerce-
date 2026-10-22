# Gemini AI Studio staging runbook

## Before enabling AI

1. Create an API key in Google AI Studio for the intended project.
2. Add it to the Cloudflare Worker as an encrypted secret named GEMINI_API_KEY. Do not put the key in GitHub source, a NEXT_PUBLIC_* variable, Firestore settings, or browser code.
3. Verify the Firebase service account and Firestore permissions already used by the store are configured in the staging Worker.
4. Open Admin → AI Studio and run Test Gemini connection. A successful test confirms one small model call only; it does not guarantee ongoing free quota.
5. Check the Google AI Studio quota page for the selected model before enabling customer traffic.

## Feature smoke tests

- Product description: select an existing product, generate a draft, verify only known facts are used, review it, and confirm the storefront product is not changed automatically.
- Smart product search: search with a product name, a category, Bangla text, and an unrelated query. Confirm links and prices match live catalog records and keyword fallback works with Gemini unavailable.
- Customer support: ask a general product question. Then ask for order/payment status and verify the answer links to /track or /account without sending the request to Gemini.
- Sales analyst: run 7-, 30-, and 90-day reports. Verify BDT amounts and order status counts against the admin reports. If more than 1,000 orders match, the report must label its values as a partial sample.
- Marketing studio: generate a campaign draft and confirm no content is published automatically.
- Shopping assistant: ask for a product by name/category and verify returned product links, effective prices, and stock are drawn from the published, in-stock catalog.

## Security and resilience tests

- Test a missing/invalid API key, unsupported model ID, timeout, provider 429/quota exhaustion, disabled global switch, and disabled individual feature.
- Verify the API key never appears in browser bundles, response payloads, logs, or Firestore.
- Verify unauthenticated users cannot call product-description, marketing, or sales-analysis endpoints; verify only a super admin can change global AI configuration.
- Verify public inputs are bounded and email/phone/OTP-like values are redacted before prompts are sent.
- Verify AI cannot update orders, confirm payments, refund orders, or change inventory.
- Confirm shopper-facing catalog search/help falls back to deterministic catalog-only responses when Gemini is unavailable.
- Review AI request logs and draft retention. Provider quota must be checked in Google AI Studio; application counters are not the provider's authoritative quota.

## Rollout gate

Run CI (npm run test:security, npx tsc --noEmit, npm run build, and npm run cf:build), deploy to a staging Worker, and test desktop/mobile layouts plus the existing login, catalog, cart, checkout, payment callback, order management, Telegram, and backup workflows. Production deployment remains a separate explicit action after staging results and secret configuration are verified.
