"use client";
import {useState} from "react";

export default function Login(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(busy)return;
  setError("");setBusy(true);
  try{
   const response=await fetch("/api/admin/auth/login",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email:email.trim(),password}),cache:"no-store"
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok){setError(typeof data.error==="string"?data.error:"Sign-in failed. Check your credentials and try again.");return;}
   window.location.assign("/admin");
  }catch{
   setError("Could not connect to the store. Check your internet connection and try again.");
  }finally{setBusy(false);}
 }

 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
  <section className="admin-card" style={{width:"100%",maxWidth:440,padding:32}} aria-labelledby="admin-login-title">
   <div className="admin-kicker">Store administration</div>
   <h1 id="admin-login-title" style={{fontSize:42,margin:"8px 0"}}>Admin Login</h1>
   <p>Sign in to manage products, orders and payments.</p>
   <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:24}}>
    <label className="fld"><span>Admin email</span><input required type="email" autoComplete="username" maxLength={254} placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="fld"><span>Password</span><input required type="password" autoComplete="current-password" maxLength={128} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p role="alert" aria-live="polite" style={{color:"#b91c1c"}}>{error}</p>}
    <button type="submit" disabled={busy} style={{background:"#111827",color:"#fff"}}>{busy?"Signing in…":"Sign in →"}</button>
   </form>
   <a href="/" style={{display:"block",marginTop:18,textAlign:"center",fontSize:14}}>← Back to store</a>
  </section>
 </main>
}
