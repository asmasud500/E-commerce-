"use client";
import AdminSidebar from "@/components/AdminSidebar";
import {useEffect,useState} from "react";import Link from "next/link";
type C={id:string;name:string;slug:string;_count:{products:number}};
export default function Categories(){const [items,setItems]=useState<C[]>([]),[name,setName]=useState(""),[error,setError]=useState("");
 async function load(){const r=await fetch("/api/admin/categories");if(r.ok)setItems(await r.json())}useEffect(()=>{load()},[]);
 async function add(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/admin/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});if(r.ok){setName("");load()}else setError((await r.json()).error||"Failed")}
 async function remove(id:string){if(!confirm("Delete category?"))return;const r=await fetch("/api/admin/categories/"+id,{method:"DELETE"});if(!r.ok)setError((await r.json()).error||"Failed");load()}
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content" style={{maxWidth:900,margin:"auto",padding:32}}><Link href="/admin">← Dashboard</Link><h1>Categories</h1><form onSubmit={add} style={{display:"flex",gap:8,margin:"24px 0"}}><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Category name"/><button>Add</button></form>{error&&<p>{error}</p>}<div>{items.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:16,borderBottom:"1px solid #ddd"}}><span><b>{c.name}</b> <small>({c._count.products} products)</small></span><button onClick={()=>remove(c.id)}>Delete</button></div>)}</div></main></div>}
