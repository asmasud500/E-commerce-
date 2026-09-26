export async function sendTelegramOrderNotification(message:string){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 const chatId=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chatId)return {ok:false,skipped:true};
 const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({chat_id:chatId,text:message,parse_mode:"HTML"})
 });
 return {ok:res.ok,skipped:false};
}
