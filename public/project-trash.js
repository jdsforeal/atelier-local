/** Corbeille de projets : aucune suppression silencieuse du document en cours. */
function trashEntries(){
  if(cloudState.active&&!demoMode)return cloudState.projects.filter(p=>p.deleted_at&&!p.purged_at).map(p=>({id:p.id,name:p.name,deletedAt:p.deleted_at}));
  return db.projects.filter(p=>p.deletedAt).map(p=>({id:p.id,name:p.name,deletedAt:p.deletedAt}));
}
function removeLocalProject(id){
  db.projects=db.projects.filter(p=>p.id!==id);
  for(const key of ['pieces','tasks','requests','supplierDrafts','expenses','quotes','quoteVersions','selectionHistory','clientBoards'])if(Array.isArray(db[key]))db[key]=db[key].filter(row=>row.project!==id);
}
async function changeProjectTrash(id,restore=false){
  if(cloudState.active&&!demoMode){
    if(cloudState.pending)await cloudFlush();
    if(cloudState.pending||cloudState.busy)throw Error('Attendez la sauvegarde avant de modifier la corbeille.');
    await cloudResult(cloudState.client.rpc('atelier_trash_project',{p_project:id,p_restore:restore}));
    await cloudLoadStudio(cloudState.studio.id);
  }else{
    const p=db.projects.find(p=>p.id===id);if(!p)return;
    if(restore){if(Date.now()-Date.parse(p.deletedAt)>=30*86400000)throw Error('Le délai de restauration est dépassé.');delete p.deletedAt;}
    else p.deletedAt=new Date().toISOString();
    view='projects';pid=null;save();render();
  }
}
function askTrashProject(externalId){
  const p=db.projects.find(p=>p.id===externalId);if(!p)return;
  if(!demoMode&&!cloudRights(externalId).manager)return toast('Action réservée au créateur du projet ou au propriétaire du studio.');
  const meta=cloudState.projects.find(p=>p.external_id===externalId);
  modal('Mettre le projet à la corbeille ?',`<p><strong>${esc(p.name)}</strong> disparaîtra des projets actifs et des accès des assistant·es.</p><p>Vous pourrez le restaurer pendant 30 jours. Les invitations en attente seront annulées ; les accès déjà acceptés reprendront si vous restaurez le projet.</p><p class="note">Si vous avez déjà activé des relances Gmail, suspendez-les avant de retirer le projet.</p>`,async()=>changeProjectTrash(demoMode?p.id:meta.id));
  document.querySelector('#form > button[type="submit"]').textContent='Mettre à la corbeille';
}
function openProjectTrash(){
  const entries=trashEntries().filter(p=>Date.now()-Date.parse(p.deletedAt)<30*86400000);
  modal('Corbeille des projets',`<p>Les projets restent restaurables pendant 30 jours. Les assistant·es n’y ont plus accès.</p><div class="trash-project-list">${entries.map(p=>{const deadline=new Date(Date.parse(p.deletedAt)+30*86400000);return `<article><div><strong>${esc(p.name)}</strong><small>Restauration possible jusqu’au ${date(deadline.toISOString().slice(0,10))}</small></div><button type="button" data-restore-project="${esc(p.id)}">Restaurer</button></article>`;}).join('')||'<p class="empty">La corbeille est vide.</p>'}</div>${entries.length&&(demoMode||cloudState.studio?.owner_id===cloudState.user?.id)?'<button type="button" class="danger" data-empty-project-trash>Vider la corbeille</button>':''}`,()=>{});
  document.querySelector('#form > button[type="submit"]').hidden=true;
}
function askEmptyProjectTrash(){
  modal('Vider définitivement la corbeille ?',`<p>Les projets de la corbeille et leurs documents seront supprimés définitivement. Cette action est irréversible.</p><label>Pour confirmer, écrivez SUPPRIMER<input name="confirmation" autocomplete="off" required></label>`,async data=>{
    if(data.confirmation!=='SUPPRIMER')throw Error('Écrivez SUPPRIMER pour confirmer.');
    if(cloudState.active&&!demoMode){
      if(cloudState.pending||cloudState.busy)throw Error('Attendez la fin de la sauvegarde.');
      await cloudResult(cloudState.client.rpc('atelier_empty_trash',{p_studio:cloudState.studio.id}));await cloudLoadStudio(cloudState.studio.id);
    }else{trashEntries().forEach(p=>removeLocalProject(p.id));save();render();}
  });
  document.querySelector('#form > button[type="submit"]').textContent='Supprimer définitivement';
}
const trashBaseProjectMenu=projectMenu;
projectMenu=function(id,x,y){
  trashBaseProjectMenu(id,x,y);
  if(demoMode||cloudRights(id).manager)document.querySelector('#project-action-menu')?.insertAdjacentHTML('beforeend',`<button role="menuitem" class="danger" data-trash-project="${esc(id)}">Mettre à la corbeille</button>`);
};
const trashBaseRender=render;
render=function(){
  if(demoMode)db.projects.filter(p=>p.deletedAt&&Date.now()-Date.parse(p.deletedAt)>=30*86400000).forEach(p=>removeLocalProject(p.id));
  const all=db.projects,hidden=new Set(all.filter(p=>p.deletedAt).map(p=>p.id)),saved={};
  db.projects=all.filter(p=>!p.deletedAt);
  for(const key of ['pieces','tasks','requests','supplierDrafts','expenses','quotes','quoteVersions','selectionHistory','clientBoards'])if(Array.isArray(db[key])){saved[key]=db[key];db[key]=db[key].filter(row=>!hidden.has(row.project));}
  try{trashBaseRender();}finally{db.projects=all;Object.assign(db,saved);}
  if(workspaceIsLocked())return;
  if(view==='projects'||view==='home')document.querySelector('.title-row')?.insertAdjacentHTML('afterend',`<div class="project-trash-entry"><button data-project-trash>Corbeille (${trashEntries().length})</button></div>`);
  if(view==='detail'&&(demoMode||cloudRights().manager))document.querySelector('.project-quick-actions')?.insertAdjacentHTML('beforeend',`<button class="quiet danger" data-trash-project="${esc(pid)}">Mettre à la corbeille</button>`);
};
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 try{
  if(b.hasAttribute('data-project-trash'))openProjectTrash();
  if(b.dataset.trashProject){closeProjectMenu();askTrashProject(b.dataset.trashProject);}
  if(b.dataset.restoreProject){b.disabled=true;await changeProjectTrash(b.dataset.restoreProject,true);openProjectTrash();}
  if(b.hasAttribute('data-empty-project-trash'))askEmptyProjectTrash();
 }catch(error){b.disabled=false;toast(error.message);}
});
render();
