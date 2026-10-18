# Android Mobile Money SMS Bridge

Private Android app starter for the same phone receiving bKash, Nagad and Rocket personal-account SMS.

## Status

This is source code, not a tested APK. The Android module is incomplete until its manifest and worker files are present and the project builds successfully. Do not use it for live payments yet.

## Required setup

1. Set a strong random Cloudflare Worker secret named MOBILE_MONEY_SMS_WEBHOOK_SECRET. Use Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets, or run `npx wrangler secret put MOBILE_MONEY_SMS_WEBHOOK_SECRET` from the website project.
2. Configure the app with the HTTPS URL `https://YOUR-DOMAIN/api/webhooks/mobile-money-sms` and the same secret. Do not commit the secret to GitHub.
3. Build and test with Android Studio on the phone that receives all three providers' SMS.
4. First test each provider using redacted SMS samples. SMS formats vary by provider and account type. The parser must find a credit message, transaction ID, exact amount and sender phone number before it can send a match.
5. Test mismatched amount, sender digits, debit SMS and duplicate transaction IDs before enabling real auto-confirmation.

## Important safety notes

- SMS notifications are not a bank-grade payment API. Keep Telegram manual confirmation as a fallback, especially for high-value orders.
- If the incoming SMS masks or omits the payer's phone number, last-four matching cannot work automatically.
- Android SMS access is sensitive and may be restricted for Play Store distribution. This starter is for private installation on your own device with explicit permission.
- Auto-confirmation must require exact transaction ID, amount, sender last four digits and a verified incoming credit SMS. Never confirm from a screenshot or user-entered values alone.
- The current parser only handles a limited set of English SMS formats and may need provider-specific adjustments. It should ignore any message it cannot parse confidently.
