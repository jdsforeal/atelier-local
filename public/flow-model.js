/** Décisions créatives, disponibilité datée et acquisitions restent indépendantes. */
function flowAvailability(piece, project) {
  const old = {
    Demandé: "En attente",
    Confirmé: "Disponible",
    Reçu: "Disponible",
    Porté: "Disponible",
    Indisponible: "Indisponible",
  };
  if (
    piece.availability &&
    [
      "À demander",
      "En attente",
      "Disponible",
      "Indisponible",
      "À reconfirmer",
      "Réservée",
      "Stock du studio",
    ].includes(piece.availability)
  )
    return piece.availabilityDate && piece.availabilityDate !== project.date
      ? "À reconfirmer"
      : piece.availability;
  if (piece.stockOwned || piece.mode === "Stock du studio")
    return "Stock du studio";
  return (
    old[piece.status] || (piece.stockOwned ? "Stock du studio" : "À demander")
  );
}
function flowUses(piece) {
  return [
    { look: piece.look, needId: piece.needId },
    ...(piece.lookUses || []),
  ];
}
function flowInLook(piece, lookId) {
  return flowUses(piece).some((x) => x.look === lookId);
}
function flowSelected(database, project) {
  return database.pieces.filter(
    (x) =>
      x.project === project.id &&
      x.selection === "Retenue" &&
      !["Écarté", "Indisponible"].includes(x.status) &&
      flowAvailability(x, project) !== "Indisponible" &&
      flowUses(x).some((use) => {
        const look = project.looks.find((l) => l.id === use.look);
        return (
          !look?.budgetVariant ||
          !x.variantId ||
          x.variantId === look.budgetVariant ||
          use.look !== x.look
        );
      }),
  );
}
function flowFingerprint(project, pieces) {
  return JSON.stringify([
    project.name,
    project.date,
    project.looks.map((l) => [l.id, l.name]),
    pieces
      .map((x) => [
        x.id,
        x.name,
        x.image,
        x.price,
        x.mode,
        x.selection,
        x.availability,
        x.availabilityDate,
        x.status,
        x.variantId,
        flowUses(x),
      ])
      .sort((a, b) => a[0].localeCompare(b[0])),
  ]);
}
function flowSnapshot(database, project, showPrices = false) {
  const items = database.pieces.filter(
    (x) =>
      x.project === project.id &&
      x.clientVisible !== false &&
      x.selection !== "Écartée" &&
      x.status !== "Écarté",
  );
  return {
    id: "board-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    name: project.name,
    date: project.date,
    showPrices,
    source: flowFingerprint(project, items),
    status: "Préparée",
    simulation: Boolean(project.simulation),
    looks: project.looks.map((l) => ({
      id: l.id,
      name: l.name,
      variants: structuredClone(l.variants || []),
      needs: structuredClone(l.needs || []),
      pieces: items
        .filter((x) => flowInLook(x, l.id))
        .map((x) => ({
          ...structuredClone(x),
          availability: flowAvailability(x, project),
          needId: flowUses(x).find((u) => u.look === l.id)?.needId,
        })),
    })),
  };
}
function flowObligations(database, project) {
  return database.pieces.filter(
    (x) =>
      x.project === project.id &&
      ((x.commit && x.selection !== "Retenue") ||
        (["Prêt", "Location"].includes(x.mode) &&
          (x.received ||
            ["Reçu", "Porté", "Retour en cours"].includes(x.status)) &&
          x.status !== "Retourné") ||
        (x.commit && Number(x.caution) > 0 && !x.cautionReturned)),
  );
}
function flowMoveDates(database, project, nextDate, shift) {
  const old = project.date;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(nextDate) ||
    !Number.isFinite(Date.parse(nextDate + "T12:00:00Z")) ||
    new Date(nextDate + "T12:00:00Z").toISOString().slice(0, 10) !== nextDate
  )
    throw Error("Indiquez une date valide.");
  const delta = old
    ? Math.round(
        (Date.parse(nextDate + "T12:00:00Z") - Date.parse(old + "T12:00:00Z")) /
          86400000,
      )
    : 0;
  const move = (value) => {
    if (!value || !delta) return value;
    const d = new Date(value + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  };
  if (shift) {
    (database.tasks || [])
      .filter((x) => x.project === project.id && !x.done)
      .forEach((x) => {
        if (x.date) x.date = move(x.date);
        if (x.due) x.due = move(x.due);
      });
    database.pieces
      .filter((x) => x.project === project.id && x.status !== "Retourné")
      .forEach((x) => {
        if (x.returnDue) x.returnDue = move(x.returnDue);
        if (x.receiveDue) x.receiveDue = move(x.receiveDue);
      });
  }
  database.pieces
    .filter(
      (x) =>
        x.project === project.id &&
        (x.commit ||
          ["Disponible", "Réservée"].includes(flowAvailability(x, project))),
    )
    .forEach((x) => {
      x.availability = "À reconfirmer";
      x.availabilityDate = nextDate;
    });
  if (shift)
    for (const stage of (project.history || []).filter((x) => !x.done))
      if (stage.date) stage.date = move(stage.date);
  project.date = nextDate;
  (project.dateHistory ??= []).push({
    from: old,
    to: nextDate,
    shifted: shift,
    date: new Date().toISOString(),
  });
}
function flowApplyValidation(database, project, version, ids, client, note) {
  if (["Terminé", "Annulé"].includes(project.status))
    throw Error("Rouvrez le projet avant de modifier ses choix.");
  if (!client.trim()) throw Error("Indiquez qui a validé cette sélection.");
  const available = new Set(
    version.looks.flatMap((l) => l.pieces.map((x) => x.id)),
  );
  if (!ids.length || ids.some((id) => !available.has(id)))
    throw Error("Choisissez les pièces validées dans cette version.");
  if (
    ids.some(
      (id) =>
        !database.pieces.some((x) => x.id === id && x.project === project.id),
    )
  )
    throw Error(
      "Une pièce de cette version a été supprimée : préparez une nouvelle version.",
    );
  // Une seule option par besoin, sauf composition multiple explicite.
  for (const look of version.looks)
    for (const need of look.needs) {
      if (
        !need.multiple &&
        look.pieces.filter((x) => x.needId === need.id && ids.includes(x.id))
          .length > 1
      )
        throw Error(
          "Gardez une seule option pour " + look.name + " / " + need.name + ".",
        );
    }
  // La réponse est appliquée aux besoins présentés, jamais aux acquisitions.
  for (const frozenLook of version.looks) {
    const liveLook = project.looks.find((l) => l.id === frozenLook.id);
    if (!liveLook) continue;
    const variants = [
      ...new Set(
        frozenLook.pieces
          .filter(
            (x) => ids.includes(x.id) && x.variantId && x.look === liveLook.id,
          )
          .map((x) => x.variantId),
      ),
    ];
    liveLook.budgetVariant = variants.length === 1 ? variants[0] : "";
    for (const n of liveLook.needs) {
      const shown = frozenLook.pieces.filter((x) => x.needId === n.id);
      if (shown.length)
        n.state = shown.some((x) => ids.includes(x.id))
          ? "Retenu"
          : "À chercher";
    }
  }
  const stamp = new Date().toISOString();
  for (const x of database.pieces.filter(
    (x) => x.project === project.id && available.has(x.id),
  )) {
    const chosen = ids.includes(x.id);
    x.selection = chosen
      ? "Retenue"
      : x.selection === "Retenue"
        ? "À comparer"
        : x.selection;
    if (!chosen) delete x.clientApproval;
    if (chosen) {
      x.clientApproval = { version: version.id, client, date: stamp };
    }
  }
  (version.validations ??= []).push({
    ids: [...ids],
    client,
    note,
    date: stamp,
  });
  version.status = "Validation enregistrée";
  project.validation =
    "Sélection validée (" + ids.length + " pièces) — " + client;
  project.clientSelectionVersion = version.id;
  project.clientSelectionIds = [...ids];
  const allNeeds = project.looks.flatMap((l) => l.needs);
  const complete =
    allNeeds.length > 0 && allNeeds.every((n) => n.state === "Retenu");
  for (const task of (database.tasks || []).filter(
    (t) =>
      t.project === project.id && t.name === "Direction validée par le client",
  )) {
    task.done = complete;
    task.automatic = true;
  }
  (database.selectionHistory ??= []).push({
    id: "client-" + stamp,
    project: project.id,
    action: "Validation client enregistrée",
    reason: client + " · " + note,
    date: stamp,
  });
}
if (typeof module !== "undefined")
  module.exports = {
    flowAvailability,
    flowUses,
    flowInLook,
    flowSelected,
    flowFingerprint,
    flowSnapshot,
    flowObligations,
    flowMoveDates,
    flowApplyValidation,
  };
