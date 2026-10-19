"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {BANGLADESH_LOCATIONS,findDivision,findDistrict} from "@/lib/bangladesh-locations";

type Kind="delivery-zones"|"banners"|"flash-sales";
type Row=Record<string,any>&{id:string};
const blank={name:"",division:"",district:"",upazila:"",postalCode:"",locationDescription:"",latitude:"",longitude:"",fee:"120",freeAbove:"",estimatedDays:"3",title:"",imageUrl:"",href:"",sortOrder:"0",productIds:"",discountPercent:"10",startsAt:"",endsAt:""};

export default function AdminResourceManager({kind}:{kind:Kind}){
 const meta:Record<Kind,{title:string;description:string;endpoint:string}>={
  "delivery-zones":{title:"Delivery Zones",description:"Set Bangladesh delivery areas using Division → District → Upazila, postal code, exact location and an optional map pin.",endpoint:"/api/admin/delivery-zones"},
  banners:{title:"Store Banners",description:"Create promotional banners and control their storefront visibility.",endpoint:"/api/admin/banners"},
  "flash-sales":{title:"Flash Sales",description:"Schedule product discounts with start/end times and explicit product IDs.",endpoint:"/api/admin/flash-sales"}
 };
 const m=meta[kind], [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[form,setForm]=useState<Record<string,string>>(blank);
 const districts=findDivision(form.division)?.districts||[];
 const upazilas=findDistrict(form.division,form.district)?.upazilas||[];
 const load=useCallback(async()=>{try{const r=await fetch(m.endpoint,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load records");setRows(Array.isArray(j)?j:[]);}catch(e){setNotice(e instanceof Error?e.message:"Request failed");}},[m.endpoint]);
 useEffect(()=>{void load();},[load]);
 const set=(key:string,value:string)=>setForm(old=>({...old,[key]:value}));
 const markLocation=()=>{
  if(!navigator.geolocation){setNotice("This browser does not support location access.");return;}
  setNotice("Requesting location permission…");
  navigator.geolocation.getCurrentPosition(pos=>{setForm(old=>({...old,latitude:String(pos.coords.latitude),longitude:String(pos.coords.longitude)}));setNotice("Location marked. Coordinates saved in the form; press Save to store them.");},err=>setNotice(err.code===1?"Location permission denied. You can enter coordinates manually.":"Could not get location. Try outdoors or enter coordinates manually."),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
 };
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setNotice("");try{
  const body:Record<string,any>={...form};
  if(kind==="delivery-zones"){body.fee=Number(body.fee);body.estimatedDays=Number(body.estimatedDays);body.freeAbove=body.freeAbove===""?null:Number(body.freeAbove);body.latitude=body.latitude===""?null:Number(body.latitude);body.longitude=body.longitude===""?null:Number(body.longitude);body.active=true;body.name=body.name.trim()||[body.upazila,body.district].filter(Boolean).join(", ");}
  if(kind==="banners"){body.sortOrder=Number(body.sortOrder||0);body.active=false;}
  if(kind==="flash-sales"){body.productIds=String(body.productIds).split(",").map(x=>x.trim()).filter(Boolean);body.discountPercent=Number(body.discountPercent);body.startsAt=new Date(body.startsAt).toISOString();body.endsAt=new Date(body.endsAt).toISOString();body.active=false;}
  const r=await fetch(m.endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save record");setForm(blank);setNotice("Saved successfully.");await load();
 }catch(e){setNotice(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}};
 const patch=async(row:Row,data:Record<string,any>)=>{setNotice("");try{const r=await fetch(m.endpoint+"/"+encodeURIComponent(row.id),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Update failed");setNotice("Updated.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Update failed");}};
 const remove=async(row:Row)=>{if(!window.confirm("Delete this record?"))return;try{const r=await fetch(m.endpoint+"/"+encodeURIComponent(row.id),{method:"DELETE"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Delete failed");setNotice("Deleted.");await load();}catch(e){setNotice(e instanceof Error?e.message:"Delete failed");}};
 const edit=async(row:Row)=>{
  if(kind==="delivery-zones"){
   const fee=window.prompt("Delivery fee (BDT)",String(row.fee));if(fee===null)return;
   const days=window.prompt("Estimated delivery days",String(row.estimatedDays??3));if(days===null)return;
   const postalCode=window.prompt("Postal code",String(row.postalCode||""));if(postalCode===null)return;
   const locationDescription=window.prompt("Exact area / village / road / landmark",String(row.locationDescription||""));if(locationDescription===null)return;
   await patch(row,{fee:Number(fee),estimatedDays:Number(days),postalCode,locationDescription});return;
  }
  if(kind==="banners"){const title=window.prompt("Banner title",row.title);if(title===null)return;const imageUrl=window.prompt("Image URL",row.imageUrl);if(imageUrl===null)return;const href=window.prompt("Destination URL",row.href||"");if(href===null)return;const sortOrder=window.prompt("Sort order",String(row.sortOrder??0));if(sortOrder===null)return;await patch(row,{title,imageUrl,href,sortOrder:Number(sortOrder)});return;}
  const title=window.prompt("Flash sale title",row.title);if(title===null)return;const productIds=window.prompt("Product IDs separated by commas",(row.productIds||[]).join(", "));if(productIds===null)return;const discountPercent=window.prompt("Discount percent (1–90)",String(row.discountPercent));if(discountPercent===null)return;await patch(row,{title,productIds:productIds.split(",").map((x:string)=>x.trim()).filter(Boolean),discountPercent:Number(discountPercent)});
 };
 const label=(row:Row)=>String(row.title||row.name||"Untitled");
 const input=(key:string,label:string,type="text",required=false,placeholder="")=><label key={key}>{label}<input type={type} step={type==="number"?"any":undefined} required={required} placeholder={placeholder} value={form[key]||""} onChange={e=>set(key,e.target.value)} /></label>;
 const select=(key:string,label:string,options:string[],required=false,disabled=false)=><label key={key}>{label}<select required={required} disabled={disabled} value={form[key]||""} onChange={e=>set(key,e.target.value)}><option value="">Choose {label.toLowerCase()}</option>{options.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
 return <div className="admin-layout"><AdminSidebar/><main className="admin-content"><div className="admin-kicker">MART · STORE CONTROL</div><div className="admin-heading-row"><div><h1>{m.title}</h1><p>{m.description}</p></div></div>
 {notice&&<p role="status" className="admin-notice">{notice}</p>}
 <section className="admin-recent"><h2>Create new</h2><form className="admin-resource-form" onSubmit={submit}>
 {kind==="delivery-zones"?<>
  {input("name","Zone label (optional)","text",false,"Auto: Upazila, District")}
  {select("division","Division",BANGLADESH_LOCATIONS.map(x=>x.name),true)}
  {select("district","District",districts.map(x=>x.name),true,!form.division)}
  {upazilas.length?select("upazila","Upazila",upazilas,true,!form.district):input("upazila","Upazila / Thana","text",true,"Enter upazila / thana")}
  {input("postalCode","Postal code","text",true,"e.g. 5500")}
  {input("locationDescription","Exact delivery location (village / area / road / house / landmark)","text",true,"Village, para, road, house no. or nearby landmark")}
  <div className="admin-location-mark"><button type="button" onClick={markLocation}>📍 Mark location using this device</button><p>Browser permission required. GPS coordinates help identify the delivery point; you can also enter them manually.</p></div>
  {input("latitude","Latitude (optional)","number",false,"e.g. 25.9167")}
  {input("longitude","Longitude (optional)","number",false,"e.g. 89.4500")}
  {input("fee","Delivery fee (৳)","number",true)}
  {input("freeAbove","Free delivery above (৳, optional)","number")}
  {input("estimatedDays","Estimated days","number",true)}
 </>:kind==="banners"?<>
  {input("title","Banner title","text",true)}{input("imageUrl","Image URL (https)","url",true)}{input("href","Destination URL","text")}{input("sortOrder","Sort order","number",true)}
 </>:<>
  {input("title","Flash sale title","text",true)}{input("productIds","Product IDs (comma separated)","text",true)}{input("discountPercent","Discount percent (1–90)","number",true)}{input("startsAt","Start time","datetime-local",true)}{input("endsAt","End time","datetime-local",true)}
 </>}
 <button disabled={busy} type="submit">{busy?"Saving…":"Save"}</button></form>
 {kind==="delivery-zones"&&<p className="admin-footnote">Division and district lists are provided. Rangpur division includes its eight districts and listed upazilas; for other divisions, enter the upazila manually. Postal codes and exact addresses must be confirmed by the customer.</p>}
 {kind==="flash-sales"&&<p className="admin-footnote">Product IDs must match existing product document IDs.</p>}</section>
 <section className="admin-recent"><div className="admin-section-heading"><div><h2>Saved records</h2><p>{rows.length} record(s)</p></div><button type="button" onClick={()=>void load()}>Refresh</button></div>{rows.length===0?<p className="admin-empty">No records yet.</p>:<div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{label(row)}</td><td><span className="admin-status">{row.active?"Active":"Inactive"}</span></td><td>{kind==="delivery-zones"?[row.division,row.district,row.upazila,row.postalCode,row.locationDescription,"৳"+row.fee,row.estimatedDays+" day(s)"].filter(Boolean).join(" · "):kind==="banners"?(row.imageUrl||"No image URL"):(row.discountPercent+"% · "+(row.productIds||[]).length+" product(s)")}</td><td><div className="admin-row-actions"><button type="button" onClick={()=>void edit(row)}>Edit</button><button type="button" onClick={()=>void patch(row,{active:!row.active})}>{row.active?"Disable":"Enable"}</button><button type="button" onClick={()=>void remove(row)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>
 </main></div>;
}
