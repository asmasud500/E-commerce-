export default function AdminLoading(){
  return (
    <main className="mart-loading" role="status" aria-label="Loading admin page">
      <section className="mart-loading-card">
        <div className="mart-loading-brand"><span className="mart-loading-mark">M</span><span>Admin Workspace</span></div>
        <div className="mart-loading-title"/>
        <div className="mart-loading-line"/>
        <div className="mart-loading-line short"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginTop:22}}>
          {[1,2,3,4].map(n=><div key={n} style={{height:76,borderRadius:12,background:"linear-gradient(90deg,#edf0f4 20%,#fff 38%,#edf0f4 56%)",backgroundSize:"200% 100%",animation:"mart-skeleton 1.25s linear infinite"}}/>)}
        </div>
        <div className="mart-loading-progress" aria-hidden="true"/>
      </section>
    </main>
  );
}
