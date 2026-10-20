"use client";
import {useState} from "react";
import Link from "next/link";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

export default function Login(){
 const [mode,setMode]=useState<"login"|"register">("login");
 const [form,setForm]=useState({name:"",email:"",password:""});
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/customer/auth/"+mode,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:form.name.trim(),email:form.email.trim(),password:form.password}),
    cache:"no-store"
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok){setError(typeof data.error==="string"?data.error:"Unable to "+(mode==="login"?"log in":"create your account")+". Please check your details and try again.");return;}
   window.location.assign("/account");
  }catch{
   setError("Could not connect to the store. Check your internet connection and try again.");
  }finally{
   setBusy(false);
  }
 }

 function changeMode(){
  setMode(mode==="login"?"register":"login");
  setError("");
 }

 return <><StoreHeader/><main className="pg">
  <section className="pg-card auth" aria-labelledby="auth-title">
   <h1 id="auth-title">{mode==="login"?"Welcome back":"Create your account"}</h1>
   <p>{mode==="login"?"Log in to view your orders and account.":"Create an account to track your orders."}</p>
   <form onSubmit={submit} noValidate={false}>
    {mode==="register"&&<label className="fld"><span>Full name</span><input autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
    <label className="fld"><span>Email address</span><input autoComplete="email" required type="email" maxLength={254} placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="fld"><span>Password</span><input autoComplete={mode==="login"?"current-password":"new-password"} required minLength={8} maxLength={128} type="password" placeholder="At least 8 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    {error&&<p className="form-error" role="alert" aria-live="polite">{error}</p>}
    <button disabled={busy} className="pg-btn pg-btn-block" type="submit">{busy?"Please wait…":mode==="login"?"Log in":"Create account"}</button>
   </form>
   <div className="auth-alt"><button type="button" disabled={busy} onClick={changeMode}>{mode==="login"?"New here? Create an account":"Already have an account? Log in"}</button><Link href="/products">← Continue shopping</Link></div>
  </section>
 </main><StoreFooter/></>
}
