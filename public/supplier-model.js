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
      c.supplierId === supplier.id || c.brandId === supplier.id || (c.brandIds || []).includes(supplier.id) ||
      ((database.suppliers || []).some(s => s.id === c.supplierId && (s.representedBrandIds || []).includes(supplier.id)) && (!Array.isArray(c.brandIds) || !c.brandIds.length || c.brandIds.includes(supplier.id))) ||
      (!c.supplierId && supplierKey(c.brand) === supplierKey(supplier.name)),
  );
}
function pieceContactGroups(database, directory, brandName = "", supplierName = "") {
  const structures = allSuppliers(database, directory);
  const brand = structures.find(s => supplierKey(s.name) === supplierKey(brandName));
  const supplier = structures.find(s => supplierKey(s.name) === supplierKey(supplierName));
  const used = new Set(), groups = [];
  for (const [label, structure] of [["Fournisseur", supplier], ["Marque", brand]]) {
    if (!structure) continue;
    const contacts = relatedContacts(database, structure).filter(c => !used.has(c.id));
    contacts.forEach(c => used.add(c.id));
    if (contacts.length) groups.push({label:label+" · "+structure.name, contacts});
  }
  const remaining = database.contacts.filter(c => !used.has(c.id));
  if (remaining.length) groups.push({label:groups.length?"Autres contacts du carnet":"Tous les contacts du carnet", contacts:remaining});
  return groups;
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
      const group = groups.get(key);
      if (contact && !group.contacts.some(c => c.id === contact.id)) group.contacts.push(contact);
      group.pieces.push(piece);
    });
  return [...groups.values()];
}
if (typeof module !== "undefined")
  module.exports = {
    supplierKey,
    allSuppliers,
    relatedContacts,
    pieceContactGroups,
    groupSupplierPieces,
  };
