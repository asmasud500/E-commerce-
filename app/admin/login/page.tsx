"use client";
import Link from "next/link";
import {useState} from "react";

export default function Login(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError("");setBusy(true);
  try{
   const response=await fetch("/api/admin/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim(),password}),cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){setError(typeof data.error==="string"?data.error:"Sign-in failed. Check your credentials and try again.");return;}
   window.location.assign("/admin");
  }catch{setError("Could not connect to the store. Check your internet connection and try again.");}
  finally{setBusy(false);}
 }
 return <main className="admin-login-shell"><section className="admin-login-card" aria-labelledby="admin-login-title">
  <div className="admin-login-logo" aria-hidden="true">M</div><div className="admin-kicker">MART · SECURE WORKSPACE</div>
  <h1 id="admin-login-title">Welcome back</h1><p>Sign in to manage your store, orders, catalog and payments.</p>
  <form onSubmit={submit}>
   <label htmlFor="admin-email">Admin email<input id="admin-email" required type="email" autoComplete="username" maxLength={254} placeholder="you@store.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label htmlFor="admin-password">Password<input id="admin-password" required type="password" autoComplete="current-password" maxLength={128} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert" aria-live="polite" className="admin-inline-error">{error}</p>}
   <button className="admin-primary-action" type="submit" disabled={busy}>{busy?"Signing in…":"Sign in securely →"}</button>
  </form><p className="admin-footnote">Authorized staff only. Never share your sign-in details or deployment secrets.</p><Link href="/" className="admin-login-back">← Back to store</Link>
 </section></main>;
}
