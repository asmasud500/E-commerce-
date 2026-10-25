# MART E-commerce Platform — Technical Requirements Document

**Status:** Architecture baseline; verify against the current source before implementation  
**Repository:** asmasud500/E-commerce-  
**Last updated:** 2026-10-25

## 1. System overview
The repository README documents a Next.js 15 / React 19 application, custom Firestore REST data adapter, and Cloudflare/OpenNext deployment support.

Conceptual request path:
1. Browser storefront or admin UI.
2. Next.js route/page or API handler.
3. Input validation, authentication, authorization, and rate limiting as applicable.
4. Application/domain service.
5. Firestore adapter and provider integrations.
6. Response with normalized data and safe error messages.
7. Auditable side effects such as Telegram notification, AI telemetry, or backup jobs.

This is a logical model, not a claim that every route currently follows the same layering. Review route handlers and services before refactoring.

## 2. Technology baseline
- Language: TypeScript / JavaScript.
- Web: Next.js 15, React 19.
- Validation: Zod 4 is present in package dependencies.
- Data runtime: custom Firestore REST adapter in `lib/firestore.ts`.
- Optional migration tooling: Prisma 6 and PostgreSQL-compatible connection used by the documented PostgreSQL-to-Firestore migration script. Prisma is not the live Firestore adapter.
- Deployment: Cloudflare Workers/OpenNext with Wrangler 4.
- Tests: Node test runner through `npm run test:security`; production build through `npm run build`; Cloudflare build through `npm run cf:build`.
- AI: Gemini API called server-side; configured key is `GEMINI_API_KEY`.
- Notifications: Telegram Bot API/webhook.
- Media/backup: Firestore-backed metadata and configured Google Drive integration are part of the documented operating plan; inspect actual implementations before promising complete backup/restore coverage.

## 3. Environments
### Local
- Copy `.env.example` to `.env`.
- Install with `npm install`.
- Configure a dedicated Firebase service account and required secrets.
- Run `npm run dev`.
- Never use production secrets in a shared or untrusted environment.

### CI
- Run security tests, TypeScript validation, and production build.
- Do not print secrets or sensitive environment values in logs.
- Fail on required quality gates. Optional integrations may be skipped only with an explicit, visible reason and a separate release gate.

### Staging
- Use isolated Firebase/Firestore data and provider sandbox credentials.
- Verify indexes, webhook configuration, origin URLs, AI behavior, Telegram delivery, and rollback/restore.
- Never test destructive migration scripts against production data.

### Production
- Deploy through the existing approved GitHub Actions / Cloudflare workflow.
- Verify deployed commit, health route, critical APIs, logs, and actual integration status after deployment.
- Keep all secret values in GitHub Actions Secrets and/or Cloudflare encrypted secrets as required by the checked-in workflow.

## 4. Data architecture
### Runtime database
Firestore is the documented runtime source of truth. Use the existing adapter and collection conventions; do not introduce a second runtime database without a separate approved migration plan.

Expected logical entities/collections (names must be reconciled with current code):
- products, categories
- customers/profiles and addresses
- carts/wishlists where persisted
- orders, orderItems, stockReservations
- paymentTransactions / gateway configuration
- coupons, gift cards, delivery zones
- reviews, returns
- staff/users, roles/permissions, audit events
- aiSettings, aiDrafts, AI usage telemetry
- banners, store settings, media/storage metadata, backup jobs

Do not create duplicate collections if equivalent collections already exist. Document actual names and field shapes in `BACKEND_SCHEMA.md` after source audit.

### Firestore constraints
- Use native Firestore transactions for invariant-sensitive multi-document operations.
- Ensure required composite indexes are checked in and deployed to the intended Firebase project.
- Treat the generic Prisma-compatible transaction wrapper as non-transactional unless its implementation is replaced and proven otherwise.
- Use deterministic IDs or idempotency records for repeated checkout/payment callbacks.
- Bound query page sizes; avoid unbounded collection reads.
- Avoid storing image binaries or Base64 review images in documents when object storage/media URLs are available.

## 5. API and domain requirements
All API routes should:
- Validate method, content type, body size, path/query parameters, and schemas.
- Authenticate before exposing protected data.
- Authorize the specific action and resource server-side; hiding a button is not authorization.
- Normalize response/error shapes and avoid stack traces, secrets, or provider payload leakage.
- Use request IDs and safe structured logs.
- Apply timeouts and rate limits to public or expensive operations.
- Use idempotency for order creation and provider callbacks.
- Avoid logging raw payment credentials, service-account keys, tokens, or sensitive customer payloads.

### Checkout invariants
- Recompute prices, promotions, delivery fees, and totals server-side.
- Validate product variants and available stock.
- Reserve/decrement stock and create order/order items atomically using the existing Firestore transaction path.
- Reject stale or replayed idempotency requests safely.
- Release expired reservations using a trusted scheduled job protected by `CRON_SECRET`.
- Ensure failure paths restore/release stock where appropriate.

