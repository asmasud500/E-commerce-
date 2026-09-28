import Link from "next/link";

export default function StoreFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <Link href="/" className="brand">STORE<span>.</span></Link>
          <p>Simple shopping. Better experience.</p>
        </div>
        <div className="footer-links">
          <Link href="/products">Products</Link>
          <Link href="/account">Account</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <small>© {new Date().getFullYear()} Store. All rights reserved.</small>
      </div>
    </footer>
  );
}
