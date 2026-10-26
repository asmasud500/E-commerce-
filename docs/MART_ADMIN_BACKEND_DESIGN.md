# MART Admin Dashboard — Backend Design

## Goal

Make `/admin` the single primary administration entry point for the MART ecommerce application. The uploaded `mart-admin-dashboard.html` is a UI prototype, not a production backend: its seeded sample records and `localStorage` mutations must never be treated as real orders, payments, customers, or settings.

## Existing production foundation

- Framework: Next.js App Router, TypeScript.
- Database: Firebase Cloud Firestore through `lib/firestore.ts` (Prisma schema is migration-source only).
- Authentication: `admin_session` HTTP-only cookie, `lib/auth/admin.ts`, login/logout API, and middleware protection for `/admin/*` and `/api/admin/*`.
- Existing Firestore collections are mapped in `lib/firestore.ts`: users, categories, products, productImages, wishlistItems, reviews, paymentGateways, orders, paymentTransactions, stockReservations, orderItems, coupons and auditLogs.
- Existing admin APIs/pages cover products, categories, orders, customers, gateways, transactions, coupons, reviews, reports and activity.

## One-panel navigation

Keep `/admin` as the home/overview and use the shared `components/AdminSidebar.tsx` for all modules. Each feature below must use the existing database/API rather than browser-only state.

| Prototype feature | Backend source / implementation |
|---|---|
| Dashboard KPIs, sales chart, top products, low stock | Aggregate Order, OrderItem and Product data; calculate revenue only from verified PAID orders. Add date-range analytics endpoint. |
| Products & inventory | Existing Product, Category and ProductImage models; existing `/api/admin/products` and category APIs. Validate price/stock server-side; record changes in AuditLog. |
| Orders, invoice, fulfilment | Existing Order and OrderItem models and order APIs. Add immutable status history and invoice numbering/print view. Never allow arbitrary status strings. |
| Customer directory and spend | User + Order aggregates. Customer block/unblock needs a persisted `customerStatus` field or CustomerProfile model; do not infer a block from UI-only state. |
| Staff and permissions | Add AdminStaff/role-permission persistence. Do not let client-side checkboxes grant access. Enforce permission checks in every protected API. Keep a non-removable owner/super-admin safeguard. |
| Payment gateways | Existing PaymentGateway model and APIs. Store secrets encrypted/server-only; expose only safe public config. Gateway enable/disable is server validated and audited. |
| Payment transaction review | Existing PaymentTransaction and order payment APIs. Verify amount, currency, gateway, order and provider reference before marking PAID. Use idempotency for webhooks. |
| Delivery rates and courier | Add persisted DeliveryZone/DeliveryRate and Shipment models. Validate zone/rate server-side and keep tracking number, courier, dispatch/delivery timestamps and tracking URL. |
| Returns/refunds/restock | Add ReturnRequest/Refund records and state machine. Restock inventory only once after an approved return is physically received; refund and stock changes must be transactional. |
| Coupons | Existing Coupon model/API. Enforce expiry, minimum order, usage limits, per-customer limits and active status on the server at checkout. |
| Banners and flash sale | Add StoreBanner and FlashSale models with start/end timestamps, sort order, active flag and safe target URL validation. Storefront reads only currently active records. |
| SEO and analytics IDs | Add StoreSetting key/value records with an allow-list. SEO title/description can be public; analytics identifiers are validated and rendered safely. Never store private API keys in public settings. |
| Store identity/social links | Persist in StoreSetting with validation; do not use base64 logo data in localStorage. Upload images to configured object storage and save the URL. |
| Reports / CSV export | Server-side paginated and date-filtered aggregates. Authorize exports, cap range/row count, neutralize spreadsheet formula prefixes in CSV fields. |
| Activity logs | Existing AuditLog. Log actor, action, entity, entity ID, timestamp and minimal redacted metadata. Never log passwords, tokens, gateway secrets or raw payment credentials. |
| Invoice print/download | Build invoice view from persisted order/customer/item snapshots; generate print-friendly HTML/PDF from server data. Never trust totals submitted by the browser. |
| Dark mode / UI preferences | Client-only preference is acceptable; it must not be used for business data. |

## Proposed additive data models (Firestore first)

Implement the following as Firestore collection/document shapes and add collection mappings plus validation in `lib/firestore.ts`. If/when the project intentionally returns to PostgreSQL, create equivalent Prisma models and a reviewed migration. Do not assume a Prisma schema edit alone creates Firestore collections.

The exact names may be aligned to existing naming conventions. Prefer stable IDs, timestamps, explicit indexes where Firestore queries require them, and server-side transactional writes where supported.

