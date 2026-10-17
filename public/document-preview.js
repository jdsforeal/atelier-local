/** Prévisualisation des pages exactes utilisées pour le PDF, sans téléchargement préalable. */
function previewDocument(
  pages,
  filename,
  title = "Prévisualisation du document",
) {
  if (!pages.length) throw Error("Ce document ne contient aucune page.");
  const previous = document.querySelector("#document-preview");
  if (previous) previous.close();
  const origin = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.id = "document-preview";
  dialog.setAttribute("aria-labelledby", "document-preview-title");
  dialog.innerHTML = `<div class="document-preview-head"><div><h2 id="document-preview-title">${esc(title)}</h2><small>${pages.length} page(s) · Le téléchargement reprend exactement cet aperçu.</small></div><button data-preview-close aria-label="Fermer la prévisualisation">✕</button></div><div class="document-preview-controls"><button data-preview-prev aria-label="Page précédente">←</button><span id="document-preview-count" aria-live="polite"></span><button data-preview-next aria-label="Page suivante">→</button><label>Affichage<select id="document-preview-zoom"><option value="fit">Page entière</option><option value="width">Pleine largeur</option></select></label><button class="primary" data-preview-download>Télécharger le PDF</button></div><div class="document-preview-sheet" tabindex="0" aria-label="Pages du document à faire défiler"></div>`;
  document.body.append(dialog);
  if (pages.warnings?.length) {
    const warning = document.createElement('p'); warning.className = 'finance-alert'; warning.setAttribute('role','status');
    warning.textContent = `${pages.warnings.length} visuel(s) indisponible(s), signalé(s) sur la planche : ${pages.warnings.join(' ; ')}. Le PDF conserve ces emplacements. Importez leurs fichiers ou captures pour une version complète.`;
    dialog.querySelector('.document-preview-controls').after(warning);
  }
  let page = 0;
  const blob = moodboardPdf(pages),
    url = URL.createObjectURL(blob);
  const sheet = dialog.querySelector(".document-preview-sheet");
  const images = pages.map((entry, index) => {
    const image = document.createElement("img");
    image.src = entry.jpeg;
    image.alt = `${title} — page ${index + 1} sur ${pages.length}`;
    image.width = entry.width;
    image.height = entry.height;
    image.dataset.previewPage = String(index);
    sheet.append(image);
    return image;
  });
  const update = () => {
    dialog.querySelector("#document-preview-count").textContent =
      `Page ${page + 1} / ${pages.length}`;
    dialog.querySelector("[data-preview-prev]").disabled = page === 0;
    dialog.querySelector("[data-preview-next]").disabled =
      page === pages.length - 1;
  };
  const go = () =>
    sheet.scrollTo({
      top: images[page].offsetTop - sheet.offsetTop - 20,
      behavior: "smooth",
    });
  let scrollFrame;
  sheet.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const top = sheet.getBoundingClientRect().top;
        let nearest = 0,
          distance = Infinity;
        images.forEach((image, index) => {
          const current = Math.abs(
            image.getBoundingClientRect().top - top - 20,
          );
          if (current < distance) {
            distance = current;
            nearest = index;
          }
        });
        page = nearest;
        update();
      });
    },
    { passive: true },
  );
  dialog.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-preview-close")) dialog.close();
    if (button.hasAttribute("data-preview-prev") && page > 0) {
      page--;
      update();
      go();
    }
    if (button.hasAttribute("data-preview-next") && page < pages.length - 1) {
      page++;
      update();
      go();
    }
    if (button.hasAttribute("data-preview-download")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
    }
  });
  dialog
    .querySelector("select")
    .addEventListener("change", (event) =>
      dialog.classList.toggle("preview-width", event.target.value === "width"),
    );
  dialog.addEventListener(
    "close",
    () => {
      cancelAnimationFrame(scrollFrame);
      dialog.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (origin?.isConnected) origin.focus();
    },
    { once: true },
  );
  update();
  dialog.showModal();
  dialog.querySelector("[data-preview-download]").focus();
}
