import type {ReactNode} from "react";

function inline(text:string):ReactNode[]{
  const out:ReactNode[]=[];
  const re=/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^)\s]*)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last=0,m:RegExpExecArray|null,i=0;
  while((m=re.exec(text))){
    if(m.index>last)out.push(text.slice(last,m.index));
    if(m[1]!==undefined){const external=/^https?:/.test(m[2]);out.push(<a key={i++} href={m[2]} {...(external?{target:"_blank",rel:"noopener noreferrer"}:{})}>{m[1]}</a>);}
    else if(m[3]!==undefined)out.push(<strong key={i++}>{m[3]}</strong>);
    else out.push(<em key={i++}>{m[4]}</em>);
    last=m.index+m[0].length;
  }
  if(last<text.length)out.push(text.slice(last));return out;
}
export function fillPlaceholders(text:string,vars:Record<string,string>){return text.replace(/\{(\w+)\}/g,(all,k)=>k in vars?vars[k]:all);}

export default function PolicyBody({text}:{text:string}){
  const blocks=text.replace(/\r\n/g,"\n").split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  const nodes:ReactNode[]=[];let key=0;
  for(const block of blocks){
    const lines=block.split("\n");let buffer:string[]=[];let list:string[]=[];let ordered=false;
    const flushText=()=>{if(buffer.length){nodes.push(<p key={key++} style={{whiteSpace:"pre-line"}}>{inline(buffer.join("\n"))}</p>);buffer=[];}};
    const flushList=()=>{if(list.length){const items=list.map((x,j)=><li key={j}>{inline(x)}</li>);nodes.push(ordered?<ol key={key++}>{items}</ol>:<ul key={key++}>{items}</ul>);list=[];ordered=false;}};
    for(const line of lines){
      if(/^##\s+/.test(line)){flushText();flushList();nodes.push(<h2 key={key++}>{line.replace(/^##\s+/,"")}</h2>);}
      else if(/^[-*]\s+/.test(line)){flushText();if(ordered)flushList();list.push(line.replace(/^[-*]\s+/,""));}
      else if(/^\d+\.\s+/.test(line)){flushText();if(list.length&&!ordered)flushList();ordered=true;list.push(line.replace(/^\d+\.\s+/,""));}
      else{flushList();buffer.push(line);}
    }
    flushText();flushList();
  }
  return <>{nodes}</>;
}
