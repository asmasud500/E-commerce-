import AdminSidebar from "@/components/AdminSidebar";
import StoreSettingsEditor from "@/components/StoreSettingsEditor";

export default function StoreSettingsPage(){return <div className="admin-layout"><AdminSidebar/><main className="admin-content ss-page">
 <div className="ss-page-top"><div><div className="admin-kicker">MART · STORE MANAGEMENT</div><h1>Store settings</h1><p>One workspace for your store identity, checkout rules, customer support and storefront content.</p></div><a className="ss-dashboard-link" href="/admin">← Back to dashboard</a></div>
 <div className="ss-page-banner"><span className="ss-banner-icon" aria-hidden="true">⚙</span><div><strong>Your store, configured in one place</strong><p>Changes are saved through the existing validated settings API. Review the preview and save when you're ready.</p></div><span className="ss-banner-pill">BDT · Bangladesh</span></div>
 <StoreSettingsEditor/>
 <section className="ss-security-note"><span className="ss-security-icon" aria-hidden="true">⌑</span><div><h2>Security & deployment settings</h2><p>API keys, payment provider credentials, Telegram bot tokens, database URLs and session secrets are never displayed here. Manage them in the hosting provider's encrypted environment settings, then review build and deployment logs separately.</p><p>Existing admin role permissions and activity audit logging remain in place. Store configuration is managed through <code>/api/admin/store-settings</code>; delivery-zone rules and server-side checkout calculations continue to take precedence where applicable.</p></div></section>
 </main></div>}
