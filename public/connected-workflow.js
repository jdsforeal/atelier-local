/** Budget vivant et planches exportables : les écrans lisent les mêmes données du projet. */
function moodboardMarkup(p) {
  return `<div class="toolbar"><button data-import-inspirations>＋ Importer plusieurs images</button><button data-board-selection>Ajouter les pièces retenues</button><select id="board-layout" aria-label="Composition du moodboard">${opts(["Éditorial", "Grille"], p.boardLayout || "Éditorial")}</select><button class="primary" data-export-moodboard ${p.boards.length ? "" : "disabled"}>Prévisualiser le PDF</button></div>
    <p class="note">Images, descriptions et liens sont facultatifs et modifiables après import. Le PDF contient uniquement les planches, avec des liens sources cliquables.</p>
    <div class="editorial-board ${p.boardLayout === "Grille" ? "grid-layout" : ""}">${p.boards.map((b, i) => `<figure><img src="${esc(b.image)}" alt="${esc(b.caption || "Inspiration " + (i + 1))}"><figcaption><small>${String(i + 1).padStart(2, "0")}</small><p>${esc(b.caption || "Sans légende")}</p>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}<div class="actions"><button data-edit-inspiration="${i}">Légende / lien</button><button data-remove-board="${i}" aria-label="Supprimer l’inspiration ${i + 1}">Retirer</button></div></figcaption></figure>`).join("")}</div>
    ${p.boards.length ? "" : '<div class="empty">Importez vos références en une fois, ou reprenez les pièces retenues du projet.</div>'}`;
}
function budgetCards(p) {
  const t = totals(p);
  return `<div class="budget-grid"><div class="panel"><small>Enveloppe du projet</small><strong>${euro(p.budget)}</strong><button class="quiet" data-action="budget-limit">Modifier</button></div><div class="panel"><small>Prévisionnel actualisé</small><strong>${euro(t.forecast)}</strong><small>Engagements + choix non engagés + frais prévus</small></div><div class="panel ${t.remaining < 0 ? "over-budget" : ""}"><small>Disponible prévisionnel</small><strong>${euro(t.remaining)}</strong></div><div class="panel"><small>Déjà engagé / dû</small><strong>${euro(t.costs)}</strong><small>Reste hors engagements : ${euro(t.committedRemaining)}</small></div><div class="panel"><small>Cautions à récupérer — séparées</small><strong>${euro(t.caution)}</strong></div></div>
 <p class="note">Retenir ou remplacer une option recalcule la prévision immédiatement. Les achats et locations déjà engagés restent comptés, même si la pièce est écartée du look, jusqu’à confirmation d’une annulation sans frais.</p>
 <details class="panel"><summary>Comprendre le calcul : pièces et frais</summary><p>Engagé / dû : ${euro(t.costs)} + pièces retenues non engagées : ${euro(t.selectedCost)} + frais prévus non engagés : ${euro(t.plannedExpenses)} = ${euro(t.forecast)}.</p>${db.pieces
   .filter((x) => x.project === p.id && (x.commit || x.selection === "Retenue"))
   .map(
     (x) =>
       `<p>${esc(x.name)} · ${esc(p.looks.find((l) => l.id === x.look)?.name || "Sans look")} : ${euro(x.price)} · ${x.commit ? "engagé / dû" : "prévision"}${x.selection === "Écartée" ? " · écartée du look, coût conservé" : ""} <button data-edit-piece="${esc(x.id)}">Modifier</button></p>`,
   )
   .join("")}</details>`;
}
function importInspirations() {
  const p = project();
  modal(
    "Importer des inspirations",
    '<label>Images (sélection multiple)<input name="inspirationFiles" type="file" multiple accept="image/jpeg,image/png,image/webp" required></label><p class="note">Vous pourrez compléter séparément chaque image après l’import.</p>',
    async (data, form) => {
      const files = [...form.elements.inspirationFiles.files];
      if (!files.length) throw Error("Choisissez au moins une image.");
      const prepared = await prepareImageBatch(files);
      const images = prepared.map((image, index) => ({
        ...image,
        caption: "",
        url: "",
        filename: files[index].name,
      }));
      p.boards.push(...images);
      p.boardRevision = (p.boardRevision || 0) + 1;
    },
  );
}
async function drawMoodboardPages(p) {
  const perPage = p.boardLayout === "Grille" ? 6 : 5;
  const pages = [];
  const load = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(
          Error(
            "Une image distante ne permet pas l’export. Téléchargez-la puis importez son fichier dans le moodboard.",
          ),
        );
      image.src = src;
    });
  const images = await Promise.all(p.boards.map((b) => load(b.image)));
  const text = (ctx, value, x, y, width, lineHeight, maxLines) => {
    const words = String(value || "").split(/\s+/);
    let line = "",
      row = 0;
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width > width && line) {
        ctx.fillText(line, x, y + row * lineHeight, width);
        row++;
        line = word;
        if (row >= maxLines - 1) break;
      } else line = next;
    }
    if (row < maxLines) ctx.fillText(line, x, y + row * lineHeight, width);
  };
  for (let start = 0; start < p.boards.length; start += perPage) {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1273;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f7f5ef";
    ctx.fillRect(0, 0, 1800, 1273);
    ctx.fillStyle = "#292d26";
    ctx.font = "24px Arial";
    ctx.fillText("ATELIER / DIRECTION ARTISTIQUE", 60, 52);
    ctx.font = "52px Georgia";
    text(ctx, p.name, 60, 116, 1450, 55, 1);
    ctx.font = "22px Arial";
    ctx.fillText(String(p.client || ""), 60, 154, 1500);
    ctx.strokeStyle = "#b6baab";
    ctx.beginPath();
    ctx.moveTo(60, 178);
    ctx.lineTo(1740, 178);
    ctx.stroke();
    const links = [];
    const boards = p.boards.slice(start, start + perPage);
    const gap = 24,
      top = 204,
      height = 938;
    const cells = boards.map((b, i) => {
      if (p.boardLayout === "Grille")
        return {
          x: 60 + (i % 3) * 568,
          y: top + Math.floor(i / 3) * 481,
          w: 544,
          h: 457,
        };
      if (i === 0) return { x: 60, y: top, w: 808, h: height };
      const n = i - 1;
      return {
        x: 892 + (n % 2) * 436,
        y: top + Math.floor(n / 2) * 481,
        w: 412,
        h: 457,
      };
    });
    boards.forEach((board, index) => {
      const box = cells[index],
        image = images[start + index],
        captionHeight = 78;
      ctx.fillStyle = "#fff";
      ctx.fillRect(box.x, box.y, box.w, box.h - captionHeight);
      const scale = Math.min(
        (box.w - 24) / image.width,
        (box.h - captionHeight - 24) / image.height,
      );
      ctx.drawImage(
        image,
        box.x + (box.w - image.width * scale) / 2,
        box.y + (box.h - captionHeight - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
      ctx.fillStyle = "#59634e";
      ctx.font = "18px Arial";
      ctx.fillText(
        String(start + index + 1).padStart(2, "0"),
        box.x,
        box.y + box.h - captionHeight + 26,
      );
      ctx.fillStyle = "#292d26";
      ctx.font = "21px Arial";
      text(
        ctx,
        board.caption,
        box.x + 40,
        box.y + box.h - captionHeight + 26,
        box.w - 46,
        26,
        2,
      );
      if (board.url)
        links.push({ ...box, width: box.w, height: box.h, url: board.url });
    });
    ctx.fillStyle = "#6c7067";
    ctx.font = "19px Arial";
    ctx.fillText(
      `Moodboard · version ${p.boardRevision || 1} · ${new Date().toLocaleDateString("fr-FR")}`,
      60,
      1215,
    );
    ctx.textAlign = "right";
    ctx.fillText(
      `${pages.length + 1} / ${Math.ceil(p.boards.length / perPage)}`,
      1740,
      1215,
    );
    ctx.textAlign = "left";
    let jpeg;
    try {
      jpeg = canvas.toDataURL("image/jpeg", 0.94);
    } catch {
      throw Error(
        "Une image bloque l’export. Importez son fichier plutôt qu’un lien distant.",
      );
    }
    pages.push({ jpeg, width: canvas.width, height: canvas.height, links });
  }
  return pages;
}
async function exportMoodboard() {
  const p = project();
  if (!p.boards.length) {
    toast("Ajoutez des inspirations avant d’exporter.");
    return;
  }
  const button = $("[data-export-moodboard]");
  button.disabled = true;
  button.textContent = "Préparation du PDF…";
  try {
    const pages = await drawMoodboardPages(p);
    previewDocument(
      pages,
      "Moodboard-" +
        p.name.replace(/[^\p{L}\p{N} _-]/gu, "") +
        "-v" +
        (p.boardRevision || 1) +
        ".pdf",
      "Moodboard · " + p.name,
    );
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Prévisualiser le PDF";
  }
}
const connectedRender = render;
render = function () {
  connectedRender();
  const notice = $(".notice");
  if (notice)
    notice.firstChild.textContent =
      "0.7 · Budget vivant & moodboards · " +
      (demoMode ? "SIMULATION " : "ESPACE LOCAL ");
  if (view !== "detail") return;
  const p = project();
  if (tab === "mood") {
    const section = $("#content");
    const toolbar = section.querySelector(".toolbar");
    if (toolbar) {
      let next = toolbar.nextSibling;
      while (next) {
        const after = next.nextSibling;
        next.remove();
        next = after;
      }
      toolbar.outerHTML = moodboardMarkup(p);
    }
  }
  if (tab === "budget") {
    $(".budget-grid").outerHTML = budgetCards(p);
    const notes = [...$("#content").querySelectorAll("p.note")];
    for (const note of notes)
      if (note.textContent.startsWith("Les pièces engagées et les frais"))
        note.remove();
  }
  if (tab === "looks") {
    const header = $(".choice-intro");
    $("#content").insertAdjacentHTML(
      "beforeend",
      `<div class="panel"><strong>Prévisionnel : ${euro(totals(p).forecast)} · disponible : ${euro(totals(p).remaining)}</strong><p>Les pièces retenues actualisent ce montant automatiquement. ${euro(totals(p).costs)} restent engagés / dus.</p><button data-tab="budget">Comprendre le budget →</button></div>`,
    );
  }
};
document.addEventListener(
  "click",
  (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    if (b.id === "print-board" || b.hasAttribute("data-export-moodboard")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportMoodboard();
      return;
    }
    if (
      b.dataset.action === "mood" ||
      b.hasAttribute("data-import-inspirations")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      importInspirations();
      return;
    }
    if (b.hasAttribute("data-board-selection")) {
      const p = project();
      const selected = db.pieces.filter(
        (x) => x.project === p.id && x.selection === "Retenue" && x.image,
      );
      const additions = selected.filter(
        (x) => !p.boards.some((b) => b.pieceId === x.id || b.image === x.image),
      );
      p.boards.push(
        ...additions.map((x) => ({
          image: x.image,
          caption: [x.brand, x.name].filter(Boolean).join(" · "),
          url: x.url || "",
          pieceId: x.id,
        })),
      );
      p.boardRevision = (p.boardRevision || 0) + 1;
      save();
      render();
      toast(additions.length + " référence(s) ajoutée(s).");
    }
    if (b.dataset.editInspiration !== undefined) {
      const p = project(),
        board = p.boards[Number(b.dataset.editInspiration)];
      modal(
        "Compléter une inspiration",
        field(
          "caption",
          "Description / intention (facultatif)",
          "textarea",
          board.caption || "",
        ) +
          field(
            "url",
            "Lien vêtement ou source (facultatif)",
            "url",
            board.url || "",
          ),
        (data) => {
          if (data.url && !safeUrl(data.url))
            throw Error("Lien http ou https attendu.");
          Object.assign(board, data);
          p.boardRevision = (p.boardRevision || 0) + 1;
        },
      );
    }
  },
  true,
);
document.addEventListener("change", (event) => {
  if (event.target.id === "board-layout") {
    project().boardLayout = event.target.value;
    project().boardRevision = (project().boardRevision || 0) + 1;
    save();
    render();
  }
});
render();

/** Un devis est une version client : reprise explicite, sans réécrire une version envoyée. */
function quoteForecastLines(p) {
  return [
    ...db.pieces
      .filter(
        (x) =>
          x.project === p.id &&
          (x.commit ||
            (typeof flowSelected === "function"
              ? flowSelected(db, p).some((piece) => piece.id === x.id)
              : x.selection === "Retenue" &&
                !["Écarté", "Indisponible"].includes(x.status))),
      )
      .map((x) => ({
        name: x.name,
        qty: 1,
        rate: Number(x.price) || 0,
        source: "piece",
        sourceId: x.id,
      })),
    ...db.expenses
      .filter((x) => x.project === p.id && x.state !== "Annulé")
      .map((x) => ({
        name: x.name,
        qty: 1,
        rate: Number(x.amount) || 0,
        source: "expense",
        sourceId: x.id,
      })),
  ];
}
const quoteConnectedRender = render;
render = function () {
  quoteConnectedRender();
  if (view === "detail" && tab === "quote" && $(".quote-panel"))
    $(".quote-panel").insertAdjacentHTML(
      "afterbegin",
      '<button data-sync-quote>Reprendre la prévision actuelle → nouvelle version</button><p class="note">Le devis conserve ses tarifs propres. Reprenez explicitement la prévision après un changement de choix ; la version précédente sera conservée.</p>',
    );
};
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-sync-quote]");
  if (!b) return;
  const p = project(),
    q = db.quotes.find((x) => x.project === p.id);
  modal(
    "Actualiser le chiffrage depuis le projet",
    `<p>Pièces et frais de la prévision : ${euro(totals(p).forecast)}. Les cautions restent exclues.</p><p>Choisissez les lignes de votre devis actuel à conserver en plus (prestations, honoraires…). Les autres seront remplacées par les pièces et frais actuels.</p>${q.lines.map((l, i) => `<label><input type="checkbox" name="keep-line" value="${i}" ${/prestation|honoraire|jour|stylisme/i.test(l.name) && !l.source ? "checked" : ""}> ${esc(l.name)} · ${euro(l.qty * l.rate)}</label>`).join("")}`,
    (data, form) => {
      const keep = [...form.querySelectorAll('[name="keep-line"]:checked')].map(
        (el) => q.lines[Number(el.value)],
      );
      (db.quoteVersions ??= []).push(
        JSON.parse(JSON.stringify({ ...q, savedAt: new Date().toISOString() })),
      );
      q.lines = [...quoteForecastLines(p), ...keep];
      q.version = (q.version || 1) + 1;
      q.status = "Brouillon";
    },
  );
});
render();
