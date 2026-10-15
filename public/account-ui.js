/** Compte lisible, identité du studio et invitations reçues visibles dans toute l'application. */
const invitationNotice = { userId: '', items: [], checked: false, error: false, busy: false, lastCheck: 0 };
const invitationBellIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
function studioAvatar(studio, size = '') {
  return `<span class="studio-avatar ${size}">${studio?.avatar ? `<img src="${esc(studio.avatar)}" alt="">` : esc((studio?.name || 'A').slice(0,1).toUpperCase())}</span>`;
}
function invitationCountLabel() {
  if (invitationNotice.error) return 'Invitations — vérification indisponible';
  return invitationNotice.checked ? `${invitationNotice.items.length} invitation${invitationNotice.items.length>1?'s':''} en attente` : 'Vérifier mes invitations';
}
function refreshInvitationBadges() {
  const count = invitationNotice.items.length;
  document.querySelectorAll('[data-invitation-count]').forEach(node=>{
    node.textContent = count || '';
    node.hidden = !count;
  });
  document.querySelectorAll('[data-notification-inbox]').forEach(button=>{
    button.setAttribute('aria-label',invitationCountLabel());
    button.title=invitationCountLabel();
  });
  const banner=document.querySelector('#invitation-notice');
  if(banner){
    banner.hidden=!count;
    banner.innerHTML=count?`<span><strong>${count} invitation${count>1?'s':''} à un projet</strong> vous attend${count>1?'ent':''}.</span><button class="primary" data-notification-inbox>Voir ${count>1?'les invitations':'l’invitation'}</button>`:'';
  }
  const status=document.querySelector('#invitations-check-status');
  if(status)status.textContent=invitationNotice.error?'Impossible de vérifier les invitations. Réessayez.':invitationNotice.checked?(count?invitationCountLabel():'Aucune invitation en attente.'):'Vérification des invitations…';
}
async function checkInvitations(force=false) {
  if(!cloudState.user || !cloudState.client || document.hidden)return;
  if(invitationNotice.userId!==cloudState.user.id){
    Object.assign(invitationNotice,{userId:cloudState.user.id,items:[],checked:false,error:false,lastCheck:0});
  }
  if(invitationNotice.busy || (!force && Date.now()-invitationNotice.lastCheck<45000))return;
  const userId=cloudState.user.id;
  invitationNotice.busy=true;invitationNotice.lastCheck=Date.now();
  try{
    const items=await cloudResult(cloudState.client.from('atelier_invitations').select('*').eq('email',cloudState.user.email.toLowerCase()).is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()));
    if(cloudState.user?.id!==userId)return;
    invitationNotice.items=items;invitationNotice.checked=true;invitationNotice.error=false;
  }catch(error){if(cloudState.user?.id===userId)invitationNotice.error=true;}
  finally{invitationNotice.busy=false;refreshInvitationBadges();}
}
cloudInbox = async function () {
  await checkInvitations(true);
  modal('Vos invitations',
    `<p id="invitations-check-status">${esc(invitationNotice.error?'Impossible de vérifier les invitations.':invitationNotice.items.length?invitationCountLabel():'Aucune invitation en attente.')}</p>`+
    invitationNotice.items.map(i=>`<article class="invitation-card"><span class="account-kicker">INVITATION À UN PROJET</span><h3>${esc(i.project_name)}</h3><p>${i.permissions.can_edit?'Vous pourrez contribuer aux looks, pièces et tâches.':'Vous pourrez consulter le projet.'} ${i.permissions.budget_read?'Le budget est partagé avec vous.':'Le budget reste privé.'}</p><small>Expire le ${date(i.expires_at.slice(0,10))} · pour ${esc(i.email)}</small><button type="button" class="primary" data-cloud-accept="${esc(i.id)}">Rejoindre le projet</button></article>`).join('')+
    `<button type="button" class="quiet" data-notification-refresh>Actualiser les invitations</button><p class="note">Une invitation est liée à votre adresse Google. Les invitations d’une autre adresse n’apparaissent pas ici.</p>`,()=>{});
  document.querySelector('#form > button[type="submit"]').hidden=true;
};
cloudAccount = function () {
  if(!cloudState.user)return cloudSignIn();
  const studio=cloudState.studio,user=cloudState.user,owner=studio?.owner_id===user.id;
  modal('Votre studio',
    `<div class="account-identity">${studioAvatar(studio,'large')}<div><span class="account-kicker">${studio?'STUDIO PRIVÉ':'MON COMPTE'}</span><h3>${esc(studio?.name||'Bienvenue dans Atelier')}</h3><small>${esc(user.email)}</small></div></div>`+
    `<div class="account-status ${cloudState.error?'has-error':''}"><span class="status-dot"></span>${esc(cloudState.error?'Des modifications attendent votre attention.':cloudState.pending||cloudState.busy?'Enregistrement en cours…':'Vos modifications sont enregistrées automatiquement.')}</div>`+
    `<div class="account-menu">${owner?'<button type="button" data-studio-profile><span>Personnaliser le studio<small>Nom et image du studio</small></span><span aria-hidden="true">›</span></button>':''}${cloudState.active?'<button type="button" data-account-team><span>Équipe et accès<small>Inviter et gérer les droits par projet</small></span><span aria-hidden="true">›</span></button>':''}<button type="button" data-notification-inbox><span>Invitations reçues<small>Rejoindre un projet partagé avec vous</small></span><span class="notification-badge" data-invitation-count ${invitationNotice.items.length?'':'hidden'}>${invitationNotice.items.length||''}</span><span aria-hidden="true">›</span></button></div>`+
    (cloudState.studios.length>1?`<div class="account-switch"><label>Changer de studio<select id="cloud-studio-select">${cloudState.studios.map(s=>`<option value="${esc(s.id)}" ${s.id===studio?.id?'selected':''}>${esc(s.name)}${s.owner_id===user.id?' · propriétaire':' · invité·e'}</option>`).join('')}</select></label><button type="button" data-cloud-open-studio>Ouvrir ce studio</button></div>`:'')+
    `<details class="account-secondary"><summary>Autres studios</summary><p>Vous pouvez avoir votre propre studio et participer aux projets d’un autre.</p><button type="button" data-cloud-new-studio>Créer un autre studio</button></details>`+
    `${cloudState.active?`<details class="account-secondary"><summary>Dépannage et données</summary><p>Atelier enregistre automatiquement. Ces outils servent uniquement à résoudre un problème ou à importer d’anciennes données.</p><button type="button" data-cloud-reload>Récupérer la dernière sauvegarde en ligne</button><p class="note">Remplace la version affichée par celle du serveur. Une confirmation est demandée si des changements ne sont pas enregistrés.</p>${cloudState.error||cloudState.pending?'<button type="button" data-cloud-flush>Réessayer l’enregistrement</button>':''}${owner?'<button type="button" data-cloud-import>Importer les anciens projets de cet appareil</button>':''}</details>`:''}`+
    '<div class="account-footer"><button type="button" class="quiet" data-cloud-signout>Se déconnecter</button><small>Connexion Google · Gmail reste séparé</small></div>',()=>{});
  document.querySelector('#form > button[type="submit"]').hidden=true;
  document.querySelector('#modal').classList.add('account-dialog');
  checkInvitations();
};
async function studioProfile() {
  const studio=cloudState.studio;
  if(!studio || studio.owner_id!==cloudState.user?.id)return;
  modal('Personnaliser le studio',
    `<div class="account-identity">${studioAvatar(studio,'large')}<p>Une image pour reconnaître votre espace sur tous vos appareils.</p></div>`+
    field('name','Nom du studio','text',studio.name)+field('avatarFile',studio.avatar?'Remplacer l’image':'Choisir une image','file')+
    (studio.avatar?'<label class="cloud-right"><input name="removeAvatar" type="checkbox"> Retirer l’image actuelle</label>':'')+
    '<p class="note">JPEG, PNG ou WebP, moins de 10 Mo. Seule la miniature sera conservée. Ces réglages sont réservés à la personne propriétaire du studio.</p>',async(data,form)=>{
      const name=data.name.trim();if(!name||name.length>100)throw Error('Choisissez un nom de 1 à 100 caractères.');
      let avatar=studio.avatar||'';const file=form.elements.avatarFile.files[0];
      if(file){
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Choisissez une image JPEG, PNG ou WebP de moins de 10 Mo.');
        const prepared=(await prepareImageBatch([file]))[0];if(!prepared)throw Error('Import annulé.');
        const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=prepared.image;});
        const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
        const side=Math.min(image.width,image.height),context=canvas.getContext('2d');
        context.fillStyle='#f3f1e8';context.fillRect(0,0,256,256);context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
        avatar=canvas.toDataURL('image/jpeg',0.82);
      }else if(form.elements.removeAvatar?.checked)avatar='';
      await cloudResult(cloudState.client.rpc('atelier_update_studio_profile',{p_studio:studio.id,p_name:name,p_avatar:avatar}));
      Object.assign(studio,{name,avatar});const cached=cloudState.studios.find(s=>s.id===studio.id);if(cached)Object.assign(cached,{name,avatar});
    });
  document.querySelector('[name="avatarFile"]').accept='image/jpeg,image/png,image/webp';
  document.querySelector('#form > button[type="submit"]').textContent='Enregistrer le studio';
}
renameStudio=studioProfile;
const accountOriginalModal=modal;
modal=function(...args){document.querySelector('#modal').classList.remove('account-dialog');return accountOriginalModal(...args);};
const accountOriginalRender=render;
render=function(){
  accountOriginalRender();
  if(!cloudState.user){Object.assign(invitationNotice,{userId:'',items:[],checked:false,error:false,lastCheck:0});return;}
  const studio=cloudState.studio;
  const header=document.querySelector('header');
  document.querySelector('#cloud-account-button')?.remove();
  document.querySelectorAll('.account-header-actions,#invitation-notice').forEach(node=>node.remove());
  header.insertAdjacentHTML('beforeend',`<div class="account-header-actions"><button class="notification-button" data-notification-inbox aria-label="${esc(invitationCountLabel())}">${invitationBellIcon}<span class="notification-badge" data-invitation-count hidden></span></button><button class="studio-account-button" data-cloud-account aria-label="Ouvrir les paramètres du studio">${studioAvatar(studio)}<span>${esc(studio?.name||'Mon compte')}</span><span aria-hidden="true">⌄</span></button></div>`);
  const bottom=document.querySelector('.aside-bottom');
  bottom.innerHTML=`<button class="sidebar-studio-button" data-cloud-account aria-label="Ouvrir les paramètres du studio">${studioAvatar(studio)}<span><strong>${esc(studio?.name||'Mon compte')}</strong><small>Paramètres du studio</small></span><span aria-hidden="true">⌄</span></button>`;
  document.querySelectorAll('.notice [data-cloud-account],.notice [data-workspace-rename]').forEach(node=>node.remove());
  if(!workspaceIsLocked()){
    const banner=document.createElement('div');banner.id='invitation-notice';banner.className='invitation-banner';banner.hidden=true;
    document.querySelector('.notice').after(banner);
  }
  refreshInvitationBadges();checkInvitations();
};
document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  try{
    if(b.hasAttribute('data-notification-inbox'))await cloudInbox();
    if(b.hasAttribute('data-notification-refresh'))await cloudInbox();
    if(b.hasAttribute('data-studio-profile'))await studioProfile();
    if(b.hasAttribute('data-account-team'))teamHub();
    if(b.hasAttribute('data-cloud-accept'))setTimeout(()=>checkInvitations(true),1500);
  }catch(error){toast(error.message);}
});
setInterval(()=>checkInvitations(),45000);
window.addEventListener('focus',()=>checkInvitations());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkInvitations();});
render();
