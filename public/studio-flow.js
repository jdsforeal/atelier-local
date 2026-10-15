/** Actions de studio : filtres métier, opérations groupées et cadrage assisté local. */
let studioTab = "Bibliothèque",
  studioSearch = "",
  studioProject = "",
  studioPage = 0;
const studioChecked = new Set();
const studioTabs = [
  "Bibliothèque",
  "Stock du studio",
  "Prêts & locations",
  "À retourner",
  "Restituées",
];
const baseImageImport = readImage;
const imageImportMetadata = new WeakMap();
function loadStudioImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error("Image illisible"));
    img.src = source;
  });
}
async function prepareImageBatch(files) {
  const records = [];
  for (const file of files) {
    const originalImage = await baseImageImport(file),
      img = await loadStudioImage(originalImage);
    const sample = document.createElement("canvas");
    sample.width = 200;
    sample.height = Math.max(1, Math.round((img.height / img.width) * 200));
    const c = sample.getContext("2d");
    c.drawImage(img, 0, 0, sample.width, sample.height);
    const crop = suggestProductCrop(
      c.getImageData(0, 0, sample.width, sample.height).data,
      sample.width,
      sample.height,
    );
    records.push({
      originalImage,
      img,
      crop,
      useCrop: crop.w < 0.98 || crop.h < 0.98,
      file,
    });
  }
  return new Promise((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "crop-dialog";
    dialog.innerHTML = `<h2>Préparer vos images</h2><p>Cadrage assisté sur votre appareil : vérifiez le résultat, surtout pour les captures contenant du texte ou plusieurs produits. Les originaux sont conservés.</p><div class="toolbar"><button type="button" data-crop-all>Appliquer les cadrages proposés</button><button type="button" data-crop-none>Garder tous les originaux</button></div><div class="crop-batch">${records
      .map(
        (r, i) =>
          `<article class="panel"><strong>${esc(r.file.name)}</strong><div class="crop-comparison"><img src="${r.originalImage}" alt="Original ${i + 1}"><canvas data-crop-preview="${i}" aria-label="Aperçu du cadrage ${i + 1}"></canvas></div><label><input type="checkbox" data-use-crop="${i}" ${r.useCrop ? "checked" : ""}> Utiliser le cadrage proposé</label>${[
            ["x", "Gauche"],
            ["y", "Haut"],
            ["w", "Largeur"],
            ["h", "Hauteur"],
          ]
            .map(
              ([key, label]) =>
                `<label>${label}<input type="range" min="${["w", "h"].includes(key) ? 5 : 0}" max="100" value="${Math.round(r.crop[key] * 100)}" data-crop-index="${i}" data-crop-key="${key}"></label>`,
            )
            .join("")}</article>`,
      )
      .join(
        "",
      )}</div><div class="toolbar"><button type="button" data-crop-cancel>Annuler l’import</button><button type="button" class="primary" data-crop-confirm>Valider les ${records.length} image(s)</button></div>`;
    document.body.append(dialog);
    const paint = (index) => {
      const r = records[index],
        canvas = dialog.querySelector(`[data-crop-preview="${index}"]`);
      canvas.width = 320;
      canvas.height = 320;
      const c = canvas.getContext("2d");
      c.fillStyle = "#f6f4ee";
      c.fillRect(0, 0, 320, 320);
      const b = r.useCrop ? r.crop : { x: 0, y: 0, w: 1, h: 1 };
      const w = r.img.width * b.w,
        h = r.img.height * b.h,
        scale = Math.min(320 / w, 320 / h);
      c.drawImage(
        r.img,
        r.img.width * b.x,
        r.img.height * b.y,
        w,
        h,
        (320 - w * scale) / 2,
        (320 - h * scale) / 2,
        w * scale,
        h * scale,
      );
    };
    records.forEach((r, i) => paint(i));
    const finish = () => {
      dialog.close();
      dialog.remove();
    };
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish();
      reject(Error("Import annulé."));
    });
    dialog.addEventListener("input", (event) => {
      if (event.target.dataset.cropIndex === undefined) return;
      const i = Number(event.target.dataset.cropIndex),
        r = records[i],
        key = event.target.dataset.cropKey;
      r.crop[key] = Number(event.target.value) / 100;
      r.crop.w = Math.min(r.crop.w, 1 - r.crop.x);
      r.crop.h = Math.min(r.crop.h, 1 - r.crop.y);
      if (r.crop.w < 0.05) {
        r.crop.x = 0.95;
        r.crop.w = 0.05;
      }
      if (r.crop.h < 0.05) {
        r.crop.y = 0.95;
        r.crop.h = 0.05;
      }
      r.useCrop = true;
      dialog.querySelector(`[data-use-crop="${i}"]`).checked = true;
      paint(i);
    });
    dialog.addEventListener("change", (event) => {
      if (event.target.dataset.useCrop !== undefined) {
        const i = Number(event.target.dataset.useCrop);
        records[i].useCrop = event.target.checked;
        paint(i);
      }
    });
    dialog.addEventListener("click", (event) => {
      if (
        event.target.hasAttribute("data-crop-all") ||
        event.target.hasAttribute("data-crop-none")
      ) {
        const enabled = event.target.hasAttribute("data-crop-all");
        records.forEach((r, i) => {
          r.useCrop = enabled;
          dialog.querySelector(`[data-use-crop="${i}"]`).checked = enabled;
          paint(i);
        });
      }
      if (event.target.hasAttribute("data-crop-cancel")) {
        finish();
        reject(Error("Import annulé."));
      }
      if (event.target.hasAttribute("data-crop-confirm")) {
        const result = records.map((r) => {
          let image = r.originalImage;
          if (r.useCrop) {
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(r.img.width * r.crop.w));
            c.height = Math.max(1, Math.round(r.img.height * r.crop.h));
            c.getContext("2d").drawImage(
              r.img,
              r.img.width * r.crop.x,
              r.img.height * r.crop.y,
              c.width,
              c.height,
              0,
              0,
              c.width,
              c.height,
            );
            image = c.toDataURL("image/jpeg", 0.82);
          }
          const data = {
            image,
            originalImage: r.originalImage,
            crop: r.useCrop ? r.crop : null,
          };
          imageImportMetadata.set(r.file, data);
          return data;
        });
        finish();
        resolve(result);
      }
    });
    dialog.showModal();
  });
}
readImage = async function (file) {
  return (await prepareImageBatch([file]))[0].image;
};
function studioList(scoped = false, forcedSection) {
  const section = forcedSection || studioTab;
  const eligible = db.pieces.filter(
    (x) =>
      (!scoped || x.project === pid) &&
      (!studioProject || scoped || x.project === studioProject) &&
      (x.name + " " + x.brand)
        .toLocaleLowerCase("fr")
        .includes(studioSearch.toLocaleLowerCase("fr")),
  );
  const list = eligible.filter((x) =>
    studioSection(
      x,
      db.projects.find((p) => p.id === x.project),
      section,
    ),
  );
  studioPage = Math.min(
    studioPage,
    Math.max(0, Math.ceil(list.length / 24) - 1),
  );
  const displayed = list.slice(studioPage * 24, (studioPage + 1) * 24);
  return `${
    !forcedSection
      ? `<div class="toolbar">${studioTabs
          .map(
            (t) =>
              `<button class="${t === studioTab ? "primary" : ""}" data-studio-tab="${esc(t)}">${esc(t)} (${
                eligible.filter((x) =>
                  studioSection(
                    x,
                    db.projects.find((p) => p.id === x.project),
                    t,
                  ),
                ).length
              })</button>`,
          )
          .join("")}</div>`
      : ""
  }
 <div class="toolbar"><input type="search" id="studio-search" placeholder="Pièce ou marque…" aria-label="Rechercher les pièces du studio" value="${esc(studioSearch)}">${!scoped ? `<select id="studio-project" aria-label="Filtrer les pièces par projet"><option value="">Tous les projets</option>${db.projects.map((p) => `<option value="${esc(p.id)}" ${p.id === studioProject ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button data-quick-stock>＋ Pièce au stock</button>` : ""}</div>
 <p class="note">${section === "Stock du studio" ? "Vos pièces en propriété, réutilisables. Un prêt ou une location n’y entre jamais automatiquement." : section === "À retourner" ? "Pièces reçues dont l’échéance est atteinte, déjà en retour ou liées à un projet en phase Retours." : "Les actions mettent à jour la même fiche dans le projet et le suivi des retours."}</p>
 <div class="toolbar"><button data-studio-select-page>Cocher cette page</button><button data-studio-clear>Tout décocher</button><span>${studioChecked.size} cochée(s)</span><select id="studio-bulk-action" aria-label="Action groupée"><option value="">Action sur les pièces cochées…</option><option value="receive">Réceptionner</option><option value="dispatch">Marquer expédiées / déposées</option><option value="returned">Confirmer la restitution</option><option value="stock">Ranger au stock (pièces en propriété)</option></select></div>
 <div class="piece-list">${displayed
   .map((x) => {
     const temporary = ["Prêt", "Location"].includes(x.mode),
       p = db.projects.find((p) => p.id === x.project),
       overdue =
         x.returnDue &&
         x.returnDue < new Date().toISOString().slice(0, 10) &&
         x.status !== "Retourné";
     return `<article class="piece-row ${overdue ? "over-budget" : ""}"><input type="checkbox" data-studio-check="${esc(x.id)}" aria-label="Cocher ${esc(x.name)}" ${studioChecked.has(x.id) ? "checked" : ""}><div class="piece-thumb">${x.image ? `<img src="${esc(x.image)}" alt="${esc(x.name)}">` : art(0)}</div><div class="piece-info"><small>${esc(x.brand)}</small><h3>${esc(x.name)}</h3><small>${esc(p?.name || "Stock du studio")} · ${esc(x.mode)}</small><p>${esc(x.returnStage || x.status)}${x.returnDue ? " · retour " + date(x.returnDue) : ""}${overdue ? " · EN RETARD" : ""}</p></div><div class="actions">${x.status === "Retourné" ? `<button data-studio-action="reopen" data-studio-piece="${esc(x.id)}">Corriger la restitution</button>` : temporary ? `${!x.received && !["Reçu", "Porté", "Retour en cours"].includes(x.status) ? `<button data-studio-action="receive" data-studio-piece="${esc(x.id)}">Reçu</button>` : `<button data-studio-action="dispatch" data-studio-piece="${esc(x.id)}">Expédiée / déposée</button><button data-studio-action="returned" data-studio-piece="${esc(x.id)}">Réception confirmée</button>`}` : `${x.status !== "Conservé" ? `<button data-studio-action="stock" data-studio-piece="${esc(x.id)}">Ranger au stock</button>` : ""}`}
 ${x.originalImage ? `<button data-restore-piece="${esc(x.id)}">Photo d’origine</button>` : ""}${!temporary && (x.stockOwned || x.status === "Conservé") ? `<button data-reuse-stock="${esc(x.id)}">Utiliser dans un projet</button>` : ""}${x.caution > 0 ? `<label><input type="checkbox" data-studio-caution="${esc(x.id)}" ${x.cautionReturned ? "checked" : ""}> Caution récupérée (${euro(x.caution)})</label>` : ""}<button data-edit-piece="${esc(x.id)}">Détails</button></div></article>`;
   })
   .join(
     "",
   )}</div>${list.length ? `<div class="pagination">${studioPage * 24 + 1}–${Math.min(list.length, (studioPage + 1) * 24)} / ${list.length}<button data-studio-page="${studioPage - 1}" ${!studioPage ? "disabled" : ""}>←</button><button data-studio-page="${studioPage + 1}" ${(studioPage + 1) * 24 >= list.length ? "disabled" : ""}>→</button></div>` : '<div class="empty">Aucune pièce dans cette rubrique.</div>'}`;
}
const originalStudioPieces = pieces;
pieces = function (scoped) {
  return scoped ? originalStudioPieces(scoped) : studioList();
};
returnsView = function (p) {
  return "<h2>Retours du projet</h2>" + studioList(true, "Prêts & locations");
};
const studioRender = render;
render = function () {
  studioRender();
  const nav = $('#nav [data-view="news"]');
  if (nav) nav.remove();
  if (view === "pieces")
    $("#content").innerHTML =
      title(
        "Votre portant.",
        "Retrouvez ce qui est à vous, en prêt ou à restituer.",
      ) + studioList();
  if (view === "news")
    $("#content").innerHTML =
      title(
        "Vos favoris.",
        "Références enregistrées — aucun fil d’actualité connecté.",
      ) +
      `<div class="cards">${db.news.map((n) => `<article class="panel"><h3>${esc(n.title)}</h3><p>${esc(n.note || "")}</p><a href="${esc(n.url)}" target="_blank" rel="noopener">Source ↗</a></article>`).join("")}</div>`;
  if (view === "contacts")
    $("#content").insertAdjacentHTML(
      "beforeend",
      "<p><button data-open-favorites>Ouvrir mes favoris enregistrés</button></p>",
    );
  $(".notice").firstChild.textContent =
    "0.8 · Le portant du studio · " +
    (demoMode ? "SIMULATION " : "ESPACE LOCAL ");
  if (view === "detail" && tab === "mood")
    document.querySelectorAll("[data-edit-inspiration]").forEach((b, i) => {
      if (project().boards[i]?.originalImage)
        b.insertAdjacentHTML(
          "afterend",
          `<button data-restore-original="${i}">Revenir à l’original</button>`,
        );
    });
};
function applyStudioAction(ids, action) {
  const items = ids
    .map((id) => db.pieces.find((x) => x.id === id))
    .filter(Boolean);
  if (
    items.some((x) =>
      ["Terminé", "Annulé"].includes(
        db.projects.find((p) => p.id === x.project)?.status,
      ),
    )
  ) {
    toast("Rouvrez le projet archivé avant de modifier ses pièces.");
    return;
  }
  if (
    action === "stock" &&
    items.some((x) => ["Prêt", "Location"].includes(x.mode))
  ) {
    toast(
      "Décochez les prêts et locations : ces pièces ne vous appartiennent pas.",
    );
    return;
  }
  if (
    ["dispatch", "returned", "reopen"].includes(action) &&
    items.some((x) => !["Prêt", "Location"].includes(x.mode))
  ) {
    toast(
      "Décochez les pièces en propriété : seules les locations et prêts sont à restituer.",
    );
    return;
  }
  items.forEach((x) => quickPieceAction(x, action));
  syncReturnMilestones([...new Set(items.map((x) => x.project))]);
  studioChecked.clear();
  save();
  render();
  toast(items.length + " pièce(s) mise(s) à jour.");
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.dataset.studioTab) {
    studioTab = b.dataset.studioTab;
    studioPage = 0;
    studioChecked.clear();
    render();
  }
  if (b.dataset.studioPage !== undefined) {
    studioPage = Number(b.dataset.studioPage);
    render();
  }
  if (b.hasAttribute("data-studio-clear")) {
    studioChecked.clear();
    render();
  }
  if (b.hasAttribute("data-studio-select-page")) {
    document
      .querySelectorAll("[data-studio-check]")
      .forEach((el) => studioChecked.add(el.dataset.studioCheck));
    render();
  }
  if (b.dataset.studioAction)
    applyStudioAction([b.dataset.studioPiece], b.dataset.studioAction);
  if (b.hasAttribute("data-open-favorites")) {
    view = "news";
    render();
  }
  if (b.dataset.restoreOriginal !== undefined) {
    const board = project().boards[Number(b.dataset.restoreOriginal)];
    board.image = board.originalImage;
    board.crop = null;
    save();
    render();
  }
  if (b.hasAttribute("data-quick-stock"))
    modal(
      "Ajouter au stock du studio",
      field("name", "Nom de la pièce") +
        field("brand", "Marque (facultatif)") +
        field(
          "category",
          "Catégorie",
          "select",
          "Haut",
          [
            "Haut",
            "Bas",
            "Robe",
            "Veste",
            "Chaussures",
            "Bijoux",
            "Sac",
            "Accessoire",
            "Autre",
          ].map((x) => [x, x]),
        ) +
        field("image", "Photo (facultatif)", "file"),
      async (data, form) => {
        const f = form.elements.image.files[0];
        const result = f ? (await prepareImageBatch([f]))[0] : {};
        db.pieces.push({
          ...data,
          ...result,
          image: result.image || "",
          id: uid(),
          project: "",
          look: "",
          mode: "Achat",
          stockOwned: true,
          status: "Conservé",
          price: 0,
          commit: false,
        });
      },
    );
});
document.addEventListener("input", (event) => {
  if (event.target.id === "studio-search") {
    const pos = event.target.selectionStart;
    studioSearch = event.target.value;
    studioPage = 0;
    render();
    const el = $("#studio-search");
    el.focus();
    el.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.studioCheck) {
    el.checked
      ? studioChecked.add(el.dataset.studioCheck)
      : studioChecked.delete(el.dataset.studioCheck);
    render();
  }
  if (el.id === "studio-project") {
    studioProject = el.value;
    studioPage = 0;
    studioChecked.clear();
    render();
  }
  if (el.id === "studio-bulk-action" && el.value)
    applyStudioAction([...studioChecked], el.value);
  if (el.dataset.studioCaution) {
    const piece = db.pieces.find((x) => x.id === el.dataset.studioCaution);
    piece.cautionReturned = el.checked;
    syncReturnMilestones([piece.project]);
    save();
    render();
  }
  if (el.name === "piecePhoto" && el.files[0]) {
    const name = $('#form [name="name"]');
    if (name && !name.value)
      name.value = el.files[0].name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]/g, " ");
  }
});
render();

// Réutiliser une pièce du studio sans ressaisir sa photo ni ses références.
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.dataset.restorePiece) {
    const piece = db.pieces.find((x) => x.id === b.dataset.restorePiece);
    piece.image = piece.originalImage;
    piece.crop = null;
    save();
    render();
  }
  if (b.dataset.reuseStock) {
    const item = db.pieces.find((x) => x.id === b.dataset.reuseStock);
    const active = db.projects.filter(
      (p) => !["Terminé", "Annulé"].includes(p.status),
    );
    if (!active.length) {
      toast("Créez un projet avant d’y associer cette pièce.");
      return;
    }
    const initial = active.find((p) => p.id === pid) || active[0];
    modal(
      "Réutiliser : " + item.name,
      field(
        "project",
        "Projet",
        "select",
        initial.id,
        active.map((p) => [p.id, p.name]),
      ) +
        field("look", "Look", "select", "", [
          ["", "Sans look pour le moment"],
          ...initial.looks.map((l) => [l.id, l.name]),
        ]) +
        '<p class="note">La référence et sa photo seront reprises. Cette réutilisation coûte 0 € et ne retire pas la pièce du stock.</p>',
      (data) => {
        const p = db.projects.find((p) => p.id === data.project),
          look = p.looks.find((l) => l.id === data.look),
          need = look?.needs.find((n) => n.category === item.category);
        if (data.look && !look) throw Error("Choisissez un look du projet.");
        if (
          db.pieces.some(
            (x) =>
              x.stockSourceId === item.id &&
              x.project === p.id &&
              x.look === (look?.id || ""),
          )
        )
          throw Error("Cette pièce est déjà associée à ce look.");
        db.pieces.push({
          id: uid(),
          stockSourceId: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          image: item.image,
          url: item.url || "",
          project: p.id,
          look: look?.id || "",
          needId: need?.id || "",
          variantId: look?.activeVariant || "",
          mode: "Stock du studio",
          selection: "À comparer",
          status: "Repéré",
          price: 0,
          caution: 0,
          commit: false,
          note: "Pièce du stock personnel — réutilisation sans achat.",
        });
      },
    );
  }
});
/** Préparation guidée : la styliste coche les étapes et les besoins au lieu de tout rédiger. */
function quickProjectWizard() {
  const stages = [
    "Brief reçu",
    "Moodboard proposé",
    "Direction validée par le client",
    "Demandes de pièces",
    "Réceptions et essayages",
    "Production réalisée",
    "Retours et cautions",
    "Bilan et clôture",
  ];
  modal(
    "Préparer un projet",
    field("client", "Client / artiste (facultatif)") +
      field(
        "type",
        "Type de projet",
        "select",
        "Clip",
        [
          "Clip",
          "Éditorial",
          "Tournée",
          "Événement",
          "Collection",
          "Autre",
        ].map((t) => [t, t]),
      ) +
      field("date", "Date principale", "date") +
      field("projectName", "Nom personnalisé (facultatif)") +
      "<details><summary>Looks et besoins à préparer automatiquement</summary>" +
      field("lookCount", "Nombre de looks", "number", 1) +
      [
        "Haut",
        "Bas",
        "Robe",
        "Veste",
        "Chaussures",
        "Bijoux",
        "Sac",
        "Accessoire",
      ]
        .map(
          (t) =>
            `<label><input type="checkbox" name="quick-need" value="${t}" ${["Haut", "Bas", "Chaussures"].includes(t) ? "checked" : ""}> ${t}</label>`,
        )
        .join("") +
      "</details><details open><summary>Étapes à créer — décochez celles qui ne servent pas</summary>" +
      stages
        .map(
          (s, i) =>
            `<label><input type="checkbox" name="quick-stage" value="${i}" checked> ${s}</label>`,
        )
        .join("") +
      '</details><p class="note">Les dates des tâches sont proposées autour de la date principale selon le type de projet. Elles restent modifiables ; aucun message n’est envoyé.</p>' +
      field("budget", "Enveloppe (€) — facultatif", "number", 0),
    (data, form) => {
      const count = Math.max(
        0,
        Math.min(5, Math.floor(Number(data.lookCount) || 0)),
      );
      const p = {
        id: uid(),
        name:
          data.projectName.trim() ||
          [data.type, data.client].filter(Boolean).join(" · "),
        client: data.client,
        date: data.date,
        type: data.type,
        status: "Préparation",
        budget: Number(data.budget) || 0,
        brief: "",
        tone: "sage",
        boards: [],
        looks: [],
      };
      const categories = [
        ...form.querySelectorAll('[name="quick-need"]:checked'),
      ].map((el) => el.value);
      for (let i = 0; i < count; i++) {
        const id = uid(),
          variant = uid();
        p.looks.push({
          id,
          name: "Look " + (i + 1),
          person: data.client || "",
          variants: [
            { id: variant, name: "Direction initiale", status: "À comparer" },
          ],
          activeVariant: variant,
          needs: categories.map((c) => ({
            id: uid(),
            name: c,
            category: c,
            state: "À chercher",
            multiple: c === "Bijoux",
          })),
        });
      }
      const schedules = {
        Clip: [-21, -14, -10, -7, -2, 0, 3, 7],
        Éditorial: [-14, -10, -7, -5, -1, 0, 2, 5],
        Tournée: [-45, -30, -21, -14, -7, 0, 7, 14],
        Événement: [-30, -21, -14, -10, -2, 0, 2, 7],
        Collection: [-60, -45, -30, -21, -7, 0, 14, 21],
      };
      const offsets = schedules[data.type] || schedules.Clip;
      for (const el of form.querySelectorAll('[name="quick-stage"]:checked')) {
        const i = Number(el.value);
        let date = "";
        if (data.date) {
          const d = new Date(data.date + "T12:00:00");
          d.setDate(d.getDate() + offsets[i]);
          date = [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0"),
          ].join("-");
        }
        db.tasks.push({
          id: uid(),
          project: p.id,
          name: stages[i],
          date,
          done: false,
          template: true,
        });
      }
      db.projects.push(p);
      pid = p.id;
      view = "detail";
      tab = "overview";
    },
  );
  const count = $('#form [name="lookCount"]');
  count.max = "5";
}
document.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest('[data-action="project"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    quickProjectWizard();
  },
  true,
);

function syncReturnMilestones(projectIds) {
  for (const projectId of projectIds) {
    const loans = db.pieces.filter(
      (x) =>
        x.project === projectId &&
        ["Prêt", "Location"].includes(x.mode) &&
        (x.received ||
          ["Reçu", "Porté", "Retour en cours", "Retourné"].includes(x.status)),
    );
    if (!loans.length) continue;
    const complete = loans.every(
      (x) =>
        x.status === "Retourné" && (!Number(x.caution) || x.cautionReturned),
    );
    db.tasks
      .filter(
        (t) => t.project === projectId && t.name === "Retours et cautions",
      )
      .forEach((t) => {
        t.done = complete;
        t.automatic = true;
      });
  }
}
