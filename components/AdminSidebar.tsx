"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const items = [
  ["/admin","Overview"],
  ["/admin/reports","Reports & Activity"],
  ["/admin/products","Products & Inventory"],
  ["/admin/categories","Categories"],
  ["/admin/orders","Orders & Invoices"],
  ["/admin/customers","Customers"],
  ["/admin/payment-gateways","Payments & Shipping"],
  ["/admin/payment-transactions","Transactions"],
  ["/admin/coupons","Coupons & Marketing"],
  ["/admin/reviews","Reviews & Moderation"],
  ["/admin/settings","Store Settings"],
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand"><span>MART</span><small>ADMIN COMMAND CENTER</small></Link>
      <nav aria-label="Admin modules">
        {items.map(([href,label]) => {
          const active = href === "/admin" ? path === href : path === href || path.startsWith(href + "/");
          return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{label}</Link>;
        })}
      </nav>
      <Link href="/" className="admin-store-link">← View Store</Link>
    </aside>
  );
}
