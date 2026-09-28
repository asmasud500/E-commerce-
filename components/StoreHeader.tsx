import Link from "next/link";

export default function StoreHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="Store home">STORE<span>.</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/account">Account</Link>
          <Link href="/cart" className="nav-cart">Cart <span aria-hidden="true">→</span></Link>
        </nav>
      </div>
    </header>
  );
}
