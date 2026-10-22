import AdminSidebar from "@/components/AdminSidebar";
import StoreSettingsEditor from "@/components/StoreSettingsEditor";

export default function StoreSettingsPage(){return <div className="admin-layout"><AdminSidebar/><main className="admin-content ss-page">
 <div className="ss-page-top"><div><div className="admin-kicker">MART · STORE MANAGEMENT</div><h1>Store settings</h1><p>One workspace for your store identity, checkout rules, customer support and storefront content.</p></div><a className="ss-dashboard-link" href="/admin">← Back to dashboard</a></div>
 <div className="ss-page-banner"><span className="ss-banner-icon" aria-hidden="true">⚙</span><div><strong>Your store, configured in one place</strong><p>Changes are saved through the existing validated settings API. Review the preview and save when you're ready.</p></div><span className="ss-banner-pill">BDT · Bangladesh</span></div>
 <StoreSettingsEditor/>
 <section className="ss-admin-tools" aria-labelledby="ss-admin-tools-title">
  <div className="ss-admin-tools-heading"><div><div className="admin-kicker">ADVANCED STORE MANAGEMENT</div><h2 id="ss-admin-tools-title">Connected admin modules</h2><p>Open the existing dedicated workspace for each feature. These links use the current admin modules rather than creating duplicate settings.</p></div></div>
  <div className="ss-admin-tools-grid">
   <a href="/admin/payment-gateways" className="ss-admin-tool"><span aria-hidden="true">৳</span><div><strong>Payments &amp; Checkout</strong><small>Gateway configuration, credentials and payment methods</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/integrations" className="ss-admin-tool"><span aria-hidden="true">⌘</span><div><strong>Extensions &amp; Integrations</strong><small>Telegram, courier/SMS and configured provider integrations</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/delivery-zones" className="ss-admin-tool"><span aria-hidden="true">⌁</span><div><strong>Shipping &amp; Tax</strong><small>Delivery zones and charges; tax defaults remain in this settings page</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/reports" className="ss-admin-tool"><span aria-hidden="true">▥</span><div><strong>Analytics &amp; Reports</strong><small>Sales, orders, inventory health and report exports</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/staff" className="ss-admin-tool"><span aria-hidden="true">♧</span><div><strong>Users &amp; Permissions</strong><small>Staff roles, account status and last-login timestamps</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/storage" className="ss-admin-tool"><span aria-hidden="true">☁</span><div><strong>Storage &amp; Backups</strong><small>Provider health, backup queue, retry and recovery checks</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/activity" className="ss-admin-tool"><span aria-hidden="true">◷</span><div><strong>Security &amp; Audit Logs</strong><small>Recorded admin actions and configuration-change history</small></div><b aria-hidden="true">↗</b></a>
   <a href="/admin/security" className="ss-admin-tool"><span aria-hidden="true">⛨</span><div><strong>Security Center &amp; Login History</strong><small>Successful/failed sign-ins, staff last-login timestamps and security alerts</small></div><b aria-hidden="true">↗</b></a>
  </div>
  <p className="ss-admin-tools-note">Coverage note: the Security Center now combines recorded successful/failed sign-ins, staff last-login timestamps and sensitive audit events. It is not a real-time intrusion detection system; rate-limit event tracking and automated alert delivery remain future enhancements. Storage monitoring exposes provider/integrity alerts separately.</p>
 </section>
 <section className="ss-security-note"><span className="ss-security-icon" aria-hidden="true">⌑</span><div><h2>Security & deployment settings</h2><p>API keys, payment provider credentials, Telegram bot tokens, database URLs and session secrets are never displayed here. Manage them in the hosting provider's encrypted environment settings, then review build and deployment logs separately.</p><p>Existing admin role permissions and activity audit logging remain in place. Store configuration is managed through <code>/api/admin/store-settings</code>; delivery-zone rules and server-side checkout calculations continue to take precedence where applicable.</p></div></section>
 </main></div>}
