# Bangladesh merchant payment integration status

This document separates credential storage from actual provider integration. Adding credentials in Admin → Payment Gateways does not, by itself, implement or activate a payment API.

## Current automated integration

### SSLCOMMERZ — implemented in the application
- Official integration docs: https://developer.sslcommerz.com/doc/v4/index.html
- Official validation docs: https://sandbox-gw.sslcommerz.com/doc/v4/order-validation.html
- Flow: server-side session creation → hosted merchant checkout → IPN/callback → provider validation → exact order amount/currency/reference checks before settlement.
- Credentials: Store ID and Store Password are entered through Admin → Payment Gateways and encrypted server-side.
- Enable LIVE only after the merchant's live account and HTTPS callback URL have been configured and successful end-to-end tests have completed.

SSLCOMMERZ may display supported cards, bank and mobile-financial-service channels only when those channels are enabled for the merchant's contract/account. The storefront must not promise a specific channel solely because a logo is shown.

## Other providers — credentials can be stored, direct adapter is not enabled

- bKash: official public product information https://www.bkash.com/en/page/tokenized_checkout. Direct API activation requires the merchant's approved PGW onboarding and current merchant-specific API specifications/credentials.
- Nagad: request the current merchant integration specification and credentials from Nagad's official merchant/onboarding channel before implementation.
- Rocket / Dutch-Bangla Bank: request the current approved e-commerce merchant integration documentation from Dutch-Bangla Bank; a personal Rocket account is not an automated merchant API.
- Upay: request current merchant API documentation and production onboarding from Upay's official merchant channel.
- Bangla QR: QR acceptance is not the same as an authenticated real-time payment-status API. Automatic settlement requires an acquiring bank/provider API and signed/verified transaction-status notifications; a static QR image alone cannot mark an order paid.

These entries remain disabled for checkout until an approved adapter is implemented and verified. Never enter production secrets in source code or commit them to Git. The shared PAYMENT_ENCRYPTION_KEY must be configured as an encrypted deployment secret.

## Logo guidance

Logos in the admin and checkout UI are identification aids only; they do not indicate that a gateway is active or that the merchant has been approved. The UI must reflect enabled/configured adapter status rather than treating every stored gateway as available.
