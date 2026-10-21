"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const groups = [
  { title: "Workspace", items: [
    ["/admin", "Overview", "⌂"],
    ["/admin/reports", "Reports & analytics", "▥"],
    ["/admin/activity", "Activity log", "◷"],
  ]},
  { title: "Store management", items: [
    ["/admin/orders", "Orders & fulfilment", "▤"],
    ["/admin/returns", "Returns & refunds", "↩"],
    ["/admin/products", "Products", "▣"],
    ["/admin/inventory", "Inventory management", "▤"],
    ["/admin/categories", "Categories", "▦"],
    ["/admin/customers", "Customers", "♙"],
    ["/admin/reviews", "Reviews & moderation", "☆"],
  ]},
  { title: "Sales & payments", items: [
    ["/admin/mart-pay", "Mart Pay", "৳"],
    ["/admin/payment-transactions", "Transactions", "⇄"],
    ["/admin/coupons", "Coupons & discounts", "％"],
    ["/admin/gift-cards", "Gift cards", "🎁"],
    ["/admin/marketing", "Marketing", "✦"],
    ["/admin/flash-sales", "Flash sales", "⚡"],
  ]},
  { title: "Store configuration", items: [
    ["/admin/delivery-zones", "Delivery zones", "⌁"],
    ["/admin/banners", "Store banners", "▧"],
    ["/admin/settings", "Store settings", "⚙"],
    ["/admin/integrations", "Integrations & API", "⌘"],
    ["/admin/staff", "Staff & permissions", "♧"],
  ]},
];

export default function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="admin-mobile-toggle" type="button" aria-expanded={open} aria-controls="mart-admin-navigation" onClick={() => setOpen(v => !v)}>
        <strong>☰ &nbsp; MART Admin</strong><span>{open ? "Close navigation ×" : "Open navigation →"}</span>
      </button>
      {open && <button className="admin-sidebar-overlay" aria-label="Close admin navigation" type="button" onClick={() => setOpen(false)} />}
      <aside id="mart-admin-navigation" className={`admin-sidebar${open ? " is-open" : ""}`}>
        <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}><span>MART</span><small>ADMIN CONTROL CENTER</small></Link>
        <nav aria-label="Admin modules">
          {groups.map(group => (
            <div className="admin-nav-section" key={group.title}>
              <div className="admin-nav-group">{group.title}</div>
              {group.items.map(([href, label, icon]) => {
                const active = href === "/admin" ? path === href : path === href || path.startsWith(href + "/");
                return <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  <span className="admin-nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
                </Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-status"><i aria-hidden="true" /> Admin workspace <span style={{marginLeft:"auto"}}>Ready</span></div>
          <Link href="/" className="admin-store-link" onClick={() => setOpen(false)}>↗ &nbsp; View storefront</Link>
        </div>
      </aside>
    </>
  );
}