- `AdminStaff`: id, userId (unique), roleId, active, createdAt, updatedAt.
- `AdminRole`: id, name (unique), isSystem, createdAt, updatedAt.
- `AdminPermission`: id, key (unique), description.
- `AdminRolePermission`: roleId, permissionId, unique pair.
- `CustomerProfile`: userId (unique), status (ACTIVE/BLOCKED), blockedAt, blockedReason.
- `OrderStatusHistory`: id, orderId, actorId, fromStatus, toStatus, note, createdAt.
- `DeliveryZone`: id, name, match rules / region codes, active.
- `DeliveryRate`: id, zoneId, amount Decimal(12,2), active, estimatedMinDays, estimatedMaxDays.
- `Shipment`: id, orderId, courier, trackingNumber, trackingUrl, status, shippedAt, deliveredAt, createdAt, updatedAt.
- `ReturnRequest`: id, orderId, reason, status, customerNote, adminNote, receivedAt, resolvedAt, createdAt, updatedAt.
- `Refund`: id, orderId, transactionId optional, amount Decimal(12,2), reference, status, reason, processedAt, createdAt.
- `StoreBanner`: id, title, imageUrl, targetUrl, active, sortOrder, startsAt, endsAt, createdAt, updatedAt.
- `FlashSale`: id, name, startsAt, endsAt, active, createdAt, updatedAt; per-product discount rules should use a related FlashSaleItem model rather than changing base product price.
- `StoreSetting`: id, key (unique), value Json, isPublic, updatedBy, updatedAt.

Existing `Coupon` can be extended with `usageLimit`, `perCustomerLimit`, `usedCount`, `startsAt`, and a relation to redemption records. Existing `Order` may receive a unique invoice number and shipment/return relations. Customer blocking should be enforced in customer authentication and checkout, not just hidden in admin UI.

## Suggested API contract

All routes below live under `/api/admin` and require an authenticated admin session plus a permission check.

- `GET /dashboard?from=&to=`: KPI totals, daily series, top products, low-stock list.
- `GET|POST /staff`, `PATCH|DELETE /staff/:id`: staff access and role assignment.
- `GET|PATCH /customers/:id/status`: block/unblock with reason.
- `GET|POST /delivery/zones`, `PATCH|DELETE /delivery/zones/:id`: delivery rules/rates.
- `POST /orders/:id/ship`, `GET /orders/:id/status-history`: shipment and audit trail.
- `POST /orders/:id/returns`, `PATCH /returns/:id`: return lifecycle.
- `POST /orders/:id/refunds`: refund request/processing, with provider integration and idempotency.
- `GET|POST /banners`, `PATCH|DELETE /banners/:id`: homepage banner management.
- `GET|POST /flash-sales`, `PATCH|DELETE /flash-sales/:id`: scheduled sale management.
- `GET|PATCH /settings`: allow-listed store settings.
- `GET /reports/sales?from=&to=&groupBy=`: revenue/order aggregates and CSV export.

Existing endpoints should be reused where they already provide the feature; do not create duplicate APIs for products, orders, coupons, categories, reviews or payment gateways.

## Security and correctness rules

1. All mutations happen on the server after session verification and permission authorization.
2. Validate request bodies with a schema (for example Zod); reject unknown status values and malformed IDs.
3. Use the Firestore atomic helpers in `lib/firestore.ts` for order/payment/refund/inventory state changes.
4. Use idempotency keys for payment webhooks, refund calls and retryable order actions.
5. Never expose encrypted gateway secrets, bot tokens, API keys, session cookies or raw provider payloads in browser responses.
6. Add AuditLog records for staff changes, customer blocking, payment decisions, order status changes, settings changes, refunds and inventory adjustments.
7. Use server pagination, bounded filters, rate limits on sensitive operations, and safe CSV escaping.
8. Add tests for unauthorized access, insufficient permissions, invalid transitions, duplicate webhooks, concurrent stock changes and refund idempotency.
9. For Firestore, deploy collection shape and security/authorization code together, validate required composite indexes, and test on a staging project before production rollout. For a future PostgreSQL migration, apply additive Prisma migrations in staging first and back up production data.
10. Treat seed/demo values in the original HTML as examples only. Never import those fake orders/customers/payments into the live database.

## Implementation order

1. Confirm existing routes/schema and preserve the current live CRUD features.
2. Port the dashboard presentation into the Next.js admin shell, replacing all seeded values with authenticated API responses.
3. Implement staff roles/permissions and audit checks before exposing more sensitive controls.
4. Implement settings, delivery/shipment, banner/flash-sale and customer status persistence.
5. Harden payment/refund/return flows and add idempotency/transaction boundaries.
6. Add tests, run CI/build, then verify deployment logs and smoke-test with a non-production order.
