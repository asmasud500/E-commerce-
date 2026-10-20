export type CartItem = { productId: string; lineId?: string; name: string; price: number; quantity: number; sku: string; imageUrl?: string | null; stock?: number; options?: Record<string,string> };

const KEY = "ecommerce-cart";
const MAX_QTY = 100;
export function cartLineId(item: Pick<CartItem,"productId"|"options">) { return item.productId+"::"+Object.entries(item.options||{}).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("|"); }

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem =>
      item && typeof item.productId === "string" && typeof item.name === "string" &&
      Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
      Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
    ).map(item => ({...item, lineId:cartLineId(item), price:Number(item.price), quantity:Math.min(MAX_QTY, Number(item.quantity))}));
  } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}
export function addToCart(item: CartItem) {
  const items = getCart();
  const existing = items.find(i => i.productId === item.productId);
  if (existing && item.options) existing.options = item.options;
  if (existing) existing.quantity = Math.min(MAX_QTY, existing.quantity + Math.max(1, item.quantity));
  else items.push({...item, lineId, price:Number(item.price), quantity:Math.min(MAX_QTY, Math.max(1,item.quantity))});
  saveCart(items);
  return items;
}
export function removeFromCart(productId: string) {
  const items = getCart().filter(i => i.productId !== productId);
  saveCart(items);
  return items;
}