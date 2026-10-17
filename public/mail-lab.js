/** Bac à sable local : le transport ci-dessous n’utilise jamais fetch ni Gmail. */
let mailLab=null;
function createMailLab(source={}){
 const now=Date.now(),input={id:crypto.randomUUID(),project:'laboratoire',recipient:'fournisseur@atelier.localhost',subject:source.subject||'TEST ATELIER · Demande de disponibilité',body:(source.body||'Bonjour,\nCes pièces sont-elles disponibles pour notre projet ?\nMerci,\nSignature de test').replace(/\[Votre signature[^\]]*\]/g,'Signature de test'),reminderBody:'Bonjour,\nAvez-vous pu regarder notre demande ?\nMerci,\nSignature de test',reminderEnabled:true,reminderDays:3};
 const account={email:'styliste@atelier.localhost',jobs:[]};AtelierMailTestEngine.addJobs(account,[input],now);
 return {now,account,transmissions:0,reply:false,failure:false,source:structuredClone(source)};
}
function paintMailLab(){
 const state=mailLab,job=state.account.jobs[0];
 const panel=document.querySelector('#mail-lab-content');if(!panel)return;
 panel.innerHTML=`<p class="mail-lab-safety"><strong>Essai sans envoi réel</strong><br>Aucune connexion à Gmail. Aucun destinataire contacté. Le projet et ses demandes restent inchangés.</p><div class="mail-lab-summary"><div><small>ÉTAT SIMULÉ</small><strong>${esc(job.state)}</strong>${job.scheduledAt?`<small>Programmé : ${esc(mailTime(job.scheduledAt))}</small>`:""}</div><div><small>MESSAGES FICTIFS</small><strong>${state.transmissions}</strong></div><div><small>RELANCES</small><strong>${job.reminderCount} / 1</strong></div></div><details open><summary>Message utilisé pour cet essai</summary><p><strong>${esc(job.subject)}</strong></p><pre class="mail-lab-message">${esc(job.body)}</pre><small>L’adresse d’origine est remplacée par une adresse de laboratoire non livrable.</small></details><div class="mail-lab-actions"><button type="button" class="primary" data-mail-lab-step="send" ${job.sentAt?'disabled':''}>1. Simuler l’envoi</button><button type="button" data-mail-lab-step="reply" ${!job.sentAt?'disabled':''}>2. Simuler une réponse</button><button type="button" data-mail-lab-step="advance" ${!job.sentAt?'disabled':''}>Avancer de 4 jours</button><button type="button" data-mail-lab-step="failure" ${!job.sentAt?'disabled':''}>Tester une panne de lecture</button><button type="button" data-mail-lab-step="schedule" ${job.state!=='En attente d’envoi'?'disabled':''}>Programmer dans une heure</button><button type="button" data-mail-lab-step="hour">Avancer d’une heure</button><button type="button" data-mail-lab-step="cancel" ${job.state!=='En attente d’envoi'?'disabled':''}>Annuler avant envoi</button><button type="button" data-mail-lab-step="reset">Recommencer</button></div><p class="note">Sans réponse, avancer de 4 jours déclenche une seule relance. Avec une réponse, aucune relance ne part. Une panne de lecture suspend la relance.</p>${job.error?`<p role="alert">Simulation : ${esc(job.error)}</p>`:''}<ol class="mail-lab-log">${job.history.map(h=>`<li><small>${mailTime(h.at)}</small> ${esc(h.event.replaceAll('Gmail','le transport fictif'))}</li>`).join('')}</ol>`;
}
function openMailLab(source={}){
 mailLab=createMailLab(source);
 modal('Essayer le suivi des demandes','<div id="mail-lab-content"></div>',()=>{});
 document.querySelector('#form > button[type="submit"]').hidden=true;
 paintMailLab();
}
async function stepMailLab(step){
 if(!mailLab)return;
 if(step==='reset'){mailLab=createMailLab(mailLab.source);return paintMailLab();}
 const s=mailLab,job=s.account.jobs[0];
 if(step==='schedule'){AtelierMailTestEngine.rescheduleJob(s.account,job.id,new Date(s.now+3600000).toISOString(),s.now);return paintMailLab();}
 if(step==='hour')s.now+=3600000;
 if(step==='cancel'){job.paused=true;job.state='Annulé avant envoi';return paintMailLab();}
 if(step==='reply'){s.reply=true;s.now+=60000;}
 if(step==='advance')s.now+=4*86400000;
 if(step==='failure'){s.failure=true;s.now+=4*86400000;}
 const transport={
  send:async()=>{s.transmissions++;return {id:'fictif-'+s.transmissions,threadId:'fil-fictif'};},
  thread:async()=>{
   if(s.failure)throw Error('Panne simulée');
   return {messages:[{id:job.messageId,internalDate:String(Date.parse(job.sentAt)),labelIds:['SENT'],payload:{headers:[{name:'Message-ID',value:'<fictif@atelier.localhost>'}]}},...(s.reply?[{id:'reponse-fictive',internalDate:String(s.now),labelIds:['INBOX'],payload:{headers:[{name:'From',value:'fournisseur@atelier.localhost'}]}}]:[])]};
  }
 };
 await AtelierMailTestEngine.processAccount(s.account,transport,()=>{},s.now);
 paintMailLab();
}
const labOriginalMessages=messages;
messages=function(p){return `<section class="mail-lab-entry"><div><strong>Découvrez le suivi sans envoyer de mail</strong><p>Testez une réponse, une absence de réponse et une relance, avec un message de ce projet.</p></div><button data-open-mail-lab>Essayer sans envoyer</button></section>`+labOriginalMessages(p);};
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 try{
  if(b.hasAttribute('data-open-mail-lab')){
   const rows=mailCurrentRows();
   if(!rows.length)return openMailLab();
   modal('Choisir un message à essayer',`<p>Une copie sera utilisée dans le laboratoire, sans toucher au projet.</p>${rows.map((r,i)=>`<button type="button" data-mail-lab-source="${i}">${esc(r.draft.supplierName||r.draft.subject)}</button>`).join('')}`,()=>{});
   document.querySelector('#form > button[type="submit"]').hidden=true;
  }
  if(b.hasAttribute('data-mail-lab-source'))openMailLab(mailCurrentRows()[Number(b.dataset.mailLabSource)]?.draft||{});
  if(b.dataset.mailLabStep)await stepMailLab(b.dataset.mailLabStep);
 }catch(error){toast(error.message);}
});

// Les vrais essais Gmail utilisent uniquement la liste reçue du service privé.
const pilotOriginalDraftFor=mailDraftFor;
mailDraftFor=function(...args){
 const d=pilotOriginalDraftFor(...args);
 if(mailServiceMode==='sandbox'&&!mailIsSent(d)){
  if(!d.subject.startsWith('[TEST ATELIER] ')){d.subject='[TEST ATELIER] '+d.subject;d.state='À relire';}
  if(!mailTestRecipients.includes(d.recipient)){d.recipient='';d.state='À relire';}
 }
 return d;
};
const pilotOriginalValidation=mailValidationError;
mailValidationError=function(d,simulation=false){
 if(!simulation&&mailServiceMode==='sandbox'&&!mailTestRecipients.includes(d.recipient))return 'Choisissez une adresse de test autorisée.';
 return pilotOriginalValidation(d,simulation);
};
