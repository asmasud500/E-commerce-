import type {Metadata} from "next";
import {PolicyPage} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Privacy policy",description:"How we handle your personal information."};
export default function Privacy(){return <PolicyPage kind="privacy"/>}
