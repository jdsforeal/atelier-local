/** Pilote local : destinations de boutiques explicites, redirections vérifiées, taille et durée bornées. */
import model from '../public/product-import-model.js';
const {parseProductHTML,productFromURL}=model;
const shops=new Set(['asos.com','www.asos.com','www.zara.com','www2.hm.com','www.mango.com','shop.mango.com','www.arket.com','www.cos.com','www.uniqlo.com','www.sezane.com']);
export async function fetchProduct(value,request=fetch){
 const fallback=productFromURL(value);let url=new URL(fallback.url);url.hash='';
 if(!shops.has(url.hostname))return {...fallback,notice:fallback.notice+' Cette boutique n’est pas encore prise en charge pour la lecture complète.'};
 try{
  for(let redirects=0;redirects<4;redirects++){
   if(!shops.has(url.hostname)||url.protocol!=='https:'||url.port||url.username||url.password)throw Error('Destination refusée.');
   const response=await request(url.href,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html','Accept-Language':'fr-FR,fr;q=0.9'}});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw Error('Redirection sans destination.');await response.body?.cancel();url=new URL(location,url);continue;}
   if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();throw Error('Page inaccessible.');}
   const reader=response.body.getReader();let length=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000000){await reader.cancel();throw Error('Page trop volumineuse.');}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const html=new TextDecoder().decode(bytes);
   return parseProductHTML(html,fallback.url);
  }
  throw Error('Trop de redirections.');
 }catch{return {...fallback,notice:fallback.notice+' La boutique n’a pas permis la lecture de sa page. Vous pouvez importer une capture à la place.'};}
}
