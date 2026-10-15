/** Réseau fictif complet : aucune adresse réelle, aucune modification de l'espace personnel. */
function populateSimulationContacts(database, directory, catalog = []) {
  if (database.contactNetworkVersion === 1) return false;
  database.suppliers ??= [];
  const key = (name) =>
    String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const structures = [
    ...new Map(
      [...directory, ...database.suppliers].map((x) => [x.id, x]),
    ).values(),
  ];
  const find = (name) => structures.find((s) => key(s.name) === key(name));
  const create = (name) => {
    let structure = find(name);
    if (structure) return structure;
    structure = {
      id: "simulation-brand-" + key(name),
      name,
      type: "Structure de simulation",
      country: "",
      categories: [],
      emails: [],
      simulation: true,
      note: "Structure du scénario fictif ; coordonnées et disponibilité non vérifiées.",
    };
    database.suppliers.push(structure);
    structures.push(structure);
    return structure;
  };
  for (const ref of catalog) if (ref.brand) create(ref.brand);
  const ordered = structures
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  // Les cent anciens interlocuteurs fictifs sont répartis dans le répertoire, sans changer leurs IDs.
  database.contacts.forEach((c, index) => {
    if (/^full-c\d+$/.test(c.id)) {
      const supplier = ordered[index % ordered.length];
      c.supplierId = supplier.id;
      c.brand = supplier.name;
      c.simulation = true;
      c.role = "Relations presse — simulation";
    } else {
      const supplier =
        structures.find((s) => s.id === c.supplierId) ||
        find(c.brand?.split(" · ")[0]) ||
        create(c.brand || "Studio de démonstration");
      c.supplierId = supplier.id;
      c.brand = supplier.name;
    }
  });
  const first = [
    "Camille",
    "Alex",
    "Lou",
    "Morgan",
    "Charlie",
    "Sam",
    "Sasha",
    "Andrea",
    "Robin",
    "Alix",
    "Léa",
    "Noa",
  ];
  const last = [
    "Martin",
    "Morel",
    "Petit",
    "Laurent",
    "Dubois",
    "Roux",
    "Simon",
    "Leroy",
    "Blanc",
    "Faure",
    "Lambert",
    "Dupont",
  ];
  for (const [index, supplier] of structures.entries()) {
    const count = index % 3 === 0 ? 3 : 2;
    const contacts = database.contacts.filter(
      (c) => c.supplierId === supplier.id,
    );
    for (let n = contacts.length; n < count; n++) {
      const slot = index * 3 + n;
      const c = {
        id: "simulation-contact-" + supplier.id + "-" + n,
        supplierId: supplier.id,
        brand: supplier.name,
        name:
          first[slot % first.length] +
          " " +
          last[Math.floor(slot / first.length) % last.length],
        email:
          "contact-" +
          n +
          "@" +
          supplier.id.replace(/[^a-z0-9-]/gi, "-") +
          ".example.invalid",
        role:
          (/location|costum|fournisseur/i.test(supplier.type)
            ? ["Réservations", "Suivi des retours", "Responsable costumes"]
            : [
                "Relations presse",
                "Showroom / prêts",
                "Accessoires et bijoux",
              ])[n % 3] + " — simulation",
        note: "Interlocuteur entièrement fictif pour tester Atelier. Ne pas contacter.",
        simulation: true,
      };
      database.contacts.push(c);
    }
  }
  for (const [index, piece] of database.pieces.entries()) {
    const supplier =
      structures.find((s) => s.id === piece.supplierId) ||
      find(piece.brand) ||
      create(piece.brand || "Fournisseur de démonstration");
    let contacts = database.contacts.filter(
      (c) => c.supplierId === supplier.id,
    );
    if (!contacts.length) {
      const c = {
        id: "simulation-contact-" + supplier.id + "-0",
        supplierId: supplier.id,
        brand: supplier.name,
        name: "Camille Martin",
        email: "simulation@" + supplier.id + ".example.invalid",
        role: "Showroom — simulation",
        simulation: true,
      };
      database.contacts.push(c);
      contacts = [c];
    }
    piece.supplierId = supplier.id;
    if (!contacts.some((c) => c.id === piece.contact))
      piece.contact = contacts[index % contacts.length].id;
  }
  // Les anciens scénarios regroupaient parfois des marques différentes dans une demande.
  database.requests = (database.requests || []).flatMap((request) => {
    if (!request.simulation && !/^full-/.test(request.id || ""))
      return [request];
    const groups = new Map();
    for (const id of request.pieces || []) {
      const piece = database.pieces.find((x) => x.id === id);
      if (!piece) continue;
      const list = groups.get(piece.supplierId) || [];
      list.push(piece);
      groups.set(piece.supplierId, list);
    }
    if (!groups.size) return [request];
    return [...groups.entries()].map(([supplierId, pieces], index) => ({
      ...request,
      id: index ? request.id + "-supplier-" + supplierId : request.id,
      supplierId,
      contact: pieces[0].contact,
      pieces: pieces.map((x) => x.id),
      simulation: true,
    }));
  });
  for (const draft of database.supplierDrafts || []) {
    if (draft.sentAt || draft.deliveryState) continue;
    draft.signature = "";
    draft.state = "À relire";
    if (
      !database.contacts.some(
        (c) => c.supplierId === draft.key && c.email === draft.recipient,
      )
    )
      draft.recipient = "";
  }
  database.contactNetworkVersion = 1;
  return true;
}
if (typeof module !== "undefined")
  module.exports = { populateSimulationContacts };
if (
  typeof demoMode !== "undefined" &&
  demoMode &&
  populateSimulationContacts(db, atelierSuppliers, atelierCatalog)
) {
  save();
  render();
}
