export default function Loading(){
  return (
    <main className="app-skeleton-page" role="status" aria-label="Loading page">
      <span className="sr-only">Loading content…</span>
      <header className="app-skeleton-header" aria-hidden="true">
        <div className="app-skeleton-logo loading-skeleton"/>
        <div className="app-skeleton-search loading-skeleton"/>
        <div className="app-skeleton-actions"><i className="loading-skeleton"/><i className="loading-skeleton"/></div>
      </header>
      <section className="app-skeleton-content" aria-hidden="true">
        <div className="app-skeleton-heading">
          <div className="loading-skeleton app-skeleton-eyebrow"/>
          <div className="loading-skeleton app-skeleton-title"/>
          <div className="loading-skeleton app-skeleton-subtitle"/>
        </div>
        <div className="app-skeleton-feature">
          <div className="loading-skeleton app-skeleton-feature-image"/>
          <div className="app-skeleton-feature-copy">
            <div className="loading-skeleton app-skeleton-line wide"/>
            <div className="loading-skeleton app-skeleton-line"/>
            <div className="loading-skeleton app-skeleton-line medium"/>
            <div className="loading-skeleton app-skeleton-button"/>
          </div>
        </div>
        <div className="app-skeleton-grid">
          {[1,2,3,4,5,6,7,8].map(n=><article className="app-skeleton-card" key={n}>
            <div className="loading-skeleton app-skeleton-card-image"/>
            <div className="app-skeleton-card-copy"><div className="loading-skeleton app-skeleton-line wide"/><div className="loading-skeleton app-skeleton-line medium"/><div className="loading-skeleton app-skeleton-line price"/></div>
          </article>)}
        </div>
      </section>
    </main>
  );
}
