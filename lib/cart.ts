export type CartItem = { productId: string; name: string; price: number; quantity: number; sku: string; imageUrl?: string | null; stock?: number };

const KEY = "ecommerce-cart";
const MAX_QTY = 100;

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem =>
      item && typeof item.productId === "string" && typeof item.name === "string" &&
      Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
      Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
    ).map(item => ({...item, price:Number(item.price), quantity:Math.min(MAX_QTY, Number(item.quantity))}));
  } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function addToCart(item: CartItem) {
  const items = getCart();
  const existing = items.find(i => i.productId === item.productId);
  if (existing) existing.quantity = Math.min(MAX_QTY, existing.quantity + Math.max(1, item.quantity));
  else items.push({...item, price:Number(item.price), quantity:Math.min(MAX_QTY, Math.max(1,item.quantity))});
  saveCart(items);
  return items;
}
export function removeFromCart(productId: string) {
  const items = getCart().filter(i => i.productId !== productId);
  saveCart(items);
  return items;
}