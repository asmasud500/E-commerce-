# Bangladesh payment provider integration research

Status checked: 2026-10-21

This document records public documentation links and integration prerequisites for the E-commerce payment-gateway work. It deliberately does **not** treat unverified community endpoint lists as official production configuration.

## Required safety rules

- Do not enable a provider merely because endpoint URLs and credentials were saved.
- Keep bKash, Nagad, Rocket and UPay disabled until a provider-specific server-side adapter exists and has been tested against an approved merchant account.
- Do not set an order to PAID based only on a browser redirect, callback query parameter, screenshot or customer-supplied transaction ID.
- Verify payment server-to-server, including amount, currency, merchant/order reference and final successful status. Validate webhook signatures/authentication and make processing idempotent.
- Never put API secrets, private keys, passwords or encryption keys in publicConfig or frontend code.
- Never guess callback/webhook paths. Confirm a real repository route exists before giving it to a provider.

## bKash

- Public demo portal: https://merchantdemo.sandbox.bka.sh/
- The portal currently advertises Tokenized Checkout stable version v2, as well as Checkout v1.2.0-beta and webhook notification documentation.
- The previously circulated v1.2.0-beta URL pattern (including /tokenized/checkout/create, /execute and /payment/status) is a legacy-version pattern and has not been validated against this project's merchant account. Do not assume it is the currently approved Live version.
- Obtain the current production guide and exact Live base URL from the bKash merchant portal/onboarding contact.
- Credentials normally supplied by the provider for the approved integration include App Key, App Secret, API Username and API Password. Use only the fields required by the selected API version.
- Configure a return URL only after confirming the exact application route and state/CSRF protections. Configure a webhook only if the selected bKash product supports it and a real, authenticated receiver route is implemented.

## Nagad

- Official merchant service page: https://nagad.com.bd/services/?service=merchant-payment
- A community GitHub repository describes sandbox paths under https://sandboxapi.nagad.com.bd/remote-payment-gateway-1.0/api/dfs/check-out/ and initialize/complete operations. This is not an official production specification and must not be used to infer the Live base URL.
- Obtain the merchant integration guide, exact Live base URL, signing/encryption rules, initialize/complete/query operations and callback rules directly from Nagad.
- Do not use the public community endpoint list to enable production payments.

## Rocket / Dutch-Bangla Bank

- Official Rocket merchant payment information: https://www.dutchbanglabank.com/rocket/merchant-payment.html
- Public DBBL e-commerce web-service WSDL: https://ecom1.dutchbanglabank.com/ecomws/dbblecomtxn?wsdl
- The WSDL is a DBBL e-commerce service reference; public evidence reviewed here does not establish that it is the correct Rocket-specific checkout API for this merchant. Obtain DBBL's approved merchant integration documents and credentials before configuring endpoints.
- Do not infer OAuth/token, capture or status endpoints from the WSDL URL.

## UPay

- Public API reference: https://upay-api-en.readme.io/reference/api-basic
- The reference describes API Key, Secret Key, platform public key, request signing/encryption and merchant webhook configuration. A listed test endpoint such as https://openapi.upay-test.best/api/v1/acquirer/pay is a test endpoint and must not be treated as Bangladesh merchant Live production.
- Confirm with the actual UPay merchant account/provider that this documentation and API product apply to the Bangladesh UPay service and obtain the approved production base URL and endpoint list.

## Repository implementation status

The current Admin Panel can store endpoint settings and encrypted credentials, but saving configuration does not implement a provider adapter. The current UI itself notes that SSLCOMMERZ is the only automatic online checkout adapter; the other providers remain unsupported until server-side integrations and verification tests are added.

Before implementation, inspect the current repository for actual callback routes and payment/order status logic. Do not invent callback or webhook URLs. Keep each provider disabled until sandbox tests pass and the provider confirms production access.

## Acceptance tests for each provider

1. Create a unique payment session for a pending order using server-side credentials.
2. Redirect the customer to the provider-hosted checkout.
3. Verify completion server-to-server using the provider's documented API.
4. Confirm amount, currency, merchant reference, order reference and successful final status match the pending order.
5. Process duplicate callbacks/webhooks idempotently.
6. Ensure failed, cancelled, expired or mismatched payments do not mark orders PAID.
7. Test timeout/retry behaviour without duplicate charges or orders.
8. Confirm secrets never appear in client bundles, logs, API responses or publicConfig.
9. Verify refund/reconciliation behaviour if the provider supports it.
10. Enable Live mode only after provider approval and a real low-value end-to-end test.


## Official source review update — 2026-10-21

This review used the official bKash demo merchant portal and official Nagad merchant page:

- bKash demo portal: https://merchantdemo.sandbox.bka.sh/
- bKash developer documentation linked from the portal: https://developer.bka.sh/docs
- bKash SI/Aggregator guide (official-hosted PDF): https://s3-ap-southeast-1.amazonaws.com/developer.pay.bka.sh/bKash_SI_Aggregator_Guide.pdf
- Nagad merchant payment page: https://nagad.com.bd/services/?service=merchant-payment

The bKash demo portal currently lists Checkout v1.2.0-beta and Tokenized Checkout v2 as available product versions. The exact product, API version and endpoints must match the merchant's approved onboarding package. Do not assume an older v1.2.0-beta endpoint pattern is correct for a merchant account approved for v2 or another product.

Nagad's public merchant page confirms merchant-payment onboarding but does not publish enough account-specific API information to safely populate all production fields. Community code and third-party copies of integration guides are reference material only, not authorization to use a guessed production URL.

### Safe configuration decision

- Do not automatically fill or enable Live endpoints based on third-party examples.
- Use only provider-issued Sandbox endpoints and credentials for a sandbox test.
- Keep bKash and Nagad disabled until the repository has a matching server-side adapter, verifies payment status server-to-server, checks exact BDT amount/order reference, and passes success/failure/cancel/duplicate-callback tests.
- Admin API endpoint fields are configuration storage; they do not dynamically generate a provider adapter. Do not enter credentials into Additional public configuration (JSON).
