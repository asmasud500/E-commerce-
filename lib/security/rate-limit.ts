type Entry={count:number;resetAt:number};
const store=new Map<string,Entry>();
const LIMIT=20;
const WINDOW=60_000;

export function rateLimit(key:string,limit=LIMIT,windowMs=WINDOW){
  const now=Date.now();
  const current=store.get(key);
  if(!current||current.resetAt<=now){
    store.set(key,{count:1,resetAt:now+windowMs});
    return {ok:true,retryAfter:0};
  }
  current.count++;
  if(current.count>limit)return {ok:false,retryAfter:Math.ceil((current.resetAt-now)/1000)};
  return {ok:true,retryAfter:0};
}
