/** Préparation réversible : aucun enregistrement ni écrasement automatique de saisie. */
function productImportPanel(){return `<section class="product-import"><div><span class="eyebrow">MOINS DE SAISIE</span><h3>Ajouter depuis un lien</h3><p>Collez la fiche de la boutique pour préparer les informations de la pièce.</p></div><div class="product-import-entry"><input type="url" data-product-url placeholder="https://…" aria-label="Lien de la fiche produit"><button type="button" data-product-analyse>Analyser le lien</button></div><div data-product-preview aria-live="polite"></div></section>`;}
const productImports=new WeakMap();
function productEmptyField(input){return input&&!input.disabled&&!input.dataset.userEntered&&(!input.value.trim()||(input.hasAttribute('data-money-field')&&Number(input.value.replace(',','.'))===0));}
function previewProduct(panel,data){
 const form=panel.closest('form'),preview=panel.querySelector('[data-product-preview]');
 const fields=[['name','Nom de la pièce',data.name],['brand','Marque',data.brand],['supplierName','Boutique / fournisseur à vérifier',data.supplier],['price','Prix relevé (€)',data.currency==='EUR'&&data.price!==null?String(data.price).replace('.',','):''],['note','Description',data.description],['url','Lien officiel',data.url]];
 const state={data,fields};productImports.set(panel,state);
 preview.innerHTML=`<p class="product-import-notice"><strong>${data.source==='url'?'Lecture limitée · informations du lien uniquement':data.reason==='partial'?'Fiche partiellement récupérée':'Fiche boutique récupérée'}</strong><br>${esc(data.notice)} <a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche boutique ↗</a></p><div class="product-import-fields">${fields.filter(([, ,value])=>value!=='').map(([key,label,value])=>`<label class="product-import-check"><input type="checkbox" data-product-field="${key}" ${productEmptyField(form.elements[key])?'checked':''}><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${!productEmptyField(form.elements[key])?'<small>Déjà renseigné : cochez pour remplacer.</small>':''}</span></label>`).join('')}</div>${data.images.length?`<fieldset class="product-import-photos"><legend>Photos du produit — facultatives</legend><p>Cochez les vues à conserver. Sans sélection, votre image reste inchangée.</p><label>Photo principale, si elle est cochée<select data-product-cover>${data.images.map((url,index)=>`<option value="${index}">Photo ${index+1}</option>`).join('')}</select></label><div>${data.images.map((url,index)=>`<label><input type="checkbox" data-product-photo value="${index}"><img src="${esc(url)}" referrerpolicy="no-referrer" loading="lazy" alt="Photo proposée ${index+1}" onerror="this.hidden=true"><span>Photo ${index+1}</span></label>`).join('')}</div></fieldset>`:'<p class="note">Aucune photo récupérée. Vous pouvez ajouter une capture ou une image dans la fiche.</p>'}<button type="button" class="primary" data-product-apply>Utiliser les informations cochées</button>`;
}
async function analyseProduct(panel){
 const raw=panel.querySelector('[data-product-url]').value;
 const fallback=productFromURL(raw),button=panel.querySelector('[data-product-analyse]');button.disabled=true;button.textContent='Lecture de la boutique…';
 const token=Symbol();productImports.set(panel,{token});panel.querySelector('[data-product-preview]').textContent='Lecture en cours…';
 let data=fallback;
 try{
   if(['127.0.0.1','localhost'].includes(location.hostname)){
     const response=await fetch('/api/product-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:fallback.url}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();data=await response.json();
   }else if(window.ATELIER_PRODUCT_IMPORT_ENABLED && cloudState?.client){
     const {data:sessionData}=await Promise.race([cloudState.client.auth.getSession(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Connexion indisponible')),10000))]);if(!sessionData.session)throw Error();
     const response=await fetch(window.ATELIER_CLOUD.url+'/functions/v1/product-import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionData.session.access_token,apikey:window.ATELIER_CLOUD.publishableKey},body:JSON.stringify({url:fallback.url}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error();data=await response.json();
   }else data.notice+=' La récupération complète des photos et prix est disponible dans le pilote local pour le moment.';
 }catch{data={...fallback,notice:fallback.notice+' La lecture complète est indisponible. Vous pouvez compléter avec une image.'};}
 finally{button.disabled=false;button.textContent='Analyser le lien';}
 if(!panel.isConnected||productImports.get(panel)?.token!==token||panel.querySelector('[data-product-url]').value!==raw)return;
 previewProduct(panel,data);
}
document.addEventListener('input',event=>{if(event.target.closest('#fields')&&event.target.matches('input[name],textarea[name],select[name]')&&event.isTrusted)event.target.dataset.userEntered='1';});
document.addEventListener('click',event=>{
 const analyse=event.target.closest('[data-product-analyse]'),apply=event.target.closest('[data-product-apply]');
 if(analyse){void analyseProduct(analyse.closest('.product-import')).catch(error=>toast(error.message));}
 if(apply){
  const panel=apply.closest('.product-import'),state=productImports.get(panel),form=panel.closest('form');if(!state?.fields)return;
  for(const [key,,value] of state.fields){if(!panel.querySelector(`[data-product-field="${key}"]`)?.checked)continue;const input=form.elements[key];if(!input||input.disabled)continue;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
  const photos=[...panel.querySelectorAll('[data-product-photo]:checked')].map(input=>state.data.images[Number(input.value)]).filter(Boolean);
  const cover=state.data.images[Number(panel.querySelector('[data-product-cover]')?.value)];if(photos.includes(cover)){photos.splice(photos.indexOf(cover),1);photos.unshift(cover);}
  if(photos.length&&form.elements.imageUrl){form.elements.imageUrl.value=photos[0];form.elements.imageUrl.dataset.userEntered='1';form.dataset.productImages=JSON.stringify(photos);}
  panel.querySelector('[data-product-preview]').innerHTML='<p role="status">Informations ajoutées à la fiche. Vérifiez-les puis enregistrez la pièce.</p>';productImports.delete(panel);
 }
});
