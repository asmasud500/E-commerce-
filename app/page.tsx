import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

const benefits = [
  ["01", "Curated products", "A focused catalog built for easy browsing and confident buying."],
  ["02", "Flexible payment", "Choose the payment method available to you at checkout."],
  ["03", "Order tracking", "Follow your order from confirmation through delivery."]
];

export default function Home() {
  return (
    <>
      <StoreHeader />
      <main>
        <section className="hero-shell">
          <div className="hero-copy">
            <span className="eyebrow">NEW COLLECTION · 2026</span>
            <h1>Simple shopping.<br /><span>Better experience.</span></h1>
            <p>Discover quality products with a clean catalog, smooth checkout and reliable order tracking.</p>
            <div className="hero-actions">
              <Link href="/products" className="primary-cta">Shop products <span>→</span></Link>
              <Link href="/cart" className="secondary-cta">View cart</Link>
            </div>
            <div className="hero-trust">
              <span>✓ Secure checkout</span><span>✓ Flexible payment</span><span>✓ Order tracking</span>
            </div>
          </div>
          <div className="hero-panel" aria-label="Store highlights">
            <div className="hero-panel-top"><span>STORE / 01</span><span>SHOP ONLINE</span></div>
            <div className="hero-orb">S.</div>
            <div className="hero-panel-bottom"><strong>Quality first.</strong><span>Designed for a faster, calmer shopping journey.</span></div>
          </div>
        </section>
        <section className="benefit-grid" aria-label="Store benefits">
          {benefits.map(([n,t,d]) => (
            <article className="benefit-card" key={n}><small>{n}</small><h2>{t}</h2><p>{d}</p></article>
          ))}
        </section>
      </main>
      <StoreFooter />
    </>
  );
}
