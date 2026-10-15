import assert from "node:assert/strict";
import model from "../public/qonto-model.js";
import { createPreparedQuote } from "../qonto-integration/adapter.mjs";
const p = { id: "real-project", name: "Clip – projet test" };
const q = {
  id: "q",
  version: 1,
  status: "Brouillon",
  lines: [
    { name: "Sourcing", qty: 2, rate: 150 },
    { name: "Transport", qty: 1, rate: 35 },
  ],
  document: {
    issued: "2026-10-15",
    validUntil: "2026-11-15",
    taxRate: "20",
    conditions: "Conditions de test",
  },
  qontoPreparation: {
    client: {
      name: "Client test",
      address: "Adresse de test",
      country: "FR",
      confirmed: true,
    },
  },
};
const before = JSON.stringify(q),
  prep = model.qontoPreparation(p, q);
assert.equal(prep.ready, true);
assert.equal(prep.subtotal, 335);
assert.equal(prep.payload.items[0].vat_rate, "0.2");
assert.equal(prep.payload.items[0].unit_price.value, "150.00");
assert.equal(JSON.stringify(q), before);
assert.equal(
  model.qontoPreparation(p, { ...q, document: { ...q.document, taxRate: "" } })
    .ready,
  false,
);
assert.equal(
  model.qontoPreparation(p, {
    ...q,
    document: { ...q.document, issued: "2026-02-30" },
  }).ready,
  false,
);
assert.equal(
  model.qontoPreparation(p, {
    ...q,
    lines: [{ name: "A", qty: 2, rate: 1.005 }],
  }).ready,
  false,
);
assert.equal(
  model.qontoPreparation(p, {
    ...q,
    qontoPreparation: {
      client: { ...q.qontoPreparation.client, confirmed: false },
    },
  }).ready,
  false,
);
const excluded = {
  ...q,
  qontoPreparation: {
    ...q.qontoPreparation,
    sourceKey: prep.sourceKey,
    excluded: [1],
  },
};
assert.equal(model.qontoPreparation(p, excluded).subtotal, 300);
const changed = {
  ...excluded,
  lines: [{ name: "Sourcing", qty: 2, rate: 200 }, q.lines[1]],
};
assert.equal(model.qontoPreparation(p, changed).subtotal, 435);
assert.ok(model.qontoPreparation(p, changed).warnings.length);
const trial = model.qontoRehearsal(prep);
assert.equal(trial.simulation, true);
assert.equal(trial.steps.length, 6);
assert.equal(q.status, "Brouillon");
assert.equal(JSON.stringify(q), before);
const options = {
  clientId: "11111111-2222-3333-4444-555555555555",
  requestId: "request-1",
  journal: new Map(),
};
let calls = 0;
const transport = {
  request: async (request) => {
    calls++;
    assert.equal(request.path, "/v2/quotes");
    assert.equal(request.body.client_id, options.clientId);
    return {
      quote: { id: "test-only", status: "pending_approval", number: "TEST-1" },
    };
  },
};
assert.equal(
  (await createPreparedQuote(transport, prep, options)).id,
  "test-only",
);
await createPreparedQuote(transport, prep, options);
assert.equal(calls, 1);
await assert.rejects(() =>
  createPreparedQuote(
    transport,
    { ...prep, payload: { ...prep.payload, header: "Autre" } },
    options,
  ),
);
const failed = { ...options, requestId: "request-failed" };
await assert.rejects(() =>
  createPreparedQuote(
    {
      request: async () => {
        throw Error("timeout");
      },
    },
    prep,
    failed,
  ),
);
await assert.rejects(() => createPreparedQuote(transport, prep, failed));
assert.equal(calls, 1);
await assert.rejects(() =>
  createPreparedQuote(transport, prep, { ...options, clientId: "unverified" }),
);
console.log(
  "Préparation Qonto : TVA, dates, centimes, client, sélection, invalidation du test, contrat API et doublons/échecs bloqués : OK. Aucun appel réel.",
);
