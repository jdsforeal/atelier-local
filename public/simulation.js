// Workflow views are available to personal records as well as to the simulation.
const workspaceRender = render,
  originalMessages = messages,
  originalPieceForm = pieceForm;
function canCloseProject(p) {
  const items = db.pieces.filter(
    (x) =>
      x.project === p.id &&
      x.commit &&
      !["Écarté", "Indisponible"].includes(x.status),
  );
  return (
    items.every(
      (x) => !["Prêt", "Location"].includes(x.mode) || x.status === "Retourné",
    ) &&
    items.every((x) => !Number(x.caution) || x.cautionReturned) &&
    db.tasks
      .filter((t) => t.project === p.id && t.name !== "Bilan et clôture")
      .every((t) => t.done) &&
    db.expenses
      .filter((e) => e.project === p.id)
      .every((e) => ["Payé", "Annulé"].includes(e.state))
  );
}
function closeProjectRecord(p) {
  p.status = "Terminé";
  p.closed = new Date().toISOString().slice(0, 10);
  p.history?.forEach((s) => (s.done = true));
  db.tasks.filter((t) => t.project === p.id).forEach((t) => (t.done = true));
  db.requests
    .filter((r) => r.project === p.id)
    .forEach((r) => (r.status = "Clôturée"));
}
function workflowView(p) {
  const stage = p.history || [];
  const items = db.pieces.filter((x) => x.project === p.id && x.commit);
  const loans = items.filter((x) => ["Prêt", "Location"].includes(x.mode));
  const returned = loans.filter((x) => x.status === "Retourné").length;
  return `<div class="workflow-summary"><div><strong>${p.status === "Terminé" ? "Projet clôturé" : "Projet " + esc(p.status.toLowerCase())}</strong><p>${p.status === "Terminé" ? "Les demandes, retours et frais de ce scénario sont clôturés." : "Le suivi du projet, du brief au dernier retour."}</p></div><span class="tag">${returned}/${loans.length} prêts et locations retournés</span></div>${stage.length ? `<ol class="timeline">${stage.map((s) => `<li class="${s.done ? "complete" : ""}"><span class="step-dot">${s.done ? "✓" : "○"}</span><div><strong>${esc(s.label)}</strong><small>${date(s.date)} · ${s.done ? "Fait" : "Prévu"}</small><p>${esc(s.detail)}</p></div></li>`).join("")}</ol>` : '<div class="empty">L’historique détaillé est disponible dans les projets de simulation. Ajoutez vos tâches pour suivre ce projet.</div>'}<div class="panel"><h2>Bilan du projet</h2><p>${p.status === "Terminé" ? esc(p.closed ? "Clôture le " + date(p.closed) : "Projet archivé") : canCloseProject(p) ? "Toutes les conditions de clôture sont remplies." : "Pour clôturer : terminer les tâches, retourner les prêts et locations, confirmer les cautions restituées et les frais payés."}</p><div class="actions"><button data-tab="returns">Voir les retours</button><button data-tab="budget">Voir le budget</button>${p.status !== "Terminé" ? '<button class="primary" data-close-project>Clôturer le projet</button>' : ""}</div></div>`;
}
function returnsView(p) {
  const list = db.pieces.filter(
    (x) =>
      x.project === p.id &&
      x.commit &&
      ["Prêt", "Location"].includes(x.mode) &&
      !["Écarté", "Indisponible"].includes(x.status),
  );
  return `<div class="section-head"><h2>Prêts, locations et cautions</h2><span class="tag">${list.filter((x) => x.status !== "Retourné").length} retours ouverts</span></div><div class="return-list">${
    list
      .map((x) => {
        const overdue =
          x.returnDue &&
          x.returnDue < new Date().toISOString().slice(0, 10) &&
          x.status !== "Retourné";
        return `<article class="panel return-card ${overdue ? "over-budget" : ""}"><img src="${esc(x.image || "")}" alt="${esc(x.name)}"><div><small>${esc(x.brand)} · ${esc(p.looks.find((l) => l.id === x.look)?.name || "")}</small><h3>${esc(x.name)}</h3><p>Réception : ${date(x.received)} · retour prévu : ${date(x.returnDue)}</p><p>${x.returned ? "Retourné le " + date(x.returned) : overdue ? "Retour en retard" : "Retour à organiser"}</p><small>Caution : ${euro(x.caution)} ${x.caution ? "· " + (x.cautionReturned ? "restituée" : "à récupérer") : ""}</small></div><span class="tag ${overdue ? "amber" : ""}">${esc(x.status)}</span><button data-edit-piece="${esc(x.id)}">Mettre à jour</button></article>`;
      })
      .join("") ||
    '<div class="empty">Aucun prêt ou location engagé pour ce projet.</div>'
  }</div>`;
}
messages = function (p) {
  const requests = db.requests.filter((r) => r.project === p.id);
  return `<div class="section-head"><h2>Demandes et réponses</h2><span class="tag">${requests.length} conversations</span></div><p class="note">${demoMode ? "Journal entièrement fictif : aucun e-mail envoyé ni réponse réelle reçue." : "Journal de suivi manuel. La messagerie n’est pas connectée."}</p><div class="request-grid">${requests
    .map((r) => {
      const c = db.contacts.find((c) => c.id === r.contact);
      return `<article class="panel"><div class="section-head" style="margin:0 0 12px"><h3>${esc(contactLabel(c || {}))}</h3><span class="tag">${esc(r.status)}</span></div><p class="note">${r.pieces
        .map((id) => db.pieces.find((x) => x.id === id)?.name)
        .filter(Boolean)
        .map(esc)
        .join(
          " · ",
        )}</p><ul class="exchange-history">${(r.history || []).map((e) => `<li><small>${date(e.date)}</small>${esc(e.text)}</li>`).join("")}</ul><p class="note">${esc(r.note)}${r.followup ? " Relance prévue : " + date(r.followup) : ""}</p><button class="quiet" data-edit-request="${esc(r.id)}">Modifier le suivi</button></article>`;
    })
    .join(
      "",
    )}</div><details class="draft-disclosure"><summary>Préparer une nouvelle demande personnalisée</summary>${originalMessages(p)}</details>`;
};
pieceForm = function (x = {}) {
  return (
    (x.image
      ? `<div class="piece-detail-preview"><img src="${esc(x.image)}" alt="${esc(x.name)}"><div><strong>${esc(x.brand)}</strong>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Fiche officielle ↗</a>` : ""}<small>Prix public observé : ${esc(x.publicPrice || "Non renseigné")} · ${esc(x.checked || "")}</small><small>${esc(x.composition || "Composition à confirmer")}</small><small>Matières animales : ${esc(x.animal || "Inconnu")} · fabrication : ${esc(x.origin || "Inconnue")}</small></div></div>`
      : "") +
    originalPieceForm(x) +
    field("size", "Taille / mesures", "text", x.size || "") +
    field("received", "Réception", "date", x.received || "") +
    field("returnDue", "Retour prévu", "date", x.returnDue || "") +
    field("returned", "Retour effectué", "date", x.returned || "") +
    field(
      "cautionReturned",
      "Caution",
      "select",
      x.cautionReturned ? "Oui" : "Non",
      [
        ["Non", "À récupérer / non applicable"],
        ["Oui", "Restituée"],
      ],
    )
  );
};
render = function () {
  workspaceRender();
  if (view === "home") {
    const active = db.projects.filter(
      (p) => !["Terminé", "Annulé", "En pause"].includes(p.status),
    );
    const old = $(".hero-copy p");
    if (old)
      old.textContent = `${active.length} projets actifs · ${db.projects.filter((p) => p.status === "Terminé").length} terminés. ${db.tasks.filter((t) => !t.done && active.some((p) => p.id === t.project)).length} actions à suivre.`;
    const tasks = $(".split .panel");
    if (tasks)
      tasks.innerHTML =
        '<div class="section-head" style="margin-top:0"><h2>À suivre</h2><button data-action="task">＋ Action</button></div>' +
        tasklist(
          db.tasks
            .filter((t) => !t.done && active.some((p) => p.id === t.project))
            .slice(0, 8),
        );
  }
  if (view === "projects") {
    const finished = db.projects.filter((p) => p.status === "Terminé").length;
    $(".title-row").insertAdjacentHTML(
      "afterend",
      `<div class="studio-stats"><button data-scope="Actifs"><strong>${db.projects.filter((p) => !["Terminé", "Annulé", "En pause"].includes(p.status)).length}</strong>Actifs</button><button data-scope="Préparation"><strong>${db.projects.filter((p) => p.status === "Préparation").length}</strong>En préparation</button><button data-scope="En cours"><strong>${db.projects.filter((p) => ["Recherche", "Production", "Retours"].includes(p.status)).length}</strong>En cours</button><button data-scope="Archives"><strong>${finished}</strong>Terminés</button></div>`,
    );
    document.querySelectorAll(".project-tile").forEach((tile) => {
      const p = db.projects.find((p) => p.id === tile.dataset.project);
      if (p?.cover)
        tile.querySelector(".tile-top").style.backgroundImage =
          `linear-gradient(0deg,rgba(25,30,25,.45),rgba(25,30,25,.05)),url("${p.cover}")`;
    });
  }
  if (view === "detail") {
    const p = project();
    for (const [id, label] of [
      ["workflow", "Parcours & bilan"],
      ["returns", "Retours"],
    ])
      $(".tabs").insertAdjacentHTML(
        "beforeend",
        `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`,
      );
    if (tab === "workflow")
      $("#content").insertAdjacentHTML("beforeend", workflowView(p));
    if (tab === "returns")
      $("#content").insertAdjacentHTML("beforeend", returnsView(p));
    if (tab === "overview")
      $(".split").insertAdjacentHTML(
        "beforebegin",
        `<div class="workflow-summary"><div><strong>${esc(p.type || "Projet")} · ${esc(p.season || "")} · ${esc(p.status)}</strong><p>Validation client : ${esc(p.validation || "À demander")}${p.closed ? " · clôturé le " + date(p.closed) : ""}</p></div><button data-tab="workflow">${p.status === "Terminé" ? "Voir le bilan" : "Voir le parcours"} →</button></div>`,
      );
    if (tab === "looks")
      document.querySelectorAll("#content .cards .card").forEach((card, i) => {
        const items = db.pieces
          .filter(
            (x) =>
              x.project === p.id &&
              x.look === p.looks[i].id &&
              x.status !== "Écarté",
          )
          .slice(0, 4);
        card
          .querySelector(".card-body")
          .insertAdjacentHTML(
            "afterbegin",
            `<div class="look-images">${items.map((x) => `<img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">`).join("")}</div>`,
          );
      });
    if (tab === "mood")
      document.querySelectorAll(".board figcaption").forEach((cap, i) => {
        if (p.boards[i]?.url)
          cap.insertAdjacentHTML(
            "beforeend",
            ` <a href="${esc(p.boards[i].url)}" target="_blank" rel="noopener">Source officielle ↗</a>`,
          );
      });
    if (tab === "budget")
      $(".budget-grid .panel:last-child small").textContent =
        "Cautions à récupérer";
    if (tab === "quote") {
      const q = db.quotes.find((q) => q.project === p.id);
      if (q)
        $(".quote-panel .eyebrow").textContent =
          `${q.number || "CHIFFRAGE"} · VERSION ${q.version || 1} · ${q.status || "BROUILLON"}`;
    }
  }
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.scope) {
    projectScope = b.dataset.scope;
    projectPage = 0;
    view = "projects";
    render();
  }
  if (b.dataset.closeProject !== undefined) {
    const p = project();
    if (!canCloseProject(p)) {
      toast(
        "Clôture impossible : vérifiez les tâches, frais, retours et cautions.",
      );
      return;
    }
    closeProjectRecord(p);
    save();
    render();
    toast("Projet clôturé et ajouté aux archives.");
  }
  if (b.dataset.editRequest) {
    const r = db.requests.find((r) => r.id === b.dataset.editRequest);
    modal(
      "Suivi de la demande",
      field(
        "status",
        "Statut",
        "select",
        r.status,
        ["Brouillon", "En attente", "Confirmée", "Refusée", "Clôturée"].map(
          (x) => [x, x],
        ),
      ) +
        field("followup", "Prochaine relance", "date", r.followup || "") +
        field("note", "Notes", "textarea", r.note || ""),
      (d) => Object.assign(r, d),
    );
  }
});
render();
