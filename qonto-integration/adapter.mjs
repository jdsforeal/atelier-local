/** Adaptateur de contrat testable ; aucun réseau ni secret par défaut. Pas encore branché à un compte. */
import model from "../public/qonto-model.js";
export async function createPreparedQuote(
  transport,
  preparation,
  { clientId, requestId, number, journal } = {},
) {
  if (!transport?.request) throw Error("Transport privé Qonto non configuré.");
  if (!requestId)
    throw Error("Identifiant de demande requis pour prévenir les doublons.");
  if (!journal?.get || !journal?.set)
    throw Error("Journal privé des demandes requis.");
  const body = model.qontoQuotePayload(preparation, clientId);
  if (number) {
    if (typeof number !== "string" || number.length > 40)
      throw Error("Numéro Qonto incorrect.");
    body.number = number;
  }
  const fingerprint = JSON.stringify(body),
    existing = journal.get(requestId);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw Error("Identifiant déjà utilisé avec un autre contenu.");
    if (existing.state === "confirmed") return structuredClone(existing.result);
    throw Error(
      "Demande déjà tentée : vérifier Qonto avant tout nouvel essai.",
    );
  }
  journal.set(requestId, { state: "pending", fingerprint });
  let response;
  try {
    response = await transport.request({
      method: "POST",
      path: "/v2/quotes",
      body,
      requestId,
    });
    if (!response?.quote?.id)
      throw Error(
        "Création non confirmée : vérifier Qonto avant tout nouvel essai.",
      );
  } catch (error) {
    journal.set(requestId, { state: "uncertain", fingerprint });
    throw error;
  }
  const result = {
    id: response.quote.id,
    number: response.quote.number,
    status: response.quote.status,
    url: response.quote.quote_url,
  };
  journal.set(requestId, { state: "confirmed", fingerprint, result });
  return structuredClone(result);
}
