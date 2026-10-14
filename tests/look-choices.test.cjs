const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const context = {};
vm.createContext(context);
vm.runInContext(
  ["catalog", "demo", "look-model"]
    .map((name) => fs.readFileSync(`public/${name}.js`, "utf8"))
    .join("\n") +
    "\ndatabase=atelierDemo();prepareLookChoices(database,atelierCatalog);",
  context,
);
const database = context.database;
assert.equal(
  database.projects.filter((p) => p.status === "Terminé").length,
  50,
);
const look = database.projects[0].looks[0];
const need = look.needs[0];
const options = database.pieces.filter(
  (piece) => piece.look === look.id && piece.needId === need.id,
);
assert(options.length >= 2);
assert.equal(look.variants.length, 2);
const beforeCost = options.reduce(
  (sum, piece) => sum + (piece.commit ? piece.price : 0),
  0,
);
context.retainLookPiece(
  database,
  options[0].id,
  "Première direction",
  "2026-10-14T10:00:00Z",
);
context.retainLookPiece(
  database,
  options[1].id,
  "Meilleure coupe",
  "2026-10-14T10:01:00Z",
);
assert.equal(
  options.filter((piece) => piece.selection === "Retenue").length,
  1,
);
assert.equal(
  options.reduce((sum, piece) => sum + (piece.commit ? piece.price : 0), 0),
  beforeCost,
);
assert(
  database.selectionHistory.some(
    (entry) => entry.action === "Remplacée" && entry.piece === options[0].id,
  ),
);
need.multiple = true;
context.retainLookPiece(
  database,
  options[0].id,
  "Superposition",
  "2026-10-14T10:02:00Z",
);
assert.equal(
  options.filter((piece) => piece.selection === "Retenue").length,
  2,
);
const archived = database.projects.find((p) => p.status === "Terminé");
const archivedPiece = database.pieces.find(
  (piece) => piece.project === archived.id && piece.needId,
);
assert.throws(() =>
  context.retainLookPiece(database, archivedPiece.id, "Modification"),
);
const compact = context.serializeWorkspace(database, context.database.catalog);
const restored = context.hydrateWorkspace(
  JSON.parse(compact),
  context.database.catalog,
);
assert.equal(restored.pieces.length, database.pieces.length);
assert.equal(restored.pieces[0].name, database.pieces[0].name);
const bytes = compact.length * 2;
console.log({
  projects: database.projects.length,
  looks: 180,
  options: database.pieces.length,
  history: database.selectionHistory.length,
  estimatedStorageBytes: bytes,
});
assert(
  bytes < 4500000,
  "Le jeu de démonstration doit tenir dans le stockage local.",
);
console.log(
  "Choix exclusif, superposition, historique, budget séparé et archive protégée : OK.",
);
