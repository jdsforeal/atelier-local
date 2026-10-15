const assert = require("node:assert/strict");
const f = require("../public/flow-model.js");
const { projectFinancials } = require("../public/budget-model.js");
global.flowSelected = f.flowSelected;
const p = {
  id: "p",
  name: "Clip",
  date: "2026-11-01",
  budget: 1000,
  status: "Recherche",
  looks: [
    {
      id: "l",
      name: "Nuit",
      budgetVariant: "a",
      variants: [
        { id: "a", name: "Robe" },
        { id: "b", name: "Ensemble" },
      ],
      needs: [{ id: "n", name: "Silhouette" }],
    },
    {
      id: "l2",
      name: "Jour",
      variants: [],
      needs: [{ id: "n2", name: "Accessoire" }],
    },
  ],
};
const a = {
  id: "a",
  project: "p",
  look: "l",
  needId: "n",
  variantId: "a",
  name: "Robe",
  selection: "Retenue",
  price: 100,
  status: "Repéré",
  mode: "Location",
  availability: "Disponible",
  availabilityDate: p.date,
};
const b = { ...a, id: "b", variantId: "b", name: "Ensemble", price: 200 };
const db = {
  projects: [p],
  pieces: [a, b],
  expenses: [],
  tasks: [
    { project: "p", date: "2026-10-31", done: false },
    { project: "p", date: "2026-10-30", done: true },
  ],
};
assert.equal(projectFinancials(db, p).forecast, 100);
b.commit = true;
assert.equal(projectFinancials(db, p).forecast, 300);
b.commit = false;
a.lookUses = [{ look: "l2", needId: "n2" }];
assert.equal(projectFinancials(db, p).forecast, 100);
const snap = f.flowSnapshot(db, p);
assert.equal(snap.looks[1].pieces[0].id, "a");
a.price = 150;
assert.equal(snap.looks[0].pieces[0].price, 100);
assert.throws(
  () => f.flowApplyValidation(db, p, snap, ["a", "b"], "Client", ""),
  /seule option/,
);
f.flowApplyValidation(db, p, snap, ["a"], "Client", "OK reçu");
assert.equal(a.selection, "Retenue");
assert.equal(a.commit, undefined);
assert.equal(snap.validations.length, 1);
f.flowMoveDates(db, p, "2026-11-04", true);
assert.equal(db.tasks[0].date, "2026-11-03");
assert.equal(db.tasks[1].date, "2026-10-30");
assert.equal(f.flowAvailability(a, p), "À reconfirmer");
assert.equal(snap.date, "2026-11-01");
a.commit = true;
a.received = "2026-10-15";
a.caution = 300;
a.status = "Retourné";
assert.equal(f.flowObligations(db, p).length, 1);
a.cautionReturned = true;
assert.equal(f.flowObligations(db, p).length, 0);
a.availability = "Indisponible";
a.commit = false;
assert.equal(projectFinancials(db, p).forecast, 0);
p.status = "Annulé";
assert.throws(
  () => f.flowApplyValidation(db, p, snap, ["a"], "Client", ""),
  /Rouvrez/,
);
console.log(
  "Flow model: scénarios, partage, versions, validation, reports et cautions OK",
);
