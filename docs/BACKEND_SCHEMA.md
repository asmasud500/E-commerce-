# MART E-commerce Platform — Backend Schema

**Important:** This is a logical schema and invariant guide, not a replacement for the actual Firestore collection definitions. The README documents Firestore as the runtime database through `lib/firestore.ts`; Prisma describes an optional PostgreSQL migration source. Before changing fields or indexes, inspect the current adapter, route handlers, seed scripts, and Firestore index file.

## 1. Schema principles
- Firestore is the documented runtime source of truth.
- Reuse existing collection names and field conventions; do not create duplicate collections simply to match this document.
- Use stable document IDs, server timestamps, explicit status enums, and schema validation.
- Keep money in integer minor units (for BDT, integer taka may be used if the existing system consistently does so); document the chosen convention and never mix floating-point representations.
- Keep gateway credentials encrypted and server-only.
- Avoid storing image binary/Base64 content in Firestore documents when a managed media URL/object store is appropriate.
- Define ownership, retention, indexes, and access rules for every collection.

## 2. Logical entities

### products
Suggested fields:
- `id`, `slug`, `name`, `description`, `categoryId`
- `images[]` (URLs or media references, not raw binary)
- `price`, `salePrice?`, `currency: "BDT"`
- `variants[]` or normalized variant records, depending on existing implementation
- `stock` or per-variant stock, `sku?`, `isActive`
- SEO metadata, created/updated timestamps

Invariants: nonnegative price/stock; sale price cannot exceed regular price unless the product policy explicitly allows it; inactive/unavailable products cannot be purchased.

### categories
Suggested fields: `id`, `name`, `slug`, `description?`, `image?`, `parentId?`, `sortOrder`, `isActive`, timestamps.

Invariants: unique slug within the intended scope; reject invalid parent relationships and cycles if hierarchical categories are supported.

### customers / profiles
Suggested fields: `id`, `name`, `phone`, `email?`, `savedAddresses[]` or address references, timestamps.

Invariants: authenticated users can read/update only their own profile; staff access is role-scoped and audited. Do not expose full profile data through public order tracking.

### addresses
Suggested fields: `id`, `customerId`, `division`, `district`, `upazila`, `postalCode?`, `fullAddress`, `label?`, timestamps.

Gift recipient address data should be attached to the relevant order/delivery snapshot rather than silently overwriting the buyer's saved address.

### orders
Suggested fields:
- `id`, `orderNumber`, `customerId?`, `customerSnapshot`, `deliverySnapshot`
- `items[]` or order-item references, `subtotal`, `discountTotal`, `deliveryFee`, `giftCardAmount?`, `total`, `currency: "BDT"`
- `orderStatus`, `paymentStatus`, `paymentMethod`
- `idempotencyKeyHash`, timestamps, cancellation/return metadata where applicable

Invariants: server-calculated totals; immutable purchase-time item/address/price snapshots; only valid state transitions; no public exposure of unnecessary personal details; duplicate order creation prevented.

### orderItems
Suggested fields: `id`, `orderId`, `productId`, `variantId?`, `skuSnapshot?`, `nameSnapshot`, `quantity`, `unitPrice`, `lineTotal`.

Invariants: positive quantity; validated product/variant at purchase time; preserve the order snapshot even if the catalogue later changes.

### stockReservations
Suggested fields: `id`, `orderId`, `productId`, `variantId?`, `quantity`, `status`, `expiresAt`, timestamps.

Invariants: reserve/decrement and order creation atomically; release exactly once; expired release job is authenticated and idempotent; prevent overselling under concurrency.

### paymentTransactions
Suggested fields: `id`, `orderId`, `gateway`, `providerTransactionId?`, `providerOrderReference?`, `amount`, `currency`, `status`, `validatedAt?`, safe provider metadata, timestamps.

Invariants: never store raw card data or gateway secrets; validate exact order reference, amount, BDT currency, and provider transaction ID server-side; callbacks are replay-safe; paid status requires verified provider evidence.

### paymentGatewaySettings
Suggested fields: `gateway`, `enabled`, non-secret public settings, encrypted secret payload, `updatedBy`, timestamps.

Invariants: secrets encrypted using the configured server key; secret values never returned to the browser; super-admin-only mutation; audit every change. Configurable fields do not imply a working adapter.

### coupons
Suggested fields: `id`, `code`, `type: "fixed" | "percentage"`, `value`, `minimumOrder`, `startsAt`, `endsAt`, `usageLimit?`, `usageCount`, `isActive`, applicability rules.

Invariants: normalize code; validate dates and limits; compute discounts server-side; prevent concurrent overuse where limits are strict.

### giftCards
Suggested fields: `id`, `codeHash`, `balance`, `currency`, `status`, `expiresAt?`, redemption ledger references.

