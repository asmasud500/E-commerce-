"use client";
import {useState} from "react";

export default function NewProduct(){
 const [saved,setSaved]=useState(false);
 return <main style={{maxWidth:800,margin:"auto",padding:32}}>
  <a href="/admin/products">← Products</a><h1>Add Product</h1>
  <form onSubmit={e=>{e.preventDefault();setSaved(true)}} style={{display:"grid",gap:16,marginTop:24}}>
   <input required placeholder="Product name" style={field}/><input required placeholder="SKU" style={field}/>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><input required type="number" step="0.01" placeholder="Price" style={field}/><input required type="number" placeholder="Stock quantity" style={field}/></div>
   <input placeholder="Category" style={field}/><textarea placeholder="Product description" rows={7} style={field}/>
   <label><input type="checkbox"/> Publish immediately</label>
   <button style={{background:"#111",color:"#fff",border:0,padding:14,borderRadius:8}}>Create Product</button>
   {saved&&<p>Product form validated. Database create API will connect this form next.</p>}
  </form>
 </main>
}
const field={padding:14,border:"1px solid #ddd",borderRadius:8,fontSize:16};