/** Sérialisation du pilote : les coûts ne voyagent pas dans les documents créatifs. */
const CLOUD_FINANCIAL_KEYS = new Set([
  "budget",
  "envelopeBasis",
  "price",
  "publicPrice",
  "caution",
  "commit",
  "cautionReturned",
  "clientBoardPrices",
  "showPrices",
]);
function cloudRedact(value) {
  if (Array.isArray(value)) return value.map(cloudRedact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !CLOUD_FINANCIAL_KEYS.has(k))
        .map(([k, v]) => [k, cloudRedact(v)]),
    );
  return value;
}
function cloudPickFinance(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([k]) => CLOUD_FINANCIAL_KEYS.has(k)),
  );
}
function cloudProjectDocuments(database, project) {
  const forProject = (key) =>
    (database[key] || []).filter((x) => x.project === project.id);
  const pieces = forProject("pieces"),
    requests = forProject("requests");
  const supplierIds = new Set(pieces.flatMap((x) => [x.supplierId, x.brandId]).filter(Boolean));
  const contactIds = new Set(
    [...pieces.map((x) => x.contact), ...requests.map((x) => x.contact)].filter(
      Boolean,
    ),
  );
  const boards = forProject("clientBoards");
  const raw = {
    project,
    pieces,
    tasks: forProject("tasks"),
    selectionHistory: forProject("selectionHistory"),
    clientBoards: boards,
    contacts: (database.contacts || []).filter(
      (c) => contactIds.has(c.id) || supplierIds.has(c.supplierId) || supplierIds.has(c.brandId),
    ),
    suppliers: (database.suppliers || []).filter((s) => supplierIds.has(s.id)),
  };
  const creative = cloudRedact(raw);
  creative.clientBoards.forEach((board) => {
    delete board.source;
  });
  creative.selectionHistory.forEach((entry) => {
    if (/€|coût|engagement|caution|budget/i.test(entry.reason || ""))
      entry.reason = "Détails financiers réservés aux personnes autorisées.";
  });
  return {
    creative,
    finance: {
      project: cloudPickFinance(project),
      pieces: pieces.map((x) => ({ id: x.id, ...cloudPickFinance(x) })),
      expenses: forProject("expenses"),
      quotes: forProject("quotes"),
      quoteVersions: forProject("quoteVersions"),
      quoteSettings: database.quoteSettings || {},
      selectionHistory: forProject("selectionHistory"),
      clientBoards: boards.map((b) => ({
        id: b.id,
        source: b.source,
        showPrices: b.showPrices,
        looks: b.looks.map((l) => ({
          id: l.id,
          pieces: l.pieces.map((x) => ({ id: x.id, ...cloudPickFinance(x) })),
        })),
      })),
    },
    requests: { requests, supplierDrafts: forProject("supplierDrafts") },
  };
}
function cloudGlobalDocument(database) {
  return {
    contacts: database.contacts || [],
    suppliers: database.suppliers || [],
    pieces: (database.pieces || []).filter((x) => !x.project),
    quoteSettings: database.quoteSettings || {},
    mailSettings: database.mailSettings || {},
    news: database.news || [],
  };
}
function cloudHydrate(globals, records, empty) {
  const db = structuredClone(empty);
  for (const k of [
    "projects",
    "pieces",
    "tasks",
    "contacts",
    "suppliers",
    "requests",
    "supplierDrafts",
    "expenses",
    "quotes",
    "quoteVersions",
    "selectionHistory",
    "clientBoards",
  ])
    db[k] = [];
  Object.assign(db, structuredClone(globals || {}));
  const mergeRows = (key, rows) => {
    for (const item of rows || []) {
      const old = db[key].find((x) => x.id === item.id);
      if (old && ["contacts", "suppliers"].includes(key)) continue;
      if (old) Object.assign(old, item);
      else db[key].push(item);
    }
  };
  for (const stored of records) {
    const record = stored.namespace
      ? cloudScopeRecord(stored, stored.namespace, stored.externalId)
      : stored;
    const creative = structuredClone(record.creative || {}),
      finance = structuredClone(record.finance || {}),
      messages = structuredClone(record.requests || {});
    if (!creative.project) continue;
    const project = { ...creative.project, ...finance.project };
    db.projects.push(project);
    for (const key of [
      "pieces",
      "tasks",
      "selectionHistory",
      "clientBoards",
      "contacts",
      "suppliers",
    ])
      mergeRows(key, creative[key]);
    for (const row of finance.pieces || []) {
      const piece = db.pieces.find(
        (x) => x.project === project.id && x.id === row.id,
      );
      if (piece) Object.assign(piece, row);
    }
    for (const key of [
      "expenses",
      "quotes",
      "quoteVersions",
      "selectionHistory",
    ])
      mergeRows(key, finance[key]);
    if (finance.quoteSettings) db.quoteSettings = finance.quoteSettings;
    for (const board of finance.clientBoards || []) {
      const b = db.clientBoards.find((x) => x.id === board.id);
      if (!b) continue;
      b.showPrices = board.showPrices;
      b.source = board.source;
      for (const look of board.looks)
        for (const piece of look.pieces) {
          const x = b.looks
            .find((l) => l.id === look.id)
            ?.pieces.find((x) => x.id === piece.id);
          if (x) Object.assign(x, piece);
        }
    }
    for (const key of ["requests", "supplierDrafts"])
      mergeRows(key, messages[key]);
  }
  db.personalDataVersion = 1;
  return db;
}
function cloudScopeRecord(record, namespace, externalId) {
  const source = structuredClone(record),
    prefix = namespace + "~",
    ids = new Set();
  const collect = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(collect);
      return;
    }
    if (typeof x.id === "string") ids.add(x.id);
    for (const [k, v] of Object.entries(x))
      if (!["contacts", "suppliers"].includes(k)) collect(v);
  };
  collect(source.creative?.project?.looks);
  for (const section of ["creative", "finance", "requests"])
    for (const [k, v] of Object.entries(source[section] || {}))
      if (!["project", "contacts", "suppliers", "quoteSettings"].includes(k))
        collect(v);
  const map = (value) =>
    typeof value === "string" && ids.has(value) && !value.startsWith(prefix)
      ? prefix + value
      : value;
  const relations = new Set([
    "id",
    "look",
    "needId",
    "variantId",
    "activeVariant",
    "budgetVariant",
    "piece",
    "sourceId",
    "previousMessage",
    "clientSelectionVersion",
    "version",
  ]);
  const walk = (x, key = "") => {
    if (Array.isArray(x))
      return x.map((v) =>
        typeof v === "string" &&
        ["pieces", "ids", "clientSelectionIds"].includes(key)
          ? map(v)
          : walk(v, key),
      );
    if (x && typeof x === "object")
      return Object.fromEntries(
        Object.entries(x).map(([k, v]) => [
          k,
          ["contacts", "suppliers", "quoteSettings"].includes(k)
            ? v
            : walk(v, k),
        ]),
      );
    return relations.has(key) ? map(x) : x;
  };
  const out = walk(source);
  if (out.creative?.project) out.creative.project.id = externalId;
  for (const section of ["creative", "finance", "requests"])
    for (const [k, rows] of Object.entries(out[section] || {}))
      if (Array.isArray(rows) && !["contacts", "suppliers"].includes(k))
        for (const row of rows)
          if (row && typeof row === "object") row.project = externalId;
  return out;
}
if (typeof module !== "undefined")
  module.exports = {
    cloudScopeRecord,
    cloudRedact,
    cloudProjectDocuments,
    cloudGlobalDocument,
    cloudHydrate,
  };
