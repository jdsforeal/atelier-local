const assert = require("node:assert/strict");
const {
  mailDraftFor,
  mailValidationError,
  mailDisplayState,
} = require("../public/mail-model.js");
const p = {
  id: "p",
  name: "Clip été",
  client: "ALMA",
  date: "2026-10-30",
  brief: "Sauge",
};
const g = {
  key: "s",
  supplier: { name: "Costumes" },
  contacts: [{ name: "Emma", email: "emma@studio.fr" }],
  pieces: [{ id: "i", name: "Robe", mode: "Prêt" }],
};
const d = mailDraftFor(p, g, null, "Marie · Styliste");
assert.equal(d.recipient, "emma@studio.fr");
assert.equal(mailValidationError(d), "");
assert.equal(d.reminderEnabled, false);
const changed = mailDraftFor(
  { ...p, date: "2026-11-01" },
  g,
  { ...d, state: "Validé" },
  "Marie",
);
assert.equal(changed.stale, true);
assert.ok(mailDisplayState(changed).startsWith("À relire"));
assert.ok(mailValidationError({ ...d, recipient: "demo@site.invalid" }));
assert.ok(mailValidationError(mailDraftFor(p, g, null, "")));
assert.equal(
  mailDraftFor(
    p,
    { ...g, contacts: [...g.contacts, { email: "other@studio.fr" }] },
    null,
    "Marie",
  ).recipient,
  "",
);
assert.equal(
  mailDraftFor(
    { ...p, date: "2026-11-01" },
    g,
    { ...d, sentAt: "2026-10-15" },
    "Marie",
  ).stale,
  false,
);
console.log(
  "Console mails : destinataire lié, signature, choix multiple, validation périmée et message envoyé conservé : OK.",
);
const fictitious = { ...d, recipient: "camille@showroom.example.invalid" };
assert.notEqual(mailValidationError(fictitious), "");
assert.equal(mailValidationError(fictitious, true), "");
