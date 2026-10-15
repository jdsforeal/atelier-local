const assert = require("node:assert/strict");
const {
  emptyPersonalWorkspace,
  cleanPersonalRecords,
} = require("../public/personal-data.js");
const legacy = {
  projects: [{ id: "p1", name: "Exemple", client: "Fictif" }],
  pieces: [{ id: "i1", name: "Top exemple" }],
  tasks: [{ id: "t1", name: "Tâche exemple" }],
  contacts: [{ name: "Faux contact", note: "Contact fictif" }],
};
const db = {
  ...emptyPersonalWorkspace(),
  projects: [
    ...legacy.projects,
    { id: "real", name: "Vrai projet", client: "Client réel" },
  ],
  pieces: [
    { id: "i1", name: "Top exemple", note: "Exemple fictif", project: "p1" },
    { id: "real-piece", name: "Vraie pièce", project: "p1" },
    { id: "real2", project: "real" },
  ],
  contacts: [
    { id: "fake", name: "Faux contact", note: "Contact fictif" },
    { id: "real-contact", name: "Contact réel", email: "contact@atelier.fr" },
  ],
  tasks: legacy.tasks,
};
const before = JSON.stringify(db),
  result = cleanPersonalRecords(db, legacy);
assert.equal(JSON.stringify(db), before);
assert.equal(result.database.projects.length, 1);
assert.equal(result.database.contacts.length, 1);
assert.equal(result.database.pieces.length, 2);
assert.equal(
  result.database.pieces.find((x) => x.id === "real-piece").project,
  "",
);
assert(result.removed.projects.length === 1);
assert.equal(result.detached.length, 1);
const empty = emptyPersonalWorkspace();
assert(Object.values(empty).every((rows) => rows.length === 0));
console.log(
  "Espace vide, exemples retirés, saisies réelles conservées et migration sans mutation : OK.",
);

const vm = require("node:vm"),
  fs = require("node:fs");
const context = { structuredClone };
vm.createContext(context);
vm.runInContext(
  ["catalog", "demo", "look-model", "personal-data"]
    .map((name) => fs.readFileSync("public/" + name + ".js", "utf8"))
    .join("\n") +
    "\nconst full=atelierDemo();prepareLookChoices(full,atelierCatalog);result=cleanPersonalRecords(full,{projects:[],pieces:[],tasks:[],contacts:[]});",
  context,
);
for (const key of [
  "projects",
  "pieces",
  "contacts",
  "tasks",
  "expenses",
  "quotes",
  "requests",
  "selectionHistory",
  "news",
])
  assert.equal(
    context.result.database[key].length,
    0,
    key + " simulation retirée",
  );
console.log(
  "Import de la simulation complète : aucune ligne fictive restante.",
);
