# Telegram-backed file storage

The app uses the configured Telegram bot and a private admin chat as a file store. Telegram's returned `file_id` is stored in the order/product database; the bot token is never sent to the browser or written into product URLs.

## Configure secrets

The existing Firestore database still requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`; these are database credentials, not file-storage credentials. Keep them in the secret store as before.

Set these as Cloudflare Worker secrets (or GitHub Actions repository secrets, which the deployment workflow copies into Worker secrets):

- `TELEGRAM_BOT_TOKEN`: token from BotFather
- `TELEGRAM_CHAT_ID`: the private admin/storage chat ID
- `TELEGRAM_ADMIN_USER_IDS`: Telegram numeric user IDs allowed to operate the admin bot
- `TELEGRAM_WEBHOOK_SECRET`: a long random webhook secret

Do not paste these secrets into source code or commit them. Keep the storage chat private and limit access to trusted admins. The deployment workflow requires the bot token and chat ID to be configured.

## What is stored

- Payment proofs: uploaded as Telegram documents, with their Telegram file ID and basic metadata stored on the order. Admin access is required to view the proof.
- Product images: stored as Telegram documents; product image URLs point to the server endpoint `/api/telegram/files/{file_id}`. That endpoint keeps the bot token server-side.
- Invoices: use **Admin → Order → Invoice → Save invoice to Telegram**. The invoice HTML file is stored in Telegram and its file ID is saved on the order. **Download saved invoice** requires admin authentication.

## Important limits and operations

- Telegram Bot API does not provide a general `deleteFile` operation. If an upload succeeds but its database write fails, an orphaned document can remain in the storage chat; remove it manually from that chat.
- Keep the chat private. Anyone who can access it may see payment proofs and invoices.
- Telegram Bot API file downloads have platform limits and files are delivered through the bot API; use appropriately sized images and documents.
- Files uploaded before this integration are not automatically migrated. Existing database-backed product images remain accessible at their existing URLs.
- To verify, upload a test product image, submit a test payment proof, store an invoice from the order invoice page, then confirm each retrieval path works while logged in as an admin. Confirm unauthenticated requests to payment proof and saved invoice endpoints return HTTP 401.


## Optional Google Drive image mirror

New product images and general website image uploads are stored in the private Telegram storage chat and copied to a private Google Drive folder when the Drive mirror is configured. Telegram remains the image-serving URL; the Drive copy is an additional backup. Payment proofs and invoices are not mirrored by this feature.

**Recommended for a personal Gmail / My Drive folder: OAuth refresh-token credentials.** Google service accounts do not have personal Drive storage quota; sharing a normal My Drive folder with a service account does not grant it quota. Service-account uploads should be used only when targeting a Google Workspace Shared Drive where the service account has appropriate membership/permissions.

Set these as GitHub Actions repository secrets (Settings → Secrets and variables → Actions), then rerun the Cloudflare deployment workflow so it copies them to Worker runtime secrets:

- `GOOGLE_DRIVE_CLIENT_ID`: OAuth 2.0 client ID
- `GOOGLE_DRIVE_CLIENT_SECRET`: OAuth 2.0 client secret
- `GOOGLE_DRIVE_REFRESH_TOKEN`: refresh token authorized by the Google account that owns/has edit access to the destination folder
- `GOOGLE_DRIVE_FOLDER_ID`: ID of the destination folder from its URL

In Google Cloud Console, enable the Google Drive API and create an OAuth client. Generate a refresh token with offline access and the Drive file scope (`https://www.googleapis.com/auth/drive.file`) while signed in as the Google account that should own the mirror files. Keep all credentials private; never commit them. OAuth credentials take precedence if both OAuth and service-account variables are configured.

**Alternative for Google Workspace:** configure `GOOGLE_DRIVE_CLIENT_EMAIL` and `GOOGLE_DRIVE_PRIVATE_KEY`, add the service account to a Shared Drive with permission to create files, and set `GOOGLE_DRIVE_FOLDER_ID` to a folder inside that Shared Drive. A regular personal My Drive folder is not sufficient to solve the service-account quota error.

The Drive mirror is inactive if no Drive credentials and folder ID are configured. If only some credentials are set, uploads report a configuration error. Existing images are not retroactively copied; only new uploads and queued retries are mirrored. Once credentials are updated, use **Admin → Storage Health → Retry due backups** to retry previously failed jobs.
 
## Storage reliability improvements

- Image uploads accept JPEG, PNG, and WebP only when the file signature matches the declared MIME type; images over 650 KB are rejected.
- New uploads calculate a SHA-256 checksum and reuse a matching Telegram file reference when an identical asset is already registered.
- Firestore collections `storageAssets` and `storageBackupJobs` track file metadata and durable Google Drive retry jobs. The image bytes are not placed in the queue.
- The admin-only `/admin/storage` dashboard reads `/api/admin/storage` for approximate tracked bytes, backup queue state, recent assets, and legacy Base64 counts. Use **Retry due backups** to process due jobs in a bounded batch. A secret-protected `POST /api/cron/storage-backups` endpoint is available for an external scheduler; send `Authorization: Bearer <CRON_SECRET>` and configure a scheduler to call it periodically.
- Backup retries are bounded: each job is retried with increasing delays and marked failed after eight attempts. A Drive upload response is recorded with its file ID; this is not a full restore verification. Periodically test that a copied Drive object can actually be retrieved and matches its SHA-256 checksum.
- Legacy Base64 records remain readable. Do not bulk-delete them until they have been migrated and verified. The dashboard reports only the legacy Base64 records within its current capped query, not a guaranteed whole-database count.
- Public product image responses use CDN caching; private payment proof and invoice responses must remain authenticated and `private, no-store`.
- Cloudflare R2 has not been switched on by this change. Add it only after choosing an R2 bucket, setting runtime credentials, and testing upload/read/rollback paths; Telegram remains the serving store in the current architecture.


## Public product image failover

- The image endpoint attempts Telegram first and falls back to the private Google Drive mirror only for images attached to published products.
- A Drive fallback is served only when its bytes match the product image's stored SHA-256 checksum. The response includes `X-Image-Storage-Source: telegram` or `google-drive` to help diagnose the source.
- Private payment proofs and invoice files never use the public image fallback.
- Existing images need a populated `driveFileId` and a verified mirror before failover can work. The deployment/build checks do not prove every Drive file is readable; validate with a known mirrored product image after deployment.
- Verification checklist: confirm a normal product image returns HTTP 200 with source `telegram`; for a test image with a valid Drive mirror, simulate primary Telegram failure and confirm HTTP 200 with source `google-drive`; confirm a mismatched Drive checksum is rejected and private file requests remain authenticated.
