import Link from "next/link";

export default function StoreFooter(){
  return (
    <footer className="sf">
      <div className="sf-in">
        <div className="sf-brand">
          <Link href="/" className="sh-logo" aria-label="Store home">STORE<span>.</span></Link>
          <p>Quality products, simple shopping.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/products">All products</Link>
          <Link href="/products?featured=true">Featured</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <div>
          <h3>Your account</h3>
          <Link href="/account">Orders and profile</Link>
          <Link href="/wishlist">Wishlist</Link>
        </div>
        <small>© {new Date().getFullYear()} Store. All rights reserved.</small>
      </div>
    </footer>
  );
}
