/** Accueil connecté, réglages visibles et raccourcis de projet accessibles au tactile. */
function workspaceIsLocked() {
  return !cloudState.user || (!demoMode && !cloudState.active);
}
cloudRenderGate = function () {
  const locked = cloudState.loading || workspaceIsLocked();
  document.body.classList.toggle('atelier-auth-pending', locked);
  let gate = document.querySelector('#cloud-loading');
  if (!locked) { gate?.remove(); return; }
  if (!gate) {
    gate = document.createElement('section');
    gate.id = 'cloud-loading';
    gate.setAttribute('aria-label', 'Connexion à Atelier');
    document.body.append(gate);
  }
  const loading = cloudState.loading;
  gate.innerHTML = `<div class="auth-card"><div class="auth-brand">atelier</div><p class="eyebrow">VOTRE STUDIO DE STYLISME</p><h1>${loading ? 'Ouverture de votre studio…' : cloudState.user ? 'Bienvenue dans Atelier.' : 'Vos projets commencent ici.'}</h1><p>${loading ? 'Nous vérifions votre connexion et vos accès.' : cloudState.user ? 'Créez votre studio privé ou retrouvez un projet auquel vous êtes invité·e.' : 'Un espace privé pour vos projets, vos looks et votre équipe.'}</p>${!loading ? cloudState.user ? '<div class="actions"><button class="primary" data-cloud-new-studio>Créer mon studio</button><button data-cloud-inbox>Voir mes invitations</button><button data-cloud-signout>Se déconnecter</button></div>' : `<button class="primary auth-login" data-cloud-login ${cloudConfigured() ? '' : 'disabled'}>Continuer avec Google</button><p class="note">${cloudConfigured() ? 'La connexion permet de retrouver votre studio sur ordinateur et téléphone.' : 'La connexion est temporairement indisponible. Réessayez plus tard.'}</p>` : ''}${cloudState.error ? `<p class="cloud-error" role="alert">${esc(cloudState.error)}</p><button data-workspace-retry>Réessayer</button>` : ''}<p class="note">Vos projets sont privés. Vous choisissez les personnes invitées et leurs droits.</p></div>`;
};
function canEditProject(id) {
  return demoMode || (cloudState.active && cloudRights(id).can_edit);
}
function projectSettings(id, photoOnly = false) {
  const p = db.projects.find(p => p.id === id);
  if (!p || !canEditProject(id)) return toast('Vous ne pouvez pas modifier ce projet.');
  modal(photoOnly ? 'Image du projet' : 'Modifier le projet',
    `${p.cover ? `<img class="project-cover-preview" src="${esc(p.cover)}" alt="Image actuelle du projet">` : '<p>Ajoutez une image pour reconnaître ce projet en un coup d’œil.</p>'}` +
    (photoOnly ? '' : field('name', 'Nom du projet', 'text', p.name) + field('client', 'Client / artiste', 'text', p.client || '') + planningFields(p) + field('type', 'Type de projet', 'select', p.type, ['Clip','Éditorial','Tournée','Événement','Collection','Autre'].map(x=>[x,x])) + field('season', 'Saison', 'select', p.season || 'Toute saison', ['Printemps','Été','Automne','Hiver','Toute saison'].map(x=>[x,x]))) +
    field('coverFile', p.cover ? 'Remplacer l’image' : 'Choisir une image', 'file') +
    (p.cover ? '<label class="cloud-right"><input type="checkbox" name="removeCover"> Retirer l’image actuelle</label>' : '') +
    '<p class="note">JPEG, PNG ou WebP. Cette image identifie le projet ; elle ne remplace pas son moodboard.</p>',
    async (data, form) => {
      if (!canEditProject(id)) throw Error('Vos droits ont changé.');
      let cover = p.cover || '';
      const file = form.elements.coverFile.files[0];
      if (file) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choisissez une image JPEG, PNG ou WebP.');
        if (file.size > 10000000) throw Error('Choisissez une image de moins de 10 Mo.');
        const result = (await prepareImageBatch([file]))[0];
        if (!result) throw Error('Import annulé.');
        cover = result.image;
      } else if (form.elements.removeCover?.checked) cover = '';
      if (!photoOnly) {
        if (!data.name.trim()) throw Error('Donnez un nom au projet.');
        const timeline=planningRead(data);
        if(timeline.shoot?.start&&timeline.shoot.start!==p.date)flowMoveDates(db,p,timeline.shoot.start,false);
        planningApply(db,p,timeline);
        Object.assign(p, {name:data.name.trim(), client:data.client, type:data.type, season:data.season});
      }
      p.cover = cover;
    });
  document.querySelector('[name="coverFile"]').accept = 'image/jpeg,image/png,image/webp';
}
async function renameStudio() {
  if (!cloudState.active || cloudState.studio.owner_id !== cloudState.user.id) return;
  modal('Nom de votre studio', field('name', 'Nom du studio', 'text', cloudState.studio.name), async data => {
    const name = data.name.trim();
    if (!name || name.length > 100) throw Error('Choisissez un nom de 1 à 100 caractères.');
    await cloudResult(cloudState.client.rpc('atelier_rename_studio', {p_studio:cloudState.studio.id,p_name:name}));
    cloudState.studio.name = name;
    const studio = cloudState.studios.find(s=>s.id===cloudState.studio.id);
    if (studio) studio.name = name;
  });
}
function closeProjectMenu() { document.querySelector('#project-action-menu')?.remove(); }
function projectMenu(id, x, y) {
  closeProjectMenu();
  const p = db.projects.find(p=>p.id===id);
  if (!p) return;
  const rights = cloudRights(id);
  const menu = document.createElement('div');
  menu.id='project-action-menu'; menu.className='project-action-menu'; menu.setAttribute('role','menu');
  menu.innerHTML = `<strong>${esc(p.name)}</strong><button role="menuitem" data-project-menu-action="open" data-project-id="${esc(id)}">Ouvrir le projet</button>${canEditProject(id) ? `<button role="menuitem" data-project-menu-action="edit" data-project-id="${esc(id)}">Modifier le projet</button><button role="menuitem" data-project-menu-action="photo" data-project-id="${esc(id)}">${p.cover ? 'Changer' : 'Ajouter'} l’image</button>` : ''}${cloudState.active && !demoMode ? `<button role="menuitem" data-project-menu-action="team" data-project-id="${esc(id)}">Équipe et accès</button>${rights.can_invite ? `<button role="menuitem" data-project-menu-action="invite" data-project-id="${esc(id)}">Inviter un·e assistant·e</button>` : ''}` : ''}`;
  document.body.append(menu);
  menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
  menu.querySelector('button')?.focus();
}
const usabilityBaseRender=render;
render=function () {
  closeProjectMenu();
  usabilityBaseRender();
  cloudRenderGate();
  if (workspaceIsLocked()) return;
  if (cloudState.active && !demoMode) {
    const aside=document.querySelector('.aside-bottom > div');
    if (aside) aside.innerHTML=`${esc(cloudState.studio.name)}<small>Studio privé</small>`;
    const notice=document.querySelector('.notice');
    notice.insertAdjacentHTML('beforeend','<button class="quiet" data-workspace-team-hub>Équipe et invitations</button>');
    if (cloudState.studio.owner_id===cloudState.user.id) notice.insertAdjacentHTML('beforeend','<button class="quiet" data-workspace-rename>Renommer le studio</button>');
  }
  document.querySelectorAll('[data-project]').forEach(card=>{
    const id=card.dataset.project,p=db.projects.find(p=>p.id===id);
    if(!p || card.closest('#project-action-menu')) return;
    let shell=card.closest('article.card');
    if(!shell){shell=document.createElement('div');shell.className='project-card-shell';card.before(shell);shell.append(card);}
    shell.classList.add('project-card-shell');shell.dataset.projectShell=id;
    const button=document.createElement('button');button.type='button';button.className='project-more';button.textContent='⋯';button.dataset.projectOptions=id;button.setAttribute('aria-label','Options du projet '+p.name);button.setAttribute('aria-haspopup','menu');shell.append(button);
  });
  if(view==='detail') {
    const p=project(); if(!p)return;
    const rights=cloudRights();
    document.querySelector('[data-cloud-team]')?.remove();
    const bar=document.createElement('div');bar.className='project-quick-actions';
    bar.innerHTML=`${canEditProject(p.id) ? `<button data-workspace-edit="${esc(p.id)}">Modifier le projet</button><button data-workspace-photo="${esc(p.id)}">${p.cover?'Changer':'Ajouter'} l’image</button>`:''}${cloudState.active && !demoMode ? `<button data-cloud-team>Équipe et accès</button>${rights.can_invite?'<button class="primary" data-cloud-invite>Inviter un·e assistant·e</button>':''}`:''}`;
    document.querySelector('.detail-summary')?.after(bar);
  }
};
const usabilityAccount=cloudAccount;
cloudAccount=function(){usabilityAccount();if(cloudState.active&&cloudState.studio.owner_id===cloudState.user.id)document.querySelector('#fields').insertAdjacentHTML('beforeend','<button type="button" data-workspace-rename>Renommer le studio</button>');};
function teamHub(){
  modal('Équipe et invitations', '<p>Les accès se donnent projet par projet. Le budget reste privé sauf si vous choisissez de le partager.</p>'+db.projects.map(p=>`<div class="panel"><strong>${esc(p.name)}</strong><div class="actions"><button type="button" data-project-menu-action="team" data-project-id="${esc(p.id)}">Voir l’équipe</button>${cloudRights(p.id).can_invite?`<button type="button" class="primary" data-project-menu-action="invite" data-project-id="${esc(p.id)}">Inviter un·e assistant·e</button>`:''}</div></div>`).join('')+(db.projects.length?'':'<p>Créez un premier projet pour inviter une personne à y travailler.</p>')+'<button type="button" data-cloud-inbox>Mes invitations reçues</button>',()=>{});
  document.querySelector('#form > button[type="submit"]').hidden=true;
}
document.addEventListener('contextmenu',event=>{
  const target=event.target.closest('[data-project-shell],[data-project]');
  if(!target || workspaceIsLocked())return;
  event.preventDefault();projectMenu(target.dataset.projectShell||target.dataset.project,event.clientX,event.clientY);
});
document.addEventListener('keydown',event=>{
  const menu=document.querySelector('#project-action-menu');
  if(!menu)return;
  if(event.key==='Escape'){closeProjectMenu();return;}
  if(['ArrowDown','ArrowUp'].includes(event.key)){
    event.preventDefault();
    const buttons=[...menu.querySelectorAll('button')];
    const step=event.key==='ArrowDown'?1:-1;
    buttons[(buttons.indexOf(document.activeElement)+step+buttons.length)%buttons.length]?.focus();
  }
});
document.addEventListener('click',async event=>{
  const b=event.target.closest('button');
  if(!event.target.closest('#project-action-menu')&&!b?.dataset.projectOptions)closeProjectMenu();
  if(!b)return;
  try{
    if(b.hasAttribute('data-workspace-retry'))location.reload();
    if(b.dataset.projectOptions){const rect=b.getBoundingClientRect();projectMenu(b.dataset.projectOptions,rect.right-250,rect.bottom);}
    if(b.dataset.workspaceEdit)projectSettings(b.dataset.workspaceEdit);
    if(b.dataset.workspacePhoto)projectSettings(b.dataset.workspacePhoto,true);
    if(b.hasAttribute('data-workspace-rename'))renameStudio();
    if(b.hasAttribute('data-workspace-team-hub'))teamHub();
    if(b.dataset.projectMenuAction){
      const id=b.dataset.projectId,command=b.dataset.projectMenuAction;
      closeProjectMenu();pid=id;
      if(command==='open'){view='detail';tab='overview';render();}
      if(command==='edit')projectSettings(id);
      if(command==='photo')projectSettings(id,true);
      if(command==='team'||command==='invite'){
        document.querySelector('#modal').close();view='detail';tab='overview';render();
        if(command==='team')await cloudTeam();
        else document.querySelector('[data-cloud-invite]')?.click();
      }
    }
  }catch(error){toast(error.message);}
});
render();

const usabilityModal = modal;
modal = function(name, fields, callback) {
  usabilityModal(name, fields, callback);
  if(name === 'Inviter dans ce projet') document.querySelector('#form > button[type="submit"]').textContent = 'Créer l’invitation';
};
