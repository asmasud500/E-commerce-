"use client";
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){
  return <main className="pg"><section className="pg-card info-page" style={{textAlign:"center"}}><h1>Something went wrong</h1><p>We could not load this page. Please try again.</p><p><button className="pg-btn" onClick={reset}>Try again</button> <a href="/" className="pg-btn pg-btn-line">Back to home</a></p></section></main>;
}
