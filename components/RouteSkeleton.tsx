export default function RouteSkeleton({variant="page"}:{variant?:"page"|"products"|"account"|"checkout"|"admin"}) {
  const cards = variant==="products" ? 8 : variant==="admin" ? 4 : variant==="checkout" ? 3 : 2;
  return <main className={`route-skeleton ${variant}`} aria-busy="true" aria-label="Loading page">
    <div className="rs-wrap">
      <div className="rs-crumb"><i/><i/><i/></div>
      {variant==="admin" ? <div className="rs-hero"><i/><i/><i/></div> : <div className="rs-title"><i/><i/></div>}
      {variant==="account" && <div className="rs-profile"><i/><span><i/><i/></span></div>}
      {variant==="checkout" && <div className="rs-steps">{[1,2,3,4,5].map(n=><i key={n}/>)}</div>}
      {variant==="admin" && <div className="rs-stats">{[1,2,3,4].map(n=><i key={n}/>)}</div>}
      <div className={variant==="products"?"rs-products":variant==="admin"?"rs-admin-grid":"rs-content-grid"}>
        {Array.from({length:cards},(_,n)=><section className="rs-card" key={n}><i className="rs-image"/><i className="rs-line short"/><i className="rs-line"/><i className="rs-line medium"/></section>)}
      </div>
    </div>
    <span className="rs-sr">Loading content…</span>
  </main>
}