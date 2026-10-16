import {fetchProduct} from '../../../product-import/fetch-product.mjs';
const origins=new Set(['https://jdsforeal.github.io','http://127.0.0.1:5173','http://localhost:5173']);
const limits=new Map<string,{start:number,count:number}>();
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(!origins.has(origin))return reply(403,{error:'Origine non autorisée.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'Méthode refusée.'});
 const authorization=request.headers.get('authorization');
 if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Connexion Atelier requise.'});
 try{
  const auth=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:authorization,apikey:Deno.env.get('SUPABASE_ANON_KEY')||''},signal:AbortSignal.timeout(6000)});
  if(!auth.ok)return reply(401,{error:'Reconnectez votre compte Atelier.'});
  const user=await auth.json();if(!user.id)return reply(401,{error:'Compte incorrect.'});
  const now=Date.now();for(const [id,rate] of limits)if(now-rate.start>60000)limits.delete(id);
  const rate=limits.get(user.id)||{start:now,count:0};limits.set(user.id,rate);if(++rate.count>15||limits.size>2000)return reply(429,{error:'Trop de demandes. Réessayez dans une minute.'});
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Lien manquant.'});let body='',size=0;const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();return reply(413,{error:'Lien trop long.'});}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();
  const data=await fetchProduct(JSON.parse(body).url);return reply(200,data);
 }catch{return reply(400,{error:'Impossible de lire ce lien produit.'});}
});
