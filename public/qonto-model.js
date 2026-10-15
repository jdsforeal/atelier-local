/** Préparation locale pour Qonto. Aucun accès réseau, aucun identifiant bancaire. */
function qontoValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const d = new Date(value + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function qontoSourceKey(project, quote) {
  return JSON.stringify([
    project.id,
    project.name,
    quote.version || 1,
    quote.lines,
    quote.document || {},
  ]);
}
function qontoPreparation(project, quote) {
  const key = qontoSourceKey(project, quote),
    saved = quote.qontoPreparation || {};
  const excluded = saved.sourceKey === key ? saved.excluded || [] : [];
  const doc = quote.document || {},
    client = saved.client || {};
  const issues = [],
    warnings = [];
  if (!client.name?.trim())
    issues.push("Compléter le nom du client à facturer.");
  if (!client.address?.trim())
    issues.push("Compléter son adresse de facturation.");
  if (!/^[A-Z]{2}$/.test(client.country || ""))
    issues.push("Choisir le pays du client.");
  if (client.confirmed !== true)
    issues.push(
      "Vérifier que le client facturé est bien le donneur d’ordre, et pas seulement le nom de l’artiste.",
    );
  if (!qontoValidDate(doc.issued)) issues.push("Renseigner la date du devis.");
  if (!qontoValidDate(doc.validUntil))
    issues.push("Renseigner sa date de fin de validité.");
  if (doc.issued && doc.validUntil && doc.validUntil < doc.issued)
    issues.push("La fin de validité doit suivre la date du devis.");
  const tax =
    doc.taxRate === undefined || String(doc.taxRate).trim() === ""
      ? null
      : Number(doc.taxRate);
  if (tax === null || !Number.isFinite(tax) || tax < 0 || tax > 100)
    issues.push("Vérifier le taux de TVA dans « Coordonnées et TVA ».");
  if (tax === 0)
    warnings.push(
      "TVA à 0 % : le motif et les mentions seront à vérifier avec les réglages Qonto.",
    );
  if (!doc.conditions?.trim())
    warnings.push("Conditions de règlement et mentions à vérifier dans Qonto.");
  const items = [];
  let subtotal = 0;
  quote.lines.forEach((line, index) => {
    if (excluded.includes(index)) return;
    const qty = Number(line.qty),
      rate = Number(line.rate);
    if (
      !line.name?.trim() ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      Math.abs(rate * 100 - Math.round(rate * 100)) > 0.000001
    ) {
      issues.push(
        `Ligne ${index + 1} : libellé, quantité ou tarif à corriger.`,
      );
      return;
    }
    if (rate === 0)
      warnings.push(
        `« ${line.name} » est à 0 € : vérifier que c’est volontaire.`,
      );
    subtotal += Math.round((qty * rate + Number.EPSILON) * 100);
    items.push({
      title: line.name.trim(),
      currency: "EUR",
      quantity: String(qty),
      unit_price: { value: rate.toFixed(2), currency: "EUR" },
      ...(tax !== null && Number.isFinite(tax)
        ? { vat_rate: String(tax / 100) }
        : {}),
    });
  });
  if (!items.length) issues.push("Sélectionner au moins une ligne valide.");
  if (saved.sourceKey && saved.sourceKey !== key)
    warnings.push(
      "Le devis a changé : sélection des lignes réinitialisée et précédent test à refaire.",
    );
  return {
    sourceKey: key,
    excluded,
    client: {
      name: client.name || "",
      address: client.address || "",
      country: client.country || "",
      email: client.email || "",
      registrationNumber: client.registrationNumber || "",
      confirmed: client.confirmed === true,
    },
    issues: [...new Set(issues)],
    warnings,
    subtotal: subtotal / 100,
    taxRate: tax,
    payload: {
      issue_date: doc.issued || "",
      expiry_date: doc.validUntil || "",
      currency: "EUR",
      items,
      terms_and_conditions: doc.conditions || "",
      header: project.name.slice(0, 1000),
    },
    ready: issues.length === 0,
  };
}
function qontoQuotePayload(preparation, clientId) {
  if (!preparation.ready)
    throw Error("La préparation doit être complétée avant de créer un devis.");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clientId || "",
    )
  )
    throw Error("Le client doit être identifié et vérifié dans Qonto.");
  return { ...structuredClone(preparation.payload), client_id: clientId };
}
function qontoRehearsal(preparation) {
  if (!preparation.ready)
    throw Error("Complétez les points à vérifier avant le test.");
  return {
    simulation: true,
    sourceKey: preparation.sourceKey,
    preparationKey: JSON.stringify([preparation.payload, preparation.client]),
    at: new Date().toISOString(),
    steps: [
      "Préparation des lignes contrôlée localement",
      "Création du devis Qonto simulée — aucun document créé",
      "Acceptation client simulée — aucun accord réel",
      "Transformation en facture simulée — aucune facture émise",
      "Transmission électronique simulée — aucun dépôt effectué",
      "Paiement simulé — aucun mouvement financier",
    ],
  };
}
if (typeof module !== "undefined")
  module.exports = {
    qontoSourceKey,
    qontoPreparation,
    qontoQuotePayload,
    qontoRehearsal,
  };
