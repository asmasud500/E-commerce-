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
- Nagad: official merchant-payment page https://nagad.com.bd/services/?service=merchant-payment. The official WordPress plugin source references the merchant ID/private key, gateway public key and callback allowlisting: https://github.com/common-repository/nagad-payment-gateway/blob/main/readme.txt. Use the current merchant-issued specification and credentials before implementation.
- Rocket / Dutch-Bangla Bank: official Rocket merchant payment overview https://www.dutchbanglabank.com/rocket/merchant-payment.html. This describes merchant-pay flows, not a general self-service web checkout API; request an approved e-commerce integration and callback/status specification from DBBL. A personal Rocket account is not an automated merchant API.
- Upay: the public merchant API reference found during research is https://upay-api-en.readme.io/reference/api-basic; verify with the Bangladesh Upay merchant team that this is the exact product/contract issued to your account before implementing it.
- Bangla QR: QR acceptance is not the same as an authenticated real-time payment-status API. Automatic settlement requires an acquiring bank/provider API and signed/verified transaction-status notifications; a static QR image alone cannot mark an order paid.

These entries remain disabled for checkout until an approved adapter is implemented and verified. Never enter production secrets in source code or commit them to Git. The shared PAYMENT_ENCRYPTION_KEY must be configured as an encrypted deployment secret.

## Logo guidance

Logos in the admin and checkout UI are identification aids only; they do not indicate that a gateway is active or that the merchant has been approved. The UI must reflect enabled/configured adapter status rather than treating every stored gateway as available.
