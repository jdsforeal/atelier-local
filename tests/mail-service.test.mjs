import assert from "node:assert/strict";
import {
  addJobs,
  validateJob,
  processAccount,
  makeMime,
  detectReply,
} from "../mail-service/core.mjs";
const input = {
  id: "a",
  project: "p",
  recipient: "costumes@studio.fr",
  subject: "Été · options",
  body: "Bonjour, voici les pièces.\nEmma",
  reminderEnabled: true,
  reminderDays: 3,
  reminderBody: "Bonjour, avez-vous des nouvelles ?\nEmma",
};
assert.throws(() =>
  validateJob({ ...input, recipient: "fake@studio.invalid" }),
);
assert.throws(() =>
  validateJob({ ...input, subject: "test\r\nBcc: other@studio.fr" }),
);
const account = { email: "styliste@studio.fr", jobs: [] };
const now = Date.parse("2026-10-15T10:00:00Z");
addJobs(account, [input], now);
addJobs(account, [{ ...input, body: "retry altered" }], now);
assert.equal(account.jobs.length, 1);
assert.equal(account.jobs[0].body, input.body);
assert.throws(() =>
  addJobs(
    account,
    [
      { ...input, id: "b" },
      { ...input, id: "c", recipient: "" },
    ],
    now,
  ),
);
assert.equal(account.jobs.length, 1);
let sends = 0,
  writes = [];
const api = {
  send: async (body) => {
    sends++;
    assert.ok(body.raw);
    assert.equal(account.jobs[0].state, "Envoi en cours");
    return { id: "gmail-" + sends, threadId: "thread" };
  },
  thread: async () => ({
    messages: [
      {
        id: "gmail-1",
        internalDate: String(now),
        labelIds: ["SENT"],
        payload: {
          headers: [{ name: "Message-ID", value: "<original@studio.fr>" }],
        },
      },
    ],
  }),
};
await processAccount(
  account,
  api,
  () => writes.push(account.jobs[0].state),
  now,
);
assert.equal(sends, 1);
assert.equal(account.jobs[0].state, "En attente de réponse");
assert.equal(writes[0], "Envoi en cours");
await processAccount(account, api, () => {}, now + 2 * 86400000);
assert.equal(sends, 1);
await processAccount(account, api, () => {}, now + 3 * 86400000);
assert.equal(sends, 2);
assert.equal(account.jobs[0].reminderCount, 1);
await processAccount(account, api, () => {}, now + 8 * 86400000);
assert.equal(sends, 2);
const replyAPI = {
  ...api,
  thread: async () => ({
    messages: [
      {
        id: "reply",
        internalDate: String(now + 4 * 86400000),
        labelIds: ["INBOX"],
        payload: {
          headers: [{ name: "From", value: "Costumes <costumes@studio.fr>" }],
        },
      },
    ],
  }),
};
await processAccount(account, replyAPI, () => {}, now + 9 * 86400000);
assert.equal(account.jobs[0].state, "Réponse reçue");
assert.equal(account.jobs[0].reminderEnabled, false);
const failure = { email: account.email, jobs: [] };
addJobs(failure, [input], now);
await processAccount(
  failure,
  {
    send: async () => {
      throw Error("timeout");
    },
  },
  () => {},
  now,
);
assert.equal(failure.jobs[0].state, "Envoi à vérifier");
await processAccount(failure, api, () => {}, now + 9 * 86400000);
assert.equal(sends, 2);
const offline = {
  email: account.email,
  jobs: [
    {
      ...input,
      state: "En attente de réponse",
      threadId: "t",
      sentAt: new Date(now).toISOString(),
      nextReminderAt: new Date(now).toISOString(),
      reminderCount: 0,
    },
  ],
};
await processAccount(
  offline,
  {
    thread: async () => {
      throw Error("offline");
    },
    send: api.send,
  },
  () => {},
  now + 9 * 86400000,
);
assert.equal(sends, 2);
assert.ok(offline.jobs[0].error);
const crash = {
  email: account.email,
  jobs: [{ ...input, state: "Envoi en cours" }],
};
await processAccount(crash, api, () => {}, now);
assert.equal(crash.jobs[0].state, "Envoi à vérifier");
assert.equal(sends, 2);
const mime = Buffer.from(
  makeMime(
    { ...input, outboundId: "x", rfcMessageId: "<original@studio.fr>" },
    account.email,
    true,
  ),
  "base64url",
).toString();
assert.ok(mime.includes("In-Reply-To: <original@studio.fr>"));
assert.ok(mime.includes("charset=UTF-8"));
assert.equal(
  detectReply(
    {
      messages: [
        { id: "own", internalDate: String(now + 1000), labelIds: ["SENT"] },
      ],
    },
    { sentAt: new Date(now).toISOString() },
  ),
  null,
);
console.log(
  "Service Gmail : lot atomique, idempotence, relance unique, arrêt sur réponse, panne sans renvoi et fil RFC : OK.",
);

const answeredBeforeDue = {
  email: account.email,
  jobs: [
    {
      ...input,
      state: "En attente de réponse",
      threadId: "t",
      sentAt: new Date(now).toISOString(),
      nextReminderAt: new Date(now).toISOString(),
      reminderCount: 0,
      history: [],
    },
  ],
};
await processAccount(
  answeredBeforeDue,
  {
    ...api,
    thread: async () => ({
      messages: [
        {
          id: "reply-before-due",
          internalDate: String(now + 1000),
          labelIds: ["INBOX"],
        },
      ],
    }),
  },
  () => {},
  now + 3 * 86400000,
);
assert.equal(answeredBeforeDue.jobs[0].state, "Réponse reçue");
assert.equal(sends, 2);
assert.equal(
  detectReply(
    {
      messages: [
        { id: "draft", internalDate: String(now + 1000), labelIds: ["DRAFT"] },
      ],
    },
    { sentAt: new Date(now).toISOString() },
  ),
  null,
);
const closed = { email: account.email, closedProjects: ["p"], jobs: [] };
assert.throws(() => addJobs(closed, [input], now));
assert.equal(closed.jobs.length, 0);
console.log(
  "Réponse avant échéance : pas de relance ; brouillon Gmail ignoré ; projet arrêté bloqué : OK.",
);
