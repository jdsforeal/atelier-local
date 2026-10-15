/** Aucun jeu d'exemples dans l'espace personnel. Migration ciblée et réversible. */
function emptyPersonalWorkspace() {
  return {
    projects: [],
    pieces: [],
    tasks: [],
    contacts: [],
    news: [],
    expenses: [],
    quotes: [],
    requests: [],
    suppliers: [],
    supplierDrafts: [],
    selectionHistory: [],
  };
}
function cleanPersonalRecords(database, legacy) {
  const copy = structuredClone(database),
    removed = {},
    detached = [],
    projectIds = new Set(),
    contactIds = new Set();
  const marker = (x) =>
    x?.simulation === true ||
    /@[^\s]*\.invalid$/i.test(x?.email || "") ||
    /^(Contact fictif|Personne fictive)/i.test(x?.note || "") ||
    /— simulation$/.test(x?.role || "");
  const legacyProjects = new Map(legacy.projects.map((x) => [x.id, x]));
  const legacyPieces = new Map(legacy.pieces.map((x) => [x.id, x]));
  const legacyTasks = new Map(legacy.tasks.map((x) => [x.id, x]));
  const take = (key, predicate) => {
    const rows = copy[key] || [];
    removed[key] = rows.filter(predicate);
    copy[key] = rows.filter((x) => !removed[key].includes(x));
  };
  take("projects", (x) => {
    const seed = legacyProjects.get(x.id);
    return (
      x.simulation === true ||
      Boolean(seed && x.name === seed.name && x.client === seed.client)
    );
  });
  removed.projects.forEach((x) => projectIds.add(x.id));
  take(
    "contacts",
    (x) =>
      marker(x) ||
      legacy.contacts.some((c) => c.name === x.name && c.note === x.note),
  );
  removed.contacts.forEach((x) => contactIds.add(x.id));
  take(
    "pieces",
    (x) =>
      marker(x) ||
      Boolean(
        legacyPieces.get(x.id)?.name === x.name &&
          /^Exemple fictif/.test(x.note || ""),
      ) ||
      Boolean(
        projectIds.has(x.project) &&
          (/^(sim[-_]|full-)/.test(x.id || "") || /simul/i.test(x.note || "")),
      ),
  );
  take(
    "tasks",
    (x) =>
      marker(x) ||
      Boolean(legacyTasks.get(x.id)?.name === x.name) ||
      Boolean(projectIds.has(x.project) && /^(sim[-_]|full-)/.test(x.id || "")),
  );
  for (const key of [
    "requests",
    "expenses",
    "quotes",
    "supplierDrafts",
    "selectionHistory",
    "quoteVersions",
    "clientBoards",
  ])
    take(
      key,
      (x) =>
        marker(x) ||
        (key === "clientBoards" && projectIds.has(x.project)) ||
        (projectIds.has(x.project) &&
          (/^(full-|initial-full-)/.test(x.id || "") ||
            (key === "selectionHistory" &&
              /scénario simulé|simulation/.test(x.reason || "")))),
    );
  take("suppliers", (x) => /^simulation-brand-/.test(x.id || ""));
  take(
    "news",
    (x) =>
      marker(x) ||
      /Ce n’est pas une actualité de lancement vérifiée/.test(x.note || ""),
  );
  // Une vraie saisie rattachée à un ancien exemple est conservée, puis détachée de cet exemple.
  for (const key of ["pieces", "tasks"])
    for (const item of copy[key]) {
      if (projectIds.has(item.project)) {
        detached.push({
          key,
          id: item.id,
          project: item.project,
          look: item.look,
          needId: item.needId,
          variantId: item.variantId,
        });
        item.project = "";
        if (key === "pieces") {
          item.look = "";
          item.needId = "";
          item.variantId = "";
        }
      }
      if (contactIds.has(item.contact)) item.contact = "";
    }
  delete copy.simulationVersion;
  delete copy.supplierSimulationVersion;
  const count = Object.values(removed).reduce((n, rows) => n + rows.length, 0);
  return { database: copy, removed, detached, count };
}
if (typeof module !== "undefined")
  module.exports = { emptyPersonalWorkspace, cleanPersonalRecords };
