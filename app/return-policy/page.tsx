import type {Metadata} from "next";
import {PolicyPage} from "@/components/InfoPage";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Returns & refunds",description:"How returns and refunds work."};
export default function Returns(){return <PolicyPage kind="returns"/>}
