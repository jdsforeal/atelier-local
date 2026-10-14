/**
 * Métier des looks.
 * Un projet contient plusieurs looks à produire.
 * Un look possède plusieurs propositions créatives (variantes).
 * Chaque besoin reçoit plusieurs pièces candidates ; le choix final est explicite.
 * Les identifiants restent internes et stables, même si un nom change.
 */
function prepareLookChoices(database, catalog = []) {
  database.selectionHistory ??= [];
  database.projects.forEach((project) => {
    project.looks.forEach((look) => {
      look.variants ??= [
        {
          id: `${look.id}-a`,
          name: "Proposition A · direction initiale",
          status: "À comparer",
        },
        {
          id: `${look.id}-b`,
          name: "Proposition B · autre silhouette",
          status: "À comparer",
        },
      ];
      look.activeVariant ??= look.variants[0].id;
      look.needs.forEach((need, index) => {
        need.id ??= `${look.id}-need-${index}`;
        need.category ??= need.name;
        need.multiple ??= false;
      });
      const items = database.pieces.filter(
        (piece) => piece.project === project.id && piece.look === look.id,
      );
      for (const piece of items) {
        const need = look.needs.find(
          (need) => need.category === piece.category,
        );
        if (need) {
          piece.needId ??= need.id;
          if (
            catalog.filter((entry) => entry.category === need.category)
              .length === 1
          )
            piece.variantId = "";
        }
        piece.variantId ??= piece.note?.startsWith("Alternative")
          ? look.variants[1].id
          : look.variants[0].id;
        piece.selection ??= ["Écarté", "Indisponible"].includes(piece.status)
          ? "Écartée"
          : piece.commit
            ? "Retenue"
            : "À comparer";
        if (piece.selection === "Écartée")
          piece.selectionReason ??= piece.note || "Autre direction artistique";
      }
      if (!project.simulation || look.choicesSeeded) return;
      // De vraies références alternatives, à comparer au sein du même besoin.
      for (const need of look.needs) {
        const current = items.filter((piece) => piece.needId === need.id);
        const refs = catalog.filter(
          (entry) => entry.category === need.category,
        );
        const missing = refs.filter(
          (entry) => !current.some((piece) => piece.ref === entry.ref),
        );
        for (const [index, entry] of missing.slice(0, 2).entries()) {
          database.pieces.push({
            id: `${look.id}-${need.id}-${entry.ref}`,
            project: project.id,
            look: look.id,
            needId: need.id,
            variantId:
              missing.length === 1
                ? look.variants[1].id
                : index === 0
                  ? look.variants[0].id
                  : look.variants[1].id,
            ref: entry.ref,
            name: entry.name,
            brand: entry.brand,
            category: entry.category,
            image: entry.image,
            url: entry.url,
            publicPrice: entry.publicPrice,
            composition: entry.composition,
            animal: entry.animal,
            origin: entry.origin,
            mode: "Location",
            price: 50,
            caution: 0,
            commit: false,
            selection: project.status === "Terminé" ? "Écartée" : "À comparer",
            selectionReason:
              project.status === "Terminé"
                ? "Palette ou silhouette moins adaptée au brief — simulation"
                : "",
            status: project.status === "Terminé" ? "Écarté" : "Repéré",
            note: "Option de comparaison ; coût et disponibilité simulés.",
          });
        }
      }
      for (const piece of database.pieces.filter(
        (piece) => piece.look === look.id && piece.needId,
      )) {
        if (
          !database.selectionHistory.some((entry) => entry.piece === piece.id)
        )
          database.selectionHistory.push({
            id: `initial-${piece.id}`,
            project: project.id,
            look: look.id,
            needId: piece.needId,
            piece: piece.id,
            action: piece.selection,
            reason: piece.selectionReason || "État initial du scénario simulé",
            date:
              (project.status === "Terminé"
                ? project.history?.[2]?.date
                : project.history?.filter((stage) => stage.done).at(-1)
                    ?.date) || new Date().toISOString(),
          });
      }
      look.choicesSeeded = true;
      if (project.status === "Terminé") {
        look.variants[0].status = "Validée";
        look.variants[1].status = "Écartée";
        look.variantReason =
          "Direction initiale retenue après comparaison — simulation";
      }
    });
  });
}

