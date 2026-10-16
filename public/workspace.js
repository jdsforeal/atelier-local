// A separate sandbox keeps demonstration records out of the personal workspace.
const APP_VERSION = "0.5 · Choix & traçabilité";
const requestedMode = new URLSearchParams(location.search).get("mode");
let demoMode =
  requestedMode === "simulation" ||
  (requestedMode !== "personal" &&
    localStorage.getItem("atelier-demo-active") === "true");
if (["simulation", "personal"].includes(requestedMode)) {
  localStorage.setItem("atelier-demo-active", String(demoMode));
}
const personalDB = db;
if (demoMode) {
  try {
    db = JSON.parse(localStorage.getItem("atelier-demo-v5")) || atelierDemo();
  } catch {
    db = atelierDemo();
  }
}
function normalize() {
  hydrateWorkspace(db, atelierCatalog);
  db.expenses ??= [];
  db.quotes ??= [];
  db.requests ??= [];
  db.contacts.forEach((c) => (c.id ??= uid()));
  db.projects.forEach((p) => {
    p.looks ??= [];
    p.boards ??= [];
    p.budget = Number(p.budget) || 0;
  });
}
normalize();
prepareLookChoices(
  db,
  typeof atelierCatalog !== "undefined" ? atelierCatalog : [],
);
save = () => {
  try {
    localStorage.setItem(
      demoMode ? "atelier-demo-v5" : KEY,
      serializeWorkspace(db, atelierCatalog),
    );
    return true;
  } catch {
    toast("Stockage plein. Exportez une sauvegarde avant de continuer.");
    return false;
  }
};
let contactSearch = "",
  contactPage = 0,
  projectSearch = "",
  projectScope = "Actifs",
  focusedLook = "",
  piecePage = 0,
  projectPage = 0;
const euro = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0,
  );
const totals = (p) => projectFinancials(db, p);
const baseRender = render,
  baseAction = action;
