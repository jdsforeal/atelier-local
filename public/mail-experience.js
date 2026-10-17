/** État réseau réel et aperçu identique au mail enrichi. */
let mailServiceReachability='unknown';
function mailNetworkMessage(error){
 const text=String(error?.message||'');
 if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'Le service mail met trop de temps à répondre. Votre brouillon est conservé.';
 if(error instanceof TypeError||/failed to fetch|fetch failed|networkerror|load failed/i.test(text))return mailServiceURL&&/localhost|127\.0\.0\.1/.test(mailServiceURL)?'Le service mail local est inaccessible. Il doit être démarré sur cet ordinateur pour utiliser Gmail ou Gemini. Vos brouillons sont conservés.':'Impossible de joindre le service mail. Vérifiez sa disponibilité et la connexion. Vos brouillons sont conservés.';
 return text||'Le service mail est indisponible.';
}
const experienceMailAPI=mailAPI;
mailAPI=async function(route,body){
 try{const result=await experienceMailAPI(route,body);if(result.email)mailServiceReachability='online';return result;}
 catch(error){const message=mailNetworkMessage(error);if(message!==error.message){mailServiceReachability='offline';mailServiceError=message;queueMicrotask(()=>{if(view==='detail'&&tab==='messages')mailRefresh();});}throw Error(message);}
};
const experienceMessages=messages;
messages=function(p){
 let html=experienceMessages(p);
 if(!demoMode&&mailSession&&mailServiceReachability!=='online'){
  html=html.replace(/Gmail · ESSAIS LIMITÉS · /g,mailServiceReachability==='offline'?'Service indisponible · compte de test mémorisé : ':'Connexion à vérifier · compte de test mémorisé : ');
  html=html.replace(/Gmail connecté · /g,mailServiceReachability==='offline'?'Service indisponible · compte mémorisé : ':'Connexion à vérifier · compte mémorisé : ');
  html=html.replace('Le service assure le suivi tant qu’il reste actif.','Le compte mémorisé ne confirme pas que le service est joignable. Utilisez « Vérifier les réponses » pour contrôler la connexion.');
  html=html.replace(/(<button class="primary" data-mail-send)(?! disabled)/,'$1 disabled');
 }
 return html;
};
const experienceMailRow=mailRowHTML;
mailRowHTML=function(p,row){
 const html=experienceMailRow(p,row),d=row.draft;
 return html.replace('</summary>',`</summary><details class="mail-rich-preview"><summary>Aperçu du mail · liens sur les noms des articles</summary>${AtelierMailFormat.html(d.body,d.links||row.group?.pieces||[])}</details>`);
};
render();
