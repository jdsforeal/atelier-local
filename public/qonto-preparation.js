/** Parcours préparatoire sans connexion Qonto. Le test ne modifie aucun statut réel. */
function currentQontoQuote() {
  return db.quotes.find((q) => q.project === pid);
}
function qontoPanel(p, q) {
  const prep = qontoPreparation(p, q),
    test = q.qontoRehearsal;
  const validTest =
    test?.sourceKey === prep.sourceKey &&
    test?.preparationKey === JSON.stringify([prep.payload, prep.client]);
  return `<section class="panel qonto-preparation"><div class="section-head"><div><div class="eyebrow">QONTO · PRÉPARATION SANS CONNEXION</div><h2>Préparer dans Atelier, finaliser dans Qonto.</h2></div><strong class="mail-state">Compte non connecté</strong></div><p>Choisissez les montants à facturer. Le devis Qonto sera créé uniquement après une future connexion et votre validation. Les cautions et frais internes ne sont pas ajoutés ici automatiquement.</p><div class="actions"><button data-qonto-client>Client à facturer</button><button data-quote-settings>Dates, coordonnées et TVA</button><button data-qonto-rehearse ${prep.ready ? "" : "disabled"}>Tester le parcours sans connexion</button></div><div class="qonto-overview"><div><strong>${esc(prep.client.name || "Client à renseigner")}</strong><p>${esc(prep.client.address || "Adresse manquante")} ${esc(prep.client.country)}</p><small>${esc(prep.client.email || "E-mail à compléter dans Qonto si nécessaire")}</small></div><div><strong>${euro(prep.subtotal)} HT à préparer</strong><p>${prep.payload.items.length} ligne(s) sélectionnée(s) · ${prep.taxRate === null ? "TVA à vérifier" : `TVA ${esc(prep.taxRate)} %`}</p><small>Les tarifs du devis restent distincts du budget interne.</small></div></div><details open><summary>Lignes à transmettre</summary><div class="qonto-lines">${q.lines.map((l, i) => `<label><input type="checkbox" data-qonto-line="${i}" ${prep.excluded.includes(i) ? "" : "checked"}><span>${esc(l.name)}</span><strong>${euro(Number(l.qty) * Number(l.rate))}</strong></label>`).join("")}</div></details>${prep.issues.length ? `<div class="qonto-checks"><strong>À compléter avant le test</strong><ul>${prep.issues.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : '<p class="note">✓ Préparation locale complète. L’éligibilité du compte, le client Qonto, la numérotation et les mentions restent à vérifier lors de la connexion.</p>'}${prep.warnings.length ? `<details><summary>${prep.warnings.length} point(s) à vérifier dans Qonto</summary><ul>${prep.warnings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}${test ? `<div class="qonto-test"><strong>${validTest ? "Dernier essai local — SIMULATION" : "Ancien essai — à refaire après modification"}</strong><ol>${test.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><p>Aucun envoi, accord client, dépôt fiscal ou paiement réel. Le statut du projet et du devis n’a pas été modifié par ce test.</p></div>` : ""}<p class="note">La future connexion utilisera une autorisation Qonto privée. Ne saisissez ici aucune clé API ni aucun mot de passe. Aucun abonnement supplémentaire n’est activé.</p></section>`;
}
function editQontoClient() {
  const p = project(),
    q = currentQontoQuote();
  if (!q) return;
  const c = q.qontoPreparation?.client || {};
  modal(
    "Qui faut-il facturer ?",
    field(
      "name",
      "Dénomination du client facturé",
      "text",
      c.name || q.document?.clientName || p.client || "",
    ) +
      field(
        "address",
        "Adresse de facturation",
        "textarea",
        c.address || q.document?.clientAddress || "",
      ) +
      field("country", "Pays", "select", c.country || "", [
        ["", "Choisir"],
        ["FR", "France"],
        ["BE", "Belgique"],
        ["DE", "Allemagne"],
        ["ES", "Espagne"],
        ["IT", "Italie"],
        ["NL", "Pays-Bas"],
        ["GB", "Royaume-Uni"],
      ]) +
      field("email", "E-mail du client — facultatif", "email", c.email || "") +
      field(
        "registrationNumber",
        "SIREN / identifiant de l’entreprise — facultatif",
        "text",
        c.registrationNumber || "",
      ) +
      `<label class="mail-tick"><input type="checkbox" name="confirmed" ${c.confirmed ? "checked" : ""}> J’ai vérifié l’identité du client à facturer.</label><p class="note">Ces renseignements restent dans votre navigateur. Le rapprochement avec les clients existants dans Qonto se fera après connexion, pour éviter les doublons.</p>`,
    (data) => {
      if (!data.address.trim() || !data.country)
        throw Error("Complétez l’adresse et le pays.");
      q.document = {
        ...q.document,
        clientName: data.name,
        clientAddress: data.address,
      };
      q.qontoPreparation = {
        ...q.qontoPreparation,
        client: { ...data, confirmed: Boolean(data.confirmed) },
      };
    },
  );
}
const qontoPrepareRender = render;
render = function () {
  qontoPrepareRender();
  if (view !== "detail" || tab !== "quote") return;
  const q = currentQontoQuote(),
    panel = $(".quote-panel");
  if (!q || !panel) return;
  panel.insertAdjacentHTML("afterend", qontoPanel(project(), q));
};
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  try {
    if (b.hasAttribute("data-qonto-client")) editQontoClient();
    if (b.hasAttribute("data-qonto-rehearse")) {
      const q = currentQontoQuote();
      q.qontoRehearsal = qontoRehearsal(qontoPreparation(project(), q));
      if (!save()) throw Error("Le test n’a pas été enregistré.");
      render();
      toast("Parcours testé localement. Aucun document réel créé dans Qonto.");
    }
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("change", (event) => {
  if (!event.target.hasAttribute("data-qonto-line")) return;
  const q = currentQontoQuote(),
    prep = qontoPreparation(project(), q),
    index = Number(event.target.dataset.qontoLine),
    excluded = new Set(prep.excluded);
  if (event.target.checked) excluded.delete(index);
  else excluded.add(index);
  q.qontoPreparation = {
    ...q.qontoPreparation,
    sourceKey: prep.sourceKey,
    excluded: [...excluded],
  };
  save();
  render();
});
render();
