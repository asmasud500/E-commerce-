# Bangladesh merchant payment integration status

Last reviewed: 2026-10-20

## Honest implementation status

| Provider | Application status | Can be enabled for automated checkout now? |
|---|---|---|
| SSLCOMMERZ | Server-side session creation, hosted checkout, IPN/callback validation and atomic settlement adapter exists | Yes, after merchant credentials and sandbox/live end-to-end tests |
| bKash | Not implemented as a direct adapter; manual transfers are disabled | No |
| Nagad | Not implemented as a direct adapter; manual transfers are disabled | No |
| Rocket (DBBL) | Not implemented as a direct web-checkout adapter; manual transfers are disabled | No |
| Upay | Not implemented as a direct adapter; manual transfers are disabled | No |
| Bangla QR | Static QR is not an automatic payment-status integration | No |

Do not describe the four requested direct integrations as completed until each provider's own API has been implemented and verified against that provider's merchant sandbox/account. Saving API keys in Admin → Payment Gateways is not enough to create an integration.

## Existing automated integration: SSLCOMMERZ

- Official integration docs: https://developer.sslcommerz.com/doc/v4/index.html
- Official validation docs: https://sandbox-gw.sslcommerz.com/doc/v4/order-validation.html
- Flow: server-side session creation → hosted merchant checkout → IPN/callback → provider-side validation → exact order reference and BDT amount checks → atomic settlement.
- Store ID and Store Password are entered through Admin → Payment Gateways and encrypted server-side.
- Do not enable LIVE until the merchant's live account, HTTPS callback/IPN URLs, and complete test purchase/refund/failure flows are verified.
- SSLCOMMERZ can show bKash/Nagad/Rocket or other payment methods only if those methods are enabled under the merchant's own contract. That is an aggregator flow, not four independent direct integrations.

## Direct provider requirements

### bKash

Official business information: https://www.bkash.com/en/business  
Sandbox merchant portal: https://merchantdemo.sandbox.bka.sh/  
Official integration guide: https://developer.bka.sh/

Required before implementation can be safely completed:
- Approved bKash PGW merchant onboarding and the current API specification for the exact product (Checkout or Tokenized Checkout).
- Sandbox app key/secret, username/password and any merchant-specific configuration, provided through the deployment's secret settings—not in source code or chat.
- Current token, create-payment, execute-payment, query/validation, callback/webhook and signature/security requirements.
- A reachable HTTPS callback URL and successful sandbox transaction tests.

### Nagad

Official site: https://nagad.com.bd/  
Official Nagad WooCommerce plugin documentation/source: https://github.com/common-repository/nagad-payment-gateway/blob/main/readme.txt

The official plugin's setup instructions refer to a merchant ID, merchant private key, Nagad gateway public key and callback URL whitelisting. The production adapter must follow the current merchant-issued specification for signature/encryption, checkout initialization, callback/verification and status handling—not copy undocumented endpoints from unofficial examples.

Required: approved merchant account, current API package, sandbox credentials/key material, callback/IP allowlisting, and tested successful/failed/cancelled payment cases.

### Rocket / Dutch-Bangla Bank

Official Rocket merchant payment overview: https://www.dutchbanglabank.com/rocket/merchant-payment.html  
DBBL e-commerce web services endpoint/WSDL: https://ecom1.dutchbanglabank.com/ecomws/dbblecomtxn?wsdl

The public Rocket overview describes a merchant-initiated merchant-pay flow; it does not establish a general self-service Rocket checkout API contract for this website. DBBL must confirm whether the e-commerce web service supports the merchant's Rocket use case and provide the applicable merchant onboarding, request signing/authentication, transaction-status and callback specifications.

Required: written DBBL confirmation and merchant-specific API docs/credentials. A personal Rocket number or static QR is not an automated direct integration.

### Upay

Public API reference found during research: https://upay-api-en.readme.io/reference/api-basic  
Example order endpoint in that reference: https://upay-api-en.readme.io/reference/post_api-v1-acquirer-pay-1

The public docs describe signed requests, API key/secret, platform public key, encryption, request IDs, timestamps and webhook setup. However, these public references do not by themselves confirm that this is the exact Bangladesh Upay merchant product/account contract. Do not wire these endpoints into production until Upay confirms the product, base URLs, payment method and merchant credentials for this business.

Required: written confirmation from the Bangladesh Upay merchant team, applicable API specification, sandbox access and tested signed callback/status verification.

## Security and acceptance criteria for every direct adapter

1. Keep credentials/private keys encrypted at rest and out of browser responses, source code, logs and Git history.
2. Create payment sessions server-side using the order's stored amount and currency; do not trust amounts supplied by the browser or callback.
3. Verify provider status server-to-server or by a cryptographically verified callback. A redirect alone never means paid.
4. Match the provider transaction/reference to the exact pending order, amount, currency (BDT), and successful final status.
5. Reject invalid signatures, expired/replayed callbacks and duplicate provider transaction IDs; settle atomically and idempotently.
6. Test success, decline, cancel, timeout, amount mismatch, duplicate callback, forged callback and provider outage in sandbox.
7. Keep each provider unavailable in checkout until all acceptance checks pass. Never fall back to personal-number transfers/manual transaction IDs.

## Admin setup checklist

For each provider, enter credentials only after the adapter exists and the merchant has issued those credentials. Use sandbox mode first. Configure the exact public HTTPS callback/webhook URL in the provider portal and complete provider-side whitelisting where required. Keep the deployment's shared PAYMENT_ENCRYPTION_KEY in the hosting secret manager and stable across deployments.

## Logo guidance

Logos are identification aids only; they do not prove a gateway is enabled or that the merchant is approved. The checkout must list only gateways backed by an implemented, enabled adapter (plus explicitly configured Cash on Delivery).
