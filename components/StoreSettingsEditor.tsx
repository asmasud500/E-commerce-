"use client";
import {useEffect,useState,type FormEvent} from "react";

type Settings={storeName:string;supportEmail:string;supportPhone:string;currency:string;defaultDeliveryFee:number;freeShippingThreshold:number|null;taxEnabled:boolean;taxRate:number;announcement:string};
const initial:Settings={storeName:"MART Store",supportEmail:"",supportPhone:"",currency:"BDT",defaultDeliveryFee:120,freeShippingThreshold:3000,taxEnabled:false,taxRate:0,announcement:""};
export default function StoreSettingsEditor(){
 const [value,setValue]=useState<Settings>(initial);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 useEffect(()=>{let live=true;fetch("/api/admin/store-settings",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load settings");if(live)setValue({...initial,...j});}).catch(e=>{if(live)setNotice(e instanceof Error?e.message:"Could not load settings");});return()=>{live=false};},[]);
 const set=(key:keyof Settings,v:any)=>setValue(old=>({...old,[key]:v}));
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setNotice("");try{const body={...value,defaultDeliveryFee:Number(value.defaultDeliveryFee),freeShippingThreshold:value.freeShippingThreshold==null||String(value.freeShippingThreshold)===""?null:Number(value.freeShippingThreshold),taxRate:Number(value.taxRate)};const r=await fetch("/api/admin/store-settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save settings");setValue({...initial,...j});setNotice("Store settings saved.");}catch(e){setNotice(e instanceof Error?e.message:"Could not save settings");}finally{setBusy(false);}}
 return <section className="admin-recent"><h2>Editable store settings</h2><p>These values are saved in Firestore. Payment credentials and other secrets remain in the hosting secret manager.</p>{notice&&<p role="status" className="admin-notice">{notice}</p>}<form className="admin-resource-form" onSubmit={save}>
 <label>Store name<input required maxLength={120} value={value.storeName} onChange={e=>set("storeName",e.target.value)}/></label>
 <label>Support email<input type="email" value={value.supportEmail} onChange={e=>set("supportEmail",e.target.value)}/></label>
 <label>Support phone<input value={value.supportPhone} onChange={e=>set("supportPhone",e.target.value)}/></label>
 <label>Currency<input value="BDT (Bangladeshi Taka)" readOnly/></label>
 <label>Default delivery fee (৳)<input type="number" min="0" max="100000" value={value.defaultDeliveryFee} onChange={e=>set("defaultDeliveryFee",Number(e.target.value))}/></label>
 <label>Free delivery threshold (৳; blank = disabled)<input type="number" min="0" max="10000000" value={value.freeShippingThreshold??""} onChange={e=>set("freeShippingThreshold",e.target.value===""?null:Number(e.target.value))}/></label>
 <label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={value.taxRate} onChange={e=>set("taxRate",Number(e.target.value))}/></label>
 <label>Store announcement<input maxLength={500} value={value.announcement} onChange={e=>set("announcement",e.target.value)}/></label>
 <label className="admin-checkbox-field"><input type="checkbox" checked={value.taxEnabled} onChange={e=>set("taxEnabled",e.target.checked)}/> Enable tax calculation (checkout integration still required)</label>
 <button disabled={busy} type="submit">{busy?"Saving…":"Save store settings"}</button></form></section>;
}
