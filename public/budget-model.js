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
  const calculate=typeof purchaseAmounts==='function'?purchaseAmounts:typeof require==='function'?require('./tax-model.js').purchaseAmounts:null;
  const basis=project.envelopeBasis||'HT';
  const cost=(row,key)=>calculate?calculate(row[key],row.purchaseTax,basis).budget:amount(row[key]);
  const costSum=(rows,key)=>rows.reduce((total,row)=>total+cost(row,key),0);
  const plannedExpenses=expenses.filter(e=>!['Engagé','Payé'].includes(e.state));
  const active=[...committed,...selected,...expenses];
  const costs = costSum(committed, "price") + costSum(committedExpenses, "amount");
  const forecast =
    costs +
    costSum(selected, "price") +
    costSum(plannedExpenses, "amount");
  return {
    taxPending:calculate?active.filter(row=>calculate(row.price??row.amount,row.purchaseTax,basis).pending).length:0,
    cashForecast:calculate?active.reduce((n,row)=>{const a=calculate(row.price??row.amount,row.purchaseTax,basis);return n+(a.gross??a.raw);},0):forecast,
    costs,
    forecast,
    remaining: amount(project.budget) - forecast,
    committedRemaining: amount(project.budget) - costs,
    selectedCost: costSum(selected, "price"),
    plannedExpenses: costSum(plannedExpenses, "amount"),
    caution: sum(
      committed.filter((p) => !p.cautionReturned),
      "caution",
    ),
    retained: items.filter((p) => p.selection === "Retenue"),
    committed,
  };
}
if (typeof module !== "undefined") module.exports = { projectFinancials };
