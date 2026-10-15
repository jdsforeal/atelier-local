const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const c = {};
vm.createContext(c);
vm.runInContext(
  fs
    .readFileSync("public/finance-workspace.js", "utf8")
    .split("const financeOriginalRender")[0],
  c,
);
const p = { budget: 3500 },
  cost = { forecast: 3600 };
const items = [
  { commit: true, caution: 300 },
  { commit: true, caution: 150, cautionReturned: true },
  { commit: false, selection: "Retenue", caution: 100 },
  { commit: false, selection: "Retenue", status: "Indisponible", caution: 500 },
];
const a = c.envelopeIndicators(p, cost, { subtotal: 3300, total: 3960 }, items);
assert.equal(a.unallocated, 200);
assert.equal(a.costRoom, -100);
assert.equal(a.balance, -300);
assert.equal(a.outstanding, 300);
assert.equal(a.planned, 100);
assert.equal(a.recovered, 150);
assert.equal(a.cashCoverage, 4000);
assert.equal(a.worstCaseBalance, -700);
const over = c.envelopeIndicators(
  p,
  { forecast: 2000 },
  { subtotal: 3700, total: 4440 },
  [],
);
assert.equal(over.unallocated, -200);
assert.equal(over.balance, 1700);
const gross = c.envelopeIndicators(
  { ...p, envelopeBasis: "TTC" },
  cost,
  { subtotal: 3300, total: 3960 },
  items,
);
assert.equal(gross.unallocated, -460);
const unknown = c.envelopeIndicators(
  { ...p, envelopeBasis: "TTC" },
  cost,
  { subtotal: 3300, total: null },
  items,
);
assert.equal(unknown.quoted, null);
assert.equal(unknown.unallocated, null);
assert.equal(unknown.balance, null);
const returned = c.envelopeIndicators(
  p,
  cost,
  { subtotal: 3300, total: 3960 },
  items.map((x) => ({ ...x, cautionReturned: true })),
);
assert.equal(returned.balance, a.balance);
assert.equal(returned.outstanding, 0);
assert.equal(returned.planned, 0);
console.log(
  "Budget & devis : enveloppe 3500 €, coûts non couverts, dépassement HT/TTC, TVA inconnue et cautions hors résultat : OK.",
);
