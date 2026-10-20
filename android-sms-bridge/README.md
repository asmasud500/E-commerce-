# Android Mobile Money SMS Bridge

Private Android app starter for the same phone receiving bKash, Nagad and Rocket personal-account SMS.

## Status

The manifest and WorkManager webhook worker are now included, and a GitHub Actions workflow builds the debug APK when this module changes. The APK and real-device SMS behavior are **not yet verified** until that workflow passes and provider-specific redacted SMS samples are tested. Do not enable live auto-confirmation until these checks pass.

## Required setup

1. Set a strong random Cloudflare Worker secret named MOBILE_MONEY_SMS_WEBHOOK_SECRET. Use Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets, or run `npx wrangler secret put MOBILE_MONEY_SMS_WEBHOOK_SECRET` from the website project.
2. Configure the app with the HTTPS URL `https://YOUR-DOMAIN/api/webhooks/mobile-money-sms` and the same secret. Do not commit the secret to GitHub.
3. Watch the **Android SMS Bridge** GitHub Actions workflow for a compile result; then install a debug build and test with Android Studio on the phone that receives all three providers' SMS.
4. First test each provider using redacted SMS samples. SMS formats vary by provider and account type. The parser must find a credit message, transaction ID, exact amount and sender phone number before it can send a match.
5. Test mismatched amount, sender digits, debit SMS, duplicate transaction IDs, webhook timeout/retry and missing configuration before enabling real auto-confirmation.

## Important safety notes

- SMS notifications are not a bank-grade payment API. Keep Telegram manual confirmation as a fallback, especially for high-value orders.
- If the incoming SMS masks or omits the payer's phone number, last-four matching cannot work automatically.
- Android SMS access is sensitive and may be restricted for Play Store distribution. This starter is for private installation on your own device with explicit permission.
- Auto-confirmation must require exact transaction ID, amount, sender last four digits and a verified incoming credit SMS. Never confirm from a screenshot or user-entered values alone.
- The current parser only handles a limited set of English SMS formats and may need provider-specific adjustments. It should ignore any message it cannot parse confidently.