Invariants: do not store redeemable secrets in plain text if avoidable; prevent double redemption; keep a ledger of balance changes.

### deliveryZones
Suggested fields: `id`, `division`, `district`, `upazila?`, `fee`, `freeDeliveryThreshold?`, `estimatedDays?`, `isActive`.

Invariants: deterministic zone matching; server computes fee; clearly reject unsupported delivery areas.

### returns
Suggested fields: `id`, `orderId`, `customerId?`, `items[]`, `reason`, `status`, `requestedAt`, `reviewedBy?`, `resolution?`.

Invariants: eligible delivered order only; quantity cannot exceed purchased/returnable quantity; staff actions audited.

### reviews
Suggested fields: `id`, `productId`, `customerId`, `rating`, `text`, `mediaRefs[]`, `status`, timestamps.

Invariants: rating within defined bounds; moderation state explicit; media stored as references rather than Base64 when possible.

### banners
Suggested fields: `id`, `title`, `imageUrl` or media reference, `destinationUrl?`, `placement`, `startsAt?`, `endsAt?`, `isActive`, sort order, timestamps.

Invariants: required fields match the actual UI contract; safe destination schemes only; valid date range; field-level validation errors.

### staff / roles / permissions
Suggested fields: `id`, `userId`, `role`, explicit permission set, `isActive`, timestamps.

Invariants: authorization is checked server-side for each action; prevent privilege escalation; deactivated staff sessions revoked; sensitive role changes audited.

### auditEvents
Suggested fields: `id`, `actorId`, `action`, `resourceType`, `resourceId`, safe change summary, `requestId`, timestamp.

Invariants: append-only for ordinary admin users; do not store secrets or unnecessary personal data.

### aiSettings / aiDrafts / aiUsage
Settings: enabled capabilities, model ID, bounded limits, update actor and timestamp.
Drafts: capability, content, target resource, creator, review/publish status, timestamps.
Usage: capability, model, duration, outcome, safe error class, token/usage counts only when available.

Invariants: generated content remains draft until approved; no PII/raw payment data in sales-analysis payloads; AI cannot perform order/payment/stock mutations; do not claim application telemetry is authoritative provider quota.

### mediaAssets / backupJobs
Media: stable asset ID, URL/storage provider, MIME type, size/checksum where available, visibility, timestamps.
Backup job: job ID, target, status, started/completed time, artifact reference, checksum, safe error, restore verification.

Invariants: private invoices and payment artifacts are not public; report real backup and restore state; never store credentials in metadata.

## 3. Order and payment state model
Exact enum values must match the code. A suggested conceptual model:

Order status: pending/placed → confirmed → packing → shipped/on-the-way → delivered; cancellation and return are separate transitions or terminal states according to the existing model.

Payment status: pending → paid after verified provider settlement; alternatively failed/cancelled/refunded as supported by the implementation. Demo mode remains unpaid. COD should have an explicit policy distinguishing order acceptance from money collected.

Never infer “paid” from a successful redirect alone. A browser return URL is not payment proof.

## 4. Transaction boundaries
Use native Firestore transactions for:
- stock validation/reservation and order creation,
- verified payment settlement,
- expiry-based reservation release,
- pending-order cancellation and stock release,
- any other operation where multiple documents must change atomically.

The repository README notes that a generic Prisma-compatible `db.$transaction` wrapper is not a real transaction. Audit every use; either move invariant-sensitive paths to native transactions or document why a path is safe without one.

## 5. Indexes and query patterns
- Catalogue: active status + category + sort field as needed.
- Orders: customer ID + created timestamp; order number exact lookup; status + created timestamp for admin lists.
- Transactions: order ID + created timestamp; provider transaction ID exact lookup if supported.
- Reservations: status + expiry timestamp.
- Returns: status + request timestamp.
- AI drafts: status + created timestamp.
- Backup jobs: status + created timestamp.

These are conceptual examples only. Derive the actual index definitions from query usage and deploy them to the intended Firebase project. Do not assume these indexes already exist.

## 6. Privacy and retention
- Limit public tracking responses to necessary progress and order summary.
- Restrict private invoices and full addresses to authorized users/staff.
- Define retention periods for logs, abandoned carts, AI drafts, backup artifacts, and old media.
- Redact identifiers from logs and AI prompts where possible.
- Keep a documented process for deletion/export requests where applicable.

## 7. Schema change process
1. Inspect existing field names, collections, queries, and indexes.
2. Update validation and migration/backfill plan.
3. Add backward-compatible readers where needed.
4. Test against a staging Firestore project with representative data.
5. Deploy indexes before relying on new queries.
6. Roll out code and monitor errors.
7. Verify rollback and data integrity.
