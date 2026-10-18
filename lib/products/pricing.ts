type PriceProduct = { price: unknown; salePrice?: unknown | null; id?: string };
type FlashSale = { active?: boolean; productIds?: unknown; discountPercent?: unknown; startsAt?: unknown; endsAt?: unknown };

function asTime(value: unknown): number {
  const raw = value && typeof value === "object" && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : value;
  const time = new Date(raw as string | number | Date).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getEffectivePrice(product: PriceProduct, flashSales: FlashSale[] = [], now = new Date()): number {
  const price = Number(product.price);
  const existingSale = product.salePrice == null ? null : Number(product.salePrice);
  let effective = existingSale != null && existingSale >= 0 && existingSale < price ? existingSale : price;
  if (!product.id || !Number.isFinite(price) || price < 0) return effective;

  const nowMs = now.getTime();
  for (const sale of flashSales) {
    if (!sale.active || !Array.isArray(sale.productIds) || !sale.productIds.includes(product.id)) continue;
    const start = asTime(sale.startsAt);
    const end = asTime(sale.endsAt);
    const percent = Number(sale.discountPercent);
    if (!start || !end || nowMs < start || nowMs > end || !Number.isFinite(percent) || percent < 1 || percent > 90) continue;
    const flashPrice = Math.round(price * (100 - percent)) / 100;
    if (flashPrice >= 0 && flashPrice < effective) effective = flashPrice;
  }
  return effective;
}
