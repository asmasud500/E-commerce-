import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("product listing supports search, category, featured, delivery and allow-listed sorting", async () => {
  const source = await read("../app/products/page.tsx");
  const api = await read("../app/api/products/route.ts");
  assert.match(source, /hasAvailableStock/);
  assert.match(api, /hasAvailableStock/);
  assert.match(source, /\.filter\(hasAvailableStock\)/);
  assert.match(api, /availableProducts=hydrated\.filter\(hasAvailableStock\)/);
  for (const token of ["sp.q", "sp.category", "sp.featured", "sp.delivery", "price_asc", "price_desc", "name_asc", "name_desc", "newest"]) {
    assert.ok(source.includes(token), "missing listing control: " + token);
  }
});

test("product details emit product-specific title, description, canonical, Open Graph and Twitter metadata", async () => {
  const source = await read("../app/products/[slug]/page.tsx");
  assert.match(source, /title:p\.name/);
  assert.match(source, /description,/);
  assert.match(source, /alternates:\{canonical\}/);
  assert.match(source, /openGraph:\{type:"website",title:p\.name,description,url:absoluteUrl/);
  assert.match(source, /twitter:\{card:"summary_large_image",title:p\.name,description/);
  assert.match(source, /"@type":"Product"/);
  assert.match(source, /"@type":"Offer"/);
  assert.match(source, /price:effective/);
  assert.match(source, /InStock/);
});

test("generic variant selection, multi-row cart addition and stock constraints exist on product details", async () => {
  const source = await read("../app/products/[slug]/ProductActions.tsx");
  assert.match(source, /resolveProductVariant/);
  assert.match(source, /bulkRows/);
  assert.match(source, /addToCart/);
  assert.match(source, /activeStock/);
  assert.match(source, /quantity/);
  const variants = await read("../tests/product-variants.test.mjs");
  assert.match(variants, /own stock and price/);
  assert.match(variants, /caps generated combinations/);
});

test("cart uses unique variant line identity and checkout requests the server quote", async () => {
  const cart = await read("../app/cart/page.tsx");
  const checkout = await read("../app/checkout/page.tsx");
  const quote = await read("../app/api/checkout/quote/route.ts");
  assert.match(cart, /cartLineId/);
  assert.match(cart, /getCart/);
  assert.match(checkout, /\/api\/checkout\/quote/);
  assert.match(quote, /buildQuote/);
  assert.match(quote, /rateLimit/);
  assert.match(quote, /cf-connecting-ip/);
});

test("checkout order creation uses shared quote calculation and idempotency", async () => {
  const source = await read("../app/api/orders/route.ts");
  assert.match(source, /buildQuote/);
  assert.match(source, /idempotency-key/);
  assert.match(source, /createOrderWithStockReservation/);
  assert.match(source, /replayed:true/);
});

test("customer account orders require a customer session; cancellation is rate-limited and atomic", async () => {
  const list = await read("../app/api/account/orders/route.ts");
  const cancel = await read("../app/api/account/orders/cancel/route.ts");
  assert.match(list, /verifyCustomerToken/);
  assert.match(list, /status:401/);
  assert.match(cancel, /verifyCustomerToken/);
  assert.match(cancel, /rejectPendingOrderAtomically/);
  assert.match(cancel, /cf-connecting-ip/);
  assert.doesNotMatch(cancel, /x-forwarded-for/);
});

test("order tracking limits exposed fields and return requests require delivered orders", async () => {
  const track = await read("../app/api/orders/track/route.ts");
  const returns = await read("../app/api/orders/return/route.ts");
  assert.match(track, /trackingSelect/);
  assert.match(track, /cf-connecting-ip/);
  assert.doesNotMatch(track, /x-forwarded-for/);
  assert.match(returns, /RETURN_WINDOW_DAYS/);
  assert.match(returns, /o\.status!=="DELIVERED"/);
  assert.match(returns, /returnRequest\.create/);
  assert.match(returns, /cf-connecting-ip/);
  assert.doesNotMatch(returns, /x-forwarded-for/);
});

test("invoice is owner/token protected and never publicly cached", async () => {
  const source = await read("../app/api/orders/[id]/invoice/route.ts");
  assert.match(source, /verifyCustomerToken/);
  assert.match(source, /verifyOrderAccessToken/);
  assert.match(source, /if\(!isOwner&&!hasOrderAccess\)/);
  assert.match(source, /private, no-store/);
});

test("login and registration rate limits do not trust x-forwarded-for", async () => {
  for (const path of ["../app/api/customer/auth/login/route.ts", "../app/api/customer/auth/register/route.ts"]) {
    const source = await read(path);
    assert.match(source, /cf-connecting-ip/);
    assert.match(source, /rateLimit/);
    assert.doesNotMatch(source, /x-forwarded-for/);
  }
});

test("wishlist requires customer authentication and reviews require a verified purchase", async () => {
  const wishlist = await read("../app/api/wishlist/route.ts");
  const reviews = await read("../app/api/reviews/route.ts");
  assert.match(wishlist, /customer_session/);
  assert.match(wishlist, /verifyCustomerToken/);
  assert.match(wishlist, /cf-connecting-ip/);
  assert.doesNotMatch(wishlist, /x-forwarded-for/);
  assert.match(reviews, /verifyCustomerToken/);
  assert.match(reviews, /Purchase the product before reviewing it/);
  assert.match(reviews, /approved:true/);
});

test("contact page provides support routes and order tracking guidance", async () => {
  const source = await read("../app/contact/page.tsx");
  assert.match(source, /supportPhone/);
  assert.match(source, /supportEmail/);
  assert.match(source, /\/track/);
});

test("route loading uses shimmer skeletons with reduced-motion support, not a fixed page overlay", async () => {
  const loading = await read("../app/loading.tsx");
  const css = await read("../app/globals.css");
  assert.match(loading, /app-skeleton-page/);
  assert.match(loading, /loading-skeleton/);
  assert.match(css, /\.loading-skeleton\{/);
  assert.match(css, /@keyframes skeleton/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(loading, /position:\s*fixed/);
});

test("deployment workflow validates required secrets before deploying", async () => {
  const workflow = await read("../.github/workflows/deploy.yml");
  assert.match(workflow, /Validate required production secrets/);
  for (const secret of ["FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "ADMIN_SESSION_SECRET", "PAYMENT_ENCRYPTION_KEY", "PAYMENT_WEBHOOK_SECRET", "CLOUDFLARE_API_TOKEN", "TELEGRAM_BOT_TOKEN"]) {
    assert.ok(workflow.includes(secret), "missing secret validation: " + secret);
  }
});

test("payment initiation uses trusted client IP and requires a known order reference", async () => {
  const source = await read("../app/api/payments/initiate/route.ts");
  assert.match(source, /cf-connecting-ip/);
  assert.match(source, /rateLimit/);
  assert.doesNotMatch(source, /x-forwarded-for/);
  assert.match(source, /orderId/);
});
