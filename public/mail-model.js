/** Demandes groupées : fonctions pures partagées par l'écran et les tests. */
function mailAddress(value) {
  const text = String(value || "").trim();
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(
    text,
  ) && !/\.(invalid|example|test)$/i.test(text)
    ? text
    : "";
}
function mailGroupSignature(project, group) {
  return JSON.stringify([
    project.name,
    project.client,
    project.date,
    project.brief,
    group.pieces
      .map((p) => [
        p.id,
        p.name,
        p.brand,
        p.mode,
        p.url,
        p.note,
        p.size,
        p.returnDue,
      ])
      .sort((a, b) => a[0].localeCompare(b[0])),
  ]);
}
function mailPieceLines(pieces) {
  const lines = pieces.map(
    (p) =>
      `• ${p.name} — ${p.brand || ""} · ${p.mode || ""}${p.size ? " · Taille " + p.size : ""}${p.url ? "\n  " + p.url : ""}${p.note ? "\n  " + p.note : ""}`,
  );
  return [...new Set(lines)].join("\n");
}
function mailDraftFor(project, group, existing, signature) {
  const name =
    group.supplier?.name ||
    group.contacts[0]?.brand ||
    group.contacts[0]?.name ||
    "Fournisseur à associer";
  const current = mailGroupSignature(project, group);
  if (existing)
    return {
      ...existing,
      stale:
        !existing.sentAt &&
        !existing.deliveryState &&
        existing.signature !== current,
      currentSignature: current,
    };
  const emails = [
    ...new Set(group.contacts.map((c) => mailAddress(c.email)).filter(Boolean)),
  ];
  return {
    id: `mail-${project.id}-${group.key}${project.mailRevision ? "-r" + project.mailRevision : ""}`,
    project: project.id,
    key: group.key,
    supplierName: name,
    recipient: emails.length === 1 ? emails[0] : "",
    subject: `Demande ${project.name} — ${name}`,
    body: `Bonjour,\n\nPour « ${project.name} » (${project.client || "notre studio"}), prévu le ${project.date || "date à préciser"}, nous recherchons :\n\n${mailPieceLines(group.pieces)}\n\n${project.brief || ""}\n\nPourriez-vous confirmer les tailles, disponibilités aux dates du projet et conditions ?\n\nMerci beaucoup,\n${signature || "[Votre signature à compléter]"}`,
    state: "À relire",
    signature: current,
    currentSignature: current,
    pieces: group.pieces.map((p) => p.id),
    reminderEnabled: false,
    reminderDays: 3,
    reminderBody: `Bonjour,\n\nJe me permets de revenir vers vous concernant notre demande pour « ${project.name} ». Auriez-vous des nouvelles sur les disponibilités et les conditions ?\n\nMerci beaucoup,\n${signature || "[Votre signature à compléter]"}`,
  };
}
function mailValidationError(draft, simulation = false) {
  if (
    !mailAddress(draft.recipient) &&
    !(simulation && /^[^\s@]+@[^\s@]+\.invalid$/.test(draft.recipient || ""))
  )
    return "Adresse du destinataire à compléter.";
  if (!draft.subject?.trim() || /[\r\n]/.test(draft.subject))
    return "Objet manquant ou incorrect.";
  if (!draft.body?.trim() || draft.body.includes("[Votre signature"))
    return "Complétez votre signature dans le message.";
  if (
    draft.reminderEnabled &&
    (!draft.reminderBody?.trim() ||
      draft.reminderBody.includes("[Votre signature"))
  )
    return "Complétez le texte de relance.";
  if (draft.stale)
    return "Le projet ou les pièces ont changé : relisez puis validez à nouveau.";
  return "";
}
function mailDisplayState(draft) {
  if (draft.stale) return "À relire · pièces modifiées";
  return draft.deliveryState || draft.state || "À relire";
}
if (typeof module !== "undefined")
  module.exports = {
    mailAddress,
    mailGroupSignature,
    mailDraftFor,
    mailValidationError,
    mailDisplayState,
  };
