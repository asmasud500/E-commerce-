import Link from "next/link";

export default function StoreHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">STORE<span>.</span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/account">Account</Link>
          <Link href="/cart" className="nav-cart">Cart</Link>
        </nav>
      </div>
    </header>
  );
}
