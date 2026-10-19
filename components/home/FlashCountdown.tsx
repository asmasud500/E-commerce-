"use client";
import {useEffect,useState} from "react";

const DAY=86400000,DHAKA_OFFSET=6*3600000;
/** Milliseconds until the next midnight in Bangladesh time (UTC+6, no DST). */
const untilMidnight=()=>DAY-((Date.now()+DHAKA_OFFSET)%DAY);

/** Counts down to `endsAt` (epoch ms) when a flash sale is running, otherwise to midnight. */
export default function FlashCountdown({endsAt}:{endsAt?:number|null}){
  const [ms,setMs]=useState<number|null>(null);
  useEffect(()=>{
    const left=()=>endsAt?Math.max(0,endsAt-Date.now()):untilMidnight();
    setMs(left());
    const id=setInterval(()=>setMs(left()),1000);
    return()=>clearInterval(id);
  },[endsAt]);
  const total=ms===null?null:Math.floor(ms/1000);
  const days=total===null?0:Math.floor(total/86400);
  const rest=total===null?null:total%86400;
  const parts=rest===null?["--","--","--"]:[Math.floor(rest/3600),Math.floor((rest%3600)/60),rest%60].map(n=>String(n).padStart(2,"0"));
  return (
    <div className="hp-cd" role="timer" aria-label="Time left in the flash sale">
      <span className="hp-cd-label">Ends in</span>
      {days>0&&<><b>{days}d</b><i>:</i></>}
      <b>{parts[0]}</b><i>:</i><b>{parts[1]}</b><i>:</i><b>{parts[2]}</b>
    </div>
  );
}
