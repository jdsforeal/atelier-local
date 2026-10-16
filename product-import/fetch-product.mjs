/** Pilote local : destinations de boutiques explicites, redirections vérifiées, taille et durée bornées. */
import model from '../public/product-import-model.js';
const {parseProductHTML,productFromURL,productShop}=model;
export async function fetchProduct(value,request=fetch){
 const fallback=productFromURL(value);let url=new URL(fallback.url);url.hash='';let reason='network';
 if(!productShop(url))return {...fallback,reason:'unsupported-shop',notice:fallback.notice+' Cette boutique n’est pas encore prise en charge pour la lecture complète. Vous pouvez ajouter une capture.'};
 try{
  const signal=AbortSignal.timeout(12000);
  for(let redirects=0;redirects<4;redirects++){
   if(!productShop(url)||url.protocol!=='https:'||url.port||url.username||url.password){reason='redirect-refused';throw Error('Destination refusée.');}
   const response=await request(url.href,{redirect:'manual',signal,headers:{Accept:'text/html','Accept-Language':'fr-FR,fr;q=0.9'}});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw Error('Redirection sans destination.');await response.body?.cancel();url=new URL(location,url);continue;}
   if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){reason=[403,429].includes(response.status)?'blocked':[404,410].includes(response.status)?'unavailable':'network';await response.body?.cancel();throw Error('Page inaccessible.');}
   const reader=response.body.getReader();let length=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>3000000){reason='too-large';await reader.cancel();throw Error('Page trop volumineuse.');}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const html=new TextDecoder().decode(bytes);
   const data=parseProductHTML(html,fallback.url);
   if(data.source==='url'&&data.reason==='no-product-data')data.notice='La page ne fournit pas de fiche produit exploitable au lecteur (page dynamique ou article retiré). Seules les informations du lien sont proposées. Ajoutez une capture pour compléter.';
   return data;
  }
  throw Error('Trop de redirections.');
 }catch(error){if(error?.name==='TimeoutError'||error?.name==='AbortError')reason='timeout';const notices={blocked:'La boutique bloque la lecture automatique.',unavailable:'Cet article est introuvable ou retiré de la boutique.',timeout:'La boutique met trop de temps à répondre.', 'redirect-refused':'Le lien redirige vers une destination non prise en charge.', 'too-large':'La page dépasse la taille de lecture autorisée.',network:'La boutique est momentanément inaccessible au lecteur.'};return {...fallback,reason,notice:(notices[reason]||notices.network)+' Les propositions viennent seulement du lien ; aucun prix ni photo récupéré. Vous pouvez importer une capture à la place.'};}
}
