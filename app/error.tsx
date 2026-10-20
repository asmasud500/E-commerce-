"use client";

import Link from "next/link";

export default function ErrorPage({reset}:{error:Error;reset:()=>void}){
  return (
    <main className="site-error-page" role="alert">
      <section className="site-error-card" aria-labelledby="site-error-title">
        <span className="site-error-mark" aria-hidden="true">!</span>
        <p className="site-error-eyebrow">TEMPORARY ISSUE</p>
        <h1 id="site-error-title">This page hit a snag</h1>
        <p className="site-error-copy">Your information is safe. The page could not finish loading, so you can retry or return to the store.</p>
        <div className="site-error-actions">
          <button type="button" className="site-error-primary" onClick={reset}>Try again</button>
          <Link href="/" className="site-error-secondary">Back to home</Link>
        </div>
        <p className="site-error-help">If the issue keeps happening, please try again in a little while.</p>
      </section>
    </main>
  );
}
