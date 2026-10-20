"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import { Icon } from "@/components/Icons";

type WishlistItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    salePrice?: number | string | null;
    stock?: number | null;
    images?: { url: string; alt?: string | null }[];
    category?: { name: string } | null;
  };
};

const money = (value: number | string | null | undefined) =>
  "৳" + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "We couldn't load your wishlist.");
      if (!Array.isArray(data)) throw new Error("The wishlist response was unexpected. Please try again.");
      setItems(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't load your wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function remove(productId: string) {
    if (removing) return;
    setRemoving(productId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/wishlist?productId=" + encodeURIComponent(productId), { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't remove this product. Please try again.");
      setItems(current => current.filter(item => item.productId !== productId));
      setNotice("Product removed from your wishlist.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't remove this product. Please try again.");
    } finally {
      setRemoving("");
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="pg wishlist-page">
        <nav className="pg-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14}/><b>Wishlist</b></nav>
        <div className="pg-head wishlist-heading">
          <div><h1>My wishlist</h1><p>Save your favourites and find them again whenever you're ready.</p></div>
          {!loading && !error && <span className="pg-pill">{items.length} saved {items.length === 1 ? "item" : "items"}</span>}
        </div>

        {notice && <p className="wishlist-notice" role="status"><Icon name="check-circle" size={17}/>{notice}</p>}
        {error && <section className="pg-card wishlist-error" role="alert"><span className="wishlist-state-icon"><Icon name="alert-circle" size={23}/></span><div><h2>Something went wrong</h2><p>{error}</p><button type="button" className="pg-btn" onClick={() => void load()} disabled={loading}>{loading ? "Retrying…" : "Try again"}</button></div></section>}

        {loading ? (
          <section className="wishlist-grid" aria-label="Loading wishlist" aria-busy="true">
            {[1,2,3,4].map(n => <article className="pg-card wishlist-skeleton" key={n}><div className="wishlist-skeleton-image"/><div className="wishlist-skeleton-line wide"/><div className="wishlist-skeleton-line"/><div className="wishlist-skeleton-line short"/></article>)}
          </section>
        ) : !error && !items.length ? (
          <section className="pg-card pg-empty wishlist-empty"><span className="pg-empty-ic"><Icon name="heart" size={26}/></span><h2>Your wishlist is empty</h2><p>Tap the heart on a product to save it here for later.</p><Link href="/products" className="pg-btn">Explore products <Icon name="arrowRight" size={17}/></Link></section>
        ) : !error ? (
          <section className="wishlist-grid" aria-label="Saved products">
            {items.map(item => {
              const product = item.product;
              const regular = Number(product.price) || 0;
              const sale = product.salePrice == null ? null : Number(product.salePrice);
              const price = sale !== null && sale > 0 && sale < regular ? sale : regular;
              const image = product.images?.[0];
              return (
                <article key={item.id} className="pg-card wishlist-card">
                  <Link href={"/products/" + product.slug} className="wishlist-image" aria-label={"View " + product.name}>
                    {image?.url ? <img src={image.url} alt={image.alt || product.name} loading="lazy" decoding="async"/> : <span aria-hidden="true">{product.name.charAt(0).toUpperCase()}</span>}
                    {product.stock != null && Number(product.stock) <= 0 && <span className="wishlist-stock">Out of stock</span>}
                  </Link>
                  <div className="wishlist-card-body">
                    <small>{product.category?.name || "Product"}</small>
                    <Link href={"/products/" + product.slug} className="wishlist-product-title">{product.name}</Link>
                    <div className="wishlist-price"><strong>{money(price)}</strong>{price < regular && <del>{money(regular)}</del>}</div>
                    <div className="wishlist-actions">
                      <Link href={"/products/" + product.slug} className="pg-btn">View product <Icon name="arrowRight" size={15}/></Link>
                      <button type="button" className="pg-btn pg-btn-line" onClick={() => void remove(item.productId)} disabled={removing === item.productId || !!removing} aria-label={"Remove " + product.name + " from wishlist"}>{removing === item.productId ? "Removing…" : <><Icon name="trash-2" size={15}/> Remove</>}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
        <div className="wishlist-bottom-link"><Link href="/products">Continue shopping <Icon name="chevronRight" size={15}/></Link></div>
      </main>
      <StoreFooter />
    </>
  );
}