/** Retenir une option ne confirme ni un stock, ni un prêt, ni une dépense. */
function retainLookPiece(
  database,
  pieceId,
  reason,
  timestamp = new Date().toISOString(),
) {
  const piece = database.pieces.find((piece) => piece.id === pieceId);
  if (!piece) throw new Error("Pièce introuvable.");
  const project = database.projects.find(
    (project) => project.id === piece.project,
  );
  if (project?.status === "Terminé")
    throw new Error("Rouvrez le projet pour modifier une sélection archivée.");
  const look = project?.looks.find((look) => look.id === piece.look);
  const need = look?.needs.find((need) => need.id === piece.needId);
  if (!need) throw new Error("Associez cette pièce à un besoin du look.");
  if (["Écarté", "Indisponible"].includes(piece.status)) {
    throw new Error("Réactivez cette option avant de la retenir.");
  }
  if (!need.multiple) {
    const previous = database.pieces.filter(
      (other) =>
        other.look === piece.look &&
        other.needId === piece.needId &&
        other.selection === "Retenue" &&
        other.id !== piece.id,
    );
    if (previous.some((other) => other.commit))
      throw new Error(
        "Une autre pièce est déjà engagée pour ce besoin. Ajustez son engagement avant de la remplacer.",
      );
    previous.forEach((other) => {
      other.selection = "À comparer";
      database.selectionHistory.push({
        id: `replaced-${timestamp}-${other.id}`,
        project: other.project,
        look: other.look,
        piece: other.id,
        needId: other.needId,
        action: "Remplacée",
        reason: `Remplacée par ${piece.name}. ${reason}`,
        date: timestamp,
      });
    });
  }
  piece.selection = "Retenue";
  piece.selectionReason = reason;
  need.state = "Retenu";
  database.selectionHistory.push({
    id: `choice-${timestamp}-${piece.id}`,
    project: piece.project,
    look: piece.look,
    needId: piece.needId,
    piece: piece.id,
    action: "Retenue",
    reason,
    date: timestamp,
  });
}

/** Journaliser la logistique sans la confondre avec le choix créatif. */
function updatePieceLogistics(database, pieceId, status) {
  const piece = database.pieces.find((piece) => piece.id === pieceId);
  if (!piece) throw new Error("Pièce introuvable.");
  const project = database.projects.find(
    (project) => project.id === piece.project,
  );
  if (project?.status === "Terminé")
    throw new Error("Rouvrez le projet pour modifier son suivi.");
  if (status === "Écarté" && piece.commit)
    throw new Error(
      "Ajustez l’engagement du budget avant d’écarter cette pièce.",
    );
  const previous = piece.status;
  piece.status = status;
  if (status === "Écarté") piece.selection = "Écartée";
  database.selectionHistory ??= [];
  database.selectionHistory.push({
    id: `logistics-${Date.now()}-${pieceId}`,
    project: piece.project,
    look: piece.look,
    piece: piece.id,
    action: "Suivi modifié",
    reason: `${previous} → ${status}`,
    date: new Date().toISOString(),
  });
}

function recordPieceEdit(database, piece, values) {
  const changes = Object.keys(values).filter(
    (key) =>
      [
        "look",
        "needId",
        "variantId",
        "price",
        "commit",
        "received",
        "returnDue",
        "returned",
        "cautionReturned",
      ].includes(key) && values[key] !== piece[key],
  );
  if (!changes.length) return;
  database.selectionHistory ??= [];
  database.selectionHistory.push({
    id: `edit-${Date.now()}-${piece.id}`,
    project: piece.project,
    look: piece.look,
    piece: piece.id,
    action: "Fiche modifiée",
    reason: changes
      .map(
        (key) =>
          `${{ look: "Look", needId: "Besoin", variantId: "Piste", price: "Coût", commit: "Engagement", received: "Réception", returnDue: "Retour prévu", returned: "Retour effectué", cautionReturned: "Caution restituée" }[key]} : ${piece[key] ?? "vide"} → ${values[key] ?? "vide"}`,
      )
      .join(" ; "),
    date: new Date().toISOString(),
  });
}

/** Les références catalogue communes sont stockées une seule fois. */
function serializeWorkspace(database, catalog = []) {
  const byReference = new Map(
    (database.catalog || catalog).map((entry) => [entry.ref, entry]),
  );
  const sharedFields = [
    "name",
    "brand",
    "category",
    "image",
    "url",
    "publicPrice",
    "composition",
    "animal",
    "origin",
    "checked",
    "remoteImage",
  ];
  return JSON.stringify({
    ...database,
    pieces: database.pieces.map((piece) => {
      const compact = { ...piece };
      const source = byReference.get(piece.ref);
      if (source)
        sharedFields.forEach((key) => {
          if (compact[key] === source[key]) delete compact[key];
        });
      return compact;
    }),
  });
}

function hydrateWorkspace(database, catalog = []) {
  const byReference = new Map(
    (database.catalog || catalog).map((entry) => [entry.ref, entry]),
  );
  database.pieces = database.pieces.map((piece) => ({
    ...byReference.get(piece.ref),
    ...piece,
  }));
  return database;
}
