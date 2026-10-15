const assert = require("node:assert/strict");
const {
  cloudProjectDocuments,
  cloudHydrate,
  cloudGlobalDocument,
} = require("../public/cloud-model.js");
const db = {
  projects: [
    { id: "p", name: "Clip", budget: 3500, envelopeBasis: "HT", looks: [] },
  ],
  pieces: [
    {
      id: "i",
      project: "p",
      name: "Veste",
      price: 50,
      caution: 100,
      commit: true,
      contact: "c",
      supplierId: "s",
    },
  ],
  contacts: [
    { id: "c", supplierId: "s", email: "presse@test.fr" },
    { id: "secret", email: "prive@test.fr" },
  ],
  suppliers: [{ id: "s", name: "Marque" }],
  tasks: [],
  selectionHistory: [{ id: "h", project: "p", reason: "Coût : 40 → 50 €" }],
  clientBoards: [
    {
      id: "b",
      project: "p",
      source: "prix:50",
      showPrices: true,
      looks: [{ id: "l", pieces: [{ id: "i", name: "Veste", price: 50 }] }],
    },
  ],
  expenses: [{ id: "e", project: "p", amount: 30 }],
  quotes: [],
  quoteVersions: [],
  supplierDrafts: [],
  requests: [],
};
const parts = cloudProjectDocuments(db, db.projects[0]);
const serialized = JSON.stringify(parts.creative);
assert.ok(!serialized.includes("3500"));
assert.ok(!serialized.includes('"price"'));
assert.ok(!serialized.includes("40 → 50"));
assert.ok(!serialized.includes("prix:50"));
assert.ok(!serialized.includes("prive@test.fr"));
assert.equal(parts.finance.project.budget, 3500);
assert.equal(parts.finance.pieces[0].price, 50);
const restore = cloudHydrate(cloudGlobalDocument(db), [parts], {});
assert.equal(restore.projects[0].budget, 3500);
assert.equal(restore.pieces[0].price, 50);
assert.equal(restore.clientBoards[0].looks[0].pieces[0].price, 50);
assert.equal(restore.clientBoards[0].source, "prix:50");
assert.equal(restore.selectionHistory[0].reason, "Coût : 40 → 50 €");
const restricted = cloudHydrate(null, [{ creative: parts.creative }], {});
assert.equal(restricted.projects[0].budget, undefined);
assert.equal(restricted.contacts.length, 1);
assert.equal(db.pieces[0].price, 50);
console.log(
  "Documents cloud : séparation des coûts, historique et planches ; carnet limité au projet ; aller-retour complet OK.",
);

const scoped = cloudHydrate(
  cloudGlobalDocument(db),
  [{ ...parts, namespace: "project-uuid", externalId: "p" }],
  {},
);
assert.equal(scoped.pieces.find((x) => x.project === "p").id, "project-uuid~i");
assert.equal(scoped.clientBoards[0].looks[0].pieces[0].id, "project-uuid~i");
const malicious = structuredClone(parts);
malicious.creative.contacts[0].email = "wrong@test.fr";
assert.equal(
  cloudHydrate(cloudGlobalDocument(db), [malicious], {}).contacts.find(
    (c) => c.id === "c",
  ).email,
  "presse@test.fr",
);
