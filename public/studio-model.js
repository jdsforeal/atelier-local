/** Classification prudente : un prêt n'entre jamais automatiquement dans le stock personnel. */
function studioSection(
  piece,
  project,
  section,
  today = new Date().toISOString().slice(0, 10),
) {
  const temporary = ["Prêt", "Location"].includes(piece.mode);
  const returned = piece.status === "Retourné";
  const held =
    ["Reçu", "Porté", "Retour en cours"].includes(piece.status) ||
    Boolean(piece.received);
  if (section === "Stock du studio")
    return !temporary && (piece.stockOwned || piece.status === "Conservé");
  if (section === "Prêts & locations") return temporary && held && !returned;
  if (section === "À retourner")
    return (
      temporary &&
      held &&
      !returned &&
      (piece.status === "Retour en cours" ||
        project?.status === "Retours" ||
        Boolean(piece.returnDue && piece.returnDue <= today))
    );
  if (section === "Restituées") return temporary && returned;
  return true;
}
function quickPieceAction(
  piece,
  action,
  today = new Date().toISOString().slice(0, 10),
) {
  if (
    ["dispatch", "returned", "reopen"].includes(action) &&
    !["Prêt", "Location"].includes(piece.mode)
  )
    throw Error(
      "Les actions de restitution concernent uniquement les prêts et locations.",
    );
  if (action === "receive") {
    piece.status = "Reçu";
    piece.received ||= today;
  }
  if (action === "prepare") {
    piece.returnStage = "À préparer";
    piece.status = "Reçu";
  }
  if (action === "dispatch") {
    piece.returnStage = "Expédiée / déposée";
    piece.status = "Retour en cours";
    piece.dispatched = today;
  }
  if (action === "returned") {
    piece.status = "Retourné";
    piece.returnStage = "Réception confirmée";
    piece.returned = today;
  }
  if (action === "reopen") {
    piece.status = "Reçu";
    piece.returnStage = "À préparer";
    delete piece.returned;
    delete piece.dispatched;
  }
  if (action === "stock") {
    if (["Prêt", "Location"].includes(piece.mode))
      throw Error(
        "Une pièce prêtée ou louée ne peut pas entrer dans votre stock sans transfert de propriété.",
      );
    piece.stockOwned = true;
    piece.status = "Conservé";
  }
}
/** Proposition locale : retire les larges marges uniformes et cherche l'objet central sur fond clair. */
function suggestProductCrop(pixels, width, height) {
  let left = width,
    right = 0,
    top = height,
    bottom = 0,
    total = 0;
  const start = Math.floor(height * 0.1),
    end = Math.ceil(height * 0.9);
  for (let y = start; y < end; y++)
    for (let x = Math.floor(width * 0.08); x < width * 0.92; x++) {
      const i = (y * width + x) * 4,
        r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      // L'encre très fine (texte) et les aplats blancs ne suffisent pas : lignes denses uniquement.
      if (Math.min(r, g, b) < 222) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        total++;
      }
    }
  if (top <= start + 2 || bottom >= end - 2)
    return { x: 0, y: 0, w: 1, h: 1, confident: false };
  if (
    total < width * height * 0.012 ||
    right - left < width * 0.12 ||
    bottom - top < height * 0.15
  )
    return { x: 0, y: 0, w: 1, h: 1, confident: false };
  const pad = Math.round(Math.min(width, height) * 0.05);
  const x = Math.max(0, left - pad),
    y = Math.max(0, top - pad),
    r = Math.min(width, right + pad),
    b = Math.min(height, bottom + pad);
  return {
    x: x / width,
    y: y / height,
    w: (r - x) / width,
    h: (b - y) / height,
    confident: false,
  };
}
if (typeof module !== "undefined")
  module.exports = { studioSection, quickPieceAction, suggestProductCrop };