function contactLabel(c) {
  return [c.brand, c.name].filter(Boolean).join(" · ");
}
function contactChooser(value = "") {
  const current = db.contacts.find((c) => c.id === value);
  return `<label>Contact — rechercher par nom ou marque<input name="contactName" list="contact-options" value="${esc(current ? contactLabel(current) : "")}" placeholder="Commencez à écrire un nom…"><datalist id="contact-options">${db.contacts.map((c) => `<option value="${esc(contactLabel(c))}"></option>`).join("")}</datalist></label>`;
}
function searchBar(id, value, placeholder) {
  return `<input id="${id}" type="search" value="${esc(value)}" placeholder="${placeholder}" aria-label="${placeholder}">`;
}
function pager(page, total, size, kind) {
  return `<div class="pagination"><span>${total ? Math.min(page * size + 1, total) : 0}–${Math.min((page + 1) * size, total)} sur ${total}</span><button data-page="${kind}:${page - 1}" ${page === 0 ? "disabled" : ""}>← Précédent</button><button data-page="${kind}:${page + 1}" ${(page + 1) * size >= total ? "disabled" : ""}>Suivant →</button></div>`;
}
function renderContacts() {
  const q = contactSearch.toLocaleLowerCase("fr");
  const list = db.contacts.filter((c) =>
    [c.name, c.brand, c.role, c.city, c.note]
      .join(" ")
      .toLocaleLowerCase("fr")
      .includes(q),
  );
  contactPage = Math.min(
    contactPage,
    Math.max(0, Math.ceil(list.length / 12) - 1),
  );
  return (
    title(
      "Votre réseau.",
      "Retrouvez une personne, une marque ou un showroom.",
      "contact",
      "Ajouter un contact",
    ) +
    `<div class="toolbar">${searchBar("contact-search", contactSearch, "Nom, marque, ville, rôle…")}<span class="result-count">${list.length} contacts</span></div><div class="contact-grid">${list
      .slice(contactPage * 12, (contactPage + 1) * 12)
      .map(
        (c) =>
          `<button class="contact-card" data-edit-contact="${esc(c.id)}"><span class="avatar">${esc(c.name?.[0] || "?")}</span><div><strong>${esc(c.brand || c.name)}</strong>${c.brand ? `<span>${esc(c.name)}</span>` : ""}<small>${esc(c.role || "Rôle à préciser")} · ${esc(c.city || "Ville à préciser")}</small></div><span class="arrow">↗</span></button>`,
      )
      .join(
        "",
      )}</div>${list.length ? pager(contactPage, list.length, 12, "contacts") : '<div class="empty">Aucun contact trouvé. Essayez un autre nom.</div>'}`
  );
}
function renderProjects() {
  const list = db.projects.filter(
    (p) =>
      (p.name + " " + p.client + " " + (p.season || ""))
        .toLowerCase()
        .includes(projectSearch.toLowerCase()) &&
      (projectScope === "Tous" ||
        (projectScope === "Archives"
          ? ["Terminé", "Annulé"].includes(p.status)
          : projectScope === "Préparation"
            ? p.status === "Préparation"
            : projectScope === "En cours"
              ? ["Recherche", "Production", "Retours"].includes(p.status)
              : !["Terminé", "Annulé", "En pause"].includes(p.status))),
  );
  projectPage = Math.min(
    projectPage,
    Math.max(0, Math.ceil(list.length / 12) - 1),
  );
  return (
    title(
      "Un espace pour chaque projet.",
      "Brief, looks, pièces et budget : tout se retrouve ici.",
      "project",
      "Nouveau projet",
    ) +
    `<div class="toolbar">${searchBar("project-search", projectSearch, "Rechercher un projet, un client…")}<select id="project-scope" aria-label="Afficher les projets">${opts(["Actifs", "Préparation", "En cours", "Archives", "Tous"], projectScope)}</select><span class="result-count">${list.length} projets</span></div><div class="cards project-cards">${list
      .slice(projectPage * 12, (projectPage + 1) * 12)
      .map((p, i) => {
        const c = counts(p),
          t = totals(p);
        return `<button class="project-tile" data-project="${esc(p.id)}"><div class="tile-top ${esc(p.tone)}"><span>${esc(p.type || "Projet")}</span><span>${esc(p.season || "")}</span><b>${esc(p.name.slice(0, 1))}</b></div><div class="card-body"><div class="meta"><span>${esc(p.client)}</span><span>${date(p.date)}</span></div><h2>${esc(p.name)}</h2><span class="tag">${esc(p.status)}</span><div class="progress"><i style="width:${c.all ? (c.done / c.all) * 100 : 0}%"></i></div><div class="card-foot"><span>${p.looks.length} looks · ${c.done}/${c.all} besoins</span><span>Ouvrir →</span></div><small>${euro(t.forecast)} prévus / ${euro(p.budget)}</small></div></button>`;
      })
      .join(
        "",
      )}</div>${list.length ? pager(projectPage, list.length, 12, "projects") : '<div class="empty">Aucun projet dans cette vue.</div>'}`
  );
}
function pieceForm(item = {}) {
  const p = db.projects.find((x) => x.id === (item.project || pid));
  return (
    field("name", "Nom de la pièce", "text", item.name || "") +
    field("brand", "Marque", "text", item.brand || "") +
    field(
      "project",
      "Projet",
      "select",
      item.project || pid,
      db.projects.map((x) => [x.id, x.name]),
    ) +
    field("look", "Look", "select", item.look || "", [
      ["", "Sans look pour le moment"],
      ...(p?.looks || []).map((l) => [l.id, l.name]),
    ]) +
    field(
      "category",
      "Catégorie",
      "select",
      item.category || "Haut",
      [
        "Haut",
        "Bas",
        "Robe",
        "Combinaison",
        "Veste",
        "Chaussures",
        "Bijoux",
        "Sac",
        "Accessoire",
        "Autre",
      ].map((x) => [x, x]),
    ) +
    contactChooser(item.contact) +
    field(
      "mode",
      "Obtention",
      "select",
      item.mode || "Prêt",
      ["Prêt", "Location", "Achat", "Création", "Stock du studio"].map((x) => [
        x,
        x,
      ]),
    ) +
    field(
      "price",
      "Coût (€) — 0 pour un prêt gratuit",
      "number",
      item.price ?? 0,
    ) +
    field("caution", "Caution (€)", "number", item.caution ?? 0) +
    field("commit", "Budget", "select", item.commit ? "Engagé" : "Option", [
      ["Option", "Option — hors budget"],
      ["Engagé", "Engagé — compter le coût"],
    ]) +
    field("url", "Lien officiel", "url", item.url || "") +
    field(
      "note",
      "Taille, matière et disponibilité",
      "textarea",
      item.note || "",
    )
  );
}
pieces = function (scoped) {
  const list = db.pieces.filter(
    (x) =>
      (!scoped || x.project === pid) &&
      (!focusedLook || x.look === focusedLook) &&
      (category === "Tout" || x.category === category) &&
      (x.name + " " + x.brand).toLowerCase().includes(filter.toLowerCase()),
  );
  piecePage = Math.min(piecePage, Math.max(0, Math.ceil(list.length / 12) - 1));
  const p = project();
  return `<div class="toolbar">${searchBar("piece-search", filter, "Rechercher une pièce ou une marque…")}<select id="category" aria-label="Catégorie">${opts(["Tout", "Haut", "Bas", "Robe", "Combinaison", "Veste", "Chaussures", "Bijoux", "Sac", "Accessoire", "Autre"], category)}</select>${scoped ? `<select id="look-filter" aria-label="Filtrer par look"><option value="">Tous les looks</option>${p.looks.map((l) => `<option value="${esc(l.id)}" ${focusedLook === l.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select><button data-action="piece">＋ Pièce</button>` : ""}</div><p class="note">${list.length} pièces · les options restent hors du budget</p><div class="piece-list">${list
    .slice(piecePage * 12, (piecePage + 1) * 12)
    .map(
      (x) =>
        `<article class="piece-row"><div class="piece-thumb">${x.image ? `<img src="${esc(x.image)}" alt="${esc(x.name)}">` : art(Math.max(0, ["Haut", "Bas", "Bijoux"].indexOf(x.category)), "sage")}</div><div class="piece-info"><small>${esc(x.brand)}</small><h3>${esc(x.name)}</h3><p>${!scoped ? esc(db.projects.find((p) => p.id === x.project)?.name || "Projet") + " / " : ""}${esc(db.projects.find((p) => p.id === x.project)?.looks.find((l) => l.id === x.look)?.name || "Sans look")} · ${esc(x.category)} · ${esc(x.mode)}</p>${x.contact ? `<small>${esc(contactLabel(db.contacts.find((c) => c.id === x.contact) || {}))}</small>` : ""}</div><div class="piece-price"><strong>${euro(x.price)}</strong><small>${x.commit ? "Engagé" : "Option"}${x.url ? `<a class="official-link" href="${esc(x.url)}" target="_blank" rel="noopener">Site officiel ↗</a>` : ""}</small></div><select aria-label="Suivi de ${esc(x.name)}" data-piece-status="${esc(x.id)}">${opts(["Repéré", "À demander", "Demandé", "Confirmé", "Reçu", "Porté", "Retourné", "Conservé", "Écarté", "Indisponible"], x.status)}</select><button class="quiet" data-edit-piece="${esc(x.id)}">Modifier</button></article>`,
    )
    .join(
      "",
    )}</div>${list.length ? pager(piecePage, list.length, 12, "pieces") : '<div class="empty">Aucune pièce. Ajoutez une option pour ce look.</div>'}`;
};
function budgetView(p) {
  const t = totals(p);
  return `<div class="budget-grid"><div class="panel"><small>Budget prévu</small><strong>${euro(p.budget)}</strong><button class="quiet" data-action="budget-limit">Modifier</button></div><div class="panel"><small>Engagé</small><strong>${euro(t.costs)}</strong></div><div class="panel ${t.remaining < 0 ? "over-budget" : ""}"><small>Disponible</small><strong>${euro(t.remaining)}</strong></div><div class="panel"><small>Cautions séparées</small><strong>${euro(t.caution)}</strong></div></div><div class="section-head"><h2>Frais du projet</h2><button data-action="expense">＋ Ajouter un frais</button></div><div class="expense-list">${
    db.expenses
      .filter((e) => e.project === p.id)
      .map(
        (e) =>
          `<button class="expense-row" data-edit-expense="${esc(e.id)}"><span>${esc(e.name)}</span><span class="tag">${esc(e.state)}</span><strong>${euro(e.amount)}</strong><span>Modifier ↗</span></button>`,
      )
      .join("") || '<div class="empty">Aucun frais enregistré.</div>'
  }</div><p class="note">Les pièces engagées et les frais engagés ou payés sont comptés. Les options et les cautions restent séparées.</p><button class="primary" data-action="quote">Préparer un devis à partir des frais →</button>`;
}
function quoteView(p) {
  const q = db.quotes.find((q) => q.project === p.id);
  return `<div class="panel quote-panel"><div class="eyebrow">PRÉPARATION DE DEVIS · BROUILLON</div><h2>${esc(p.name)}</h2><p class="note">Ajustez les frais et ajoutez vos prestations. Ces modifications ne changent pas le budget interne.</p><div class="quote-lines">${q.lines.map((l, i) => `<div class="quote-line"><label>Libellé<input data-quote="${i}:name" value="${esc(l.name)}"></label><label>Quantité<input type="number" min="0" step="0.5" data-quote="${i}:qty" value="${l.qty}"></label><label>Tarif (€)<input type="number" min="0" step="0.01" data-quote="${i}:rate" value="${l.rate}"></label><strong>${euro(l.qty * l.rate)}</strong><button data-remove-line="${i}" aria-label="Supprimer ${esc(l.name)}">✕</button></div>`).join("")}</div><div class="actions"><button data-add-service>＋ Prestation</button><strong class="quote-total">Total de travail : ${euro(q.lines.reduce((n, l) => n + l.qty * l.rate, 0))}</strong></div><p class="note">Brouillon de chiffrage. Les mentions de l’entreprise, la TVA et les conditions doivent être configurées avant de produire un devis client.</p></div>`;
}
render = function () {
  baseRender();
  $("#crumb").textContent =
    (demoMode ? "Simulation" : "Votre studio") +
    " / " +
    (view === "detail"
      ? project()?.name
      : {
          home: "Accueil",
          projects: "Projets",
          contacts: "Réseau",
          pieces: "Pièces",
          news: "Veille",
        }[view] || "");
  $(".notice").innerHTML =
    `${APP_VERSION} · ${demoMode ? "SIMULATION" : "ESPACE LOCAL"} <span>${demoMode ? `${db.projects.length} projets · ${db.projects.filter((p) => p.status === "Terminé").length} terminés · ${db.pieces.length} sélections · ${db.contacts.length} contacts fictifs` : "Enregistré dans ce navigateur · exportez régulièrement une sauvegarde"}</span><button id="switch-demo" class="quiet">${demoMode ? "Revenir à mon espace" : "Tester la simulation"}</button><button id="restore" class="quiet">Importer une sauvegarde</button>`;
  if (view === "projects") $("#content").innerHTML = renderProjects();
  if (view === "contacts") $("#content").innerHTML = renderContacts();
  if (view === "detail") {
    const p = project();
    const tabs = $(".tabs");
    for (const [id, label] of [
      ["budget", "Budget & frais"],
      ["quote", "Devis"],
    ])
      tabs.insertAdjacentHTML(
        "beforeend",
        `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`,
      );
    if (tab === "budget")
      $("#content").insertAdjacentHTML("beforeend", budgetView(p));
    if (tab === "quote") {
      if (!db.quotes.find((x) => x.project === pid))
        $("#content").insertAdjacentHTML(
          "beforeend",
          '<div class="empty"><h2>Un chiffrage, sans ressaisie.</h2><p>Reprenez les frais du projet et ajoutez vos honoraires.</p><button data-action="quote">Préparer le brouillon</button></div>',
        );
      else $("#content").insertAdjacentHTML("beforeend", quoteView(p));
    }
    if (tab === "overview")
      $(".detail-summary").insertAdjacentHTML(
        "beforeend",
        `<button class="quiet" data-tab="budget">${euro(totals(p).remaining)} disponibles →</button>`,
      );
    if (tab === "looks")
      document.querySelectorAll("#content .cards .card").forEach((card, i) => {
        card
          .querySelector(".card-body")
          .insertAdjacentHTML(
            "beforeend",
            `<button class="look-open" data-open-look="${esc(p.looks[i].id)}">Voir les pièces de ce look →</button>`,
          );
      });
  }
};
action = function (a) {
  const p = project();
  if (a === "project")
    return modal(
      "Créer un projet",
      field("name", "Nom du projet") +
        field("client", "Client / artiste") +
        field(
          "type",
          "Type",
          "select",
          "Clip",
          [
            "Clip",
            "Éditorial",
            "Tournée",
            "Événement",
            "Collection",
            "Personnel",
            "Autre",
          ].map((v) => [v, v]),
        ) +
        field(
          "season",
          "Saison",
          "select",
          "Printemps",
          ["Printemps", "Été", "Automne", "Hiver", "Toute saison"].map((v) => [
            v,
            v,
          ]),
        ) +
        field("date", "Date principale", "date") +
        field("budget", "Budget total (€)", "number", 0) +
        field("brief", "Brief et contraintes", "textarea"),
      (d) => {
        const n = {
          ...d,
          budget: Number(d.budget),
          id: uid(),
          status: "Préparation",
          tone: "sage",
          looks: [],
          boards: [],
        };
        db.projects.push(n);
        pid = n.id;
        view = "detail";
        tab = "overview";
      },
    );
  if (a === "contact") return editContact();
  if (a === "piece") return editPiece();
  if (a === "budget-limit")
    return modal(
      "Budget du projet",
      field("budget", "Budget total (€)", "number", p.budget),
      (d) => (p.budget = Number(d.budget)),
    );
  if (a === "expense") return editExpense();
  if (a === "quote") {
    let q = db.quotes.find((x) => x.project === pid);
    if (!q) {
      q = {
        id: uid(),
        project: pid,
        lines: [
          ...quoteForecastLines(p),
          { name: "Prestation de stylisme", qty: 1, rate: 0 },
        ],
      };
      db.quotes.push(q);
      save();
    }
    tab = "quote";
    return render();
  }
  return baseAction(a);
};
function editContact(id) {
  const c = db.contacts.find((c) => c.id === id) || {};
  modal(
    id ? "Modifier le contact" : "Ajouter un contact",
    field("brand", "Marque / structure", "text", c.brand || "") +
      field("name", "Nom", "text", c.name || "") +
      field("email", "E-mail", "email", c.email || "") +
      field("role", "Rôle", "text", c.role || "") +
      field("city", "Ville", "text", c.city || "") +
      field("note", "Conditions et notes", "textarea", c.note || ""),
    (d) => {
      if (id) Object.assign(c, d);
      else db.contacts.push({ ...d, id: uid() });
    },
  );
}
function editPiece(id) {
  const x = db.pieces.find((x) => x.id === id) || {};
  modal(id ? "Modifier la pièce" : "Ajouter une pièce", pieceForm(x), (d) => {
    if (d.url && !safeUrl(d.url))
      throw Error("Utilisez une adresse http ou https.");
    const p = db.projects.find((p) => p.id === d.project);
    if (d.look && !p?.looks.some((l) => l.id === d.look))
      throw Error("Choisissez un look du projet sélectionné.");
    const selectedContact = db.contacts.find(
      (c) => contactLabel(c) === d.contactName,
    );
    if (d.contactName && !selectedContact)
      throw Error("Choisissez un contact du carnet ou laissez ce champ vide.");
    const obj = {
      ...d,
      contact: selectedContact?.id || "",
      price: Number(d.price),
      caution: Number(d.caution),
      commit: d.commit === "Engagé",
      cautionReturned: d.cautionReturned === "Oui",
    };
    obj.needId = resolvePieceNeed(db, obj, uid);
    if (id) {
      recordPieceEdit(db, x, obj);
      Object.assign(x, obj);
    } else db.pieces.push({ ...obj, id: uid(), status: "Repéré", image: "" });
  });
}
function editExpense(id) {
  const x = db.expenses.find((e) => e.id === id) || {};
  modal(
    id ? "Modifier le frais" : "Ajouter un frais",
    field("name", "Libellé", "text", x.name || "") +
      field("amount", "Montant (€)", "number", x.amount ?? 0) +
      field(
        "state",
        "État",
        "select",
        x.state || "Prévu",
        ["Prévu", "Engagé", "Payé", "Annulé"].map((v) => [v, v]),
      ) + (typeof purchaseTaxFields==='function'?purchaseTaxFields(x.purchaseTax,'expense'):''),
    (d,form) => {
      const purchaseTax=typeof purchaseTaxRead==='function'?purchaseTaxRead(form,'expense'):x.purchaseTax;
      const obj = { ...d, amount: Number(d.amount),...(purchaseTax?{purchaseTax}:{}) };
      for(const key of ['expenseBasis','expenseRate','expenseRecovery','expenseConfirmed'])delete obj[key];
      if (id) Object.assign(x, obj);
      else db.expenses.push({ ...obj, id: uid(), project: pid });
    },
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.project || b.dataset.view) {
    focusedLook = "";
    piecePage = 0;
    render();
  }
  if (b.dataset.editContact) editContact(b.dataset.editContact);
  if (b.dataset.editPiece) editPiece(b.dataset.editPiece);
  if (b.dataset.editExpense) editExpense(b.dataset.editExpense);
  if (b.dataset.openLook) {
    focusedLook = b.dataset.openLook;
    category = "Tout";
    filter = "";
    piecePage = 0;
    tab = "pieces";
    render();
  }
  if (b.dataset.page) {
    const [kind, p] = b.dataset.page.split(":");
    if (kind === "contacts") contactPage = Number(p);
    else if (kind === "projects") projectPage = Number(p);
    else piecePage = Number(p);
    render();
  }
  if (b.id === "switch-demo") {
    save();
    demoMode = !demoMode;
    history.replaceState(
      null,
      "",
      location.pathname +
        (demoMode ? "?mode=simulation&v=0.8.1" : "?mode=personal&v=0.8.1"),
    );
    localStorage.setItem("atelier-demo-active", String(demoMode));
    try {
      db =
        JSON.parse(localStorage.getItem(demoMode ? "atelier-demo-v5" : KEY)) ||
        (demoMode ? atelierDemo() : personalDB);
    } catch {
      db = demoMode ? atelierDemo() : personalDB;
    }
    if (!demoMode) db = preparePersonalWorkspace(db);
    normalize();
    prepareLookChoices(db, atelierCatalog);
    pid = db.projects[0]?.id;
    view = "projects";
    projectScope = "Actifs";
    render();
  }
  if (b.dataset.addService !== undefined) {
    const q = db.quotes.find((x) => x.project === pid);
    q.lines.push({ name: "Nouvelle prestation", qty: 1, rate: 0 });
    save();
    render();
  }
  if (b.dataset.removeLine !== undefined) {
    db.quotes
      .find((x) => x.project === pid)
      .lines.splice(Number(b.dataset.removeLine), 1);
    save();
    render();
  }
  if (b.id === "restore") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        const next = JSON.parse(await input.files[0].text());
        if (
          !["projects", "pieces", "contacts", "tasks", "news"].every((k) =>
            Array.isArray(next[k]),
          )
        )
          throw Error("Sauvegarde incompatible.");
        modal(
          "Restaurer la sauvegarde",
          "<p>La sauvegarde sélectionnée remplacera les données de cet espace. Exportez les données actuelles avant de confirmer.</p>",
          () => {
            db = demoMode ? next : preparePersonalWorkspace(next, true);
            normalize();
            prepareLookChoices(db, atelierCatalog);
            pid = db.projects[0]?.id;
            view = "projects";
          },
        );
      } catch (err) {
        toast(err.message);
      }
    };
    input.click();
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  const fields = {
    "contact-search": () => {
      contactSearch = el.value;
      contactPage = 0;
    },
    "project-search": () => {
      projectSearch = el.value;
      projectPage = 0;
    },
  };
  if (fields[el.id]) {
    const pos = el.selectionStart;
    fields[el.id]();
    render();
    const next = document.getElementById(el.id);
    next.focus();
    next.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "project-scope") {
    projectScope = el.value;
    projectPage = 0;
    render();
  }
  if (el.id === "look-filter") {
    focusedLook = el.value;
    piecePage = 0;
    render();
  }
  if (el.dataset.quote) {
    const [i, key] = el.dataset.quote.split(":");
    db.quotes.find((x) => x.project === pid).lines[i][key] =
      key === "name" ? el.value : Math.max(0, Number(el.value) || 0);
    save();
    render();
  }
  if (el.name === "project" && $("#modal").open && $("#form").elements.look) {
    const p = db.projects.find((p) => p.id === el.value);
    $("#form").elements.look.innerHTML =
      '<option value="">Sans look pour le moment</option>' +
      (p?.looks || [])
        .map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`)
        .join("");
  }
});
if (demoMode) {
  pid = db.projects[0]?.id;
  view = "projects";
  projectScope = "Actifs";
}
render();
