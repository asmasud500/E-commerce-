"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const items = [
  ["/admin","Overview"],
  ["/admin/products","Products"],
  ["/admin/orders","Orders"],
  ["/admin/payment-gateways","Payment Gateways"],
  ["/admin/payment-transactions","Transactions"],
  ["/admin/reviews","Reviews"],
  ["/admin/coupons","Coupons"],
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>STORE</span><small>ADMIN</small></div>
      <nav>
        {items.map(([href,label]) => (
          <Link key={href} href={href} className={path===href ? "active" : ""}>{label}</Link>
        ))}
      </nav>
      <Link href="/" className="admin-store-link">← View Store</Link>
    </aside>
  );
}
