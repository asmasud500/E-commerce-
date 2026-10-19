import { db } from "../lib/firestore.ts";

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home & Living", slug: "home-living" },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care" },
  { name: "Sports & Outdoors", slug: "sports-outdoors" },
  { name: "Accessories", slug: "accessories" }
];

const products = [
  { name: "Wireless Bluetooth Headphones", slug: "demo-wireless-bluetooth-headphones", sku: "DEMO-ELEC-001", category: "electronics", price: 1890, compareAtPrice: 2490, salePrice: 1690, stock: 35, featured: true, description: "Comfortable over-ear wireless headphones with clear sound, soft ear cushions and long battery life.", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80" },
  { name: "Smart Watch Series X", slug: "demo-smart-watch-series-x", sku: "DEMO-ELEC-002", category: "electronics", price: 3290, compareAtPrice: 3990, salePrice: 2990, stock: 22, featured: true, description: "A modern smartwatch concept with fitness tracking, notifications and a bright touch display.", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80" },
  { name: "Portable Bluetooth Speaker", slug: "demo-portable-bluetooth-speaker", sku: "DEMO-ELEC-003", category: "electronics", price: 1450, compareAtPrice: 1790, salePrice: null, stock: 28, featured: false, description: "Compact portable speaker for music at home, outdoors or while travelling.", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80" },
  { name: "Classic Everyday Sneakers", slug: "demo-classic-everyday-sneakers", sku: "DEMO-FASH-001", category: "fashion", price: 2490, compareAtPrice: 2990, salePrice: 2190, stock: 18, featured: true, description: "Versatile everyday sneakers with a clean design and cushioned sole.", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80" },
  { name: "Minimalist Backpack", slug: "demo-minimalist-backpack", sku: "DEMO-FASH-002", category: "fashion", price: 1590, compareAtPrice: 1990, salePrice: null, stock: 24, featured: false, description: "A lightweight everyday backpack with a spacious main compartment and simple styling.", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80" },
  { name: "Cotton Casual T-Shirt", slug: "demo-cotton-casual-t-shirt", sku: "DEMO-FASH-003", category: "fashion", price: 590, compareAtPrice: 790, salePrice: 499, stock: 60, featured: false, description: "Soft cotton casual T-shirt designed for comfortable everyday wear.", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80" },
  { name: "Insulated Travel Tumbler", slug: "demo-insulated-travel-tumbler", sku: "DEMO-HOME-001", category: "home-living", price: 790, compareAtPrice: 990, salePrice: null, stock: 40, featured: false, description: "Reusable travel tumbler for keeping drinks close at home, work or on the move.", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80" },
  { name: "Modern Desk Lamp", slug: "demo-modern-desk-lamp", sku: "DEMO-HOME-002", category: "home-living", price: 1290, compareAtPrice: 1590, salePrice: 1090, stock: 16, featured: true, description: "A clean, modern desk lamp for study tables, home offices and bedside use.", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80" },
  { name: "Daily Skincare Set", slug: "demo-daily-skincare-set", sku: "DEMO-BEAUTY-001", category: "beauty-personal-care", price: 1190, compareAtPrice: 1490, salePrice: null, stock: 20, featured: false, description: "Demo skincare bundle for a simple daily personal-care routine. Product shown for storefront testing.", image: "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80" },
  { name: "Yoga Mat", slug: "demo-yoga-mat", sku: "DEMO-SPORT-001", category: "sports-outdoors", price: 990, compareAtPrice: 1290, salePrice: 890, stock: 26, featured: false, description: "A comfortable exercise mat for stretching, yoga and home workouts.", image: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=900&q=80" },
  { name: "Polarized Sunglasses", slug: "demo-polarized-sunglasses", sku: "DEMO-ACC-001", category: "accessories", price: 850, compareAtPrice: 1190, salePrice: null, stock: 32, featured: false, description: "A versatile sunglasses style for everyday outings and travel.", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80" },
  { name: "Classic Wrist Watch", slug: "demo-classic-wrist-watch", sku: "DEMO-ACC-002", category: "accessories", price: 1790, compareAtPrice: 2290, salePrice: 1590, stock: 14, featured: true, description: "A classic accessory watch with a timeless, minimalist look.", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80" }
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const existing = await db.category.findFirst({ where: { slug: category.slug } });
    const row = existing ?? await db.category.create({ data: category });
    categoryIds.set(category.slug, row.id);
  }

  let created = 0;
  let updated = 0;
  for (const p of products) {
    const categoryId = categoryIds.get(p.category)!;
    const existing = await db.product.findFirst({ where: { sku: p.sku } });
    const data = {
      name: p.name, slug: p.slug, sku: p.sku, description: p.description,
      price: p.price, compareAtPrice: p.compareAtPrice, salePrice: p.salePrice,
      stock: p.stock, lowStockThreshold: 5, featured: p.featured, published: true, categoryId
    };
    const row = existing
      ? await db.product.update({ where: { id: existing.id }, data })
      : await db.product.create({ data });
    if (existing) updated++; else created++;

    const image = await db.productImage.findFirst({ where: { productId: row.id } });
    if (image) {
      await db.productImage.update({ where: { id: image.id }, data: { url: p.image, alt: p.name, sortOrder: 0 } });
    } else {
      await db.productImage.create({ data: { productId: row.id, url: p.image, alt: p.name, sortOrder: 0 } });
    }
  }
  console.log(`Demo catalog ready: ${created} products created, ${updated} existing demo products updated.`);
}

main().catch(error => {
  console.error("Demo product seeding failed:", error);
  process.exitCode = 1;
});
