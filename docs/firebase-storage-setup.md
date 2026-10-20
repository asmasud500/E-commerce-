# Firebase Storage setup for payment proofs

This app uploads payment screenshots server-side and keeps the bucket private. The browser never receives a storage service-account key or a public object URL.

## 1. Create the bucket

1. Open the [Firebase Console](https://console.firebase.google.com/) and select the existing project configured as `FIREBASE_PROJECT_ID`.
2. Open **Storage → Get started** and create the default bucket. Firebase currently requires the Blaze pay-as-you-go plan to provision Cloud Storage for Firebase; set a Google Cloud budget alert before enabling production traffic.
3. Open **Storage → Files** and copy the exact bucket name. It commonly ends in `.firebasestorage.app`; use the actual name shown in your project rather than guessing.

## 2. Grant the server service account access

The service account configured by `FIREBASE_CLIENT_EMAIL` must have permission to create, read, and delete objects in this bucket. Grant the least-privilege Cloud Storage role that allows object create/get/delete (for example, **Storage Object Admin** at the bucket/project scope). Do not put a service-account JSON key in the repository.

## 3. Configure the Cloudflare Worker

In **Cloudflare Dashboard → Workers & Pages → ecommerce-platform → Settings → Variables and Secrets**, add the non-secret variable:

- `FIREBASE_STORAGE_BUCKET` = the exact bucket name copied in step 1 (without `gs://`)

Ensure the existing runtime bindings/secrets `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are configured for the same Firebase project. Keep the private key in the secret store.

## 4. Verify

1. Deploy the latest application.
2. Place a test order and submit a JPEG payment screenshot.
3. Open **Admin → Orders → View order → Payment verification → View saved payment screenshot**.
4. Confirm an unauthenticated browser session receives HTTP 401 from the admin proof endpoint.

## Security notes

- The application uploads and reads files using a server-side Google OAuth token; it does not make proof files public.
- Keep Firebase Storage client rules restrictive. Do not add public read/write rules for payment proofs.
- New screenshots are stored under `payment-proofs/{orderId}/...`; only the authenticated admin endpoint streams the file.
- Proofs submitted before this feature was configured are not automatically backfilled from Telegram.
- If upload returns HTTP 503, verify the bucket name, service-account IAM permissions, and Cloudflare runtime variables.
