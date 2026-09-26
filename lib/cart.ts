export type CartItem = { productId: string; name: string; price: number; quantity: number; sku: string };

const KEY = "ecommerce-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function addToCart(item: CartItem) {
  const items = getCart();
  const existing = items.find(i => i.productId === item.productId);
  if (existing) existing.quantity += item.quantity;
  else items.push(item);
  saveCart(items);
  return items;
}
export function removeFromCart(productId: string) {
  const items = getCart().filter(i => i.productId !== productId);
  saveCart(items);
  return items;
}
