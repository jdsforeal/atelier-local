/** Vue centrée sur la décision : projet → look → piste → besoin → options. */
const processRender = render;
const processPieceForm = pieceForm;

function pieceGallery(piece) {
  const photos=[...new Set([piece.image,...(piece.photos||[])].filter(Boolean))];
  if(!photos.length)return art(0);
  return `<div class="piece-gallery"><img class="piece-gallery-main" src="${esc(photos[0])}" alt="${esc(piece.name)}" loading="lazy">${photos.length>1?`<div class="piece-gallery-thumbs" aria-label="Photos de la pièce">${photos.map((url,i)=>`<button type="button" data-piece-photo="${esc(url)}" aria-label="Voir la photo ${i+1}" aria-pressed="${i===0}"><img src="${esc(url)}" alt="Vue ${i+1}" loading="lazy"></button>`).join('')}</div>`:''}</div>`;
}
function choiceCard(piece, archived) {
  const retained = piece.selection === "Retenue";
  return `<article class="choice-card ${retained ? "retained" : ""}">
    ${pieceGallery(piece)}
    <div class="choice-body"><small>${esc(piece.brand)}</small><h3>${esc(piece.name)}</h3>
    <span class="tag">${esc(piece.selection || "À comparer")}</span>
    <p>${esc(piece.mode)} · ${typeof purchaseCostLabel==='function'?purchaseCostLabel(piece):'coût '+euro(piece.price)} ${piece.commit ? "· engagé" : "· prévision si retenue"}</p>
    <small>Disponibilité : ${esc(typeof flowAvailability === "function" ? flowAvailability(piece, project()) : piece.status)} · Suivi : ${esc(piece.status)}${piece.clientApproval ? " · choix validé par le client" : ""}</small>
    ${piece.selectionReason ? `<p class="choice-reason">${esc(piece.selectionReason)}</p>` : ""}
    <div class="actions">${!archived && !retained && piece.selection !== "Écartée" ? `<button class="primary" data-retain-piece="${esc(piece.id)}">Retenir</button>` : ""}
    ${!archived && piece.selection !== "Écartée" ? `<button data-reject-piece="${esc(piece.id)}">Écarter</button>` : ""}
    ${!archived && piece.selection === "Écartée" ? `<button data-reconsider-piece="${esc(piece.id)}">Réexaminer</button>` : ""}
    <button class="quiet" data-edit-piece="${esc(piece.id)}">Détails</button>
    ${piece.url ? `<a href="${esc(piece.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</div></div>
  </article>`;
}

let choiceLookId = "";

function lookChoicesView(project) {
  prepareLookChoices(db, atelierCatalog);
  if (!project.looks.some((look) => look.id === choiceLookId))
    choiceLookId = project.looks[0]?.id || "";
  const displayedLooks = project.looks.filter(
    (look) => look.id === choiceLookId,
  );
  return `<div class="look-navigation"><div class="look-selector">${project.looks.map((look) => `<button data-choice-look="${esc(look.id)}" class="${look.id === choiceLookId ? "active" : ""}">${esc(look.name)}</button>`).join("")}</div>${project.status!=='Terminé'&&canEditProject(project.id)?'<button class="primary" data-action="look">＋ Nouveau look</button>':''}</div><details class="process-guide"><summary>Aide et raccourcis du projet</summary><strong>Une méthode claire</strong>
    <p>1. Comparer les pistes du look → 2. Comparer les pièces de chaque besoin → 3. Retenir les options → 4. Confirmer disponibilité et budget → 5. Réception, essayage et retours.</p>
    <small>« Retenue » est un choix créatif. « Engagé » est une décision de budget. Les deux sont distincts.</small></details>
    ${displayedLooks
      .map((look) => {
        const archived = project.status === "Terminé";
        const allPieces = db.pieces.filter(
          (piece) =>
            piece.project === project.id &&
            (typeof flowInLook === "function"
              ? flowInLook(piece, look.id)
              : piece.look === look.id),
        );
        const variant = look.variants.find(
          (variant) => variant.id === look.activeVariant,
        );
        const history = db.selectionHistory.filter(
          (entry) => entry.look === look.id,
        );
        return `<section class="look-workspace"><div class="section-head"><div><small>LOOK · ${esc(look.person || project.client)}</small><h2>${esc(look.name)}</h2></div>
        ${!archived ? `<button class="primary" data-batch-import-launch data-import-look="${esc(look.id)}">＋ Ajouter des pièces</button>` : '<span class="tag">Archivé</span>'}</div>
        <details class="look-variant-tools"><summary>Variantes et réglages du look <span>${look.variants.length} variante${look.variants.length>1?'s':''}</span></summary><p class="note">Les variantes sont différentes propositions pour « ${esc(look.name)} ». Pour créer un look indépendant, utilisez « Nouveau look ».</p>${!archived?`<div class="actions"><button data-add-variant="${esc(look.id)}">＋ Créer une variante</button><button class="quiet" data-add-need="${esc(look.id)}">＋ Ajouter une catégorie</button></div>`:''}<div class="variant-tabs">${look.variants.map((candidate) => `<button data-look-variant="${esc(look.id)}:${esc(candidate.id)}" class="${candidate.id === look.activeVariant ? "active" : ""}"><strong>${esc(candidate.name)}</strong><small>${esc(candidate.status)}</small></button>`).join("")}</div>
        <div class="variant-summary"><span>${esc(variant?.name)}${variant?.brief ? " · " + esc(variant.brief) : ""}${look.variantReason ? " · " + esc(look.variantReason) : ""}</span>
        ${!archived ? `<button class="quiet" data-validate-variant="${esc(look.id)}">Valider cette variante</button>` : ""}</div></details>
        ${look.needs
          .map((need) => {
            const options = allPieces.filter(
              (piece) =>
                (piece.needId === need.id ||
                  piece.lookUses?.some(
                    (u) => u.look === look.id && u.needId === need.id,
                  )) &&
                (!piece.variantId ||
                  piece.variantId === look.activeVariant ||
                  piece.look !== look.id),
            );
            const retained = allPieces.filter(
              (piece) =>
                (piece.needId === need.id ||
                  piece.lookUses?.some(
                    (u) => u.look === look.id && u.needId === need.id,
                  )) &&
                piece.selection === "Retenue",
            );
            return `<div class="need-section"><div class="section-head"><div><h3>${esc(need.name)}</h3><small>${need.multiple ? "Plusieurs pièces finales possibles" : "Une pièce finale"} · ${options.length} pièces dans cette variante · ${retained.length} retenue${retained.length > 1 ? "s" : ""} au total</small></div>
            ${!archived ? `<button data-batch-import-launch data-import-look="${esc(look.id)}" data-import-need="${esc(need.id)}">＋ Ajouter des pièces</button><details class="need-tools"><summary aria-label="Réglages de ${esc(need.name)}">⋯</summary><button class="quiet" data-multiple-need="${esc(look.id)}:${esc(need.id)}">Composition : une ou plusieurs pièces finales</button></details>` : ""}</div>
            ${
              retained.some((piece) => piece.variantId !== look.activeVariant)
                ? `<p class="note">Une pièce de l’autre piste est retenue : ${retained
                    .filter((piece) => piece.variantId !== look.activeVariant)
                    .map((piece) => esc(piece.name))
                    .join(", ")}.</p>`
                : ""
            }
            <div class="choices-grid">${options.map((piece) => choiceCard(piece, archived)).join("") || '<p class="note">Ajoutez une ou plusieurs pièces depuis des liens, des images ou une saisie manuelle.</p>'}</div></div>`;
          })
          .join("")}
        <details class="selection-log"><summary>Historique des décisions (${history.length})</summary>
        ${
          history.length
            ? `<ol>${history
                .slice()
                .reverse()
                .map(
                  (entry) =>
                    `<li><strong>${esc(entry.action)}</strong> · ${esc(db.pieces.find((piece) => piece.id === entry.piece)?.name || entry.label || "Piste créative")}<small>${new Date(entry.date).toLocaleString("fr-FR")}</small><p>${esc(entry.reason)}</p></li>`,
                )
                .join("")}</ol>`
            : '<p class="note">Les prochains choix et motifs seront conservés ici.</p>'
        }</details>
        <button class="look-open" data-open-look="${esc(look.id)}">Ouvrir la sélection et le suivi de ce look →</button></section>`;
      })
      .join("")}`;
}

pieceForm = function (piece = {}) {
  const look = db.projects
    .find((project) => project.id === (piece.project || pid))
    ?.looks.find((look) => look.id === piece.look);
  return (
    processPieceForm(piece) +
    field("needId", "Besoin du look", "select", piece.needId || "", [
      ["", "À associer"],
      ...(look?.needs || []).map((need) => [need.id, need.name]),
    ]) +
    field(
      "variantId",
      "Piste créative",
      "select",
      piece.variantId || look?.activeVariant || "",
      [
        ["", "Commune à toutes les pistes"],
        ...(look?.variants || []).map((variant) => [variant.id, variant.name]),
      ],
    )
  );
};

render = function () {
  processRender();
  if (view === "detail" && tab === "looks") {
    const content = $("#content");
    content.querySelector('.title-row [data-action="look"]')?.remove();
    const cards = content.querySelector(".cards");
    if (cards) cards.outerHTML = lookChoicesView(project());
  }
};

function logChoice(lookId, action, reason, extra = {}) {
  db.selectionHistory.push({
    id: uid(),
    project: pid,
    look: lookId,
    action,
    reason,
    date: new Date().toISOString(),
    ...extra,
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if(button.dataset.piecePhoto){const gallery=button.closest('.piece-gallery');gallery.querySelector('.piece-gallery-main').src=button.dataset.piecePhoto;gallery.querySelectorAll('[data-piece-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));return;}
  if (button.dataset.choiceLook) {
    choiceLookId = button.dataset.choiceLook;
    render();
  }
  if (button.dataset.reconsiderPiece) {
    const piece = db.pieces.find(
      (piece) => piece.id === button.dataset.reconsiderPiece,
    );
    modal(
      "Réexaminer cette option",
      field("reason", "Pourquoi la reconsidérer ?", "textarea"),
      (data) => {
        piece.selection = "À comparer";
        piece.status = "Repéré";
        piece.selectionReason = data.reason;
        logChoice(piece.look, "Réexaminée", data.reason, {
          piece: piece.id,
          needId: piece.needId,
        });
      },
    );
  }
  if (button.dataset.multipleNeed) {
    const [lookId, needId] = button.dataset.multipleNeed.split(":");
    const need = project()
      .looks.find((look) => look.id === lookId)
      .needs.find((need) => need.id === needId);
    modal(
      "Pièces finales pour ce besoin",
      field(
        "multiple",
        "Composition",
        "select",
        need.multiple ? "Oui" : "Non",
        [
          ["Non", "Une seule pièce finale"],
          ["Oui", "Plusieurs pièces — superpositions / bijoux"],
        ],
      ),
      (data) => {
        if (
          data.multiple === "Non" &&
          db.pieces.filter(
            (piece) =>
              piece.look === lookId &&
              piece.needId === needId &&
              piece.selection === "Retenue",
          ).length > 1
        )
          throw new Error(
            "Gardez une seule pièce retenue avant de passer à ce réglage.",
          );
        need.multiple = data.multiple === "Oui";
        logChoice(
          lookId,
          "Composition ajustée",
          need.multiple
            ? "Plusieurs pièces finales possibles"
            : "Une seule pièce finale",
          { needId, label: need.name },
        );
      },
    );
  }
  if (button.dataset.lookVariant) {
    const [lookId, variantId] = button.dataset.lookVariant.split(":");
    project().looks.find((look) => look.id === lookId).activeVariant =
      variantId;
    save();
    render();
  }
  if (button.dataset.addVariant) {
    const look = project().looks.find(
      (look) => look.id === button.dataset.addVariant,
    );
    modal(
      "Créer une variante de ce look",
      field("name", "Nom de la variante (pas un nouveau look)") +
        field("brief", "Intention créative", "textarea"),
      (data) => {
        const variant = { ...data, id: uid(), status: "À comparer" };
        look.variants.push(variant);
        look.activeVariant = variant.id;
        logChoice(look.id, "Piste ajoutée", data.brief, { label: data.name });
      },
    );
  }
  if (button.dataset.validateVariant) {
    const look = project().looks.find(
      (look) => look.id === button.dataset.validateVariant,
    );
    modal(
      "Valider une direction créative",
      field("reason", "Pourquoi cette piste ?", "textarea"),
      (data) => {
        look.variants.forEach((variant) => {
          variant.status =
            variant.id === look.activeVariant ? "Validée" : "À comparer";
        });
        look.variantReason = data.reason;
        logChoice(look.id, "Piste validée", data.reason, {
          label: look.variants.find(
            (variant) => variant.id === look.activeVariant,
          ).name,
        });
      },
    );
  }
  if (button.dataset.addOption) {
    const [lookId, needId] = button.dataset.addOption.split(":");
    const look = project().looks.find((look) => look.id === lookId);
    const need = look.needs.find((need) => need.id === needId);
    const sample = {
      project: pid,
      look: lookId,
      needId,
      variantId: look.activeVariant,
      category: need.category,
      mode: "Prêt",
    };
    modal("Ajouter une option pour " + need.name, pieceForm(sample), (data) => {
      if (data.url && !safeUrl(data.url))
        throw new Error("Utilisez un lien http ou https.");
      const contact = db.contacts.find(
        (contact) => contactLabel(contact) === data.contactName,
      );
      if (data.contactName && !contact)
        throw new Error("Choisissez un contact du carnet.");
      db.pieces.push({
        ...data,
        project: pid,
        look: lookId,
        needId: resolvePieceNeed(db, {...data, project:pid, look:lookId}, uid),
        variantId: look.activeVariant,
        id: uid(),
        contact: contact?.id || "",
        price: Number(data.price),
        caution: Number(data.caution),
        cautionReturned: data.cautionReturned === "Oui",
        commit: data.commit === "Engagé",
        status: "Repéré",
        selection: "À comparer",
        image: "",
      });
      logChoice(lookId, "Option ajoutée", "", { label: data.name });
    });
  }
  if (button.dataset.retainPiece) {
    const piece = db.pieces.find(
      (piece) => piece.id === button.dataset.retainPiece,
    );
    modal(
      "Retenir cette option",
      field("reason", "Motif du choix", "textarea"),
      (data) => {
        return retainLookPiece(
          db,
          piece.id,
          data.reason.trim() || "Option retenue par le studio",
        );
      },
    );
  }
  if (button.dataset.rejectPiece) {
    const piece = db.pieces.find(
      (piece) => piece.id === button.dataset.rejectPiece,
    );
    modal(
      "Écarter cette option",
      field("reason", "Motif : coupe, couleur, budget…", "textarea") +
        (piece.commit
          ? field("financialDecision", "Coût déjà engagé", "select", "keep", [
              ["keep", "Conserver le coût : réservation / achat encore dû"],
              [
                "release",
                "Annulation confirmée sans frais : libérer le budget",
              ],
            ]) +
            '<p class="note">Écarter du look ne résilie pas une location. Libérez le coût uniquement après confirmation du fournisseur.</p>'
          : ""),
      (data) => {
        data.reason = data.reason.trim() || "Option écartée par le studio";
        piece.selection = "Écartée";
        piece.selectionReason = data.reason;
        if (data.financialDecision === "release") piece.commit = false;
        if (!piece.commit) piece.status = "Écarté";
        logChoice(
          piece.look,
          "Écartée",
          data.reason +
            (piece.commit
              ? " · coût conservé"
              : data.financialDecision === "release"
                ? " · engagement annulé sans frais"
                : ""),
          {
            piece: piece.id,
            needId: piece.needId,
          },
        );
      },
    );
  }
});

// Les formulaires restent cohérents lorsque le look choisi change.
document.addEventListener("change", (event) => {
  if (event.target.name !== "look" || !$("#modal").open) return;
  const form = $("#form");
  const look = db.projects
    .find((project) => project.id === form.elements.project.value)
    ?.looks.find((look) => look.id === event.target.value);
  for (const [name, values] of [
    ["needId", look?.needs],
    ["variantId", look?.variants],
  ]) {
    if (form.elements[name])
      form.elements[name].innerHTML =
        '<option value="">À associer</option>' +
        (values || [])
          .map(
            (item) =>
              `<option value="${esc(item.id)}">${esc(item.name)}</option>`,
          )
          .join("");
  }
});
render();

const lookCreationPreviousAction=action;
action=function(a){
 if(a!=='look')return lookCreationPreviousAction(a);
 const p=project();if(!p||p.status==='Terminé'||!canEditProject(p.id))return toast('Choisissez un projet actif que vous pouvez modifier.');
 modal('Créer un nouveau look',field('name','Nom du look')+field('person','Personne / silhouette — facultatif')+field('needs','Catégories, séparées par une virgule','text','Haut, Bas, Chaussures, Accessoire'),data=>{
  const id=uid(),name=String(data.name||'').trim();if(!name)throw Error('Donnez un nom au look.');
  const variant={id:id+'-a',name:'Version initiale',status:'À comparer'};
  p.looks.push({id,name,person:data.person||'',needs:[...new Set(String(data.needs||'').split(',').map(n=>n.trim()).filter(Boolean))].map((name,i)=>({id:id+'-need-'+i,name,category:name,state:'À chercher',multiple:false})),variants:[variant],activeVariant:variant.id});
  choiceLookId=id;tab='looks';
 });
};
