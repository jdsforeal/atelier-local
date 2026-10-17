document.addEventListener('click',event=>{if(event.target.closest('[data-tab="pieces"]')&&view==='detail'&&tab!=='pieces'){focusedLook='';category='Tout';filter='';piecePage=0;}},true);
let projectPiecesDisplay = 'list';
document.addEventListener('click',event=>{const button=event.target.closest('[data-project-pieces-display]');if(button){projectPiecesDisplay=button.dataset.projectPiecesDisplay;render();}});
/** L’aperçu emploie les pages exactes du moteur d’export PDF. */
async function mountOverviewMoodboard(host, p) {
  try {
    const pages = await drawMoodboardPages(structuredClone(p));
    if (!host.isConnected) return;
    host.replaceChildren();
    if (pages.warnings?.length) {
      const warning = document.createElement('p'); warning.className='note';
      warning.textContent=`${pages.warnings.length} visuel(s) à remplacer : ${pages.warnings.join(' ; ')}. La planche reste disponible ; les emplacements manquants sont signalés.`;
      host.append(warning);
    }
    pages.forEach((page, index) => {
      const button = document.createElement('button');
      button.className = 'overview-pdf-page';
      button.setAttribute('aria-label', `Agrandir le moodboard — page ${index + 1} sur ${pages.length}`);
      const image = document.createElement('img');
      image.src = page.jpeg; image.alt = `Moodboard — page ${index + 1} sur ${pages.length}`;
      image.width = page.width; image.height = page.height;
      button.append(image);
      button.addEventListener('click', () => previewDocument(pages, 'Moodboard.pdf', 'Moodboard · ' + p.name));
      host.append(button);
    });
  } catch (error) {
    if (!host.isConnected) return;
    host.textContent = error.message || 'Aperçu indisponible.';
    const button = document.createElement('button'); button.dataset.tab = 'mood'; button.textContent = 'Ouvrir le moodboard'; host.append(button);
  }
}
/** Actions contextuelles et vue d’ensemble du projet. */
function refineProjectPresentation() {
  if (view === 'home') document.querySelector('#content .hero')?.remove();
  if (view !== 'detail' || workspaceIsLocked()) return;
  const p = project(); if (!p) return;
  const rights = cloudRights(p.id), financial = demoMode || rights.budget_read;
  document.querySelector('.title-row [data-action="look"]')?.remove();
  document.querySelector('#project-state')?.remove();
  document.querySelector('.workflow-summary')?.remove();
  document.querySelector('.tabs [data-tab="workflow"]')?.remove();
  const bar = document.querySelector('.project-quick-actions');
  if (bar) {
    bar.innerHTML = `<button data-project-options="${esc(p.id)}" aria-haspopup="menu">Paramètres du projet <span aria-hidden="true">⌄</span></button>${!demoMode && rights.can_invite ? '<button class="primary" data-cloud-invite>Inviter un·e assistant·e</button>' : ''}`;
  }
  if (!financial) {
    document.querySelectorAll('.detail-summary .tag').forEach(el => { if (/budget/i.test(el.textContent)) el.remove(); });
    document.querySelector('#client-board-prices')?.closest('label')?.remove();
  }
  document.querySelectorAll('.piece-image-action').forEach(button => {
    const article = button.closest('article');
    const image = article?.querySelector('.piece-gallery img,.piece-thumb img,img');
    if (!image || image.closest('button,a')) return;
    image.tabIndex = 0; image.setAttribute('role','button');
    image.setAttribute('aria-label','Recadrer ou remplacer cette image'); image.style.cursor = 'pointer';
    const id = button.dataset.pieceImage;
    const edit = () => {const piece=db.pieces.find(x=>x.id===id); if(piece) void openVisualEditor(piece,'piece');};
    image.addEventListener('click',edit);
    image.addEventListener('contextmenu',e=>{e.preventDefault();edit();});
    image.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();edit();}});
    button.hidden = true;
  });
  if (tab === 'overview') {
    const heading = [...document.querySelectorAll('#content h2')].find(el => el.textContent === 'Direction artistique');
    const panel = heading?.closest('.panel');
    if (panel) {
      panel.classList.add('overview-inspiration');
      panel.innerHTML = `<div class="section-head"><h2>Votre moodboard</h2><button class="quiet" data-tab="mood">Modifier ↗</button></div><div class="overview-pdf-preview" aria-live="polite">${p.boards?.length ? 'Préparation de la planche…' : '<button data-tab="mood">Ajoutez vos premières inspirations</button>'}</div><details class="overview-brief"><summary>Brief & direction artistique</summary><p>${esc(p.brief || 'Ajoutez le brief du projet.')}</p>${canEditProject(p.id)?'<button class="quiet" data-action="brief">Modifier le brief</button>':''}</details>`;
    }
    if (panel && p.boards?.length) void mountOverviewMoodboard(panel.querySelector('.overview-pdf-preview'), p);
    const flow = document.querySelector('.flow-actions');
    if (flow) {
      const details = document.createElement('details'); details.className = 'project-followup';
      details.innerHTML = '<summary>Suivi des pièces & engagements</summary>';
      flow.before(details); details.append(flow);
      flow.querySelector('.section-head')?.remove();

    }
  }
  if (tab === 'looks' || tab === 'pieces') {
    document.querySelector('.process-guide [data-tab="pieces"]')?.remove();
    const switcher=document.createElement('nav');switcher.className='project-pieces-switch';switcher.setAttribute('aria-label','Vue des pièces du projet');
    switcher.innerHTML=`<button data-tab="looks" aria-pressed="${tab==='looks'}">Par looks</button><button data-tab="pieces" aria-pressed="${tab==='pieces'}">Toutes les pièces du projet</button>`;
    document.querySelector('.tabs')?.after(switcher);
    if(tab==='pieces') {
      const all=db.pieces.filter(x=>x.project===p.id);
      const heading=[...document.querySelectorAll('#content h2')].find(el=>el.textContent==='Toutes les pièces du projet');
      heading?.closest('.section-head')?.querySelector('button')?.remove();
      const summary=document.createElement('p');summary.className='note';summary.textContent=`${all.length} pièces · ${all.filter(x=>x.selection==='Retenue').length} retenue(s) · ${all.filter(x=>!x.selection||x.selection==='À comparer').length} à comparer`;
      heading?.after(summary);
      const list=document.querySelector('.piece-list');
      if(list){
        list.classList.toggle('project-piece-grid',projectPiecesDisplay==='grid');
        const toggle=document.createElement('div');toggle.className='project-pieces-display';toggle.innerHTML=`<button data-project-pieces-display="list" aria-pressed="${projectPiecesDisplay==='list'}">Liste</button><button data-project-pieces-display="grid" aria-pressed="${projectPiecesDisplay==='grid'}">Vignettes</button>`;
        list.before(toggle);
        list.querySelectorAll('.piece-row').forEach(row=>{const id=row.querySelector('[data-edit-piece]')?.dataset.editPiece;const piece=all.find(x=>x.id===id);if(!piece)return;const badge=document.createElement('span');badge.className='tag';badge.textContent=piece.selection||'À comparer';row.querySelector('.piece-info')?.append(badge);});
      }
      const manual=document.querySelector('.toolbar [data-action="piece"]');manual?.remove();
      const importBar=document.querySelector('.batch-import-launch');
      if(importBar){const toolbar=document.querySelector('#piece-search')?.closest('.toolbar');if(toolbar){toolbar.append(...importBar.children);importBar.remove();}}
    }
  }
  if (tab === 'client-board') {
    const section = document.querySelector('.client-board-workspace');
    const actions = section?.querySelector('.section-head .actions');
    const pdf = actions?.querySelector('[data-flow-pdf]');
    if (pdf) { pdf.textContent = 'Créer la planche PDF'; pdf.classList.add('primary'); }
    actions?.querySelector('[data-tab="messages"]')?.remove();
    const toolbar = section?.querySelector('.toolbar');
    if (toolbar) {
      const options = document.createElement('details'); options.className = 'selection-settings';
      options.innerHTML = '<summary>Versions & options de présentation</summary>';
      toolbar.before(options); options.append(toolbar);
      const freeze = actions?.querySelector('[data-flow-freeze]'); if (freeze) toolbar.append(freeze);
    }
    section?.querySelector('.section-head p')?.remove();
  }
}
const presentationPreviousRender = render;
render = function () {
  if (view === 'detail' && tab === 'workflow') tab = 'overview';
  presentationPreviousRender(); refineProjectPresentation();
};
refineProjectPresentation();
