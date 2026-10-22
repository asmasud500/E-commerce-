import type {Metadata} from "next";
import {PolicyPage} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Terms of service",description:"Terms for using our store."};
export default function Terms(){return <PolicyPage kind="terms"/>}
