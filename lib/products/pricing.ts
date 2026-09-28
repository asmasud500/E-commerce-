type PriceProduct = { price: unknown; salePrice?: unknown | null };

export function getEffectivePrice(product: PriceProduct): number {
  const price = Number(product.price);
  const sale = product.salePrice == null ? null : Number(product.salePrice);
  if (sale != null && sale >= 0 && sale < price) return sale;
  return price;
}
