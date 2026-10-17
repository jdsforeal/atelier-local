/** Atelier : planches de sélection versionnées et suivi en parallèle des fournisseurs. */
let clientBoardVersion = "";
function flowCurrentItems(p) {
  return db.pieces.filter(
    (x) =>
      x.project === p.id &&
      x.clientVisible !== false &&
      x.selection !== "Écartée" &&
      x.status !== "Écarté",
  );
}
function clientBoardMarkup(p) {
  const versions = (db.clientBoards || []).filter((x) => x.project === p.id);
  const snapshot = versions.find((x) => x.id === clientBoardVersion);
  const board = snapshot || flowSnapshot(db, p, p.clientBoardPrices === true);
  return `<section class="client-board-workspace"><div class="section-head"><div><div class="eyebrow">SÉLECTION CLIENT · LOOKS ET ALTERNATIVES</div><h2>${snapshot ? "Version conservée" : "Planche en préparation"}</h2><p>Composez pendant les demandes de disponibilité. Les décisions client sont enregistrées séparément des réservations.</p></div><div class="actions"><button data-flow-freeze ${!board.looks.some((l) => l.pieces.length) || snapshot ? "disabled" : ""}>Conserver une nouvelle version</button><button data-flow-pdf ${!board.looks.some((l) => l.pieces.length) ? "disabled" : ""}>Prévisualiser la sélection PDF</button><button data-tab="messages">Demandes fournisseurs</button></div></div>
  <div class="toolbar"><select id="client-board-version" aria-label="Version de la sélection client"><option value="">Préparation en direct</option>${versions
    .slice()
    .reverse()
    .map(
      (v, i) =>
        `<option value="${esc(v.id)}" ${v === snapshot ? "selected" : ""}>Version ${versions.indexOf(v) + 1} · ${date(v.createdAt.slice(0, 10))} · ${esc(v.status)}</option>`,
    )
    .join(
      "",
    )}</select>${!snapshot ? `<label><input type="checkbox" id="client-board-prices" ${p.clientBoardPrices ? "checked" : ""}> Montrer les coûts au client</label>` : `<button data-flow-validate="${esc(snapshot.id)}">Enregistrer la réponse du client</button><button data-flow-sent="${esc(snapshot.id)}">Marquer comme transmise</button>`}</div>
  ${snapshot && snapshot.source !== flowFingerprint(p, flowCurrentItems(p)) ? '<p class="finance-alert">Le projet a changé depuis cette version. Elle reste intacte ; préparez une nouvelle version pour transmettre les changements.</p>' : ""}
  ${board.looks
    .map(
      (l) =>
        `<section class="panel client-look"><div class="eyebrow">LOOK</div><h2>${esc(l.name)}</h2>${l.needs
          .map(
            (n) =>
              `<h3>${esc(n.name)}${n.multiple ? " · composition multiple" : ""}</h3><div class="choices-grid">${
                l.pieces
                  .filter((x) => x.needId === n.id)
                  .map((x) => clientOptionMarkup(x, l, board, snapshot))
                  .join("") || '<p class="note">Aucune option présentée.</p>'
              }</div>`,
          )
          .join("")}${
          l.pieces.some((x) => !l.needs.some((n) => n.id === x.needId))
            ? `<h3>Autres pièces</h3><div class="choices-grid">${l.pieces
                .filter((x) => !l.needs.some((n) => n.id === x.needId))
                .map((x) => clientOptionMarkup(x, l, board, snapshot))
                .join("")}</div>`
            : ""
        }</section>`,
    )
    .join("")}
  ${snapshot ? (snapshot.validations || []).map((v) => `<p class="note">Validation saisie par le studio : ${esc(v.client)} · ${new Date(v.date).toLocaleString("fr-FR")} · ${v.ids.length} pièce(s). ${esc(v.note)}</p>`).join("") : ""}</section>`;
}
function clientOptionMarkup(x, l, board, frozen) {
  return `<article class="choice-card ${x.selection === "Retenue" ? "retained" : ""}">${x.image ? `<img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">` : art(0)}<div class="choice-body"><small>${esc(x.brand || "")}</small><h3>${esc(x.name)}</h3><p>${esc(l.variants.find((v) => v.id === x.variantId)?.name || "Commune aux pistes")}</p><span class="tag">${esc(x.selection || "À comparer")}</span><p>${esc(x.mode)} · ${esc(x.availability)}${board.showPrices ? " · " + euro(x.price) : ""}</p>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Référence ↗</a>` : ""}${!frozen ? `<button data-flow-hide="${esc(x.id)}">Masquer de la présentation</button>` : ""}</div></article>`;
}
function flowActionsMarkup(p) {
  const pieces = db.pieces.filter((x) => x.project === p.id),
    selected = flowSelected(db, p),
    obligations = flowObligations(db, p);
  const unresolved = selected.filter(
    (x) =>
      !["Disponible", "Réservée", "Stock du studio"].includes(
        flowAvailability(x, p),
      ),
  );
  const incoming = selected.filter(
    (x) =>
      !x.commit &&
      !x.stockOwned &&
      !["Indisponible"].includes(flowAvailability(x, p)),
  );
  const clientChanged =
    p.clientSelectionIds &&
    JSON.stringify([...p.clientSelectionIds].sort()) !==
      JSON.stringify(selected.map((x) => x.id).sort());
  const changed = (db.supplierDrafts || []).filter(
    (d) =>
      d.project === p.id &&
      (d.sentAt || d.deliveryState) &&
      d.signature !==
        mailGroupSignature(p, {
          pieces: pieces.filter((x) => (d.pieces || []).includes(x.id)),
        }),
  );
  return `<section class="panel flow-actions"><div class="section-head"><h2>À faire maintenant</h2><div class="actions"><button data-flow-dates>Déplacer les dates</button><button data-flow-board>Préparer la sélection client</button></div></div><p>${selected.length} pièces dans le scénario · ${unresolved.length} disponibilités à confirmer · ${incoming.length} acquisitions à confirmer · ${obligations.length} obligations à suivre.</p>${p.status === "Annulé" ? '<p class="finance-alert">Projet annulé : aucune nouvelle demande. Les coûts dus, les retours et les cautions restent à traiter. Les relances serveur ne sont arrêtées qu’après synchronisation avec Gmail.</p>' : ""}${clientChanged ? '<p class="finance-alert">La sélection a changé depuis la validation client. Vérifiez les remplacements et préparez une nouvelle proposition.</p>' : ""}${changed.length ? `<p class="finance-alert">${changed.length} demande(s) déjà envoyée(s) concernée(s) par des changements : préparez un complément ou une annulation ; le message envoyé reste conservé.</p>` : ""}<details><summary>Achats, locations et points à résoudre</summary>${incoming.map((x) => `<p>${esc(x.mode)} · ${esc(x.name)} · ${esc(flowAvailability(x, p))} · ${euro(x.price)} <button data-flow-piece="${esc(x.id)}">Suivi rapide</button></p>`).join("")}${obligations.map((x) => `<p>À solder · ${esc(x.name)} : ${x.commit && x.selection !== "Retenue" ? "engagement encore dû · " : ""}${["Prêt", "Location"].includes(x.mode) && x.status !== "Retourné" ? "retour à confirmer · " : ""}${x.caution && !x.cautionReturned ? "caution à récupérer" : ""} <button data-edit-piece="${esc(x.id)}">Détails</button></p>`).join("")}</details></section>`;
}
const flowPreviousRender = render;
render = function () {
  if (view === "detail" && tab === "client-board") {
    tab = "looks";
    flowPreviousRender();
    tab = "client-board";
    document
      .querySelectorAll(".tabs button")
      .forEach((x) => x.classList.remove("active"));
  } else flowPreviousRender();
  if (view !== "detail") return;
  const p = project();
  $(".tabs").insertAdjacentHTML(
    "beforeend",
    `<button data-flow-board class="${tab === "client-board" ? "active" : ""}">Sélection client</button>`,
  );
  if (tab === "client-board") {
    const content = $("#content");
    const tabs = content.querySelector(".tabs");
    while (tabs.nextSibling) tabs.nextSibling.remove();
    content.insertAdjacentHTML("beforeend", clientBoardMarkup(p));
  }
  if (tab === "overview")
    $("#content").insertAdjacentHTML("beforeend", flowActionsMarkup(p));
  if (tab === "looks") {
    $(".process-guide").innerHTML =
      '<summary>Aide et raccourcis du projet</summary><strong>Créer et vérifier en parallèle</strong><p>Importez vos options, préparez les demandes fournisseurs et composez la sélection client dès maintenant. Une validation créative ne réserve pas la pièce.</p><button data-flow-board>Préparer la sélection client</button><button data-tab="messages">Vérifier les disponibilités</button>';
    document.querySelectorAll("[data-edit-piece]").forEach((b) => {
      const x = db.pieces.find((x) => x.id === b.dataset.editPiece);
      if (x && b.closest(".choice-card"))
        b.insertAdjacentHTML(
          "beforebegin",
          `<button data-flow-piece="${esc(x.id)}">Disponibilité / acquisition</button><button data-flow-link="${esc(x.id)}">Partager avec un autre look</button><button data-flow-present="${esc(x.id)}">${x.clientVisible === false ? "Présenter au client" : "Masquer du client"}</button>`,
        );
    });
    const look = p.looks.find((l) => l.id === choiceLookId);
    if (look)
      $(".variant-summary").insertAdjacentHTML(
        "beforeend",
        `<label>Scénario du budget<select data-flow-scenario="${esc(look.id)}"><option value="">Choix retenus toutes pistes</option>${look.variants.map((v) => `<option value="${esc(v.id)}" ${look.budgetVariant === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label><p class="note">Choisissez une seule piste pour chiffrer « robe OU haut + bas ». Les engagements restent dus dans toutes les pistes.</p>`,
      );
  }
  if (tab === "messages")
    $("#content").insertAdjacentHTML(
      "beforeend",
      `<details class="panel"><summary>Choisir les pièces à demander — indépendamment de la planche client</summary><p>Les pièces cochées alimentent les brouillons par fournisseur. Tout changement impose une nouvelle relecture ; aucun mail ne part ici.</p>${db.pieces
        .filter(
          (x) =>
            x.project === p.id &&
            x.selection !== "Écartée" &&
            !["Écarté", "Retourné", "Conservé"].includes(x.status),
        )
        .map(
          (x) =>
            `<label><input type="checkbox" data-flow-request="${esc(x.id)}" ${x.requestAvailability !== false ? "checked" : ""}> ${esc(x.name)} · ${esc(flowAvailability(x, p))}</label>`,
        )
        .join("")}</details>`,
    );
};
function flowPieceModal(x) {
  const p = project();
  if (["Terminé", "Annulé"].includes(p.status))
    return toast("Rouvrez le projet pour modifier ses acquisitions.");
  modal(
    "Disponibilité et acquisition",
    field(
      "availability",
      "Réponse fournisseur",
      "select",
      flowAvailability(x, p),
      [
        "À demander",
        "En attente",
        "Disponible",
        "Indisponible",
        "À reconfirmer",
        "Réservée",
        "Stock du studio",
      ].map((v) => [v, v]),
    ) +
      field(
        "commit",
        "Engagement financier",
        "select",
        x.commit ? "keep" : "no",
        [
          ["no", "Non engagé"],
          ["keep", "Achat / location engagé(e)"],
          ...(x.commit ? [["release", "Annulation confirmée sans frais"]] : []),
        ],
      ) +
      field(
        "note",
        "Précision fournisseur (facultatif)",
        "textarea",
        x.availabilityNote || "",
      ) +
      '<p class="note">Disponible ne signifie pas réservé. Une dépense déjà engagée reste due tant que son annulation sans frais n’est pas confirmée.</p>',
    (d) => {
      x.availability = d.availability;
      x.availabilityDate = p.date;
      x.availabilityNote = d.note;
      if (d.commit === "keep") x.commit = true;
      if (d.commit === "release") x.commit = false;
      if (!x.commit && d.availability === "Indisponible")
        x.selection = "À comparer";
    },
  );
}
document.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  try {
    const p = view === "detail" ? project() : null;
    if (b.hasAttribute("data-flow-board")) {
      tab = "client-board";
      clientBoardVersion = "";
      render();
    }
    if (b.dataset.flowPiece)
      flowPieceModal(db.pieces.find((x) => x.id === b.dataset.flowPiece));
    if (b.dataset.flowPresent || b.dataset.flowHide) {
      const x = db.pieces.find(
        (x) => x.id === (b.dataset.flowPresent || b.dataset.flowHide),
      );
      x.clientVisible = b.dataset.flowHide ? false : x.clientVisible === false;
      save();
      render();
    }
    if (b.hasAttribute("data-flow-freeze")) {
      const v = flowSnapshot(db, p, p.clientBoardPrices === true);
      v.project = p.id;
      (db.clientBoards ??= []).push(v);
      clientBoardVersion = v.id;
      save();
      render();
    }
    if (b.dataset.flowSent) {
      const v = db.clientBoards.find((x) => x.id === b.dataset.flowSent);
      v.status = "Transmise";
      v.sentAt = new Date().toISOString();
      save();
      render();
      toast("Transmission enregistrée ; aucun message envoyé par Atelier.");
    }
    if (b.dataset.flowValidate) {
      const v = db.clientBoards.find((x) => x.id === b.dataset.flowValidate);
      const rows = [
        ...new Map(
          v.looks.flatMap((l) => l.pieces).map((x) => [x.id, x]),
        ).values(),
      ];
      modal(
        "Enregistrer la validation du client",
        field("client", "Nom du client ayant répondu") +
          field(
            "note",
            "Réponse / référence du message (facultatif)",
            "textarea",
          ) +
          rows
            .map(
              (x) =>
                `<label><input type="checkbox" name="approved-piece" value="${esc(x.id)}" ${x.selection === "Retenue" ? "checked" : ""}> ${esc(
                  v.looks
                    .filter((l) => l.pieces.some((piece) => piece.id === x.id))
                    .map((l) => l.name)
                    .join(" / "),
                )} · ${esc(x.name)} · ${esc(x.mode)}</label>`,
            )
            .join("") +
          '<p class="note">Cette saisie consigne la réponse reçue. Elle ne confirme pas la disponibilité et ne déclenche aucun achat.</p>',
        (d, f) =>
          flowApplyValidation(
            db,
            p,
            v,
            [...f.querySelectorAll('[name="approved-piece"]:checked')].map(
              (x) => x.value,
            ),
            d.client,
            d.note,
          ),
      );
    }
    if (b.dataset.flowLink) {
      const x = db.pieces.find((x) => x.id === b.dataset.flowLink);
      modal(
        "Une acquisition pour plusieurs looks",
        field("target", "Look et besoin", "select", "", [
          ["", "Choisir"],
          ...p.looks.flatMap((l) =>
            l.needs
              .filter(
                (n) =>
                  !flowUses(x).some(
                    (u) => u.look === l.id && u.needId === n.id,
                  ),
              )
              .map((n) => [l.id + "|" + n.id, l.name + " / " + n.name]),
          ),
        ]) +
          '<p class="note">Même pièce physique, même coût et même retour. Pour une autre taille ou un autre exemplaire, ajoutez une nouvelle pièce.</p>',
        (d) => {
          if (!d.target) throw Error("Choisissez un besoin.");
          const [look, needId] = d.target.split("|");
          (x.lookUses ??= []).push({ look, needId });
        },
      );
    }
    if (b.hasAttribute("data-flow-dates"))
      modal(
        "Déplacer le projet",
        field("date", "Nouvelle date principale", "date", p.date) +
          field("shift", "Échéances non terminées", "select", "yes", [
            [
              "yes",
              "Décaler les tâches, réceptions prévues et retours du même nombre de jours",
            ],
            ["no", "Conserver les échéances et les vérifier manuellement"],
          ]) +
          '<p class="note">Les réservations et disponibilités confirmées seront à reconfirmer. Les dates réelles de réception et de retour restent conservées.</p>',
        (d) => flowMoveDates(db, p, d.date, d.shift === "yes"),
      );
    if (b.hasAttribute("data-flow-pdf")) {
      b.disabled = true;
      const v =
        (db.clientBoards || []).find((x) => x.id === clientBoardVersion) ||
        flowSnapshot(db, p, p.clientBoardPrices === true);
      await exportClientSelection(v);
      if (!clientBoardVersion) {
        v.project = p.id;
        v.status = "Prévisualisée";
        (db.clientBoards ??= []).push(v);
        clientBoardVersion = v.id;
        save();
        render();
      }
      b.disabled = false;
    }
  } catch (error) {
    toast(error.message);
    b.disabled = false;
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "client-board-version") {
    clientBoardVersion = el.value;
    render();
  }
  if (el.id === "client-board-prices") {
    project().clientBoardPrices = el.checked;
    save();
    render();
  }
  if (el.dataset.flowRequest) {
    db.pieces.find((x) => x.id === el.dataset.flowRequest).requestAvailability =
      el.checked;
    save();
    render();
  }
  if (el.dataset.flowScenario) {
    project().looks.find(
      (x) => x.id === el.dataset.flowScenario,
    ).budgetVariant = el.value;
    save();
    render();
  }
});
render();

/** Versions client du devis : le document accepté n'est jamais réécrit par les choix. */
function flowQuoteCostKey(p) {
  return JSON.stringify(
    quoteForecastLines(p)
      .map((x) => [x.source, x.sourceId, x.rate])
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]))),
  );
}
const flowQuoteRender = render;
render = function () {
  flowQuoteRender();
  if (view !== "detail" || tab !== "quote") return;
  const p = project(),
    q = db.quotes.find((x) => x.project === p.id);
  if (!q) return;
  q.costBaseline ??= flowQuoteCostKey(p);
  const changed = q.costBaseline !== flowQuoteCostKey(p);
  $(".quote-panel").insertAdjacentHTML(
    "beforebegin",
    `<section class="panel"><div class="section-head"><h3>Versions du devis client</h3><button data-flow-save-quote>Conserver une version client</button></div>${changed ? '<p class="finance-alert">Les coûts ou les pièces ont changé depuis la dernière référence de ce devis. Vérifiez les écarts et reprenez la prévision si nécessaire. Les versions client conservées restent intactes.</p>' : ""}<p class="note">Le document ci-dessous reste votre brouillon de travail. Conservez une version avant de la transmettre ou après acceptation.</p>${(
      db.quoteVersions || []
    )
      .filter((v) => v.project === p.id && v.clientRecord)
      .map(
        (v) =>
          `<p>Version ${v.version || 1} · ${esc(v.clientRecord)} · ${date(v.savedAt.slice(0, 10))} · ${euro(v.lines.reduce((n, l) => n + l.qty * l.rate, 0))} HT <button data-flow-old-quote="${esc(v.archiveId)}">Prévisualiser cette version</button></p>`,
      )
      .join("")}</section>`,
  );
};
document.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-flow-save-quote")) {
    const p = project(),
      q = db.quotes.find((x) => x.project === p.id);
    modal(
      "Conserver le devis client",
      field("state", "État constaté", "select", "Préparé", [
        ["Préparé", "Préparé pour le client"],
        ["Transmis", "Transmis au client"],
        ["Accepté", "Accepté par le client"],
      ]) +
        field(
          "evidence",
          "Référence / réponse du client (facultatif)",
          "textarea",
        ) +
        '<p class="note">Cette action conserve une copie ; elle n’envoie rien et ne vaut pas signature.</p>',
      (d) => {
        const snapshot = structuredClone(q);
        snapshot.savedAt = new Date().toISOString();
        snapshot.archiveId = uid();
        snapshot.clientRecord = d.state;
        snapshot.evidence = d.evidence;
        (db.quoteVersions ??= []).push(snapshot);
        q.version = (q.version || 1) + 1;
        q.status = "Brouillon";
        q.costBaseline = flowQuoteCostKey(p);
      },
    );
  }
  if (b.dataset.flowOldQuote) {
    try {
      const q = db.quoteVersions.find(
        (x) => x.archiveId === b.dataset.flowOldQuote,
      );
      const pages = quotePdfPages(project(), q, db.quoteSettings || {});
      previewDocument(
        pages,
        "Atelier-devis-version-" + q.version + ".pdf",
        "Devis conservé · version " + q.version,
      );
    } catch (error) {
      toast(error.message);
    }
  }
});
// Une reprise explicite des coûts fixe une nouvelle référence après l'enregistrement du formulaire.
const flowSubmitModal = modal;
modal = function (name, fields, fn) {
  return flowSubmitModal(name, fields, async (d, f) => {
    const result = await fn(d, f);
    if (name === "Actualiser le chiffrage depuis le projet") {
      const p = project(),
        q = db.quotes.find((x) => x.project === p.id);
      if (q) q.costBaseline = flowQuoteCostKey(p);
    }
    return result;
  });
};
render();

/** Réconcilier les étapes dérivées sans transformer une réponse mail en réservation. */
function reconcileProjectFlow(p) {
  const selected = flowSelected(db, p);
  for (const l of p.looks)
    for (const n of l.needs) {
      const items = db.pieces.filter(
        (x) =>
          x.project === p.id &&
          flowUses(x).some((u) => u.look === l.id && u.needId === n.id) &&
          x.selection !== "Écartée",
      );
      if (items.length)
        n.state = selected.some((x) =>
          flowUses(x).some((u) => u.look === l.id && u.needId === n.id),
        )
          ? "Retenu"
          : "À chercher";
    }
  for (const d of (db.supplierDrafts || []).filter(
    (d) => d.project === p.id && d.sentAt,
  ))
    for (const x of db.pieces.filter((x) => (d.pieces || []).includes(x.id))) {
      if (flowAvailability(x, p) === "À demander" && !p.dateHistory?.length) {
        x.availability = "En attente";
        x.availabilityDate = p.date;
      }
    }
}
const reconciledFlowRender = render;
render = function () {
  if (view === "detail") reconcileProjectFlow(project());
  reconciledFlowRender();
  if (view !== "detail") return;
  const p = project();
  if (tab === "overview") {
    const clashes = db.pieces
      .filter((x) => x.project === p.id && x.stockSourceId)
      .flatMap((x) =>
        db.pieces
          .filter(
            (other) =>
              other.project !== p.id &&
              other.stockSourceId === x.stockSourceId &&
              other.selection === "Retenue",
          )
          .map((other) => ({
            piece: x,
            project: db.projects.find((v) => v.id === other.project),
          })),
      )
      .filter(
        (x) =>
          x.project &&
          x.project.date === p.date &&
          !["Terminé", "Annulé"].includes(x.project.status),
      );
    if (clashes.length)
      $(".flow-actions").insertAdjacentHTML(
        "beforeend",
        `<p class="finance-alert">Stock à vérifier à la même date : ${clashes.map((x) => esc(x.piece.name) + " / " + esc(x.project.name)).join(" · ")}. Vérifiez les horaires et les exemplaires disponibles.</p>`,
      );
  }
};
render();

const flowMailRender = render;
render = function () {
  flowMailRender();
  if (view !== "detail" || tab !== "messages") return;
  for (const row of mailRows(project())) {
    const article = document.querySelector(
      `[data-mail-row="${CSS.escape(row.draft.id)}"]`,
    );
    if (!article || !row.group) continue;
    if (row.draft.stale)
      article.insertAdjacentHTML(
        "beforeend",
        `<p class="finance-alert">La liste ou les dates ont changé. Actualisez le brouillon avant une nouvelle validation.</p><button data-flow-refresh-mail="${esc(row.draft.id)}">Actualiser la liste et le texte</button>`,
      );
    if (mailIsSent(row.draft))
      article.insertAdjacentHTML(
        "beforeend",
        `<button data-flow-followup-mail="${esc(row.draft.id)}">Préparer un complément à cette demande</button>`,
      );
  }
};
document.addEventListener("click", (event) => {
  const b = event.target.closest(
    "[data-flow-refresh-mail],[data-flow-followup-mail]",
  );
  if (!b) return;
  try {
    const p = project(),
      row = mailRows(p).find(
        (r) =>
          r.draft.id ===
          (b.dataset.flowRefreshMail || b.dataset.flowFollowupMail),
      );
    if (!row?.group || ["Terminé", "Annulé"].includes(p.status))
      throw Error("Rouvrez le projet et sélectionnez les pièces à demander.");
    const next = mailDraftFor(
      p,
      row.group,
      null,
      db.mailSettings?.signature || "",
    );
    const extra = !!b.dataset.flowFollowupMail;
    modal(
      extra
        ? "Préparer un complément fournisseur"
        : "Actualiser le brouillon fournisseur",
      field(
        "subject",
        "Objet",
        "text",
        (extra ? "Complément · " : "") + next.subject,
      ) +
        field("body", "Message à relire", "textarea", next.body) +
        '<p class="note">Le texte reprend la liste actuellement cochée dans les demandes. Ajustez-le avant validation. Le message précédent est conservé ; rien n’est envoyé. Si sa relance est active, arrêtez-la séparément depuis la demande initiale après connexion Gmail.</p>',
      (d) => {
        const old = mailRecord(row.draft);
        if (extra) {
          old.key = "history:" + old.id;
          old.pauseRequested = true;
          p.mailRevision = (p.mailRevision || 0) + 1;
          next.id = next.id + "-complement-" + uid();
          next.previousMessage = old.id;
          (db.supplierDrafts ??= []).push({
            ...next,
            subject: d.subject,
            body: d.body,
            state: "À relire",
            simulation: demoMode,
          });
        } else {
          (old.revisions ??= []).push({
            subject: old.subject,
            body: old.body,
            pieces: old.pieces,
            signature: old.signature,
            date: new Date().toISOString(),
          });
          Object.assign(old, {
            ...next,
            id: old.id,
            subject: d.subject,
            body: d.body,
            state: "À relire",
          });
        }
      },
    );
  } catch (error) {
    toast(error.message);
  }
});
render();

/** Navigation du projet : ordre de lecture, sans imposer d'étapes obligatoires. */
const orderedProjectRender = render;
render = function () {
  orderedProjectRender();
  if (view !== "detail") return;
  const navigation = document.querySelector(".tabs");
  if (!navigation) return;
  const clientButton = navigation.querySelector("[data-flow-board]");
  if (clientButton) clientButton.dataset.tab = "client-board";
  for (const [id, label] of [
    ["overview", "Vue d’ensemble"],
    ["mood", "Moodboard"],
    ["looks", "Looks & besoins"],
    ["client-board", "Sélection client"],
    ["messages", "Demandes fournisseurs"],
    ["quote", "Budget & devis"],
    ["returns", "Réceptions & retours"],
    ["workflow", "Parcours & bilan"],
  ]) {
    const button = navigation.querySelector(`[data-tab="${id}"]`);
    if (!button) continue;
    button.textContent = label;
    button.classList.toggle("active", tab === id);
    navigation.append(button);
  }
  navigation.querySelector('[data-tab="pieces"]')?.remove();
  if (tab === "looks") {
    document
      .querySelector(".process-guide")
      ?.insertAdjacentHTML(
        "beforeend",
        '<button data-tab="pieces">Toutes les pièces du projet →</button>',
      );
  }
  if (tab === "pieces") {
    navigation.querySelector('[data-tab="looks"]')?.classList.add("active");
    navigation.insertAdjacentHTML(
      "afterend",
      '<div class="section-head"><h2>Toutes les pièces du projet</h2><button data-tab="looks">← Revenir aux looks & besoins</button></div>',
    );
  }
};
render();
