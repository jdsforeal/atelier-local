/** Un même import visuel pour toutes les images, sans changer les formulaires métier. */
function validateImageUpload(files, multiple) {
  if (!multiple && files.length > 1) return 'Déposez une seule image ici.';
  if (files.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type))) return 'Choisissez uniquement des images JPEG, PNG ou WebP.';
  if (files.some(file => file.size > 10000000)) return 'Chaque image doit faire moins de 10 Mo.';
  return '';
}
const imageUploadStates = new Map();
function refreshImageUpload(input) {
  const state=imageUploadStates.get(input);if(!state)return;
  state.urls.forEach(url=>URL.revokeObjectURL(url));state.urls=[];
  state.previews.replaceChildren();
  const files=Array.from(input.files||[]);
  state.title.textContent=files.length?`${files.length} image${files.length>1?'s':''} prête${files.length>1?'s':''}`:input.multiple?'Glissez vos images ici':'Glissez votre image ici';
  state.hint.textContent=files.length?'Cliquez pour remplacer la sélection':'ou cliquez pour parcourir vos fichiers';
  state.clear.hidden=!files.length;state.browse.textContent=files.length?'Changer la sélection':input.multiple?'Choisir des images':'Choisir une image';
  for(const file of files.slice(0,8)){
    const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
    const url=URL.createObjectURL(file);state.urls.push(url);img.src=url;img.alt='Aperçu de '+file.name;
    caption.textContent=file.name;figure.append(img,caption);state.previews.append(figure);
  }
  if(files.length>8){const extra=document.createElement('span');extra.textContent=`+ ${files.length-8} images`;state.previews.append(extra);}
}
function enhanceImageUploads() {
  for(const [input,state] of imageUploadStates){if(!input.isConnected){state.urls.forEach(url=>URL.revokeObjectURL(url));imageUploadStates.delete(input);}}
  document.querySelectorAll('input[type="file"][accept*="image/"]').forEach(input=>{
    if(imageUploadStates.has(input)||(input.accept||'').includes('application/pdf'))return;
    const zone=document.createElement('div');zone.className='image-upload-zone';
    const icon=document.createElement('span');icon.className='image-upload-icon';icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg>';
    const title=document.createElement('strong'),hint=document.createElement('span'),formats=document.createElement('small'),browse=document.createElement('span');browse.className='image-upload-browse';browse.setAttribute('aria-hidden','true');
    formats.textContent=`JPEG, PNG, WebP · 10 Mo maximum${input.multiple?' par image · sélection multiple':''}`;
    const previews=document.createElement('div');previews.className='image-upload-previews';
    const error=document.createElement('p');error.className='image-upload-error';error.setAttribute('role','alert');error.hidden=true;
    const clear=document.createElement('button');clear.type='button';clear.className='image-upload-clear';clear.textContent='Retirer la sélection';clear.hidden=true;
    input.before(zone);zone.append(icon,title,hint,browse,formats,input);zone.after(previews,error,clear);
    input.classList.add('image-upload-input');
    imageUploadStates.set(input,{title,hint,browse,previews,error,clear,urls:[]});
    const showError=message=>{error.textContent=message;error.hidden=!message;};
    input.addEventListener('change',()=>{
      const message=validateImageUpload(Array.from(input.files||[]),input.multiple);
      if(message)input.value='';showError(message);refreshImageUpload(input);
    });
    clear.addEventListener('click',event=>{event.preventDefault();input.value='';showError('');input.dispatchEvent(new Event('change',{bubbles:true}));});
    ['dragenter','dragover'].forEach(type=>zone.addEventListener(type,event=>{event.preventDefault();zone.classList.add('is-dragging');if(event.dataTransfer)event.dataTransfer.dropEffect='copy';}));
    zone.addEventListener('dragleave',event=>{if(!zone.contains(event.relatedTarget))zone.classList.remove('is-dragging');});
    zone.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();zone.classList.remove('is-dragging');
      const files=Array.from(event.dataTransfer?.files||[]);if(!files.length)return showError('Déposez un fichier image depuis votre appareil.');
      const message=validateImageUpload(files,input.multiple);if(message)return showError(message);
      const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    refreshImageUpload(input);
  });
}
new MutationObserver(enhanceImageUploads).observe(document.body,{childList:true,subtree:true});
enhanceImageUploads();
