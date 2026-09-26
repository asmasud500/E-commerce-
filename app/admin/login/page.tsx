"use client";
import {useState} from "react";
export default function Login(){const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setError("");const r=await fetch("/api/admin/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});if(r.ok)location.href="/admin";else setError((await r.json()).error||"Login failed")}
 return <main style={{maxWidth:420,margin:"80px auto",padding:24}}><h1>Admin Login</h1><form onSubmit={submit} style={{display:"grid",gap:12}}><input required type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/><input required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p>{error}</p>}<button>Sign in</button></form></main>}
