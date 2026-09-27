import type { Product } from "@prisma/client";

export function getEffectivePrice(product: Pick<Product, "price" | "salePrice">): number {
  const price = Number(product.price);
  const sale = product.salePrice == null ? null : Number(product.salePrice);
  if (sale != null && sale >= 0 && sale < price) return sale;
  return price;
}
