/** Seuls les anciens exemples identifiables sont retirés ; les saisies personnelles restent présentes. */
function preparePersonalWorkspace(value, force = false) {
  if (value.personalDataVersion === 1 && !force) return value;
  const result = cleanPersonalRecords(value, legacySeed);
  const next = result.database;
  next.personalDataVersion = 1;
  if (result.count)
    next.personalCleanupBackup = {
      removed: result.removed,
      detached: result.detached,
      date: new Date().toISOString(),
      count: result.count,
    };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return {
      ...value,
      personalCleanupWarning:
        "Le nettoyage n’a pas été enregistré : exportez vos données pour libérer du stockage avant de réessayer.",
    };
  }
}

const KEY = "atelier-studio-v1";
const legacySeed = {
  projects: [
    {
      id: "p1",
      name: "Éclats nocturnes",
      client: "ALMA · CLIP",
      date: "2026-11-06",
      status: "Recherche",
      brief:
        "Trois silhouettes pour un clip nocturne. Reflets métalliques, lignes sculpturales et mouvement. Sans matières animales. Réception souhaitée avant le 3 novembre.",
      budget: 1800,
      tone: "sage",
      boards: [],
      looks: [
        {
          id: "l1",
          name: "01 — Première lumière",
          needs: [
            { name: "Haut sculptural", state: "En sélection" },
            { name: "Pantalon", state: "À chercher" },
            { name: "Bijoux", state: "À chercher" },
          ],
        },
        {
          id: "l2",
          name: "02 — Heure bleue",
          needs: [
            { name: "Robe ou ensemble", state: "À chercher" },
            { name: "Chaussures", state: "Déjà fourni" },
          ],
        },
        {
          id: "l3",
          name: "03 — Dernier éclat",
          needs: [
            { name: "Combinaison", state: "Retenu" },
            { name: "Boucles d’oreilles", state: "À chercher" },
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "Le temps suspendu",
      client: "REVUE FORME · ÉDITORIAL",
      date: "2026-11-14",
      status: "Préparation",
      brief: "Silhouettes douces, matières texturées et palette de terre.",
      budget: 900,
      tone: "rose",
      boards: [],
      looks: [
        {
          id: "l4",
          name: "01 — Terre douce",
          needs: [
            { name: "Ensemble", state: "En sélection" },
            { name: "Accessoires", state: "À chercher" },
          ],
        },
      ],
    },
    {
      id: "p3",
      name: "Mouvement libre",
      client: "NORA · TOURNÉE",
      date: "2026-11-21",
      status: "Production",
      brief: "Quatre passages sur scène, confort et liberté de mouvement.",
      budget: 3200,
      tone: "dark",
      boards: [],
      looks: [
        {
          id: "l5",
          name: "01 — Ouverture",
          needs: [
            { name: "Tenue", state: "Retenu" },
            { name: "Chaussures", state: "Retenu" },
          ],
        },
      ],
    },
  ],
  pieces: [
    {
      id: "i1",
      name: "Top drapé argenté",
      brand: "Studio Sillage",
      category: "Haut",
      mode: "Prêt",
      price: 0,
      status: "À demander",
      project: "p1",
      url: "",
      note: "Exemple fictif · disponibilité et taille à confirmer",
      image: "",
    },
    {
      id: "i2",
      name: "Pantalon ample ivoire",
      brand: "Maison Orbe",
      category: "Bas",
      mode: "Location",
      price: 85,
      status: "Demandé",
      project: "p1",
      url: "",
      note: "Exemple fictif · taille 38 à confirmer",
      image: "",
    },
    {
      id: "i3",
      name: "Boucles sculpturales",
      brand: "Atelier Onde",
      category: "Bijoux",
      mode: "Achat",
      price: 120,
      status: "Repéré",
      project: "p1",
      url: "",
      note: "Exemple fictif · finition argentée",
      image: "",
    },
  ],
  tasks: [
    {
      id: "t1",
      name: "Confirmer la taille du pantalon",
      project: "p1",
      date: "2026-10-16",
      done: false,
    },
    {
      id: "t2",
      name: "Envoyer la sélection au client",
      project: "p2",
      date: "2026-10-19",
      done: false,
    },
    {
      id: "t3",
      name: "Préparer les étiquettes de retour",
      project: "p3",
      date: "2026-11-23",
      done: false,
    },
  ],
  contacts: [
    {
      name: "Camille · Studio Sillage",
      email: "",
      role: "Prêts presse",
      note: "Contact fictif — ajouter les coordonnées réelles avant envoi.",
    },
    {
      name: "Maison Orbe",
      email: "",
      role: "Showroom & location",
      note: "Contact fictif — conditions à confirmer.",
    },
  ],
  news: [],
};
const seed = emptyPersonalWorkspace();
let db;
try {
  db = JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed);
} catch {
  db = structuredClone(seed);
}
db = preparePersonalWorkspace(db);
let view = "home",
  pid = "p1",
  tab = "overview",
  filter = "",
  category = "Tout";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
let save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch {
    toast("Stockage plein : exportez vos données et réduisez les images.");
    return false;
  }
};
const toast = (s) => {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 4000);
};
const date = (s) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sans date";
const project = () => db.projects.find((p) => p.id === pid);
const opts = (arr, value) =>
  arr
    .map((x) => `<option ${x === value ? "selected" : ""}>${esc(x)}</option>`)
    .join("");
