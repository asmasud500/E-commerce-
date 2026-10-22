import type {Metadata} from "next";
import {PolicyPage} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Delivery information",description:"Delivery charges, timing and tracking."};
export default function Shipping(){return <PolicyPage kind="shipping"/>}
