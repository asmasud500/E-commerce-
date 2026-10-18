"use client";import{useState}from"react";import Link from"next/link";import StoreHeader from"@/components/StoreHeader";import StoreFooter from"@/components/StoreFooter";
export default function Login(){
 const[mode,setMode]=useState<"login"|"register">("login"),[form,setForm]=useState({name:"",email:"",password:""}),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const r=await fetch("/api/customer/auth/"+mode,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(r.ok)location.href="/account";else setError(d.error||"Request failed");setBusy(false)}
 return <><StoreHeader/><main className="pg"><section className="pg-card auth">
  <h1>{mode==="login"?"Welcome back":"Create your account"}</h1>
  <p>{mode==="login"?"Log in to view your orders and account.":"Create an account to track your orders."}</p>
  <form onSubmit={submit}>
   {mode==="register"&&<label className="fld"><span>Full name</span><input required placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
   <label className="fld"><span>Email address</span><input required type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
   <label className="fld"><span>Password</span><input required minLength={8} type="password" placeholder="8+ characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <button disabled={busy} className="pg-btn pg-btn-block">{busy?"Please wait...":mode==="login"?"Log in":"Create account"}</button>
  </form>
  <div className="auth-alt"><button type="button" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"New here? Create an account":"Already have an account? Log in"}</button><Link href="/products">← Continue shopping</Link></div>
 </section></main><StoreFooter/></>}
