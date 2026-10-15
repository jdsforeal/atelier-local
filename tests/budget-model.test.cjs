const assert = require("node:assert/strict");
const { projectFinancials } = require("../public/budget-model.js");
const p = { id: "p", budget: 500 };
const db = {
  pieces: [
    { project: "p", id: "a", price: 150, selection: "Retenue", commit: false },
  ],
  expenses: [],
};
assert.equal(projectFinancials(db, p).forecast, 150);
db.pieces[0].selection = "Écartée";
db.pieces.push({ project: "p", id: "b", price: 90, selection: "Retenue" });
assert.equal(projectFinancials(db, p).forecast, 90);
assert.equal(projectFinancials(db, p).remaining, 410);
db.pieces[0].commit = true;
db.pieces[0].status = "Écarté";
assert.equal(projectFinancials(db, p).forecast, 240);
assert.equal(projectFinancials(db, p).costs, 150);
db.pieces[1].commit = true;
assert.equal(projectFinancials(db, p).forecast, 240);
db.expenses.push(
  { project: "p", amount: 20, state: "Prévu" },
  { project: "p", amount: 30, state: "Payé" },
  { project: "p", amount: 99, state: "Annulé" },
);
assert.equal(projectFinancials(db, p).forecast, 290);
assert.equal(projectFinancials(db, p).costs, 270);
db.pieces[0].commit = false;
assert.equal(projectFinancials(db, p).forecast, 140);
console.log(
  "Prévision dynamique, remplacement, coûts dus conservés, frais et absence de double comptage : OK.",
);
