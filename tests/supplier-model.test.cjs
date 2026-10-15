const assert = require("node:assert/strict");
const {
  supplierKey,
  allSuppliers,
  relatedContacts,
  groupSupplierPieces,
} = require("../public/supplier-model.js");
const directory = [
  { id: "brand", name: "Été Paris" },
  { id: "rental", name: "Location Bruxelles" },
];
const db = {
  suppliers: [],
  contacts: [
    { id: "c1", name: "Presse", brand: "Été Paris", supplierId: "brand" },
    { id: "c2", name: "Location", supplierId: "rental" },
  ],
  pieces: [
    {
      id: "p1",
      project: "p",
      brand: "Été Paris",
      supplierId: "rental",
      contact: "c2",
      selection: "Retenue",
      status: "Repéré",
    },
    {
      id: "p2",
      project: "p",
      brand: "Été Paris",
      supplierId: "rental",
      selection: "À comparer",
      status: "Repéré",
    },
    {
      id: "p3",
      project: "p",
      brand: "Été Paris",
      selection: "À comparer",
      status: "Repéré",
    },
    { id: "p4", project: "p", brand: "Été Paris", selection: "Écartée" },
    { id: "p5", project: "other", supplierId: "rental" },
    { id: "p6", project: "p", brand: "Inconnue", status: "Repéré" },
  ],
};
assert.equal(supplierKey("Été Paris"), supplierKey("ETE PARIS"));
assert.equal(relatedContacts(db, directory[0]).length, 1);
const groups = groupSupplierPieces(db, "p", directory);
assert.deepEqual(
  groups.find((g) => g.key === "rental").pieces.map((p) => p.id),
  ["p1", "p2"],
);
assert.deepEqual(
  groups.find((g) => g.key === "brand").pieces.map((p) => p.id),
  ["p3"],
);
assert.deepEqual(
  groups.find((g) => g.key === "unassigned").pieces.map((p) => p.id),
  ["p6"],
);
assert.equal(groups.find((g) => g.key === "rental").contacts[0].id, "c2");
db.suppliers.push({ id: "brand", name: "Été Paris", note: "Ma note" });
assert.equal(allSuppliers(db, directory).length, 2);
assert.equal(
  allSuppliers(db, directory).find((s) => s.id === "brand").note,
  "Ma note",
);
console.log(
  "Fournisseur distinct de marque, contacts liés, regroupement, exclusions et notes privées : OK.",
);
