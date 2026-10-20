export default function Loading(){
  return (
    <main className="mart-page-loading" aria-label="Loading page" role="status">
      <section className="mart-loading-card">
        <div className="mart-loading-brand"><span className="mart-loading-mark">M</span><span>MART Store</span></div>
        <div className="mart-spinner" aria-hidden="true"/>
        <p style={{fontWeight:700,margin:"14px 0 18px"}}>Getting everything ready…</p>
        <div className="mart-loading-title"/>
        <div className="mart-loading-line"/>
        <div className="mart-loading-line short"/>
        <div className="mart-loading-progress" aria-hidden="true"/>
        <span style={{display:"block",fontSize:12,color:"#64748b",marginTop:12}}>Please wait while the page loads.</span>
      </section>
    </main>
  );
}
