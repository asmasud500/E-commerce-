export default function AdminLoading(){
  return (
    <main className="yt-loading-screen" role="status" aria-label="Loading admin workspace">
      <header className="yt-loading-header">
        <span className="yt-loading-menu" aria-hidden="true"/>
        <div className="yt-loading-logo"><span className="yt-loading-play">▶</span><span>MART Admin</span></div>
        <div className="yt-loading-search" aria-hidden="true"/>
        <span className="yt-loading-user" aria-hidden="true"/>
      </header>
      <section className="yt-loading-admin" aria-hidden="true">
        <div className="yt-loading-chips">{[1,2,3,4].map(n=><span key={n} className="yt-loading-chip"/>)}</div>
        <div className="yt-loading-grid">
          {[1,2,3,4,5,6,7,8].map(n=><article className="yt-loading-video" key={n}>
            <div className="yt-loading-thumb"/>
            <div className="yt-loading-meta"><div className="yt-loading-avatar"/><div className="yt-loading-copy"><div className="yt-loading-line long"/><div className="yt-loading-line short"/></div></div>
          </article>)}
        </div>
      </section>
    </main>
  );
}
