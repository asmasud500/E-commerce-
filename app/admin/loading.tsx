export default function AdminLoading() {
  return (
    <div className="admin-layout admin-loading-layout" role="status" aria-label="Loading admin workspace">
      <aside className="admin-sidebar admin-loading-sidebar" aria-hidden="true">
        <div className="admin-loading-brand" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <span className="admin-loading-nav" key={item} />)}
      </aside>
      <main className="admin-content admin-loading-content" aria-hidden="true">
        <span className="admin-loading-kicker" />
        <div className="admin-loading-heading"><span /><span /></div>
        <div className="admin-loading-stats">{[1, 2, 3, 4].map((item) => <div key={item}><span /><strong /></div>)}</div>
        <div className="admin-loading-panel"><span /><span /><span /><span /><span /></div>
      </main>
    </div>
  );
}
