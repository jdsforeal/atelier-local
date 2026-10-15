/** Montants en euros : les choix créatifs modifient la prévision, jamais les engagements déjà dus. */
function projectFinancials(database, project) {
  const items = database.pieces.filter((p) => p.project === project.id);
  const amount = (value) => Math.max(0, Number(value) || 0);
  const sum = (rows, key) => rows.reduce((n, row) => n + amount(row[key]), 0);
  const committed = items.filter((p) => p.commit);
  const selected =
    typeof flowSelected === "function"
      ? flowSelected(database, project).filter((x) => !x.commit)
      : items.filter(
          (x) =>
            !x.commit &&
            x.selection === "Retenue" &&
            !["Écarté", "Indisponible"].includes(x.status),
        );
  const expenses = (database.expenses || []).filter(
    (e) => e.project === project.id && e.state !== "Annulé",
  );
  const committedExpenses = expenses.filter((e) =>
    ["Engagé", "Payé"].includes(e.state),
  );
  const costs = sum(committed, "price") + sum(committedExpenses, "amount");
  const forecast =
    costs +
    sum(selected, "price") +
    sum(
      expenses.filter((e) => !["Engagé", "Payé"].includes(e.state)),
      "amount",
    );
  return {
    costs,
    forecast,
    remaining: amount(project.budget) - forecast,
    committedRemaining: amount(project.budget) - costs,
    selectedCost: sum(selected, "price"),
    plannedExpenses: sum(
      expenses.filter((e) => !["Engagé", "Payé"].includes(e.state)),
      "amount",
    ),
    caution: sum(
      committed.filter((p) => !p.cautionReturned),
      "caution",
    ),
    retained: items.filter((p) => p.selection === "Retenue"),
    committed,
  };
}
if (typeof module !== "undefined") module.exports = { projectFinancials };
