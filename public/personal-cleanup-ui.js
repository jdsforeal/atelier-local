const personalCleanRender = render;
render = function () {
  personalCleanRender();
  const badge = $(".notice");
  if (badge?.firstChild)
    badge.firstChild.textContent = badge.firstChild.textContent.replace(
      /^0\.8 /,
      "0.8.1 ",
    );
  if (demoMode) return;
  const note = [...document.querySelectorAll("p.note")].find((el) =>
    el.textContent.startsWith("Répertoire de départ documenté"),
  );
  if (note)
    note.textContent =
      "Répertoire de référence documenté, non exhaustif. Aucun contact personnel n’est ajouté automatiquement. Vos ajouts restent dans votre navigateur.";
  const notice = $(".notice");
  if (db.personalCleanupBackup?.count)
    notice.insertAdjacentHTML(
      "beforeend",
      `<span>Exemples retirés de cet espace.</span><button class="quiet" data-undo-personal-cleanup>Annuler ce nettoyage</button>`,
    );
  if (db.personalCleanupWarning)
    notice.insertAdjacentHTML(
      "beforeend",
      `<p>${esc(db.personalCleanupWarning)}</p>`,
    );
};
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-undo-personal-cleanup]") || demoMode) return;
  const backup = db.personalCleanupBackup;
  if (!backup) return;
  for (const [key, records] of Object.entries(backup.removed)) {
    db[key] ??= [];
    for (const record of records)
      if (
        !db[key].some((x) =>
          record.id
            ? x.id === record.id
            : JSON.stringify(x) === JSON.stringify(record),
        )
      )
        db[key].push(record);
  }
  for (const item of backup.detached || []) {
    const record = db[item.key]?.find((x) => x.id === item.id);
    if (record && !record.project) {
      for (const key of ["project", "look", "needId", "variantId"])
        if (item[key] !== undefined) record[key] = item[key];
    }
  }
  delete db.personalCleanupBackup;
  save();
  normalize();
  view = "projects";
  render();
  toast("Anciens exemples restaurés. Vos nouvelles saisies sont conservées.");
});
render();
