/** Étape 1 : fiches fournisseurs, contacts liés et préparation de demandes groupées. */
let networkTab = demoMode ? "directory" : "contacts",
  supplierSearch = "",
  supplierCountry = "Tous",
  supplierType = "Tous",
  supplierCategory = "Toutes",
  supplierCoverage = "Tous";
let networkSize = 24,
  networkPage = 0;
const supplierOriginalLabel = contactLabel;
contactLabel = function (c) {
  const source = supplierDirectory().find(s => s.id === c.supplierId);
  const brand = supplierDirectory().find(s => s.id === c.brandId);
  return [source?.name || c.brand, brand && brand.id !== source?.id ? brand.name : "", c.name].filter(Boolean).join(" · ");
};

const supplierDirectory = () => allSuppliers(db, atelierSuppliers);
const getSupplier = (id) => supplierDirectory().find((s) => s.id === id);
function supplierOptions(
  value = "",
  label = "Fournisseur / showroom — facultatif",
) {
  const current = getSupplier(value);
  return `<label>${label}<input name="supplierName" list="supplier-list" value="${esc(current?.name || "")}" placeholder="Rechercher ou saisir une nouvelle structure"><datalist id="supplier-list">${supplierDirectory()
    .map((s) => `<option value="${esc(s.name)}"></option>`)
    .join("")}</datalist></label>`;
}
function resolveSupplier(name, type = "À préciser") {
  if (!name.trim()) return null;
  let s = supplierDirectory().find(
    (s) => supplierKey(s.name) === supplierKey(name),
  );
  if (!s) {
    s = {
      id: "private-" + uid(),
      name: name.trim(),
      type,
      country: "",
      categories: [],
      emails: [],
      note: "Ajout personnel",
      source: "",
      website: "",
    };
    (db.suppliers ??= []).push(s);
  }
  return s;
}
function editSupplier(id) {
  const s = getSupplier(id) || {};
  modal(
    id ? s.name : "Ajouter une marque ou un fournisseur",
    field("name", "Nom", "text", s.name || "") +
      field(
        "type",
        "Activité",
        "select",
        s.type || "Marque",
        ["Marque", "Location costumes", "Showroom", "À préciser"].map((x) => [
          x,
          x,
        ]),
      ) +
      field("country", "Pays", "text", s.country || "") +
      field("city", "Ville", "text", s.city || "") +
      field("website", "Site / fiche source", "url", s.website || "") +
      field(
        "note",
        "Spécialités et conditions personnelles",
        "textarea",
        s.note || "",
      ),
    (data) => {
      if (data.website && !safeUrl(data.website))
        throw Error("Lien http ou https attendu.");
      const record = {
        ...s,
        ...data,
        id: s.id || "private-" + uid(),
        categories: s.categories || [],
        emails: s.emails || [],
      };
      const existing = (db.suppliers ??= []).find((x) => x.id === record.id);
      if (existing) Object.assign(existing, record);
      else db.suppliers.push(record);
    },
  );
}
function supplierDetail(id) {
  const s = getSupplier(id);
  if (!s) return;
  const contacts = relatedContacts(db, s);
  modal(
    s.name,
    `<p>${esc(s.type)} · ${esc(s.country || "Pays à préciser")} ${esc(s.city || "")}</p><p>${esc(s.phone || "")}</p><p>${esc(s.note || "")}</p>
    ${s.source ? `<p><a href="${esc(s.source)}" target="_blank" rel="noopener">Source de la fiche ↗</a> · relevé ${esc(s.checked || "à vérifier")}</p>` : ""}
    <p class="note">Référencement ≠ accord de prêt. Stock, tarifs, tailles et disponibilité à confirmer auprès du fournisseur.</p>
    ${s.website ? `<p><a href="${esc(s.website)}" target="_blank" rel="noopener">Consulter le site / la fiche ↗</a></p>` : ""}
    <h3>Vos interlocuteurs liés (${contacts.length})</h3>${contacts.map((c) => `<p>${esc(c.name)} · ${esc(c.role || "")} · ${esc(c.email || "Adresse à compléter")}${c.source ? ` · <a href="${esc(c.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</p>`).join("") || "<p>Aucun contact personnel lié.</p>"}
    <div class="actions"><button type="button" data-add-supplier-contact="${esc(id)}">＋ Ajouter un interlocuteur</button><button type="button" data-edit-supplier="${esc(id)}">Modifier ma fiche</button></div>
    ${s.emails?.length ? `<h3>Coordonnées professionnelles publiées</h3>${s.emails.map((email) => `<p>${esc(email)} <button type="button" data-import-supplier-email="${esc(id)}" data-email="${esc(email)}">Ajouter à mon carnet</button></p>`).join("")}` : '<p class="note">Pas d’adresse publique vérifiée dans cette fiche. Ajoutez votre contact presse, showroom ou location.</p>'}`,
    () => {},
  );
  $('#form button[type="submit"]').textContent = "Fermer";
}
const supplierBaseModal = modal;
modal = function (...args) {
  supplierBaseModal(...args);
  $('#form button[type="submit"]').textContent = "Enregistrer";
};
editContact = function (id, supplierId = "") {
  const c = db.contacts.find((c) => c.id === id) || {};
  modal(
    id ? "Modifier le contact" : "Ajouter un interlocuteur",
    (c.source ? `<p class="note">Coordonnée publiée · relevée le ${esc(c.checked || "à vérifier")} · <a href="${esc(c.source)}" target="_blank" rel="noopener">Consulter la source officielle ↗</a>${c.contactUrl ? " · Contact par formulaire, pas d’adresse e-mail vérifiée." : " · Fonction et disponibilité à reconfirmer."}</p>` : "") +
    supplierOptions(c.supplierId || supplierId, "Structure liée") +
      field("name", "Nom / service", "text", c.name || "") +
      field("email", "E-mail", "email", c.email || "") +
      field("role", "Rôle", "text", c.role || "") +
      field("city", "Ville", "text", c.city || "") +
      field("note", "Notes privées", "textarea", c.note || ""),
    (data) => {
      const supplier = resolveSupplier(data.supplierName);
      const { supplierName, ...rest } = data;
      const obj = {
        ...rest,
        supplierId: supplier?.id || "",
        brand: supplier?.name || "",
      };
      if (id) {
        if (c.publicDirectory && (obj.email !== c.email || obj.supplierId !== c.supplierId)) {
          c.originalPublicSource = c.source;
          for (const key of ['source', 'checked', 'publicDirectory', 'publicationStatus', 'contactUrl']) delete c[key];
        }
        Object.assign(c, obj);
      } else db.contacts.push({ ...obj, id: uid() });
    },
  );
};
let supplierEditingPieceId = "";
const supplierPieceForm = pieceForm;
pieceForm = function (piece = {}) {
  supplierEditingPieceId = piece.id || "";
  const brandList = `<datalist id="brand-list">${supplierDirectory()
    .filter((s) => s.type === "Marque")
    .map((s) => `<option value="${esc(s.name)}"></option>`)
    .join("")}</datalist>`;
  let form = supplierPieceForm(piece).replace(
    'name="brand"',
    'list="brand-list" name="brand"',
  );
  // La sélection et le suivi logistique ne sont pas demandés à la création d'une option.
  if (!piece.id) {
    form = form.replace(/<label>Budget<select[\s\S]*?<\/label>/, "");
    for (const name of [
      "received",
      "returned",
      "returnDue",
      "cautionReturned",
    ]) {
      const pattern = new RegExp(
        '<label>[^<]*(?:<input|<select)[^>]*name="' +
          name +
          '"[\\s\\S]*?</label>',
      );
      form = form.replace(pattern, "");
    }
    if (piece.project && piece.look) {
      for (const name of ["project", "look", "needId", "variantId"]) {
        const pattern = new RegExp(
          '<label>[^<]*<select name="' + name + '"[\\s\\S]*?</label>',
        );
        form = form.replace(
          pattern,
          '<input type="hidden" name="' +
            name +
            '" value="' +
            esc(piece[name] || "") +
            '">',
        );
      }
    }
  }
  form = form.replace(
    "<label>Contact —",
    supplierOptions(piece.supplierId) + "<label>Contact —",
  );
  form = form.replace(/<label>Contact —[\s\S]*?<\/label>/, `<div class="piece-contact-picker"><div class="piece-contact-heading"><strong>Qui contacter pour cette pièce ?</strong><button type="button" data-piece-new-contact>＋ Ajouter un contact</button></div><div data-piece-existing-contact ${db.contacts.length?'':'hidden'}><label>Rechercher dans mon carnet<input id="piece-contact-search" type="search" placeholder="Nom, marque ou e-mail…" autocomplete="off"></label><label>Contact lié à cette pièce<select name="contactName" id="piece-contact-choice" data-current-contact="${esc(db.contacts.find(c=>c.id===piece.contact)?contactLabel(db.contacts.find(c=>c.id===piece.contact)):"")}"></select></label></div><input type="hidden" name="newContactMode" value="0"><div data-piece-contact-create hidden><p>Le contact sera enregistré dans votre carnet et associé à cette pièce.</p><div class="piece-contact-context"><label>Marque associée<input data-contact-brand-context readonly aria-label="Marque associée au nouveau contact"></label><label>Fournisseur associé<input data-contact-supplier-context readonly aria-label="Fournisseur associé au nouveau contact"></label></div><label>Nom ou service<input name="newContactName" placeholder="Ex. Camille · service presse" disabled></label><label>Adresse e-mail<input name="newContactEmail" type="email" placeholder="contact@marque.fr" disabled></label><button type="button" class="quiet" data-piece-contact-cancel>Annuler l’ajout du contact</button></div><p id="supplier-contact-hint" class="note"></p></div>`);
  return (
    productImportPanel() + form +
    '<p class="note">Une nouvelle marque ou un nouveau fournisseur sera ajouté à votre carnet privé en enregistrant cette pièce.</p>' +
    brandList +
    field(
      "imageUrl",
      "Lien vers une photo (facultatif)",
      "url",
      piece.image?.startsWith("http") ? piece.image : "",
    ) +
    (typeof purchaseTaxFields==='function'?purchaseTaxFields(piece.purchaseTax):'') +
    '<label>Importer une photo (facultatif)<input name="piecePhoto" type="file" accept="image/jpeg,image/png,image/webp"></label>'
  );
};
const supplierFormModal = modal;
modal = function (name, fields, callback) {
  const isPiece = fields.includes('name="piecePhoto"');
  const editingId = isPiece ? supplierEditingPieceId : "";
  supplierFormModal(
    name,
    fields,
    isPiece
      ? async (data, form) => {
          if (data.imageUrl && !safeUrl(data.imageUrl))
            throw Error("Lien photo http ou https attendu.");
          const creatingContact = data.newContactMode === "1";
          if (creatingContact && (!String(data.newContactName||"").trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.newContactEmail||"").trim()))) throw Error("Complétez le nom et une adresse e-mail valide pour le nouveau contact.");
          let contact = creatingContact ? null : db.contacts.find(c => contactLabel(c) === data.contactName);
          const purchaseTax=typeof purchaseTaxRead==='function'?purchaseTaxRead(form):null;
          const file = form.elements.piecePhoto?.files[0];
          const image = file
            ? await readImage(file)
            : data.imageUrl ||
              db.pieces.find((p) => p.id === editingId)?.image ||
              "";
          const previousContacts = new Set(db.contacts.map(c=>c.id));
          const previousStructures = new Set((db.suppliers||[]).map(s=>s.id));
          try {
          if (creatingContact) {
            const brand = resolveSupplier(data.brand || "", "Marque");
            const supplier = resolveSupplier(data.supplierName || "");
            const email = data.newContactEmail.trim().toLowerCase();
            contact = db.contacts.find(c => c.email?.trim().toLowerCase() === email && (c.supplierId||"") === (supplier?.id||brand?.id||"") && (c.brandId||"") === (brand?.id||""));
            if (!contact) {
              contact = {id:uid(),name:data.newContactName.trim(),email,brand:brand?.name||supplier?.name||"",brandId:brand?.id||"",supplierId:supplier?.id||brand?.id||"",role:"",note:""};
              db.contacts.push(contact);
            }
            data.contactName = contactLabel(contact);
          }
          delete data.newContactMode; delete data.newContactName; delete data.newContactEmail; delete data.productImportImageChoice;
          await callback(data, form);
          const supplier = resolveSupplier(
            data.supplierName || getSupplier(contact?.supplierId)?.name || "",
          );
          const piece = editingId
            ? db.pieces.find((p) => p.id === editingId)
            : db.pieces.at(-1);
          const brand = resolveSupplier(data.brand || "", "Marque");
          piece.brandId = brand?.id || "";
          piece.brand = brand?.name || "";
          piece.supplierId = supplier?.id || "";
          piece.image = image;
          if(purchaseTax){piece.purchaseTax=purchaseTax;for(const key of Object.keys(piece))if(/^purchase(Basis|Rate|Recovery|Confirmed)$/.test(key))delete piece[key];}
          if (form.dataset?.productImages) {
            try { const imported=JSON.parse(form.dataset.productImages).filter(url=>safeUrl(url));piece.photos=[...new Set(file?[image,...imported]:imported)].slice(0,8); } catch { piece.photos = []; }
          } else if (piece.photos?.length && piece.photos[0] !== image) {
            piece.photos = [image, ...piece.photos.filter(url=>url!==image)].filter(Boolean).slice(0,8);
          }
          if (file && imageImportMetadata.has(file))
            Object.assign(piece, imageImportMetadata.get(file));
          delete piece.supplierName;
          delete piece.imageUrl;
          delete piece.piecePhoto;
          if (!editingId) {
            piece.selection = "À comparer";
            piece.commit = false;
            piece.status = "Repéré";
          }
          } catch(error) {
            db.contacts = db.contacts.filter(c=>previousContacts.has(c.id));
            db.suppliers = (db.suppliers||[]).filter(s=>previousStructures.has(s.id));
            throw error;
          }
        }
      : callback,
  );
  if (isPiece) updateSupplierSuggestions();
};
function updateSupplierSuggestions() {
  const supplierInput = $('#fields [name="supplierName"]');
  const choice = $('#piece-contact-choice');
  if (!supplierInput || !choice) return;
  const selected = choice.value || choice.dataset.currentContact || "";
  const query = supplierKey($('#piece-contact-search')?.value || "");
  const groups = pieceContactGroups(db, atelierSuppliers, $('#fields [name="brand"]')?.value || "", supplierInput.value);
  choice.innerHTML = '<option value="">Sans contact pour le moment</option>' + groups.map(group => {
    const contacts = group.contacts.filter(c => !query || supplierKey([contactLabel(c), c.email, c.role].join(' ')).includes(query) || contactLabel(c) === selected);
    return contacts.length ? `<optgroup label="${esc(group.label)}">${contacts.map(c => `<option value="${esc(contactLabel(c))}" ${contactLabel(c)===selected?'selected':''}>${esc(contactLabel(c))}${c.email?' — '+esc(c.email):''}</option>`).join('')}</optgroup>` : '';
  }).join('');
  choice.dataset.currentContact = choice.value;
  const brandContext = $('#fields [data-contact-brand-context]'), supplierContext = $('#fields [data-contact-supplier-context]');
  if(brandContext)brandContext.value=$('#fields [name="brand"]')?.value || 'Non renseignée';
  if(supplierContext)supplierContext.value=supplierInput.value || 'Même interlocuteur que la marque';
  $('#supplier-contact-hint').textContent = $('#fields [name="newContactMode"]')?.value === '1' ? 'Le contact et ses liens seront créés en enregistrant la pièce.' : db.contacts.length ? 'Contacts du fournisseur et de la marque en priorité. Le reste du carnet reste disponible ; un seul contact est lié à la pièce.' : 'Ajoutez un contact ici : sa marque et son fournisseur sont déjà préremplis.';
}
function togglePieceContactCreation(enabled) {
  const form = $('#form');
  if(!form?.querySelector('[name="newContactMode"]'))return;
  form.querySelector('[name="newContactMode"]').value=enabled?'1':'0';
  form.querySelector('[data-piece-contact-create]').hidden=!enabled;
  form.querySelector('[data-piece-existing-contact]').hidden=enabled || !db.contacts.length;
  form.querySelector('[data-piece-new-contact]').hidden=enabled;
  for(const input of form.querySelectorAll('[name="newContactName"],[name="newContactEmail"]')){input.disabled=!enabled;input.required=enabled;}
  form.querySelector('[name="contactName"]').disabled=enabled;
  updateSupplierSuggestions();
  if(enabled)form.querySelector('[name="newContactName"]').focus();
}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-piece-new-contact]'))togglePieceContactCreation(true);
  if(event.target.closest('[data-piece-contact-cancel]'))togglePieceContactCreation(false);
});
renderContacts = function () {
  const directory = supplierDirectory();
  const source = networkTab === "directory" ? directory : db.contacts;
  const q = supplierKey(supplierSearch);
  const list = source.filter(
    (s) =>
      supplierKey(
        [s.name, s.brand, s.city, s.role, s.note, ...(s.categories || [])].join(
          " ",
        ),
      ).includes(q) &&
      (networkTab !== "directory" ||
        ((supplierCoverage === "Tous" || (supplierCoverage === "Avec contact" ? relatedContacts(db, s).length > 0 : relatedContacts(db, s).length === 0)) &&
        (supplierCountry === "Tous" || s.country === supplierCountry) &&
          (supplierType === "Tous" || s.type === supplierType) &&
          (supplierCategory === "Toutes" ||
            s.categories?.includes(supplierCategory)))),
  );
  networkPage = Math.min(
    networkPage,
    Math.max(0, Math.ceil(list.length / networkSize) - 1),
  );
  return (
    title(
      "Votre réseau de création.",
      "Marques, loueurs et interlocuteurs : une information saisie une seule fois.",
      "",
      "",
    ) +
    `<div class="network-create-actions"><button class="primary" data-action="contact">＋ Ajouter un contact</button><button data-new-supplier>＋ Ajouter une marque ou un fournisseur</button></div><p class="note">Une marque ou un fournisseur est une entreprise. Un contact est la personne ou le service à joindre, lié à cette entreprise.</p><div class="toolbar"><button data-network-tab="directory" class="${networkTab === "directory" ? "primary" : ""}">Répertoire (${directory.length})</button><button data-network-tab="contacts" class="${networkTab === "contacts" ? "primary" : ""}">${demoMode ? "Contacts publics et ajouts" : "Mes contacts"} (${db.contacts.length})</button></div>
 <p class="note">${demoMode ? "Simulation : coordonnées professionnelles publiques sourcées ; projets et échanges fictifs. Aucun message réel envoyé. Les marques sans contact restent à compléter." : "Répertoire de départ documenté, non exhaustif. Ajoutez les coordonnées publiques à votre carnet quand elles sont utiles."}</p>
 <div class="toolbar"><input id="supplier-search" type="search" placeholder="Nom, spécialité, ville…" aria-label="Rechercher dans le réseau" value="${esc(supplierSearch)}">
 ${networkTab === "directory" ? `<select id="supplier-coverage" aria-label="Couverture des contacts">${opts(["Tous", "Avec contact", "Contact à rechercher"], supplierCoverage)}</select><select id="supplier-country" aria-label="Pays">${opts(["Tous", "Belgique", "France"], supplierCountry)}</select><select id="supplier-type" aria-label="Activité">${opts(["Tous", "Marque", "Location costumes", "Showroom", "À préciser"], supplierType)}</select><select id="supplier-category" aria-label="Spécialité">${opts(["Toutes", "Vêtements", "Bijoux", "Accessoires", "Costumes"], supplierCategory)}</select>` : ""}
 <select id="network-size" aria-label="Fiches par page">${[12, 24, 50, 100].map((n) => `<option value="${n}" ${n === networkSize ? "selected" : ""}>${n} par page</option>`).join("")}</select><span>${list.length} résultats</span></div>
 <div class="contact-grid">${list
   .slice(networkPage * networkSize, (networkPage + 1) * networkSize)
   .map((s) =>
     networkTab === "directory"
       ? `<button class="contact-card" data-supplier="${esc(s.id)}"><span class="avatar">${esc(s.name[0])}</span><div><strong>${esc(s.name)}</strong><small>${esc(s.type)} · ${esc(s.country || "International / à préciser")}</small><small>${esc((s.categories || []).join(" · "))}</small><small>${relatedContacts(db, s).length ? relatedContacts(db, s).length + " interlocuteur(s) lié(s)" : "Contact à rechercher"}</small></div></button>`
       : `<button class="contact-card" data-edit-contact="${esc(s.id)}"><span class="avatar">${esc(s.name?.[0] || "?")}</span><div><strong>${esc(s.brand || "Structure à relier")}</strong><span>${esc(s.name)}</span>${s.publicDirectory ? `<small>Source officielle · relevé ${esc(s.checked)}</small>` : ""}<small>${esc(s.role || "")} · ${esc(s.email || "Adresse à compléter")}</small></div></button>`,
   )
   .join("")}</div>
 ${list.length ? pager(networkPage, list.length, networkSize, "network") : '<div class="empty">Aucun résultat. Ajoutez votre structure ou élargissez les filtres.</div>'}`
  );
};
const supplierOldMessages = messages;
messages = function (p) {
  if (["Terminé", "Annulé"].includes(p.status))
    return supplierOldMessages(p).split(
      '<details class="draft-disclosure">',
    )[0];
  const groups = groupSupplierPieces(db, p.id, atelierSuppliers);
  return `<div class="section-head"><h2>Préparer les demandes par fournisseur</h2><span>${groups.length} groupes</span></div><p class="note">Une demande regroupe uniquement les pièces du même fournisseur. Choisissez l’interlocuteur, relisez le texte puis validez le brouillon. Aucun envoi automatique connecté.</p>
 ${groups.map((g) => `<article class="panel"><h3>${esc(g.supplier?.name || (g.key === "unassigned" ? "Fournisseur à associer" : contactLabel(g.contacts[0])))}</h3><p>${g.pieces.length} options : ${g.pieces.map((x) => esc(x.name)).join(" · ")}</p>${g.key === "unassigned" ? "<p>Renseignez le fournisseur dans les fiches des pièces avant de préparer une demande.</p>" : `<button data-supplier-draft="${esc(g.key)}">Préparer ce message</button>`}</article>`).join("") || "<p>Aucune pièce à demander.</p>"}
 ${(db.supplierDrafts || [])
   .filter((d) => d.project === p.id)
   .map(
     (d) =>
       `<article class="panel"><h3>${esc(d.supplierName)}</h3><p>${esc(d.recipient || "Destinataire manquant")} · ${esc(d.state)}</p><button data-open-supplier-draft="${esc(d.id)}">Relire / modifier</button></article>`,
   )
   .join("")}
 <details><summary>Historique des échanges</summary>${supplierOldMessages(p).split('<details class="draft-disclosure">')[0]}</details>`;
};
function editSupplierDraft(key, id) {
  let draft = (db.supplierDrafts || []).find((d) =>
    id ? d.id === id : d.key === key && d.project === pid,
  );
  const p = project();
  const group = groupSupplierPieces(db, p.id, atelierSuppliers).find(
    (g) => g.key === (key || draft?.key),
  );
  if (!group) {
    toast("Plus de pièces ouvertes pour ce fournisseur.");
    return;
  }
  const name = group.supplier?.name || contactLabel(group.contacts[0]);
  const signature = JSON.stringify([
    p.date,
    p.brief,
    group.pieces.map((x) => [x.id, x.name, x.url, x.note, x.mode]),
  ]);
  const changed = draft && draft.signature !== signature;
  const body = `Bonjour,\n\nPour « ${p.name} » (${p.client}), prévu le ${date(p.date)}, nous recherchons les pièces suivantes :\n\n${group.pieces.map((x) => `• ${x.name} — ${x.brand} · ${x.mode}${x.note ? " · " + x.note : ""}${x.url ? "\n  " + x.url : ""}`).join("\n")}\n\n${p.brief || ""}\n\nPourriez-vous confirmer les tailles, disponibilités aux dates du projet et conditions ?\n\nMerci beaucoup,\n[Votre signature]`;
  modal(
    "Demande · " + name,
    (changed
      ? '<p class="note">Les pièces ou le brief ont changé depuis ce brouillon. Vérifiez et adaptez le message avant de le valider à nouveau.</p>'
      : "") +
      field(
        "recipient",
        "Interlocuteur destinataire",
        "select",
        draft?.recipient || "",
        [
          ["", "Choisir un contact lié"],
          ...group.contacts
            .filter((c) => c.email)
            .map((c) => [c.email, `${c.name} · ${c.email}`]),
        ],
      ) +
      field(
        "subject",
        "Objet",
        "text",
        draft?.subject || `Demande ${p.name} — ${name}`,
      ) +
      field(
        "body",
        "Message à personnaliser",
        "textarea",
        draft?.body || body,
      ) +
      field(
        "state",
        "Validation",
        "select",
        changed ? "À relire" : draft?.state || "À relire",
        [
          ["À relire", "À relire"],
          ["Validé", "Validé pour un futur envoi"],
        ],
      ) +
      '<p class="note">Le message est enregistré comme brouillon ; validation ≠ envoi. Ajoutez vos contacts dans Réseau si la liste est vide.</p>',
    (data) => {
      if (
        data.state === "Validé" &&
        (!data.recipient || data.recipient.endsWith(".invalid"))
      )
        throw Error("Une vraie adresse liée est requise pour valider.");
      const record = {
        ...data,
        signature,
        id: draft?.id || uid(),
        key: group.key,
        project: p.id,
        supplierName: name,
        pieces: group.pieces.map((x) => x.id),
        updated: new Date().toISOString(),
      };
      if (draft) Object.assign(draft, record);
      else (db.supplierDrafts ??= []).push(record);
    },
  );
}
const supplierRender = render;
render = function () {
  supplierRender();
  const demoSummary = $(".notice span");
  if (demoMode && demoSummary)
    demoSummary.textContent = demoSummary.textContent.replace(
      "contacts fictifs",
      "contacts · échanges simulés",
    );
  const notice = $(".notice");
  if (notice)
    notice.firstChild.textContent =
      "0.6 · Réseau & fournisseurs · " +
      (demoMode ? "SIMULATION " : "ESPACE LOCAL ");
};
document.addEventListener("input", (event) => {
  if (event.target.id === "supplier-search") {
    const position = event.target.selectionStart;
    supplierSearch = event.target.value;
    networkPage = 0;
    render();
    const el = $("#supplier-search");
    el.focus();
    el.setSelectionRange(position, position);
  }
  if (["supplierName", "brand"].includes(event.target.name) || event.target.id === "piece-contact-search") updateSupplierSuggestions();
});
document.addEventListener("change", (event) => {
  if(event.target.id === "piece-contact-choice") event.target.dataset.currentContact = event.target.value;
  if(["supplierName", "brand"].includes(event.target.name)) updateSupplierSuggestions();
  const id = event.target.id;
  if (id === "network-size") networkSize = Number(event.target.value);
  else if (id === "supplier-country") supplierCountry = event.target.value;
  else if (id === "supplier-type") supplierType = event.target.value;
  else if (id === "supplier-category") supplierCategory = event.target.value;
  else if (id === "supplier-coverage") supplierCoverage = event.target.value;
  else return;
  networkPage = 0;
  render();
});
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.dataset.networkTab) {
    networkTab = b.dataset.networkTab;
    networkPage = 0;
    render();
  }
  if (b.hasAttribute("data-new-supplier")) editSupplier();
  if (b.dataset.supplier) supplierDetail(b.dataset.supplier);
  if (b.dataset.editSupplier) {
    $("#modal").close();
    editSupplier(b.dataset.editSupplier);
  }
  if (b.dataset.addSupplierContact) {
    $("#modal").close();
    editContact(null, b.dataset.addSupplierContact);
  }
  if (b.dataset.importSupplierEmail) {
    if (
      !db.contacts.some(
        (c) =>
          c.supplierId === b.dataset.importSupplierEmail &&
          c.email === b.dataset.email,
      )
    ) {
      const s = getSupplier(b.dataset.importSupplierEmail);
      db.contacts.push({
        id: uid(),
        supplierId: s.id,
        brand: s.name,
        name: "Contact public",
        email: b.dataset.email,
        role: "Service à confirmer",
        note: "Coordonnée publiée : " + s.source,
      });
      save();
    }
    supplierDetail(b.dataset.importSupplierEmail);
  }
  if (b.dataset.page?.startsWith("network:")) {
    networkPage = Number(b.dataset.page.split(":")[1]);
    render();
  }
  if (b.dataset.supplierDraft) editSupplierDraft(b.dataset.supplierDraft);
  if (b.dataset.openSupplierDraft)
    editSupplierDraft(null, b.dataset.openSupplierDraft);
});
render();

/** Migration du scénario fictif uniquement : contacts associés à la marque réelle de chaque référence. */
function linkSimulationSuppliers() {
  if (!demoMode || db.supplierSimulationVersion === 1) return;
  db.suppliers ??= [];
  for (const reference of atelierCatalog) {
    let supplier = supplierDirectory().find(
      (s) => supplierKey(s.name) === supplierKey(reference.brand),
    );
    if (!supplier) {
      supplier = {
        id: "simulation-brand-" + supplierKey(reference.brand),
        name: reference.brand,
        type: "Marque",
        country: "",
        categories: [reference.category],
        website: reference.url,
        source: reference.url,
        checked: reference.checked || "2026-10-14",
        emails: [],
        note: "Référence produit réelle du catalogue de démonstration. Prêt, contact presse et disponibilité non confirmés.",
      };
      db.suppliers.push(supplier);
    }
    for (const contact of db.contacts) {
      if (
        supplierKey(contact.brand?.split(" · ")[0]) ===
        supplierKey(reference.brand)
      )
        contact.supplierId ??= supplier.id;
    }
    const contacts = relatedContacts(db, supplier);
    for (const piece of db.pieces) {
      if (
        !piece.supplierId &&
        supplierKey(piece.brand) === supplierKey(reference.brand)
      ) {
        piece.supplierId = supplier.id;
        piece.contact = contacts[0]?.id || "";
      }
    }
  }
  db.supplierSimulationVersion = 1;
  save();
}
const supplierMigrateRender = render;
render = function () {
  linkSimulationSuppliers();
  supplierMigrateRender();
};
render();