function art(type = 0, tone = "sage") {
  const shapes = [
    `<path d="M93 34 70 45 43 93 64 108 82 76 79 193 167 193 164 76 182 108 203 93 176 45 151 34Q123 59 93 34Z" fill="#f1eee5"/><path d="m93 35 55 52-62 28 71 31-65 36" fill="none" stroke="#bcbeb4" stroke-width="3"/>`,
    `<path d="M86 34 164 34 170 88 160 202 127 202 122 108 113 202 78 202 79 85Z" fill="#eee8dc"/><path d="m122 50 0 58M85 56h76" stroke="#beb5a4" fill="none" stroke-width="2"/>`,
    `<circle cx="94" cy="79" r="11" fill="#e3dfcb"/><path d="M94 94c-45 55-33 87 0 80 33-7 27-46 0-80Z" fill="none" stroke="#d7d4c1" stroke-width="14"/><circle cx="163" cy="79" r="11" fill="#e3dfcb"/><path d="M163 94c-45 55-33 87 0 80 33-7 27-46 0-80Z" fill="none" stroke="#d7d4c1" stroke-width="14"/>`,
  ];
  return `<div class="art ${tone}" role="img" aria-label="Illustration décorative de vêtement"><svg viewBox="0 0 250 230" aria-hidden="true">${shapes[type % 3]}</svg></div>`;
}
function title(h, p, action = "", label = "") {
  return `<div class="title-row"><div><div class="eyebrow">VOTRE STUDIO, L’ESPRIT LIBRE</div><h1>${esc(h)}</h1><p class="subtitle">${esc(p)}</p></div>${action ? `<button class="primary" data-action="${action}">＋ ${label}</button>` : ""}</div>`;
}
function counts(p) {
  const ns = p.looks.flatMap((l) => l.needs);
  return {
    all: ns.length,
    done: ns.filter((n) => {
      if (["Déjà fourni", "Abandonné"].includes(n.state)) return true;
      const linked = db.pieces.filter(
        (x) => x.project === p.id && x.needId === n.id,
      );
      return linked.length
        ? linked.some(
            (x) =>
              x.selection === "Retenue" &&
              !["Écarté", "Indisponible"].includes(x.status),
          )
        : n.state === "Retenu";
    }).length,
  };
}
function card(p, i) {
  const c = counts(p);
  return `<article class="card"><button class="card-link" data-project="${p.id}">${p.cover ? `<img src="${esc(p.cover)}" alt="Références du projet ${esc(p.name)}" class="project-cover">` : art(i, p.tone)}<div class="card-body"><div class="meta"><span>${esc(p.client)}</span><span>${date(p.date)}</span></div><h3>${esc(p.name)}</h3><div class="progress"><i style="width:${c.all ? (c.done / c.all) * 100 : 0}%"></i></div><div class="card-foot"><span>${p.looks.length} looks · ${c.done}/${c.all} besoins réglés</span><span>↗</span></div></div></button></article>`;
}
function tasklist(tasks) {
  return tasks.length
    ? tasks
        .map(
          (t) =>
            `<div class="task ${t.done ? "done" : ""}"><input type="checkbox" aria-label="Terminer ${esc(t.name)}" data-task="${t.id}" ${t.done ? "checked" : ""}><div class="task-label">${esc(t.name)}<small>${esc(db.projects.find((p) => p.id === t.project)?.name || "Studio")}</small></div><span class="tag">${date(t.date)}</span></div>`,
        )
        .join("")
    : '<p class="note">Tout est à jour. Ajoutez votre prochaine action.</p>';
}
function render() {
  const items = [
    ["home", "⌂", "Accueil"],
    ["projects", "▤", "Projets"],
    ["pieces", "◇", "Pièces"],
    ["news", "◉", "Actualités"],
    ["contacts", "♧", "Contacts"],
  ];
  $("#nav").innerHTML = items
    .map(
      ([id, icon, label]) =>
        `<button data-view="${id}" class="${view === id || (view === "detail" && id === "projects") ? "active" : ""}"><span>${icon}</span>${label}</button>`,
    )
    .join("");
  $("#crumb").textContent =
    "Votre studio / " +
    (view === "detail"
      ? project()?.name
      : items.find((i) => i[0] === view)?.[2]);
  let html = "";
  if (view === "home") {
    let active = db.projects.filter(
      (p) => !["Terminé", "Annulé", "En pause"].includes(p.status),
    );
    html =
      title(
        "Place à la création.",
        "Vos idées ont de l’espace. Vos projets, un fil conducteur.",
        "project",
        "Nouveau projet",
      ) +
      `<div class="hero"><div class="hero-copy"><div class="eyebrow">LE FIL DE VOTRE STUDIO</div><h2>Une vision d’ensemble.<br>Chaque détail à sa place.</h2><p>${active.length} projets actifs, ${db.tasks.filter((t) => !t.done).length} prochaines actions. Retrouvez ce qui compte, puis revenez à ce que vous aimez.</p><button data-view="projects">Ouvrir mes projets ↗</button></div><div class="hero-art">${art(0, "sage")}${art(2, "rose")}</div></div><div class="section-head"><h2>Sur votre portant</h2><button class="quiet" data-view="projects">Tous les projets →</button></div><div class="cards">${active.slice(0, 3).map(card).join("")}</div><div class="split"><div class="panel"><div class="section-head" style="margin-top:0"><h2>À suivre</h2><button class="quiet" data-action="task">＋ Action</button></div>${tasklist(db.tasks)}</div><div class="panel"><div class="eyebrow">LA MÉTHODE ATELIER</div><h2>Commencez où vous en êtes.</h2><p class="note">Un brief tout neuf, un moodboard déjà validé ou simplement une paire de boucles à trouver. Chaque projet s’adapte à votre façon de travailler.</p><div class="swatches"><i style="background:#697760"></i><i style="background:#c5c7b8"></i><i style="background:#dbc9ba"></i><i style="background:#464944"></i></div><p class="note">Palette de travail · sauge, craie & pierre</p></div></div>`;
  } else if (view === "projects") {
    html =
      title(
        "Vos projets.",
        "De la première intention au dernier retour.",
        "project",
        "Nouveau projet",
      ) + `<div class="cards">${db.projects.map(card).join("")}</div>`;
  } else if (view === "detail") {
    const p = project();
    if (!p) {
      view = "projects";
      return render();
    }
    html =
      title(p.name, p.client, "look", "Ajouter un look") +
      `<div class="detail-summary"><select class="project-state" id="project-state" aria-label="État du projet">${opts(["Préparation", "Recherche", "Production", "Retours", "Terminé", "En pause", "Annulé"], p.status)}</select><span class="tag">${date(p.date)}</span><span class="tag">Budget prévu : ${esc(p.budget || 0)} €</span></div><div class="tabs">${[
        ["overview", "Vue d’ensemble"],
        ["mood", "Moodboard"],
        ["looks", "Looks & besoins"],
        ["pieces", "Sélection"],
        ["messages", "Demandes"],
      ]
        .map(
          ([id, n]) =>
            `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${n}</button>`,
        )
        .join("")}</div>`;
    if (tab === "overview")
      html += `<div class="split"><div class="panel"><div class="section-head" style="margin-top:0"><h2>Direction artistique</h2><button class="quiet" data-action="brief">Modifier</button></div><p style="white-space:pre-wrap;line-height:1.8">${esc(p.brief || "Ajoutez le brief et les contraintes du projet.")}</p><button data-tab="mood">Ouvrir le moodboard ↗</button></div><div class="panel"><div class="section-head" style="margin-top:0"><h2>Prochaines actions</h2><button class="quiet" data-action="task">＋</button></div>${tasklist(db.tasks.filter((t) => t.project === pid))}</div></div>`;
    if (tab === "looks")
      html += `<div class="cards">${p.looks.map((l, i) => `<div class="card"><div class="card-body"><div class="eyebrow">SILHOUETTE ${String(i + 1).padStart(2, "0")}</div><h2>${esc(l.name)}</h2><p>Gardez vos options. Choisissez ce qui manque.</p>${l.needs.map((n, j) => `<div class="need"><span>${esc(n.name)}</span><select aria-label="État de ${esc(n.name)}" data-need="${l.id}:${j}">${opts(["À chercher", "En sélection", "Retenu", "Déjà fourni", "Abandonné"], n.state)}</select></div>`).join("")}<button class="quiet" data-add-need="${l.id}">＋ Ajouter un besoin</button></div></div>`).join("")}</div>`;
    if (tab === "mood")
      html += `<div class="toolbar"><button data-action="mood">＋ Importer une inspiration</button><button id="print-board">Imprimer / enregistrer en PDF</button></div><p class="note">Références importées · aucun visuel généré. Vos images restent dans ce navigateur.</p>${p.boards.length ? `<div class="board">${p.boards.map((b, i) => `<figure><img src="${esc(b.image)}" alt="${esc(b.caption)}"><figcaption>${esc(b.caption)} <button data-remove-board="${i}" aria-label="Supprimer cette image">✕</button></figcaption></figure>`).join("")}</div>` : `<div class="empty"><h2>Votre direction commence ici.</h2><p>Importez les images du réalisateur, vos références ou un moodboard déjà validé.</p><button data-action="mood">Ajouter la première image</button></div>`}`;
    if (tab === "pieces") html += pieces(true);
    if (tab === "messages") html += messages(p);
  } else if (view === "pieces") {
    html =
      title(
        "Votre sélection.",
        "Des pièces repérées aux silhouettes retenues.",
        "piece",
        "Ajouter une pièce",
      ) + pieces(false);
  } else if (view === "contacts") {
    html =
      title(
        "Les bonnes personnes.",
        "Votre carnet de collaborations, au même endroit.",
        "contact",
        "Ajouter un contact",
      ) +
      `<div class="cards">${db.contacts.map((c) => `<div class="panel"><div class="contact"><span class="avatar">${esc(c.name[0])}</span><div><h3>${esc(c.name)}</h3><small>${esc(c.role)}</small></div></div><p class="note">${esc(c.note)}</p>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="tag amber">Coordonnées à compléter</span>'}</div>`).join("")}</div>`;
  } else if (view === "news") {
    html =
      title(
        "Le carnet d’actualités.",
        "Vos découvertes, à garder pour le bon projet.",
        "news",
        "Enregistrer un lien",
      ) +
      `<p class="note">Veille manuelle pour cette première édition. Aucun flux de marques connecté.</p>${db.news.length ? `<div class="cards">${db.news.map((n) => `<div class="panel"><div class="eyebrow">${esc(n.brand)}</div><h2>${esc(n.title)}</h2><p class="note">${esc(n.note)}</p><a target="_blank" rel="noopener" href="${esc(n.url)}">Voir la source ↗</a></div>`).join("")}</div>` : '<div class="empty"><h2>Gardez une longueur d’inspiration.</h2><p>Enregistrez une collection, une nouveauté ou un créateur à retrouver.</p></div>'}`;
  }
  $("#content").innerHTML = html;
}
function pieces(scoped) {
  const list = db.pieces.filter(
    (p) =>
      (!scoped || p.project === pid) &&
      (category === "Tout" || p.category === category) &&
      (p.name + " " + p.brand).toLowerCase().includes(filter.toLowerCase()),
  );
  return `<div class="toolbar"><input id="piece-search" placeholder="Rechercher une pièce, une marque…" value="${esc(filter)}" aria-label="Rechercher une pièce"><select id="category" aria-label="Catégorie">${opts(["Tout", "Haut", "Bas", "Robe", "Combinaison", "Chaussures", "Bijoux", "Accessoire", "Autre"], category)}</select>${scoped ? '<button data-action="piece">＋ Pièce</button>' : ""}</div><div class="cards">${list.map((p, i) => `<article class="card">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" style="width:100%;height:180px;object-fit:cover">` : art(["Haut", "Bas", "Bijoux"].indexOf(p.category) >= 0 ? ["Haut", "Bas", "Bijoux"].indexOf(p.category) : 0, ["sage", "rose", "dark"][i % 3])}<div class="card-body"><div class="meta"><span>${esc(p.brand)}</span><span>${esc(p.mode)} · ${Number(p.price) || 0} €</span></div><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p><select aria-label="Suivi de ${esc(p.name)}" data-piece-status="${p.id}" style="width:100%">${opts(["Repéré", "À demander", "Demandé", "Confirmé", "Reçu", "Retourné", "Indisponible"], p.status)}</select>${p.url ? `<p><a href="${esc(p.url)}" target="_blank" rel="noopener">Voir la pièce sur le site ↗</a></p>` : ""}</div></article>`).join("")}</div>${list.length ? "" : '<div class="empty">Aucune pièce pour cette sélection.</div>'}`;
}
function messages(p) {
  const selected = db.pieces.filter((x) => x.project === p.id);
  return `<div class="panel"><div class="eyebrow">PRÉPARATION DE DEMANDE · MODÈLE SANS IA</div><h2>Un message personnel, prêt à adapter.</h2><p class="note">Aucun mail n’est envoyé par Atelier. Copiez le texte ou ouvrez votre messagerie pour le relire et l’envoyer.</p><label>Destinataire<input id="recipient" type="email" placeholder="contact@marque.fr"></label><label>Votre demande<textarea class="draft" id="draft">${esc(`Bonjour,\n\nJe vous contacte pour le projet « ${p.name} » (${p.client}), prévu le ${date(p.date)}.\n\n${p.brief}\n\nNous aimerions connaître les disponibilités et les conditions pour les pièces suivantes :\n${selected.map((x) => "• " + x.name + " — " + x.brand + " (" + x.mode.toLowerCase() + ")").join("\n") || "• À préciser"}\n\nPourriez-vous nous confirmer les tailles disponibles, les dates possibles et les modalités ?\n\nMerci beaucoup,\n[Votre signature]`)}</textarea></label><div class="actions"><button class="primary" id="copy-draft">Copier le message</button><button id="open-mail">Ouvrir ma messagerie ↗</button><button data-action="task">Créer un rappel de relance</button></div><p class="note">Les envois, réponses et relances automatiques seront ajoutés après connexion et test de votre messagerie.</p></div>`;
}
function field(name, label, type = "text", value = "", choices) {
  return `<label>${label}${type === "textarea" ? `<textarea name="${name}">${esc(value)}</textarea>` : type === "select" ? `<select name="${name}">${choices.map(([v, n]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : `<input name="${name}" type="${type}" value="${esc(value)}" ${["name", "title"].includes(name) ? "required" : ""} ${type === "file" ? 'accept="image/jpeg,image/png,image/webp"' : ""} ${type === "number" ? 'min="0"' : ""}>`}</label>`;
}
let submit;
function modal(name, fields, fn) {
  $("#modal-title").textContent = name;
  $("#fields").innerHTML = fields;
  submit = fn;
  $("#modal").showModal();
}
function action(a) {
  const p = project();
  if (a === "project")
    modal(
      "Un nouveau projet",
      field("name", "Nom du projet") +
        field("client", "Client · type de projet") +
        field("date", "Date principale", "date") +
        field("budget", "Budget prévu (€)", "number", 0) +
        field("brief", "Brief & contraintes", "textarea"),
      (d) => {
        const n = {
          ...d,
          id: uid(),
          status: "Préparation",
          tone: "sage",
          boards: [],
          looks: [],
        };
        db.projects.push(n);
        pid = n.id;
        view = "detail";
        tab = "overview";
      },
    );
  if (a === "brief")
    modal(
      "Direction artistique",
      field("brief", "Brief & contraintes", "textarea", p.brief),
      (d) => (p.brief = d.brief),
    );
  if (a === "look")
    modal(
      "Un nouveau look",
      field("name", "Nom du look") +
        field(
          "needs",
          "Besoins, séparés par une virgule",
          "text",
          "Haut, Bas, Bijoux",
        ),
      (d) => {
        p.looks.push({
          id: uid(),
          name: d.name,
          needs: d.needs
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .map((name) => ({ name, state: "À chercher" })),
        });
        tab = "looks";
      },
    );
  if (a === "task")
    modal(
      "Une prochaine action",
      field("name", "Action") +
        field(
          "project",
          "Projet",
          "select",
          pid,
          db.projects.map((x) => [x.id, x.name]),
        ) +
        field("date", "Échéance", "date"),
      (d) => db.tasks.push({ ...d, id: uid(), done: false }),
    );
  if (a === "contact")
    modal(
      "Ajouter un contact",
      field("name", "Nom / marque") +
        field("email", "Adresse e-mail", "email") +
        field("role", "Rôle") +
        field("note", "Notes privées", "textarea"),
      (d) => db.contacts.push(d),
    );
  if (a === "news")
    modal(
      "Garder une découverte",
      field("title", "Titre") +
        field("brand", "Marque / source") +
        field("url", "Lien officiel", "url") +
        field("note", "Pourquoi la garder ?", "textarea"),
      (d) => {
        if (d.url && !safeUrl(d.url))
          throw Error("Utilisez un lien https:// ou http://");
        db.news.push(d);
      },
    );
  if (a === "piece")
    modal(
      "Ajouter une pièce",
      field("name", "Nom de la pièce") +
        field("brand", "Marque") +
        field(
          "category",
          "Catégorie",
          "select",
          "Haut",
          [
            "Haut",
            "Bas",
            "Robe",
            "Combinaison",
            "Chaussures",
            "Bijoux",
            "Accessoire",
            "Autre",
          ].map((x) => [x, x]),
        ) +
        field(
          "project",
          "Projet",
          "select",
          pid,
          db.projects.map((x) => [x.id, x.name]),
        ) +
        field(
          "mode",
          "Mode d’obtention",
          "select",
          "Prêt",
          ["Prêt", "Location", "Achat", "Création", "Stock du studio"].map(
            (x) => [x, x],
          ),
        ) +
        field("price", "Coût prévu (€)", "number", 0) +
        field("url", "Lien de la pièce", "url") +
        field("image", "Photo (facultatif)", "file") +
        field("note", "Taille, matière, disponibilité et notes", "textarea"),
      async (d, form) => {
        if (d.url && !safeUrl(d.url))
          throw Error("Utilisez un lien https:// ou http://");
        const f = form.elements.image.files[0];
        db.pieces.push({
          ...d,
          id: uid(),
          status: "Repéré",
          image: f ? await readImage(f) : "",
        });
      },
    );
  if (a === "mood")
    modal(
      "Ajouter une inspiration",
      field("caption", "Ce qu’il faut retenir de cette image") +
        field("image", "Image", "file"),
      async (d, form) => {
        const f = form.elements.image.files[0];
        if (!f) throw Error("Choisissez une image.");
        p.boards.push({ caption: d.caption, image: await readImage(f) });
      },
    );
}
const safeUrl = (u) => {
  try {
    return ["https:", "http:"].includes(new URL(u).protocol);
  } catch {
    return false;
  }
};
async function readImage(file) {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Choisissez une image de moins de 10 Mo.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  canvas.width = bitmap.width * ratio;
  canvas.height = bitmap.height * ratio;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.78);
}
$("#form").onsubmit = async (e) => {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  try {
    await submit(Object.fromEntries(new FormData(e.target)), e.target);
    if (!save())
      throw Error(
        "Stockage plein : exportez une sauvegarde et libérez de la place. Votre modification reste en mémoire, mais n’est pas sauvegardée.",
      );
    $("#modal").close();
    render();
    toast("Enregistré dans votre studio.");
  } catch (err) {
    toast(err.message);
  } finally {
    button.disabled = false;
  }
};
$("#close").onclick = () => $("#modal").close();
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.view) {
    view = b.dataset.view;
    filter = "";
    category = "Tout";
    render();
  }
  if (b.dataset.project) {
    pid = b.dataset.project;
    view = "detail";
    tab = "overview";
    render();
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab;
    render();
  }
  if (b.dataset.action) action(b.dataset.action);
  if (b.dataset.addNeed) {
    const l = project().looks.find((x) => x.id === b.dataset.addNeed);
    modal("Ajouter un besoin", field("name", "Élément recherché"), (d) =>
      l.needs.push({ name: d.name, state: "À chercher" }),
    );
  }
  if (b.dataset.removeBoard !== undefined) {
    project().boards.splice(Number(b.dataset.removeBoard), 1);
    save();
    render();
  }
  if (b.id === "copy-draft") {
    try {
      await navigator.clipboard.writeText($("#draft").value);
      toast("Message copié.");
    } catch {
      toast("Sélectionnez le texte pour le copier.");
    }
  }
  if (b.id === "open-mail") {
    const email = $("#recipient");
    if (!email.value || !email.checkValidity()) {
      toast("Ajoutez une adresse e-mail valide.");
      return;
    }
    location.href =
      "mailto:" +
      encodeURIComponent(email.value) +
      "?subject=" +
      encodeURIComponent("Demande de pièces — " + project().name) +
      "&body=" +
      encodeURIComponent($("#draft").value);
  }
  // Export du moodboard pris en charge par connected-workflow.js.
  if (b.id === "backup") {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "atelier-sauvegarde.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Sauvegarde exportée.");
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.task) {
    db.tasks.find((t) => t.id === el.dataset.task).done = el.checked;
    save();
    render();
  }
  if (el.dataset.need) {
    const [id, j] = el.dataset.need.split(":");
    project().looks.find((l) => l.id === id).needs[j].state = el.value;
    save();
  }
  if (el.dataset.pieceStatus) {
    try {
      updatePieceLogistics(db, el.dataset.pieceStatus, el.value);
      save();
    } catch (err) {
      el.value = db.pieces.find((p) => p.id === el.dataset.pieceStatus).status;
      toast(err.message);
    }
  }
  if (el.id === "project-state") {
    if (
      el.value === "Terminé" &&
      typeof canCloseProject === "function" &&
      !canCloseProject(project())
    ) {
      el.value = project().status;
      toast(
        "Terminez les tâches, frais, retours et cautions avant la clôture.",
      );
      return;
    }
    if (el.value === "Terminé" && typeof closeProjectRecord === "function")
      closeProjectRecord(project());
    else project().status = el.value;
    save();
    toast("État du projet mis à jour.");
  }
  if (el.id === "category") {
    category = el.value;
    render();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "piece-search") {
    const pos = e.target.selectionStart;
    filter = e.target.value;
    render();
    $("#piece-search").focus();
    $("#piece-search").setSelectionRange(pos, pos);
  }
});
render();
