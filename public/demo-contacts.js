/** Contacts publics sourcés dans la simulation uniquement. Aucun envoi réel. */
function populateSimulationContacts(database, directory, catalog = [], publicContacts = []) {
  const version = 3;
  if (database.contactNetworkVersion === version) return false;
  const key = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  database.suppliers ??= [];
  const structures = [...new Map([...directory, ...database.suppliers].map(s => [s.id, s])).values()];
  const find = name => structures.find(s => key(s.name) === key(name));
  const ensure = name => {
    let supplier = find(name);
    if (!supplier) {
      supplier = { id: 'simulation-brand-' + key(name), name, type: 'Structure de simulation', categories: [], emails: [], simulation: true, note: 'Structure fictive du scénario, aucun contact réel attribué.' };
      database.suppliers.push(supplier); structures.push(supplier);
    }
    return supplier;
  };
  for (const ref of catalog) if (ref.brand) ensure(ref.brand);
  // Supprime les personnes générées, mais conserve les contacts réellement ajoutés par la testeuse.
  const removed = new Set();
  database.contacts = (database.contacts || []).filter(c => {
    const fake = c.publicDirectory || c.simulation || /^full-c\d+$|^simulation-contact-/.test(c.id || '') || /\.invalid$/i.test(c.email || '') || /fictif|simulation/i.test([c.role, c.note].join(' '));
    if (fake) removed.add(c.id);
    return !fake;
  });
  for (const record of publicContacts) {
    const supplier = structures.find(s => s.id === record.supplierId) || find(record.brand);
    if (!supplier) continue;
    const id = 'public-contact-' + supplier.id + '-' + key(record.email || record.source);
    if (!database.contacts.some(c => c.id === id || (c.supplierId === supplier.id && c.email && c.email === record.email))) {
      database.contacts.push({ ...record, id, supplierId: supplier.id, brand: supplier.name, publicDirectory: true, simulation: false,
        note: 'Coordonnée professionnelle publiée ; relevée le ' + record.checked + '. Fonction et disponibilité à reconfirmer. Aucun accord de prêt.\nSource : ' + record.source });
    }
  }
  for (const supplier of structures) {
    const published = database.contacts.filter(c => c.supplierId === supplier.id && c.publicDirectory);
    const record = { ...supplier, emails: published.map(c => c.email).filter(Boolean), contactChecked: '2026-10-15', contactCoverage: published.length ? 'Contact public trouvé' : 'Contact à rechercher' };
    const index = database.suppliers.findIndex(s => s.id === supplier.id);
    if (index >= 0) database.suppliers[index] = record; else database.suppliers.push(record);
  }
  const rank = c => /presse/i.test(c.role || '') ? 0 : /location|styliste/i.test(c.role || '') ? 1 : /général/i.test(c.role || '') ? 2 : 3;
  for (const piece of database.pieces || []) {
    const supplier = structures.find(s => s.id === piece.supplierId) || ensure(piece.brand || 'Fournisseur à préciser');
    piece.supplierId = supplier.id;
    const linked = database.contacts.filter(c => c.supplierId === supplier.id).sort((a,b) => rank(a)-rank(b));
    if (!linked.some(c => c.id === piece.contact)) piece.contact = linked.find(c => c.email)?.id || '';
  }
  database.requests = (database.requests || []).flatMap(request => {
    if (!request.simulation && !/^full-/.test(request.id || '') && !removed.has(request.contact)) return [request];
    const groups = new Map();
    for (const id of request.pieces || []) {
      const piece = database.pieces.find(x => x.id === id);
      if (piece) { const list = groups.get(piece.supplierId) || []; list.push(piece); groups.set(piece.supplierId, list); }
    }
    if (!groups.size) return [{ ...request, contact: removed.has(request.contact) ? '' : request.contact }];
    return [...groups.entries()].map(([supplierId, pieces], i) => ({ ...request, id: i ? request.id + '-supplier-' + supplierId : request.id,
      supplierId, contact: pieces[0].contact || '', pieces: pieces.map(x => x.id), simulation: true }));
  });
  // Les validations et destinataires de brouillons issus de l'ancien réseau ne sont pas réutilisés.
  for (const draft of database.supplierDrafts || []) {
    if (/\.invalid$/i.test(draft.recipient || '')) draft.recipient = '';
    if (draft.sentAt || draft.deliveryState) continue;
    draft.signature = ''; draft.state = 'À relire'; draft.stale = true;
    const contact = database.contacts.find(c => c.supplierId === draft.key && c.email === draft.recipient);
    if (!contact) draft.recipient = '';
  }
  database.contactNetworkVersion = version;
  return true;
}
if (typeof module !== 'undefined') module.exports = { populateSimulationContacts };
if (typeof demoMode !== 'undefined' && demoMode && populateSimulationContacts(db, atelierSuppliers, atelierCatalog, atelierPublicContacts)) { save(); render(); }
