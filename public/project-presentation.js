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
