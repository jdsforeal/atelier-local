/** Répertoire public de référence + ajouts privés à chaque espace. Aucun prêt implicite. */
function supplierKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function allSuppliers(database, directory) {
  const map = new Map(directory.map((s) => [s.id, s]));
  (database.suppliers || []).forEach((s) => map.set(s.id, s));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
function relatedContacts(database, supplier) {
  if (!supplier) return [];
  return database.contacts.filter(
    (c) =>
      c.supplierId === supplier.id ||
      (!c.supplierId && supplierKey(c.brand) === supplierKey(supplier.name)),
  );
}
function groupSupplierPieces(database, projectId, directory) {
  const groups = new Map();
  const suppliers = allSuppliers(database, directory);
  database.pieces
    .filter(
      (p) =>
        p.project === projectId &&
        !["Écartée"].includes(p.selection) &&
        !["Écarté", "Indisponible", "Retourné", "Conservé"].includes(p.status),
    )
    .forEach((piece) => {
      const contact = database.contacts.find((c) => c.id === piece.contact);
      // Un fournisseur explicitement choisi prime sur le contact historique et la marque.
      const supplier =
        suppliers.find((s) => s.id === piece.supplierId) ||
        suppliers.find((s) => s.id === contact?.supplierId) ||
        suppliers.find(
          (s) =>
            supplierKey(s.name) === supplierKey(contact?.brand || piece.brand),
        );
      const key =
        supplier?.id || (contact ? "contact:" + contact.id : "unassigned");
      if (!groups.has(key))
        groups.set(key, {
          key,
          supplier,
          contacts: supplier
            ? relatedContacts(database, supplier)
            : contact
              ? [contact]
              : [],
          pieces: [],
        });
      groups.get(key).pieces.push(piece);
    });
  return [...groups.values()];
}
if (typeof module !== "undefined")
  module.exports = {
    supplierKey,
    allSuppliers,
    relatedContacts,
    groupSupplierPieces,
  };
