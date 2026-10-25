# MART E-commerce Platform — UI/UX Specification

**Design direction:** Premium, clear, commerce-first  
**Brand line:** MART — “Shop Smarter, Live Better”  
**Last updated:** 2026-10-25

## 1. Non-negotiable visual constraint
Preserve the existing Navy–Orange theme. Do not replace the theme with a new palette or rewrite global design tokens without checking the current source first.

Previously referenced colors:
- Navy: `#131921`
- Orange: `#FF6801`
- Light surface: `#F5F5F7`

These are reference values from project history; inspect the current CSS/Tailwind tokens and retain the exact live values if they differ. Avoid scattering raw color literals across components.

## 2. Visual principles
- Premium, organized, trustworthy, and product-focused.
- Strong hierarchy between page title, product name, price, primary action, and supporting details.
- Consistent spacing, radii, shadows, icon size, form control height, and button behavior.
- Use orange for primary action/highlight, navy for navigation/strong text and branded surfaces, and neutral backgrounds for readable content.
- Use product imagery consistently; preserve aspect ratio and provide graceful fallbacks.
- Avoid unnecessary animation, excessive gradients, and crowded dashboard cards.

## 3. Responsive behavior
### Small mobile (320–390 px)
- No horizontal page overflow.
- Header and navigation remain usable without covering content.
- Product cards adapt to a compact grid or list that preserves readable prices/actions.
- Forms use full-width controls and clear labels.
- Checkout stepper may become a compact vertical or horizontally scrollable progress indicator, but the active step and completion state must remain understandable.
- Modals/drawers fit viewport height and allow internal scrolling.
- Sticky controls must not hide the last field or submit button.

### Large mobile / tablet
- Increase grid columns only when cards retain usable width.
- Keep filter/sort controls accessible.
- Admin sidebar may collapse to a drawer; opening it must not trap the page behind an accidental overlay.
- Tables may use responsive columns or intentional horizontal scrolling within the table container, not the whole page.

### Desktop
- Use a clear content max-width and consistent page gutters.
- Admin sidebar/navigation occupies its own layout region and must not overlay the main content.
- Store Settings panels open within the content region; avoid viewport-sized overlays.
- Checkout may use a horizontal five-step indicator and a two-column summary layout where sufficient space exists.
- Ensure modal/dialog layering, z-index, and scroll behavior are intentional.

## 4. Typography and content
- Use the project's current font stack unless there is a tested reason to change it.
- Establish a consistent type scale for page title, section title, body, helper text, and metadata.
- Use concise, specific labels: “Save banner”, “Payment pending”, “Retry payment”, not vague labels such as “Submit” where context is unclear.
- Format currency consistently as BDT/৳ and show discounts and delivery fees separately.
- Dates/times should be consistent and localized where appropriate.
- Do not display fake ratings, fake inventory counts, fake delivery estimates, or invented setup status.

## 5. Storefront components
### Header
- Brand mark, product search, category/navigation access, account, wishlist, and cart as supported.
- Mobile header must not force all desktop controls into one row.
- Search must have loading, empty, and failure states.

### Product card
- Product image with stable aspect ratio.
- Product name, current price, original price/discount when valid, stock/availability where appropriate.
- Clear product detail and add-to-cart actions.
- Long titles wrap safely; no clipped prices or inaccessible controls.
- Wishlist state must be obvious and keyboard accessible.

### Product detail
- Image gallery, product name, price/sale price, variants, quantity, availability, description, and purchase action.
- Variant selection and quantity must be validated before cart addition.
- Do not show a purchase-ready state if stock is unavailable.

### Cart
- Editable quantity, remove action, item totals, promotion/coupon feedback, subtotal, delivery estimate/fee when available, and total.
- Empty cart provides a useful route back to shopping.
- Server rejection due to stale price/stock is explained.

### Checkout
- Clear progress indicator for Order Summary → Customer Info → Delivery Info → Payment → Confirmation.
- Show inline errors near fields and preserve valid user input after recoverable errors.
- Keep order totals visible without hiding form controls on small screens.
- Payment state labels distinguish pending, paid, failed, COD, and demo.
- Demo payment notice must prominently say “DEMO MODE — NOT PAID”.

### Tracking and invoice
- Timeline is based on persisted order history.
- Cancellation and return actions appear only when eligible.
- Invoice uses a print stylesheet with A4 page sizing, readable typography, and no navigation/interactive UI in print output.
- QR code must lead to a safe order update page and must not encode sensitive data directly.

## 6. Admin shell and navigation
- Persistent but responsive navigation; content region remains independently usable.
- Active route is visibly highlighted.
- Sidebar collapse/drawer has accessible labels and focus handling.
- No overlay should obscure the entire desktop app when opening Store Settings.
- Long pages and settings panels must scroll correctly on Android mobile browsers and desktop.
- Destructive actions require confirmation and show the target item.

## 7. Admin data tables
- Page title, concise context, primary action, search/filter, loading state, table/list, pagination, and empty/error state.
- Keep action controls consistent.
- Use status chips only when their color and label have clear meaning.
- Never fabricate row counts or success status.
- Use confirmation for irreversible operations; preserve filters after returning from edit where practical.
- On mobile, prioritize essential columns and expose secondary fields through a detail view.

## 8. Forms and validation
- Persistent labels, examples only where helpful, field-level error text, disabled/loading states, and successful-save confirmation.
- Errors should explain how to fix the problem.
- For Banners, return specific field errors rather than only “Invalid banner”.
- Secret fields should show a neutral “configured” state, never the stored secret.
- Prevent double submissions while a request is in progress.
- Confirmation dialogs must name the action and consequence.

## 9. Store Settings accordion interaction
- Selecting a closed section opens it.
- Selecting another section closes the previous section and opens the selected one.
- Selecting the open section again closes it.
- Keep state predictable and ensure only one panel is open at a time.
- Use semantic buttons with `aria-expanded` and panel relationships.
- Maintain keyboard focus and visible focus ring.
- Mobile page scroll must reach every control; desktop layout must keep sidebar and content visible together.

## 10. Accessibility
- Target WCAG 2.2 AA where practical.
- Keyboard access for navigation, dialogs, forms, carousels, and accordions.
- Visible focus states and adequate contrast.
- Images use useful alt text; decorative images use empty alt.
- Associate field errors/help text programmatically.
- Announce asynchronous errors/successes with suitable live regions.
- Respect reduced-motion settings and browser zoom.

## 11. Motion and feedback
- Use short, purposeful transitions for drawer, accordion, toast, and cart feedback.
- Avoid motion that blocks input or causes layout shifts.
- Provide skeleton/loading feedback only when data is actually loading.
- Toasts complement rather than replace inline form errors.
- Every async operation resolves to success, error, or an explicit pending state.

## 12. UX quality gates
- Test at 320, 360, 390, 768, 1024, 1280, and 1440 px widths.
- Test Android browser scrolling, keyboard overlap, fixed headers, and modal/drawer behavior.
- Confirm Store Settings accordion behavior exactly matches the interaction rules above.
- Confirm no change to the existing Navy–Orange theme.
- Confirm checkout stepper, order summary, invoice print view, admin tables, and banner validation.
- Run keyboard-only and screen-reader spot checks for critical journeys.
