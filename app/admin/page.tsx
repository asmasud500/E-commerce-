export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/prisma";
import AdminSidebar from "@/components/AdminSidebar";

const money = (n: number) => "৳" + Number(n || 0).toLocaleString("en-BD");
const modules = [
  { title: "Orders & fulfilment", desc: "Review new orders, verify payment proof, update fulfilment, refunds and courier tracking.", href: "/admin/orders", icon: "▤", tag: "Operations" },
  { title: "Products & inventory", desc: "Manage product listings, pricing, stock levels, publication and bulk CSV import/export.", href: "/admin/products", icon: "▣", tag: "Catalog" },
  { title: "Customers", desc: "Search registered customers and review customer purchase records.", href: "/admin/customers", icon: "♙", tag: "Customers" },
  { title: "Payment gateways", desc: "Review supported payment methods and configure available gateway settings.", href: "/admin/payment-gateways", icon: "৳", tag: "Payments" },
  { title: "Transactions", desc: "Inspect payment verification records and transaction references.", href: "/admin/payment-transactions", icon: "⇄", tag: "Payments" },
  { title: "Categories", desc: "Keep product categories organized for easy store navigation.", href: "/admin/categories", icon: "▦", tag: "Catalog" },
  { title: "Coupons & discounts", desc: "Manage discount codes and coupon rules.", href: "/admin/coupons", icon: "％", tag: "Marketing" },
  { title: "Reviews & moderation", desc: "Moderate customer reviews and manage their visibility.", href: "/admin/reviews", icon: "☆", tag: "Engagement" },
  { title: "Reports & analytics", desc: "Review sales activity, order statuses, stock alerts and available exports.", href: "/admin/reports", icon: "▥", tag: "Insights" },
  { title: "AI Studio", desc: "Manage Gemini-powered product content, smart search, customer support, sales insights and marketing drafts.", href: "/admin/ai-studio", icon: "✦", tag: "AI & automation" },
  { title: "Returns & refunds", desc: "Review return requests and refund-related workflows.", href: "/admin/returns", icon: "↩", tag: "After-sales" },
  { title: "Delivery zones", desc: "Manage delivery areas, charges and estimated delivery times.", href: "/admin/delivery-zones", icon: "⌁", tag: "Delivery" },
  { title: "Store settings", desc: "Review store profile, delivery defaults, tax preferences and announcements.", href: "/admin/settings", icon: "⚙", tag: "Configuration" },
  { title: "Integrations & API", desc: "Manage configured integrations and review integration status.", href: "/admin/integrations", icon: "⌘", tag: "Configuration" },
  { title: "Staff & permissions", desc: "Manage staff access and available administrative roles.", href: "/admin/staff", icon: "♧", tag: "Security" },
  { title: "Store banners", desc: "Manage promotional banner content, links, ordering and visibility.", href: "/admin/banners", icon: "▧", tag: "Merchandising" },
  { title: "Flash sales", desc: "Manage scheduled product promotions and sale campaigns.", href: "/admin/flash-sales", icon: "⚡", tag: "Marketing" },
  { title: "Activity log", desc: "Review available recent records of store and order operations.", href: "/admin/activity", icon: "◷", tag: "Audit" },
  { title: "Security center", desc: "Review successful and failed admin sign-ins, staff last-login details and sensitive audit events.", href: "/admin/security", icon: "⛨", tag: "Security" },
  { title: "Storage health", desc: "Monitor image storage, backup queue, storage usage and retry failed backups.", href: "/admin/storage", icon: "☁", tag: "System" },
];

export default async function AdminPage() {
  let orders = 0, products = 0, customers = 0, pending = 0, paidRevenue = 0;
  let recent: any[] = [];
  let dataAvailable = true;
  try {
    const result = await Promise.all([
      db.order.count(),
      db.product.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, orderNumber: true, customerName: true, total: true, status: true, paymentStatus: true, createdAt: true } }),
    ]);
    orders = result[0]; products = result[1]; customers = result[2]; pending = result[3];
    paidRevenue = Number(result[4]?._sum?.total || 0); recent = result[5] || [];
  } catch (error) {
    dataAvailable = false;
    console.error("Admin dashboard data error:", error instanceof Error ? error.message : String(error));
  }

  return <div className="admin-layout">
    <AdminSidebar />
    <main className="admin-content">
      <div className="admin-kicker">MART · STORE OPERATIONS</div>
      <div className="admin-heading-row">
        <div><h1>Admin dashboard</h1><p>Your store overview, daily operations and management tools in one place.</p></div>
        <Link className="admin-primary-action" href="/">↗ &nbsp; View storefront</Link>
      </div>
      {!dataAvailable && <div role="status" className="admin-alert"><div><span className="admin-alert-eyebrow">DATABASE CONNECTION</span><h2>Live metrics are temporarily unavailable</h2><p>Check the server database configuration and try refreshing the dashboard.</p></div><Link href="/admin/settings">Open settings →</Link></div>}
      <div className="admin-stat-grid">
        {[
          { label: "Total orders", value: orders.toLocaleString("en-BD"), note: "All recorded orders", icon: "▤" },
          { label: "Products", value: products.toLocaleString("en-BD"), note: "Catalog items", icon: "▣" },
          { label: "Customers", value: customers.toLocaleString("en-BD"), note: "Registered customer accounts", icon: "♙" },
          { label: "Paid revenue", value: money(paidRevenue), note: "Orders marked as paid", icon: "৳" },
        ].map(stat => <article className="admin-stat" key={stat.label}><span>{stat.icon} &nbsp; {stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></article>)}
      </div>
      <section className="admin-alert">
        <div><span className="admin-alert-eyebrow">ACTION REQUIRED</span><h2>{pending.toLocaleString("en-BD")} pending order{pending === 1 ? "" : "s"}</h2><p>Review new orders and check payment details before processing.</p></div>
        <Link href="/admin/orders">Review order queue →</Link>
      </section>
      <div className="admin-section-heading"><div><h2>Store management</h2><p>Choose a module to manage the relevant part of your store.</p></div></div>
      <div className="admin-module-grid">
        {modules.map(m => <Link className="admin-module-card" href={m.href} key={m.href}>
          <div className="admin-module-top"><span className="admin-module-icon" aria-hidden="true">{m.icon}</span><span className="admin-module-tag">{m.tag}</span></div>
          <h3>{m.title}</h3><p>{m.desc}</p><span className="admin-module-link">Open module <b>→</b></span>
        </Link>)}
      </div>
      <section className="admin-recent">
        <div className="admin-section-heading"><div><h2>Recent orders</h2><p>Latest records from the connected database.</p></div><Link href="/admin/orders">View all orders →</Link></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Order number</th><th>Customer</th><th>Order total</th><th>Payment</th><th>Order status</th><th>Created</th><th></th></tr></thead>
          <tbody>{recent.map(o => <tr key={o.id}>
            <td><strong>{o.orderNumber || o.id}</strong></td><td>{o.customerName || "Customer"}</td><td>{money(Number(o.total))}</td>
            <td><span className="admin-status">{o.paymentStatus || "—"}</span></td><td><span className="admin-status">{o.status || "—"}</span></td>
            <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-BD") : "—"}</td><td><Link href="/admin/orders">Open →</Link></td>
          </tr>)}</tbody></table>{!recent.length && <p className="admin-empty">No recent orders found.</p>}</div>
      </section>
      <p className="admin-footnote">Metrics are loaded from the server database. Each management module uses its existing route and backend; availability depends on the configured services and permissions.</p>
    </main>
  </div>;
}
