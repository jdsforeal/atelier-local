/** Préparation réversible : aucun enregistrement ni écrasement automatique de saisie. */
function productImportPanel(){return `<section class="product-import"><header class="import-heading"><span class="eyebrow">VOS INSPIRATIONS, EN UN GESTE</span><h3>Préparer votre pièce</h3><p>Un lien ou une capture suffit pour commencer. Vous gardez la main sur chaque information.</p></header><div class="import-source-grid"><section class="import-source-card"><span class="import-source-number" aria-hidden="true">↗</span><h4>Depuis une boutique</h4><p>Retrouvez les informations et les photos de la fiche produit.</p><div class="product-import-entry"><input type="url" data-product-url placeholder="Coller le lien du produit…" aria-label="Lien de la fiche produit"><button type="button" data-product-analyse>Analyser le lien</button></div></section><section class="import-source-card"><span class="import-source-number" aria-hidden="true">▧</span><h4>Depuis une capture</h4><p>Le nom et le prix sont lus avant de recadrer votre image.</p><div class="product-import-capture"><label><span class="sr-only">Capture de la fiche produit</span><input type="file" data-product-capture aria-label="Choisir une capture du produit" accept="image/png,image/jpeg,image/webp"></label><button type="button" data-product-read-capture>Lire la capture</button></div></section></div><div data-product-preview aria-live="polite"></div><footer class="import-more"><span>Plusieurs pièces à ajouter ?</span><button type="button" data-batch-import-launch>Ouvrir l’import par lot <span aria-hidden="true">↗</span></button></footer></section>`;}
const productImports=new WeakMap();
function productEmptyField(input){return input&&!input.disabled&&!input.dataset.userEntered&&(!input.value.trim()||(input.hasAttribute('data-money-field')&&Number(input.value.replace(',','.'))===0));}
function productFieldReady(form,key){const input=form.elements[key];return key==='category'&&typeof supplierEditingPieceId!=='undefined'&&!supplierEditingPieceId&&!input?.dataset.userEntered?true:productEmptyField(input);}
function previewProduct(panel,data){
 const form=panel.closest('form'),preview=panel.querySelector('[data-product-preview]');
 const fields=[['name','Nom de la pièce',data.name],['brand','Marque',data.brand],['category','Catégorie proposée',data.category||''],['supplierName','Boutique / fournisseur à vérifier',data.supplier],['price','Prix relevé (€)',data.currency==='EUR'&&data.price!==null?String(data.price).replace('.',','):''],['note','Description',data.description],['url','Lien officiel',data.url]];
 const state={data,fields};productImports.set(panel,state);
 preview.innerHTML=`<p class="product-import-notice"><strong>${data.source==='capture'?'Capture lue · à vérifier':data.source==='url'?'Lecture limitée · informations du lien uniquement':data.reason==='partial'?'Fiche partiellement récupérée':'Fiche boutique récupérée'}</strong><br>${esc(data.notice)}${data.url?` <a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche boutique ↗</a>`:''}</p><div class="product-import-fields">${fields.filter(([, ,value])=>value!=='').map(([key,label,value])=>`<label class="product-import-check"><input type="checkbox" data-product-field="${key}" ${productFieldReady(form,key)?'checked':''}><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${!productFieldReady(form,key)?'<small>Déjà renseigné : cochez pour remplacer.</small>':''}</span></label>`).join('')}</div>${data.capturePreview?`<label class="product-import-check"><input type="checkbox" data-product-use-capture checked><span><img src="${esc(data.capturePreview)}" alt="Capture à utiliser pour la pièce" style="max-width:140px;max-height:180px;object-fit:contain">Utiliser aussi cette capture comme photo (cadrage à l’enregistrement)</span></label>`:''}${data.images.length?`<fieldset class="product-import-photos"><legend>Photos du produit — facultatives</legend><p>Cochez les vues à conserver. Sans sélection, votre image reste inchangée.</p><label>Photo principale, si elle est cochée<select data-product-cover>${data.images.map((url,index)=>`<option value="${index}">Photo ${index+1}</option>`).join('')}</select></label><div>${data.images.map((url,index)=>`<label><input type="checkbox" data-product-photo value="${index}"><img src="${esc(url)}" referrerpolicy="no-referrer" loading="lazy" alt="Photo proposée ${index+1}" onerror="this.hidden=true"><span>Photo ${index+1}</span></label>`).join('')}</div></fieldset>`:data.capturePreview?'<p class="note">Le texte a été lu avant tout rognage. Vérifiez les informations proposées.</p>':'<p class="note">Aucune photo récupérée. Vous pouvez ajouter une capture ou une image dans la fiche.</p>'}<button type="button" class="primary" data-product-apply>Utiliser les informations cochées</button>`;
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
async function analyseProduct(panel){
 const raw=panel.querySelector('[data-product-url]').value;
 const button=panel.querySelector('[data-product-analyse]');button.disabled=true;button.textContent='Lecture de la boutique…';
 const token=Symbol();productImports.set(panel,{token});panel.querySelector('[data-product-preview]').textContent='Lecture en cours…';
 try{const data=await requestProductImport(raw);if(panel.isConnected&&productImports.get(panel)?.token===token&&panel.querySelector('[data-product-url]').value===raw)previewProduct(panel,data);}
 finally{button.disabled=false;button.textContent='Analyser le lien';}
}
async function analyseProductCapture(panel){
 const file=panel.querySelector('[data-product-capture]').files[0];if(!file)throw Error('Choisissez une capture à lire.');
 const button=panel.querySelector('[data-product-read-capture]'),token=Symbol();productImports.set(panel,{token});button.disabled=true;
 const preview=panel.querySelector('[data-product-preview]');let worker,cancelled=false;const linkButton=panel.querySelector('[data-product-analyse]');linkButton.disabled=true;const modal=panel.closest('dialog');const observer=new MutationObserver(()=>{if(!panel.isConnected||(modal&&!modal.open)){cancelled=true;productImports.delete(panel);void worker?.terminate();}});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 try{preview.textContent='Préparation de la lecture locale…';worker=await createAtelierOCR(message=>{if(panel.isConnected&&productImports.get(panel)?.token===token)preview.textContent=message.status==='recognizing text'?'Lecture du texte '+Math.round((message.progress||0)*100)+' %':'Préparation de la lecture locale…';});if(cancelled)return;const result=await readAtelierCapture(worker,file);const raw=panel.querySelector('[data-product-url]').value;let context={};try{if(raw)context=productFromURL(raw);}catch{}
 const data=batchOCRProposal(result.text,result.confidence,context);data.captureFile=file;data.capturePreview=await baseImageImport(file);
 if(panel.isConnected&&productImports.get(panel)?.token===token)previewProduct(panel,data);
 }catch(error){if(!cancelled)throw error;}finally{observer.disconnect();button.disabled=false;linkButton.disabled=false;await worker?.terminate();}
}
document.addEventListener('input',event=>{if(event.target.closest('#fields')&&event.target.matches('input[name],textarea[name],select[name]')&&event.isTrusted)event.target.dataset.userEntered='1';});
document.addEventListener('click',event=>{
 const capture=event.target.closest('[data-product-read-capture]');if(capture)void analyseProductCapture(capture.closest('.product-import')).catch(error=>toast(error.message));
 const analyse=event.target.closest('[data-product-analyse]'),apply=event.target.closest('[data-product-apply]');
 if(analyse){void analyseProduct(analyse.closest('.product-import')).catch(error=>toast(error.message));}
 if(apply){
  const panel=apply.closest('.product-import'),state=productImports.get(panel),form=panel.closest('form');if(!state?.fields)return;
  for(const [key,,value] of state.fields){if(!panel.querySelector(`[data-product-field="${key}"]`)?.checked)continue;const input=form.elements[key];if(!input||input.disabled)continue;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
  if(state.data.captureFile&&panel.querySelector('[data-product-use-capture]')?.checked&&form.elements.piecePhoto){const transfer=new DataTransfer();transfer.items.add(state.data.captureFile);form.elements.piecePhoto.files=transfer.files;form.elements.piecePhoto.dispatchEvent(new Event('change',{bubbles:true}));}
  const photos=[...panel.querySelectorAll('[data-product-photo]:checked')].map(input=>state.data.images[Number(input.value)]).filter(Boolean);
  const cover=state.data.images[Number(panel.querySelector('[data-product-cover]')?.value)];if(photos.includes(cover)){photos.splice(photos.indexOf(cover),1);photos.unshift(cover);}
  if(photos.length&&form.elements.imageUrl){form.elements.imageUrl.value=photos[0];form.elements.imageUrl.dataset.userEntered='1';form.dataset.productImages=JSON.stringify(photos);}
  panel.querySelector('[data-product-preview]').innerHTML='<p role="status">Informations ajoutées à la fiche. Vérifiez-les puis enregistrez la pièce.</p>';productImports.delete(panel);
 }
});
