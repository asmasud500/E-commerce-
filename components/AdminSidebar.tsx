"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import AdminPageAiAssistant from "@/components/AdminPageAiAssistant";

const groups = [
  { title: "Workspace", items: [
    ["/admin", "Overview", "dashboard"],
    ["/admin/ai-studio", "AI Studio", "sparkle"],
    ["/admin/reports", "Reports & analytics", "barChart"],
    ["/admin/activity", "Activity log", "clock"],
  ]},
  { title: "Store management", items: [
    ["/admin/orders", "Orders & fulfilment", "clipboard"],
    ["/admin/returns", "Returns & refunds", "undo"],
    ["/admin/products", "Products", "package"],
    ["/admin/inventory", "Inventory management", "layers"],
    ["/admin/categories", "Categories", "grid"],
    ["/admin/customers", "Customers", "users"],
    ["/admin/reviews", "Reviews & moderation", "star"],
  ]},
  { title: "Sales & payments", items: [
    ["/admin/mart-pay", "Mart Pay", "wallet"],
    ["/admin/payment-transactions", "Transactions", "swap"],
    ["/admin/coupons", "Coupons & discounts", "percent"],
    ["/admin/gift-cards", "Gift cards", "gift"],
    ["/admin/marketing", "Marketing", "trendingUp"],
    ["/admin/flash-sales", "Flash sales", "bolt"],
  ]},
  { title: "Store configuration", items: [
    ["/admin/delivery-zones", "Delivery zones", "mapPin"],
    ["/admin/banners", "Store banners", "image"],
    ["/admin/storage", "Storage Health", "cloud"],
    ["/admin/settings", "Store settings", "sliders"],
    ["/admin/integrations", "Integrations & API", "plug"],
    ["/admin/staff", "Staff & permissions", "shield"],
  ]},
];

export default function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="admin-mobile-toggle" type="button" aria-expanded={open} aria-controls="mart-admin-navigation" onClick={() => setOpen(v => !v)}>
        <strong><Icon name="menu" size={18} /> MART Admin</strong><span>{open ? "Close navigation ×" : "Open navigation →"}</span>
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
                  <span className="admin-nav-icon" aria-hidden="true"><Icon name={icon} size={18} /></span><span>{label}</span>
                </Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-status"><i aria-hidden="true" /> Admin workspace <span style={{marginLeft:"auto"}}>Ready</span></div>
          <Link href="/" className="admin-store-link" onClick={() => setOpen(false)}><Icon name="externalLink" size={16} /> View storefront</Link>
        </div>
      </aside>
      <AdminPageAiAssistant />
    </>
  );
}
