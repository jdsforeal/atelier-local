/** Préparation réversible : aucun enregistrement ni écrasement automatique de saisie. */
function productImportPanel(){return `<section class="product-import-launch"><div><span class="eyebrow">AJOUT RAPIDE</span><strong>Préremplir depuis un lien ou une image</strong><p>Analysez, choisissez les informations, puis complétez cette fiche.</p></div><button type="button" data-product-open>Analyser une pièce <span aria-hidden="true">↗</span></button><button type="button" class="quiet" data-batch-import-launch>Plusieurs liens / images</button><div data-product-applied role="status" hidden></div></section>`;}
const productImportForms=new WeakMap();
let activeProductAnalysis;
function openProductAnalysis(launcher){
 if(activeProductAnalysis)return;
 const form=launcher.closest('form');if(!form)return;
 const dialog=document.createElement('dialog');dialog.className='product-analysis-dialog';dialog.setAttribute('aria-labelledby','product-analysis-title');
 dialog.innerHTML=`<div class="analysis-heading"><div><span class="eyebrow" data-analysis-step>1 · VOS SOURCES</span><h2 id="product-analysis-title" tabindex="-1">Préparer une pièce</h2><p data-analysis-intro>Un lien, une image, ou les deux pour le même produit.</p></div><button type="button" data-analysis-close aria-label="Fermer l’analyse">✕</button></div><section class="product-import analysis-panel"><div data-analysis-sources><div class="analysis-source-tabs" role="group" aria-label="Sources à analyser"><button type="button" data-analysis-mode="link" aria-pressed="true">Lien</button><button type="button" data-analysis-mode="image" aria-pressed="false">Image</button><button type="button" data-analysis-mode="both" aria-pressed="false">Lien + image</button></div><div class="import-source-grid"><section class="import-source-card" data-analysis-link><h3>Le lien du produit</h3><p>Collez la fiche de la boutique.</p><input type="url" data-product-url placeholder="https://…" aria-label="Lien de la fiche produit"></section><section class="import-source-card" data-analysis-image hidden><h3>Votre image</h3><p>Une capture avec le nom et le prix permet de lire les informations.</p><label><span class="sr-only">Image du produit</span><input type="file" data-product-capture aria-label="Choisir une image du produit" accept="image/png,image/jpeg,image/webp"></label></section></div><p class="analysis-privacy">Vous vérifierez les propositions avant de les reporter dans la fiche.</p></div><p data-analysis-status role="status" hidden></p><p data-analysis-error role="alert" hidden></p><div data-product-preview aria-live="polite"></div></section><div class="analysis-footer"><button type="button" data-analysis-back hidden>Modifier les sources</button><button type="button" data-analysis-cancel>Annuler</button><button type="button" class="primary" data-analysis-run>Analyser</button></div>`;
 const panel=dialog.querySelector('.analysis-panel');productImportForms.set(panel,form);
 const state={dialog,panel,launcher,form,mode:'link',busy:false,alive:true,worker:null};activeProductAnalysis=state;
 const close=()=>{state.alive=false;void state.worker?.terminate().catch(()=>{});productImports.delete(panel);productImportForms.delete(panel);dialog.close();dialog.remove();activeProductAnalysis=null;launcher.querySelector('[data-product-open]')?.focus();};state.close=close;
 const setMode=mode=>{state.mode=mode;dialog.querySelector('[data-analysis-link]').hidden=mode==='image';dialog.querySelector('[data-analysis-image]').hidden=mode==='link';dialog.querySelector('.import-source-grid').classList.toggle('analysis-both',mode==='both');dialog.querySelectorAll('[data-analysis-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.analysisMode===mode)));};
 const status=message=>{if(!state.alive)return;const el=dialog.querySelector('[data-analysis-status]');el.hidden=!message;el.textContent=message;};
 async function analyse(){
  if(state.busy)return;
  const raw=panel.querySelector('[data-product-url]').value.trim(),file=panel.querySelector('[data-product-capture]').files[0];
  const error=dialog.querySelector('[data-analysis-error]');error.hidden=true;
  try{
   if(state.mode!=='image'&&!raw)throw Error('Collez le lien du produit pour continuer.');
   if(state.mode!=='image')productFromURL(raw);
   if(state.mode!=='link'&&!file)throw Error('Ajoutez une image pour continuer.');
   if(state.mode!=='link'){const invalid=validateImageUpload([file],false);if(invalid)throw Error(invalid);}
   state.busy=true;dialog.querySelectorAll('input,button:not([data-analysis-close]):not([data-analysis-cancel])').forEach(el=>el.disabled=true);status('Lecture en cours…');
   let link,capture;
   if(state.mode!=='image')link=await requestProductImport(raw);
   if(!state.alive)return;
   if(state.mode!=='link'){
    try{state.worker=await createAtelierOCR(message=>status(message.status==='recognizing text'?'Lecture de l’image · '+Math.round((message.progress||0)*100)+' %':'Préparation de la lecture de l’image…'));if(!state.alive)return;const result=await readAtelierCapture(state.worker,file);capture=batchOCRProposal(result.text,result.confidence,link||{});}
    catch(readError){if(!state.alive)return;capture={notice:readError.message+' Vous pouvez conserver l’image et compléter la fiche.',images:[],price:null};}
   }
   if(!state.alive)return;
   const data={...batchCombine(link,capture),currency:'EUR',source:link?.source||'capture',reason:link?.reason};
   if(file&&state.mode!=='link'){data.captureFile=file;data.capturePreview=await baseImageImport(file);}
   if(!state.alive)return;
   previewProduct(panel,data);dialog.querySelector('[data-analysis-sources]').hidden=true;dialog.querySelector('[data-analysis-step]').textContent='2 · VÉRIFIEZ LES PROPOSITIONS';dialog.querySelector('#product-analysis-title').textContent='Que souhaitez-vous conserver ?';dialog.querySelector('[data-analysis-intro]').textContent='Cochez les informations et les photos utiles. Le reste de votre fiche est conservé.';dialog.querySelector('[data-analysis-run]').hidden=true;dialog.querySelector('[data-analysis-back]').hidden=false;
   const apply=panel.querySelector('[data-product-apply]');dialog.querySelector('.analysis-footer').append(apply);apply.textContent='Reporter dans la fiche';status('');dialog.scrollTop=0;dialog.querySelector('#product-analysis-title').focus({preventScroll:true});
  }catch(cause){if(state.alive){error.hidden=false;error.textContent=cause.message;status('');}}
  finally{state.busy=false;await state.worker?.terminate().catch(()=>{});state.worker=null;if(state.alive)dialog.querySelectorAll('input,button').forEach(el=>el.disabled=false);}
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.matches('[data-analysis-close],[data-analysis-cancel]'))return close();if(state.busy)return;if(button.dataset.analysisMode)setMode(button.dataset.analysisMode);if(button.hasAttribute('data-analysis-run'))void analyse();if(button.hasAttribute('data-analysis-back')){productImports.delete(panel);dialog.querySelector('[data-product-preview]').replaceChildren();dialog.querySelector('[data-product-apply]')?.remove();dialog.querySelector('[data-analysis-sources]').hidden=false;dialog.querySelector('[data-analysis-step]').textContent='1 · VOS SOURCES';dialog.querySelector('#product-analysis-title').textContent='Préparer une pièce';dialog.querySelector('[data-analysis-intro]').textContent='Un lien, une image, ou les deux pour le même produit.';dialog.querySelector('[data-analysis-run]').hidden=false;button.hidden=true;}});
 dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-product-url]')){event.preventDefault();void analyse();}});
 dialog.addEventListener('paste',event=>{const files=[...event.clipboardData?.files||[]];if(state.busy||!files.length)return;const invalid=validateImageUpload(files,false);event.preventDefault();if(invalid){const el=dialog.querySelector('[data-analysis-error]');el.textContent=invalid;el.hidden=false;return;}setMode(panel.querySelector('[data-product-url]').value.trim()?'both':'image');const input=panel.querySelector('[data-product-capture]'),transfer=new DataTransfer();transfer.items.add(files[0]);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 document.body.append(dialog);dialog.showModal();
 const existing=form.elements.url?.value;if(existing)panel.querySelector('[data-product-url]').value=existing;
}

const productImports=new WeakMap();
function productEmptyField(input){return input&&!input.disabled&&!input.dataset.userEntered&&(!input.value.trim()||(input.hasAttribute('data-money-field')&&Number(input.value.replace(',','.'))===0));}
function productFieldReady(form,key){const input=form.elements[key];return key==='category'&&typeof supplierEditingPieceId!=='undefined'&&!supplierEditingPieceId&&!input?.dataset.userEntered?true:productEmptyField(input);}
function previewProduct(panel,data){
 const form=productImportForms.get(panel)||panel.closest('form'),preview=panel.querySelector('[data-product-preview]');
 const fields=[['name','Nom de la pièce',data.name],['brand','Marque',data.brand],['category','Catégorie proposée',data.category||''],['supplierName','Boutique / fournisseur à vérifier',data.supplier],['price','Prix boutique (€) · TVA à confirmer',data.currency==='EUR'&&data.price!==null?String(data.price).replace('.',','):''],['note','Description',data.description],['url','Lien officiel',data.url]];
 const state={data,fields};productImports.set(panel,state);
 preview.innerHTML=`<p class="product-import-notice"><strong>${data.source==='capture'?'Capture lue · à vérifier':data.source==='url'?'Lecture limitée · informations du lien uniquement':data.reason==='partial'?'Fiche partiellement récupérée':'Fiche boutique récupérée'}</strong><br>${esc(data.notice)}${data.url?` <a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche boutique ↗</a>`:''}</p><div class="product-import-fields">${fields.filter(([, ,value])=>value!=='').map(([key,label,value])=>`<label class="product-import-check"><input type="checkbox" data-product-field="${key}" ${productFieldReady(form,key)?'checked':''}><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${!productFieldReady(form,key)?'<small>Déjà renseigné : cochez pour remplacer.</small>':''}</span></label>`).join('')}</div>${data.taxEvidence&&!data.taxEvidence.conflict&&(data.taxEvidence.basis!=='unknown'||data.taxEvidence.rate!==null)?`<label class="product-import-check"><input type="checkbox" data-product-tax><span>TVA proposée : ${esc(data.taxEvidence.basis==='unknown'?'Base à confirmer':data.taxEvidence.basis)} · ${esc(data.taxEvidence.rate??'taux inconnu')} %<small>${esc(data.taxEvidence.excerpt)} — à confirmer sur la facture.</small></span></label>`:''}${data.capturePreview?`<label class="product-import-check"><input type="checkbox" data-product-use-capture ${data.images.length?'':'checked'}><span><img src="${esc(data.capturePreview)}" alt="Capture à utiliser pour la pièce" style="max-width:140px;max-height:180px;object-fit:contain">Utiliser cette image comme photo principale (cadrage à l’enregistrement)</span></label>`:''}${data.images.length?`<fieldset class="product-import-photos"><legend>Photos du produit — facultatives</legend><p>Cochez les vues à conserver. Sans sélection, votre image reste inchangée.</p><label>Photo principale, si elle est cochée<select data-product-cover>${data.images.map((url,index)=>`<option value="${index}">Photo ${index+1}</option>`).join('')}</select></label><div>${data.images.map((url,index)=>`<label><input type="checkbox" data-product-photo value="${index}"><img src="${esc(url)}" referrerpolicy="no-referrer" loading="lazy" alt="Photo proposée ${index+1}" onerror="this.hidden=true"><span>Photo ${index+1}</span></label>`).join('')}</div></fieldset>`:data.capturePreview?'<p class="note">Le texte a été lu avant tout rognage. Vérifiez les informations proposées.</p>':'<p class="note">Aucune photo récupérée. Vous pouvez ajouter une capture ou une image dans la fiche.</p>'}<button type="button" class="primary" data-product-apply>Utiliser les informations cochées</button>`;
}
async function requestProductImport(raw){
 const fallback=productFromURL(raw);
 let data=fallback;
 try{
   if(['127.0.0.1','localhost'].includes(location.hostname)){
     const response=await fetch('/api/product-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:fallback.url}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();data=await response.json();
   }else if(window.ATELIER_PRODUCT_IMPORT_ENABLED && cloudState?.client){
     const {data:sessionData}=await Promise.race([cloudState.client.auth.getSession(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Connexion indisponible')),10000))]);if(!sessionData.session)throw Error();
     const response=await fetch(window.ATELIER_CLOUD.url+'/functions/v1/product-import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionData.session.access_token,apikey:window.ATELIER_CLOUD.publishableKey},body:JSON.stringify({url:fallback.url}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();data=await response.json();
   }else data.notice+=' La récupération complète des photos et prix est disponible dans le pilote local pour le moment.';
 }catch{data={...fallback,notice:fallback.notice+' La lecture complète est indisponible. Vous pouvez compléter avec une image.'};}

 if(typeof batchCategory==='function')data.category=batchCategory(data.name);
 return data;
}
document.addEventListener('input',event=>{if(event.target.closest('#fields')&&event.target.matches('input[name],textarea[name],select[name]')&&event.isTrusted)event.target.dataset.userEntered='1';});
document.addEventListener('click',event=>{
 const open=event.target.closest('[data-product-open]');if(open)openProductAnalysis(open.closest('.product-import-launch'));
 const apply=event.target.closest('[data-product-apply]');
 if(apply){
  const panel=apply.closest('.product-import')||apply.closest('.product-analysis-dialog')?.querySelector('.analysis-panel'),state=productImports.get(panel),form=productImportForms.get(panel)||panel.closest('form');if(!state?.fields)return;
  if(panel.querySelectorAll('[data-product-photo]:checked').length+(panel.querySelector('[data-product-use-capture]')?.checked?1:0)>8){const error=panel.querySelector('[data-analysis-error]');if(error){error.hidden=false;error.textContent='Conservez au maximum 8 photos pour cette pièce.';error.scrollIntoView({block:'nearest'});}return;}
  for(const [key,,value] of state.fields){if(!panel.querySelector(`[data-product-field="${key}"]`)?.checked)continue;const input=form.elements[key];if(!input||input.disabled)continue;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
  if(panel.querySelector('[data-product-field="price"]')?.checked&&form.elements.purchaseConfirmed){form.elements.purchaseConfirmed.checked=false;form.elements.purchaseBasis.value='unknown';form.elements.purchaseRate.value='';if(typeof purchaseTaxRefresh==='function')purchaseTaxRefresh(form);}
  if(panel.querySelector('[data-product-tax]')?.checked&&form.elements.purchaseBasis){const e=state.data.taxEvidence;form.elements.purchaseBasis.value=e.conflict?'unknown':e.basis;form.elements.purchaseRate.value=e.conflict?'':e.rate??'';form.elements.purchaseConfirmed.checked=false;purchaseTaxRefresh(form);}
  if(state.data.captureFile&&panel.querySelector('[data-product-use-capture]')?.checked&&form.elements.piecePhoto){delete form.dataset.productImages;const transfer=new DataTransfer();transfer.items.add(state.data.captureFile);form.elements.piecePhoto.files=transfer.files;const nameBefore=form.elements.name?.value;form.elements.piecePhoto.dispatchEvent(new Event('change',{bubbles:true}));if(form.elements.name)form.elements.name.value=nameBefore;}
  const photos=[...panel.querySelectorAll('[data-product-photo]:checked')].map(input=>state.data.images[Number(input.value)]).filter(Boolean);
  const cover=state.data.images[Number(panel.querySelector('[data-product-cover]')?.value)];if(photos.includes(cover)){photos.splice(photos.indexOf(cover),1);photos.unshift(cover);}
  if(photos.length&&form.elements.imageUrl){if(!panel.querySelector('[data-product-use-capture]')?.checked&&form.elements.piecePhoto){form.elements.piecePhoto.value='';form.elements.piecePhoto.dispatchEvent(new Event('change',{bubbles:true}));}form.elements.imageUrl.value=photos[0];form.elements.imageUrl.dataset.userEntered='1';form.dataset.productImages=JSON.stringify(photos);}
  if(activeProductAnalysis?.panel===panel){const message=activeProductAnalysis.launcher.querySelector('[data-product-applied]');message.hidden=false;const selected=[...(panel.querySelector('[data-product-use-capture]')?.checked?[state.data.capturePreview]:[]),...photos].filter(Boolean);message.innerHTML='<p>Informations reportées · vérifiez HTVA/TVAC et TVA dans la fiche avant enregistrement.</p>'+(selected.length?'<div class="analysis-transferred-photos">'+selected.map((url,i)=>'<img src="'+esc(url)+'" alt="Photo retenue '+(i+1)+'" referrerpolicy="no-referrer">').join('')+'</div>':'');activeProductAnalysis.close();}else{panel.querySelector('[data-product-preview]').innerHTML='<p role="status">Informations ajoutées à la fiche. Vérifiez-les puis enregistrez la pièce.</p>';productImports.delete(panel);}
 }
});
