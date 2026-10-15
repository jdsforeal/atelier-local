const fs = require("fs"),
  vm = require("vm"),
  assert = require("node:assert/strict");
const { populateSimulationContacts } = require("../public/demo-contacts.js");
const c = {};
vm.createContext(c);
vm.runInContext(
  fs.readFileSync("public/catalog.js", "utf8") +
    fs.readFileSync("public/demo.js", "utf8") +
    fs.readFileSync("public/supplier-directory.js", "utf8") +
    "\ndatabase=atelierDemo();directory=atelierSuppliers;catalog=atelierCatalog;",
  c,
);
const db = c.database;
assert.equal(populateSimulationContacts(db, c.directory, c.catalog), true);
const all = [...c.directory, ...db.suppliers];
assert.ok(db.contacts.length > 400);
for (const contact of db.contacts) {
  assert.ok(all.some((s) => s.id === contact.supplierId));
  assert.match(contact.email, /\.invalid$/);
}
for (const supplier of all) {
  const contacts = db.contacts.filter((c) => c.supplierId === supplier.id);
  assert.ok(contacts.length >= 2, supplier.name);
}
for (const piece of db.pieces)
  assert.equal(
    db.contacts.find((c) => c.id === piece.contact).supplierId,
    piece.supplierId,
  );
for (const req of db.requests)
  for (const id of req.pieces || []) {
    const x = db.pieces.find((p) => p.id === id);
    assert.equal(
      x.supplierId,
      db.contacts.find((c) => c.id === req.contact).supplierId,
    );
  }
const count = db.contacts.length;
assert.equal(populateSimulationContacts(db, c.directory, c.catalog), false);
assert.equal(db.contacts.length, count);
console.log(
  count +
    " contacts fictifs, " +
    all.length +
    " structures couvertes ; pièces/demandes cohérentes et migration sans doublons.",
);
