const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const context = {};
vm.createContext(context);
vm.runInContext(
  fs
    .readFileSync("public/quote-export.js", "utf8")
    .split("const quoteExportRender")[0],
  context,
);
const a = context.quoteAmounts({
  lines: [
    { qty: 1.5, rate: 100.25 },
    { qty: 1, rate: 20 },
  ],
  document: { taxRate: "20" },
});
assert.equal(a.subtotal, 170.38);
assert.equal(a.tax, 34.08);
assert.equal(a.total, 204.46);
assert.equal(
  context.quoteAmounts({ lines: [], document: { taxRate: "" } }).total,
  null,
);
assert.equal(
  context.quoteAmounts({
    lines: [{ qty: 1, rate: 5 }],
    document: { taxRate: "0" },
  }).total,
  5,
);
assert.throws(() => context.quoteAmounts({ lines: [{ qty: 1, rate: NaN }] }));
assert.throws(() =>
  context.quoteAmounts({ lines: [], document: { taxRate: 101 } }),
);
console.log(
  "Devis PDF : arrondis par ligne, quantités fractionnaires, TVA non renseignée distincte de zéro et validation des montants : OK.",
);
