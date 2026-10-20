# Telegram-backed file storage

The app uses the configured Telegram bot and a private admin chat as a file store. Telegram's returned `file_id` is stored in the order/product database; the bot token is never sent to the browser or written into product URLs.

## Configure secrets

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
