/** Une seule vue pour l'enveloppe client, les coûts, le devis et les cautions. */
function envelopeIndicators(project, financials, quoteAmountsValue, items) {
  const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const envelope = money(project.budget),
    basis = project.envelopeBasis || "HT";
  const quoted = quoteAmountsValue
    ? basis === "TTC"
      ? quoteAmountsValue.total
      : quoteAmountsValue.subtotal
    : 0;
  const outstanding = money(
    items
      .filter((x) => x.commit && !x.cautionReturned)
      .reduce((n, x) => n + Math.max(0, Number(x.caution) || 0), 0),
  );
  const planned = money(
    items
      .filter(
        (x) =>
          !x.commit &&
          !x.cautionReturned &&
          x.selection === "Retenue" &&
          (typeof flowSelected !== "function" ||
            flowSelected({ pieces: items }, project).some(
              (p) => p.id === x.id,
            )) &&
          !["Écarté", "Indisponible", "Retourné"].includes(x.status),
      )
      .reduce((n, x) => n + Math.max(0, Number(x.caution) || 0), 0),
  );
  const recovered = money(
    items
      .filter((x) => x.commit && x.cautionReturned)
      .reduce((n, x) => n + Math.max(0, Number(x.caution) || 0), 0),
  );
  return {
    envelope,
    basis,
    quoted: quoted === null ? null : money(quoted),
    unallocated: quoted === null ? null : money(envelope - quoted),
    costs: money(financials.forecast),
    costRoom: money(envelope - financials.forecast),
    balance: quoted === null ? null : money(quoted - financials.forecast),
    outstanding,
    planned,
    recovered,
    cashCoverage: money(financials.forecast + outstanding + planned),
    worstCaseBalance:
      quoted === null
        ? null
        : money(quoted - financials.forecast - outstanding - planned),
  };
}
function financeData(p) {
  const q = db.quotes.find((x) => x.project === p.id);
  let a = null;
  try {
    if (q) a = quoteAmounts(q);
  } catch {
    a = { subtotal: null, total: null };
  }
  return envelopeIndicators(
    p,
    totals(p),
    a,
    db.pieces.filter((x) => x.project === p.id),
  );
}
function financeSummary(p) {
  const t = financeData(p),
    card = (label, value, detail = "", negative = false) =>
      `<article class="panel ${negative ? "over-budget" : ""}"><small>${label}</small><strong>${value === null ? "À préciser" : euro(value)}</strong>${detail ? `<small>${detail}</small>` : ""}</article>`;
  return `<div class="section-head"><div><div class="eyebrow">ENVELOPPE CLIENT ET CONSTRUCTION DU DEVIS</div><h2>Construire le projet dans son enveloppe.</h2></div><button data-edit-envelope>Régler l’enveloppe client</button></div><div class="budget-grid finance-grid">${card(`Enveloppe client ${t.basis}`, t.envelope, "Objectif négocié avec le client")}${card(`Devis en construction ${t.basis}`, t.quoted, t.quoted === null ? "Renseigner la TVA pour comparer en TTC" : "Prestations + postes facturés")}${card(t.unallocated !== null && t.unallocated < 0 ? "Dépassement du devis" : "Reste à répartir dans le devis", t.unallocated, t.unallocated !== null && t.unallocated < 0 ? "Le devis dépasse l’enveloppe client" : "Enveloppe moins devis", t.unallocated < 0)}${card("Coûts prévus du projet", t.costs, "Pièces retenues, engagements et frais")}${card("Enveloppe après coûts prévus", t.costRoom, "Avant répartition des honoraires", t.costRoom < 0)}${card("Solde du devis après coûts", t.balance, "Avant cotisations, impôts et charges non saisies", t.balance < 0)}</div>${t.costRoom < 0 ? `<p class="finance-alert" role="status">Les coûts prévus dépassent déjà l’enveloppe de ${euro(-t.costRoom)}. Ajustez les choix, les frais ou l’enveloppe avant de finaliser le devis.</p>` : ""}${t.unallocated < 0 ? `<p class="finance-alert" role="status">Le devis dépasse l’objectif client de ${euro(-t.unallocated)}.</p>` : ""}${t.balance < 0 ? `<p class="finance-alert" role="status">Le devis ne couvre pas encore ${euro(-t.balance)} de coûts prévus. Ajoutez les postes à facturer ou revoyez les coûts.</p>` : ""}<p class="note">L’enveloppe est comparée au devis sur la base ${t.basis}. Les coûts utilisent les montants que vous avez saisis : gardez une base de TVA cohérente. Les cautions restent à part.</p><details class="panel"><summary>Cautions et montants à mobiliser</summary><div class="finance-deposits"><p>Cautions engagées, encore à récupérer <strong>${euro(t.outstanding)}</strong></p><p>Cautions prévues sur les choix non engagés <strong>${euro(t.planned)}</strong></p><p>Cautions déjà récupérées <strong>${euro(t.recovered)}</strong></p><p>Coûts prévus + cautions à couvrir <strong>${euro(t.cashCoverage)}</strong></p>${t.worstCaseBalance === null ? "" : `<p>Scénario sans remboursement des cautions <strong>${euro(t.worstCaseBalance)}</strong><small>Solde du devis après coûts et perte de toutes les cautions restantes — hypothèse uniquement.</small></p>`}</div><p class="note">Une caution récupérée restitue de la trésorerie ; elle n’augmente pas le montant facturé ni le solde du devis. Son remboursement n’est compté qu’après avoir été indiqué dans le suivi des pièces.</p></details>`;
}
function financeCosts(p) {
  return `<details class="panel finance-cost-details"><summary>Voir et ajuster les coûts du projet</summary><div class="section-head"><h3>Pièces et frais</h3><button data-action="expense">＋ Ajouter un frais</button></div>${db.pieces
    .filter(
      (x) => x.project === p.id && (x.commit || x.selection === "Retenue"),
    )
    .map(
      (x) =>
        `<button class="expense-row" data-edit-piece="${esc(x.id)}"><span>${esc(x.name)}</span><span>${x.commit ? "Engagé / dû" : "Prévu"}</span><strong>${euro(x.price)}</strong><span>Modifier</span></button>`,
    )
    .join("")}${
    db.expenses
      .filter((x) => x.project === p.id)
      .map(
        (x) =>
          `<button class="expense-row" data-edit-expense="${esc(x.id)}"><span>${esc(x.name)}</span><span>${esc(x.state)}</span><strong>${euro(x.amount)}</strong><span>Modifier</span></button>`,
      )
      .join("") || '<p class="note">Aucun frais complémentaire.</p>'
  }</details>`;
}
const financeOriginalRender = render;
render = function () {
  if (view === "detail" && tab === "budget") tab = "quote";
  financeOriginalRender();
  if (view !== "detail") return;
  document
    .querySelectorAll('.tabs [data-tab="budget"]')
    .forEach((el) => el.remove());
  const navigation = $('.tabs [data-tab="quote"]');
  if (navigation) navigation.textContent = "Budget & devis";
  if (tab !== "quote") return;
  const p = project(),
    anchor = $(".quote-panel") || $("#content .empty");
  if (!anchor) return;
  anchor.insertAdjacentHTML(
    "beforebegin",
    `<section id="finance-summary">${financeSummary(p)}</section>`,
  );
  anchor.insertAdjacentHTML("afterend", financeCosts(p));
  const note = $(".quote-panel > p.note");
  if (note)
    note.textContent =
      "Construisez le devis ci-dessous : ses tarifs mettent à jour les indicateurs au-dessus. Les coûts du projet restent suivis séparément pour voir ce que le montant facturé couvre.";
};
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-edit-envelope]")) return;
  const p = project();
  modal(
    "Enveloppe négociée avec le client",
    field("budget", "Montant cible du client (€)", "number", p.budget || 0) +
      field(
        "basis",
        "Base de comparaison du devis",
        "select",
        p.envelopeBasis || "HT",
        [
          ["HT", "Hors taxes (HT)"],
          ["TTC", "Toutes taxes comprises (TTC)"],
        ],
      ) +
      '<p class="note">L’enveloppe est un objectif. Elle ne remplace pas les tarifs du devis ni les coûts des pièces et frais.</p>',
    (data) => {
      const amount = Number(data.budget);
      if (!Number.isFinite(amount) || amount < 0)
        throw Error("Montant positif attendu.");
      p.budget = amount;
      p.envelopeBasis = data.basis;
    },
  );
  $("#form").elements.budget.step = "0.01";
});
let financeSaveTimer;
document.addEventListener("input", (event) => {
  const el = event.target;
  if (!el.dataset.quote || view !== "detail" || tab !== "quote") return;
  const [i, key] = el.dataset.quote.split(":"),
    q = db.quotes.find((x) => x.project === pid);
  if (!q?.lines[i]) return;
  if (key === "name") q.lines[i][key] = el.value;
  else {
    if (el.validity.badInput || Number(el.value) < 0) return;
    q.lines[i][key] = Number(el.value) || 0;
  }
  const row = el.closest(".quote-line");
  if (row)
    row.querySelector("strong").textContent = euro(
      q.lines[i].qty * q.lines[i].rate,
    );
  const summary = $("#finance-summary");
  if (summary) summary.innerHTML = financeSummary(project());
  const total = $(".quote-total");
  if (total) {
    const a = quoteAmounts(q);
    total.textContent = `Total HT : ${euro(a.subtotal)}${a.total === null ? " · TVA à préciser" : " · TTC : " + euro(a.total)}`;
  }
  clearTimeout(financeSaveTimer);
  financeSaveTimer = setTimeout(() => save(), 350);
});
render();
if (typeof module !== "undefined") module.exports = { envelopeIndicators };
