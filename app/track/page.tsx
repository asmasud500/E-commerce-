import type {Metadata} from "next";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import TrackClient from "./TrackClient";

export const metadata:Metadata={title:"Track your order",description:"Check the status of your order with your order number and the phone number or email you ordered with."};

export default async function TrackPage({searchParams}:{searchParams:Promise<{order?:string}>}){
  const sp=await searchParams;
  return <><StoreHeader/><main className="pg"><TrackClient initialOrder={(sp.order||"").slice(0,60)}/></main><StoreFooter/></>;
}
