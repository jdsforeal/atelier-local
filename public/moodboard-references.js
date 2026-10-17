/** Deux espaces créatifs et documents déjà composés, sans les transformer en pièces. */
let activeMoodKind = 'stylisme';
function moodKindLabel(kind) { return kind === 'da' ? 'Direction artistique' : 'Stylisme'; }
function moodReferenceMarkup(p, kind) {
 const docs=(p.moodDocuments||[]).filter(d=>d.kind===kind);
 return docs.map(d=>`<article class="mood-reference"><div class="section-head"><div><small>${esc(moodKindLabel(kind))} · ${d.type==='application/pdf'?'PDF':'Planche importée'}</small><h3>${esc(d.name)}</h3>${d.author?`<p class="note">${esc(d.author)}</p>`:''}</div><div class="actions"><button data-mood-document="${esc(d.id)}">Ouvrir</button>${editableVisualProject(p)?`<button class="quiet" data-mood-document-remove="${esc(d.id)}">Retirer</button>`:''}</div></div>${d.type==='application/pdf'?'<p class="note">Document original conservé · cliquez sur Ouvrir pour consulter toutes ses pages.</p>':`<button class="mood-reference-image" data-mood-document="${esc(d.id)}"><img src="${esc(d.data)}" alt="${esc(d.name)}"></button>`}</article>`).join('');
}
function importFinishedMoodboard() {
 const p=project();if(!editableVisualProject(p))return;
 modal('Importer un moodboard existant',field('name','Titre de la planche','text','')+field('kind','Espace','select',activeMoodKind,[['stylisme','Stylisme'],['da','Direction artistique']])+field('author','Auteur / équipe — facultatif','text','')+'<label>Planche ou document<input type="file" name="moodDocument" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><p class="note">PDF, JPEG, PNG ou WebP · 3 Mo maximum. La composition est conservée telle quelle, sans analyse ni recadrage.</p>',async(data,form)=>{
  if(!editableVisualProject(p))throw Error('Vos droits de modification ont changé.');
  const file=form.elements.moodDocument.files[0];
  if(!file||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)throw Error('Choisissez un PDF ou une image de 3 Mo maximum.');
  if(file.type==='application/pdf'&&!new TextDecoder().decode(await file.slice(0,5).arrayBuffer()).startsWith('%PDF-'))throw Error('Ce fichier n’est pas un PDF valide.');
  const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Le fichier ne peut pas être lu.'));reader.readAsDataURL(file);});
  const previous=p.moodDocuments||[];
  // Limite le volume du projet, notamment dans la sauvegarde locale.
  if(previous.reduce((n,d)=>n+d.data.length,0)+encoded.length>12*1024*1024)throw Error('Ce projet contient déjà plusieurs documents volumineux. Réduisez la taille du fichier.');
  const next=[...previous,{id:uid(),kind:data.kind==='da'?'da':'stylisme',name:data.name.trim()||file.name,author:data.author.trim(),type:file.type,data:encoded}];
  p.moodDocuments=next;
  try{if(save()===false)throw Error('La sauvegarde a échoué. Réduisez la taille du fichier.');}catch(error){p.moodDocuments=previous;throw error;}
  activeMoodKind=data.kind==='da'?'da':'stylisme';
 });
}
function showMoodDocument(id){
 const d=(project()?.moodDocuments||[]).find(d=>d.id===id);if(!d)return;
 if(!/^data:(application\/pdf|image\/(jpeg|png|webp));base64,/.test(d.data)&&!(d.type.startsWith('image/')&&productPublicURL(d.data)))return toast('Ce document est indisponible.');
 const dialog=document.createElement('dialog');dialog.className='mood-document-dialog';
 dialog.innerHTML=`<div class="section-head"><h2>${esc(d.name)}</h2><button aria-label="Fermer le document">✕</button></div><div class="mood-document-content"></div>`;
 const content=dialog.querySelector('.mood-document-content');let url;
 if(d.type==='application/pdf'){
  const raw=atob(d.data.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');link.href=url;link.download=d.name.endsWith('.pdf')?d.name:d.name+'.pdf';link.textContent='Télécharger le PDF original';content.append(link);
  const note=document.createElement('p');note.className='note';note.textContent='Si votre navigateur ne propose pas l’aperçu PDF, téléchargez le document pour l’ouvrir.';content.append(note);
  const frame=document.createElement('iframe');frame.title=d.name;frame.src=url;content.append(frame);
 }else{const img=document.createElement('img');img.src=d.data;img.alt=d.name;content.append(img);}
 const close=()=>{dialog.close();dialog.remove();if(url)URL.revokeObjectURL(url);};dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();
}
const referenceMoodMarkup=moodboardMarkup;
moodboardMarkup=function(p){
 const html=referenceMoodMarkup(p);const root=document.createElement('div');root.innerHTML=html;
 const toolbar=root.querySelector('.moodboard-toolbar');
 const nav=document.createElement('div');nav.className='mood-kind-navigation';nav.innerHTML=['stylisme','da'].map(kind=>`<button class="${activeMoodKind===kind?'primary':''}" data-mood-kind="${kind}" aria-pressed="${activeMoodKind===kind}">${moodKindLabel(kind)}</button>`).join('');toolbar.after(nav);
 if(editableVisualProject(p))toolbar.querySelector('.actions').insertAdjacentHTML('afterbegin','<button data-mood-finished>Importer un moodboard existant</button>');
 root.querySelectorAll('.editorial-board > figure').forEach((figure,index)=>{if((p.boards[index].kind||'stylisme')!==activeMoodKind)figure.remove();});
 const list=document.createElement('section');list.className='mood-reference-list';list.innerHTML=moodReferenceMarkup(p,activeMoodKind);nav.after(list);
 const heading=toolbar.querySelector('h2');heading.textContent=moodKindLabel(activeMoodKind);
 const count=(p.boards||[]).filter(b=>(b.kind||'stylisme')===activeMoodKind).length;
 toolbar.querySelector('p').textContent=`${count} inspiration(s) · ${(p.moodDocuments||[]).filter(d=>d.kind===activeMoodKind).length} document(s) importé(s)`;
 const pdf=toolbar.querySelector('[data-export-moodboard]');if(pdf)pdf.disabled=!(p.boards||[]).some(b=>(b.kind||'stylisme')===activeMoodKind&&b.image);
 if(activeMoodKind==='da')root.querySelector('[data-board-selection]')?.remove();
 root.querySelector('.empty')?.remove();
 root.querySelector('.editorial-board')?.insertAdjacentHTML('beforebegin',`<p class="note">${activeMoodKind==='da'?'Univers visuel, lumière, décors et intentions de la direction artistique.':'Silhouettes, vêtements, accessoires et intentions de stylisme.'}</p>`);
 return root.innerHTML;
};
const referenceDrawPages=drawMoodboardPages;
drawMoodboardPages=function(p){const kind=tab==='mood'?activeMoodKind:'stylisme';const boards=(p.boards||[]).filter(b=>(b.kind||'stylisme')===kind&&b.image);if(!boards.length)return Promise.reject(Error('Aucune inspiration illustrée dans cet espace. Les moodboards importés se consultent séparément.'));return referenceDrawPages({...p,boards});};
const referenceRender=render;
render=function(){referenceRender();if(view!=='detail')return;const p=project();if(tab==='overview'&&(p.moodDocuments||[]).length){const panel=document.querySelector('.overview-inspiration');panel?.insertAdjacentHTML('beforeend',`<details class="overview-brief"><summary>Moodboards importés · stylisme & direction artistique</summary>${moodReferenceMarkup(p,'stylisme')}${moodReferenceMarkup(p,'da')}</details>`);}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.moodKind){activeMoodKind=b.dataset.moodKind;render();}
 if(b.hasAttribute('data-mood-finished'))importFinishedMoodboard();
 if(b.dataset.moodDocument)showMoodDocument(b.dataset.moodDocument);
 if(b.dataset.moodDocumentRemove){const p=project();if(!editableVisualProject(p))return;const previous=p.moodDocuments;p.moodDocuments=previous.filter(d=>d.id!==b.dataset.moodDocumentRemove);if(save()===false){p.moodDocuments=previous;return toast('La sauvegarde a échoué.');}render();}
});
render();