### Payment invariants
- Keep gateway secrets encrypted at rest using `PAYMENT_ENCRYPTION_KEY`; never return saved secrets to clients.
- Production callback origin must be canonical HTTPS via `PAYMENT_CALLBACK_BASE_URL`.
- Verify payment with the provider server-to-server; validate exact order reference, amount, BDT currency, and transaction ID.
- Make settlement idempotent and safe against callback replay.
- Demo mode must be visibly labelled and must not set payment status to paid.
- Expose only gateways that are actually enabled and implemented. The README documents SSLCOMMERZ as the verified automatic adapter; verify current code before treating any other gateway as live.
- Never accept personal-number SMS forwarding or screenshot/manual proof as a substitute for merchant validation.

## 6. Authentication and authorization
- Enforce secure admin sessions on every admin API, not only admin page routes.
- Use server-side role/permission checks for super admin, manager, staff, and customer operations.
- Protect login and sensitive actions against brute force, CSRF where applicable, session fixation, and privilege escalation.
- Use secure cookie attributes appropriate to the deployment (HttpOnly, Secure in production, SameSite policy).
- Rotate sessions after authentication/privilege changes and revoke access on staff deactivation.
- Audit role changes, gateway edits, refunds, order status changes, backup restores, and global AI/store settings changes.
- Never trust role IDs or owner/customer IDs supplied by the browser without server verification.

## 7. Integrations
### Cloudflare / OpenNext
- Keep the deployment configuration aligned with the installed Next.js/OpenNext/Wrangler versions.
- Test build output and runtime compatibility for Node APIs, cache, file handling, and environment bindings.
- Confirm all required environment variables and secrets are available in the deployed Worker.

### Firebase / Firestore
- Use least-privilege service-account credentials.
- Deploy Firestore indexes separately using the documented Firebase CLI workflow and intended project.
- Test read/write limits, transaction contention, and adapter behavior in staging.

### Telegram
- Configure bot token, chat ID, allowed admin IDs, and webhook secret as encrypted secrets.
- Validate Telegram's webhook secret-token header and authorized user IDs for command actions.
- Notifications must be best-effort or queued so an external messaging outage does not silently corrupt an order transaction.
- Never place customer secrets or payment credentials in messages.

### Google Drive backup
- Keep OAuth client secret and refresh token server-side.
- Show actual backup job state, timestamps, errors, and restore verification.
- A successful upload alone does not prove a complete restorable backup.
- Do not report healthy status when quota/authentication fails.

### Gemini AI
- Use `GEMINI_API_KEY` server-side only.
- Bound input/output size and execution time; sanitize or redact sensitive identifiers.
- Store generated product/marketing content as drafts.
- Use deterministic catalogue-only fallback where designed.
- Do not send customer PII/raw payment data to sales-analysis prompts.
- Do not silently activate paid billing or claim authoritative provider quota based on application telemetry.

## 8. Frontend and accessibility
- Keep the established Navy–Orange theme and current design tokens.
- Use semantic HTML, keyboard-operable controls, visible focus, labelled inputs, meaningful validation, and accessible contrast.
- Test common mobile widths and desktop layouts.
- Ensure page content scrolls independently where appropriate; no fixed overlay should obscure the entire desktop content area.
- Avoid layout shifts and horizontal overflow.
- Use loading, success, empty, and error states for every asynchronous workflow.

## 9. Observability and operations
- Structured logs should include request/job ID, operation, safe outcome, latency, and non-sensitive error category.
- Track failed payment validation, duplicate/idempotency conflicts, stock contention, webhook failures, AI provider failures, and backup failures.
- Health checks must distinguish application availability from dependency readiness; do not show “healthy” solely because the process responds.
- Provide alerting for repeated failures without including secrets or raw personal data.
- Document rollback and recovery procedures.

## 10. Performance
- Paginate catalogue and admin tables.
- Optimize product images and use appropriate cache headers for public media.
- Avoid serial N+1 reads and repeated provider calls.
- Use timeouts, bounded retries with jitter where safe, and circuit-breaker/fallback behavior for optional services.
- Do not cache personalized, payment, admin, or private invoice data publicly.

## 11. Security and privacy
- Keep secrets out of Git, client bundles, URLs, and logs.
- Apply input validation, output encoding, security headers, least privilege, and dependency updates.
- Verify object ownership before reading private invoices, profiles, orders, or payment records.
- Minimize personal data retention and provide a clear store privacy policy.
- Review third-party AI data terms before production use.
- Test authorization at API level, including direct requests by a lower-privileged user.

## 12. Required technical gates
Before release, verify: install; lint/type-check if configured; security tests; production build; Cloudflare/OpenNext build; Firestore index deployment; checkout concurrency/idempotency; payment callback replay and mismatch rejection; role matrix; responsive flows; Telegram webhook; backup/restore; AI guardrails; deployed smoke tests.

## 13. Known technical risks
- Some legacy multi-document operations may still use a non-transactional compatibility wrapper.
- Provider credential forms may exist without working provider adapters.
- Application-level in-memory AI rate limiting is not a distributed global limiter.
- Deployment can be blocked by optional external integration setup unless workflow behavior is intentionally separated from the core deploy.
- CI success does not verify production secrets, external services, Firestore indexes, or restore capability.
