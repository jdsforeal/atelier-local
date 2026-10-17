/** L’IA propose ; la personne conserve la décision sur le texte et l’envoi. */
function mailAIContext(p,row){
 const contact=row.group?.contacts.find(c=>mailAddress(c.email)===mailAddress(row.draft.recipient));
 const saved=row.draft.aiPreparation?.sourceSignature===row.draft.currentSignature?row.draft.aiPreparation:{};
 return {project:{name:p.name,client:p.client||saved.project?.client||'',type:p.type||saved.project?.type||'',date:p.date||saved.project?.date||''},supplier:row.draft.supplierName,contactName:contact?.name||'',signature:db.mailSettings?.signature||saved.signature||'',pieces:(row.group?.pieces||[]).map(x=>{const prior=saved.pieces?.find(y=>y.id===x.id)||{};return {name:x.name,brand:x.brand,mode:x.mode||prior.mode||'',size:x.size||prior.size||'',returnDue:x.returnDue||prior.returnDue||'',url:x.url};})};
}
function mailMissingInformation(context){
 const fields=[];
 const add=(key,label,type='text',piece=null)=>fields.push({key,label,type,piece});
 if(!context.project.client)add('client','Artiste / client');
 if(!context.project.type)add('type','Type de projet');
 if(!context.project.date)add('date','Date du projet','date');
 if(!context.signature)add('signature','Votre signature');
 context.pieces.forEach((piece,index)=>{
  if(!piece.mode)add('mode',`${piece.name} · prêt, location ou achat ?`,'text',index);
  if(!piece.size)add('size',`${piece.name} · taille / format souhaité`,'text',index);
  if(['Prêt','Location'].includes(piece.mode)&&!piece.returnDue)add('returnDue',`${piece.name} · date de retour envisagée`,'date',index);
 });
 return fields;
}
function mailTextSnapshot(d){return JSON.stringify([d.subject,d.body,d.reminderBody]);}
function openMailAI(id){
 const p=project(),row=mailRows(p).find(r=>r.draft.id===id);
 if(!row||!mailCanEdit(p,row.draft))return toast('Ce message ne peut plus être modifié.');
 if(!row.group?.pieces.length)return toast('Associez les pièces à un fournisseur avant la rédaction.');
 const context=mailAIContext(p,row),before=mailTextSnapshot(row.draft),signature=row.draft.currentSignature;
 const missing=mailMissingInformation(context);
 const dialog=document.createElement('dialog');dialog.className='mail-ai-dialog';
 dialog.innerHTML=`<div class="section-head"><div><small>AIDE À LA RÉDACTION · FACULTATIVE</small><h2>Une proposition pour ${esc(row.draft.supplierName)}</h2></div><button data-ai-close aria-label="Fermer">✕</button></div><p>${demoMode?'Simulation : un exemple de rédaction est produit sur cet appareil, sans appel à Gemini.':'Gemini reçoit les références ci-dessous pour proposer un mail et une relance.'} Votre texte actuel reste intact jusqu’à votre choix.</p><details open><summary>Déjà repris des étapes précédentes</summary><p>${esc(context.project.client||p.name)} · ${esc(context.project.type||'Type à préciser')} · ${esc(context.project.date||'Date à préciser')} · ${context.pieces.length} pièce(s)</p><ul>${context.pieces.map(x=>`<li>${esc(x.name)} · ${esc(x.mode||'Mode à préciser')}${x.size?' · taille '+esc(x.size):''}${x.returnDue?' · retour '+esc(x.returnDue):''}</li>`).join('')}</ul><p>Signature : ${esc(context.signature||'À compléter')}</p><p class="note">Titre et type du projet, fournisseur, nom du contact, liens, tailles, dates de retour et signature renseignés sont également transmis. Budgets et notes internes exclus.</p></details>${missing.length?`<section class="mail-missing-information"><h3>Informations à compléter</h3><p>Quelques précisions peuvent rendre cette demande plus utile. Complétez ce que vous connaissez ; ces réponses seront mémorisées pour cette demande fournisseur, sans modifier les fiches du projet.</p><div class="mail-missing-fields">${missing.map((f,i)=>`<label>${esc(f.label)}<input type="${f.type}" data-ai-missing="${i}" maxlength="${f.key==='signature'?1000:300}"></label>`).join('')}</div><label class="mail-tick"><input type="checkbox" data-ai-unknown> Je ne connais pas encore toutes ces informations. Continuer sans les inventer.</label></section>`:''}<p class="mail-ai-status" role="status"></p><div class="mail-ai-comparison" hidden><section><h3>Texte actuel</h3><pre data-ai-current></pre></section><section><h3>Proposition IA</h3><label>Objet<input data-ai-subject></label><label>Message<textarea rows="12" data-ai-body></textarea></label><details><summary>Relance proposée</summary><textarea rows="5" data-ai-reminder></textarea></details><p class="note">Vérifiez les faits et les engagements avant d’appliquer cette proposition.</p></section></div><footer class="actions"><button data-ai-close>Garder mon texte</button><button class="primary" data-ai-generate>Créer une proposition</button><button class="primary" data-ai-apply hidden>Appliquer · à relire</button></footer>`;
 let proposal=null,busy=false,alive=true;
 const close=()=>{alive=false;dialog.close();dialog.remove();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-ai-close'))return close();
  const status=dialog.querySelector('.mail-ai-status');
  try{
   if(b.hasAttribute('data-ai-generate')&&!busy){
    let unresolved=0;
    dialog.querySelectorAll('[data-ai-missing]').forEach(input=>{
      const f=missing[Number(input.dataset.aiMissing)],value=input.value.trim();
      input.closest('label').classList.toggle('mail-missing-pending',!value);
      if(!value){unresolved++;return;}
      if(f.piece!==null)context.pieces[f.piece][f.key]=value;
      else if(f.key==='signature')context.signature=value;
      else context.project[f.key]=value;
    });
    if(unresolved&&!dialog.querySelector('[data-ai-unknown]')?.checked){status.textContent='Complétez les champs signalés ou indiquez que vous ne connaissez pas encore ces informations.';dialog.querySelector('.mail-missing-pending input')?.focus();return;}
    const record=mailRecord(row.draft),previousPreparation=record.aiPreparation;
    record.aiPreparation={sourceSignature:signature,project:{client:context.project.client,type:context.project.type,date:context.project.date},signature:context.signature,pieces:context.pieces.map((x,i)=>({id:row.group.pieces[i].id,mode:x.mode,size:x.size,returnDue:x.returnDue}))};
    if(save()===false){record.aiPreparation=previousPreparation;throw Error('Les précisions n’ont pas pu être enregistrées.');}
    busy=true;b.disabled=true;status.textContent='Rédaction en cours…';
    const availability=await mailAPI('ai-status');
    if(!availability.enabled)throw Error('Gemini n’est pas encore configuré sur le service. Votre brouillon classique reste disponible.');
    const result=await mailAPI('ai-draft',{projectId:p.id,context});if(!alive)return;
    proposal=result.proposal;
    if(!proposal?.subject||!proposal.body||!proposal.reminderBody)throw Error('La proposition est incomplète. Votre texte est conservé.');
    dialog.querySelector('[data-ai-current]').textContent=row.draft.subject+'\n\n'+row.draft.body;
    dialog.querySelector('[data-ai-subject]').value=proposal.subject;
    dialog.querySelector('[data-ai-body]').value=proposal.body;
    dialog.querySelector('[data-ai-reminder]').value=proposal.reminderBody;
    dialog.querySelector('.mail-ai-comparison').hidden=false;
    dialog.querySelector('[data-ai-apply]').hidden=false;b.hidden=true;
    status.textContent='Proposition prête. Vous pouvez la modifier ou garder votre texte.';
   }
   if(b.hasAttribute('data-ai-apply')&&proposal){
    const current=mailRows(p).find(r=>r.draft.id===id);
    if(!current||!mailCanEdit(p,current.draft)||current.draft.currentSignature!==signature||mailTextSnapshot(current.draft)!==before)throw Error('Le projet ou le brouillon a changé. Fermez puis relancez la rédaction pour repartir des bonnes informations.');
    const next={subject:dialog.querySelector('[data-ai-subject]').value.trim(),body:dialog.querySelector('[data-ai-body]').value.trim(),reminderBody:dialog.querySelector('[data-ai-reminder]').value.trim()};
    if(!next.subject||/[\r\n]/.test(next.subject)||!next.body)throw Error('Complétez l’objet et le message.');
    const d=mailRecord(current.draft),previous=structuredClone(d);
    if(row.draft.subject?.startsWith('[TEST ATELIER] ')&&!next.subject.startsWith('[TEST ATELIER] '))next.subject='[TEST ATELIER] '+next.subject;
    Object.assign(d,next,{signature,aiPrevious:{subject:d.subject,body:d.body,reminderBody:d.reminderBody},state:'À relire',aiAssisted:true});
    if(save()===false){Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,previous);throw Error('La sauvegarde a échoué. Le texte précédent est conservé.');}
    close();mailRefresh();toast('Proposition appliquée. Relisez et validez avant l’envoi.');
   }
  }catch(error){if(alive)status.textContent=error.message;}finally{busy=false;if(alive)b.disabled=false;}
 });document.body.append(dialog);dialog.showModal();
}
const aiPreviousMailRow=mailRowHTML;
mailRowHTML=function(p,row){
 let html=aiPreviousMailRow(p,row);
 if(!mailIsSent(row.draft)) {
  const issue=mailValidationError(row.draft,demoMode);
  const review=issue||((row.draft.state!=='Validé')?'Message à relire et à valider.':'Tout est prêt pour ce fournisseur.');
  const missing=[];if(!p.date)missing.push('Date du projet non renseignée');
  if(row.group?.pieces.some(x=>!x.size))missing.push('Certaines tailles ne sont pas renseignées');
  const checklist=`<div class="mail-preparation-check ${issue?'needs-attention':''}"><strong>${esc(review)}</strong>${missing.length?`<small>À préciser si nécessaire : ${missing.map(esc).join(' · ')}.</small>`:''}</div>`;
  html=html.replace('<div class="mail-row-grid">',checklist+'<div class="mail-row-grid">');
 }

 if(!mailCanEdit(p,row.draft))return html;
 const toolbar=`<div class="mail-ai-tools"><button data-mail-ai="${esc(row.draft.id)}">Proposer une rédaction IA</button>${row.draft.aiPrevious?`<button class="quiet" data-mail-ai-restore="${esc(row.draft.id)}">Revenir au texte précédent</button>`:''}<small>Facultatif · aucun envoi automatique</small></div>`;
 return html.replace('</summary><label>Objet', '</summary>'+toolbar+'<label>Objet');
};
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;
 if(b.dataset.mailAi)openMailAI(b.dataset.mailAi);
 if(b.dataset.mailAiRestore){try{updateMailDraft(b.dataset.mailAiRestore,d=>{if(!d.aiPrevious)return;const current={subject:d.subject,body:d.body,reminderBody:d.reminderBody};Object.assign(d,d.aiPrevious);d.aiPrevious=current;d.state='À relire';d.aiAssisted=false;});mailRefresh();}catch(error){toast(error.message);}}
});
const aiPreviousMessages=messages;
messages=function(p){
 const rows=mailRows(p),selected=rows.filter(r=>mailSelection.has(r.draft.id));
 const ready=selected.filter(r=>mailCanEdit(p,r.draft)&&r.draft.state==='Validé'&&!r.draft.stale&&!r.draft.orphan&&r.group?.key!=='unassigned'&&!mailValidationError(r.draft,demoMode));
 return `<div class="mail-preparation-path"><span>1 · Choisir les fournisseurs</span><span>2 · Relire chaque message</span><span>3 · Envoyer ou programmer</span></div><p class="note">${selected.length} fournisseur(s) coché(s) · ${ready.length} message(s) prêt(s)${selected.length>ready.length?' · Complétez les messages signalés ou décochez-les pour les traiter plus tard.':''}</p>`+aiPreviousMessages(p);
};
render();
