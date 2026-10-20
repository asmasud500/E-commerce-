export type FieldDef={key:string;label:string;secret?:boolean;placeholder?:string;optional?:boolean};
export type ProviderDef={id:string;name:string;kind:"courier"|"sms";help:string;config:FieldDef[];secrets:FieldDef[]};

export const PROVIDERS:ProviderDef[]=[
  {id:"steadfast",name:"Steadfast Courier",kind:"courier",help:"Merchant panel → Settings → API. Parcels are booked with one click from the order.",
   config:[{key:"baseUrl",label:"API base URL",placeholder:"https://portal.packzy.com/api/v1",optional:true}],
   secrets:[{key:"apiKey",label:"API key",secret:true},{key:"secretKey",label:"Secret key",secret:true}]},
  {id:"pathao",name:"Pathao Courier",kind:"courier",help:"Pathao merchant API credentials. Use the sandbox URL (https://courier-api-sandbox.pathao.com) while testing.",
   config:[{key:"baseUrl",label:"API base URL",placeholder:"https://api-hermes.pathao.com",optional:true},{key:"storeId",label:"Store ID"}],
   secrets:[{key:"clientId",label:"Client ID",secret:true},{key:"clientSecret",label:"Client secret",secret:true},{key:"username",label:"Merchant email",secret:true},{key:"password",label:"Merchant password",secret:true}]},
  {id:"sms",name:"SMS (BulkSMSBD)",kind:"sms",help:"Sends order updates to the customer's phone (confirmed, shipped, delivered, cancelled).",
   config:[{key:"senderId",label:"Sender ID"}],
   secrets:[{key:"apiKey",label:"API key",secret:true}]}
];
export const providerById=(id:string)=>PROVIDERS.find(p=>p.id===id)||null;
