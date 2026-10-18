"use client";
import {useEffect,useState} from "react";

const DAY=86400000,DHAKA_OFFSET=6*3600000;
/** Milliseconds until the next midnight in Bangladesh time (UTC+6, no DST). */
const untilMidnight=()=>DAY-((Date.now()+DHAKA_OFFSET)%DAY);

export default function FlashCountdown(){
  const [ms,setMs]=useState<number|null>(null);
  useEffect(()=>{
    setMs(untilMidnight());
    const id=setInterval(()=>setMs(untilMidnight()),1000);
    return()=>clearInterval(id);
  },[]);
  const total=ms===null?null:Math.floor(ms/1000);
  const parts=total===null?["--","--","--"]:[Math.floor(total/3600),Math.floor((total%3600)/60),total%60].map(n=>String(n).padStart(2,"0"));
  return (
    <div className="hp-cd" role="timer" aria-label="Time left in today's flash sale">
      <span className="hp-cd-label">Ends in</span>
      <b>{parts[0]}</b><i>:</i><b>{parts[1]}</b><i>:</i><b>{parts[2]}</b>
    </div>
  );
}
