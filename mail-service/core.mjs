const randomUUID = () => globalThis.crypto.randomUUID();
function mailBase64(text) {
  if (typeof Buffer !== "undefined") return Buffer.from(text).toString("base64");
  return btoa(Array.from(new TextEncoder().encode(text),byte=>String.fromCharCode(byte)).join(""));
}
const DAY = 86400000;
export function validEmail(value) {
  return (
    typeof value === "string" &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(
      value,
    ) &&
    !/\.(invalid|test|example)$/i.test(value)
  );
}
export function mailSchedule(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at <= now) throw Error('Choisissez une date et une heure futures.');
  return new Date(at).toISOString();
}
export function rescheduleJob(account, id, value, now = Date.now()) {
  const job = (account.jobs || []).find(j => j.id === id);
  if (!job || job.state !== 'En attente d’envoi' || job.paused || job.sentAt) throw Error('Cet envoi ne peut plus être déplacé.');
  const scheduledAt = mailSchedule(value, now);
  if (!scheduledAt) throw Error('Choisissez une date et une heure.');
  job.scheduledAt = scheduledAt;
  job.history.push({at:new Date(now).toISOString(),event:'Envoi reprogrammé au ' + scheduledAt});
  return job;
}
export function validateJob(input) {
  if (
    !input ||
    typeof input.id !== "string" ||
    input.id.length > 200 ||
    !validEmail(input.recipient)
  )
    throw Error("Destinataire ou identifiant incorrect.");
  if (
    typeof input.subject !== "string" ||
    !input.subject.trim() ||
    input.subject.length > 500 ||
    /[\r\n]/.test(input.subject)
  )
    throw Error("Objet incorrect.");
  if (
    typeof input.body !== "string" ||
    !input.body.trim() ||
    input.body.length > 40000 ||
    input.body.includes("[Votre signature")
  )
    throw Error("Message incomplet.");
  if (
    input.reminderEnabled &&
    (typeof input.reminderBody !== "string" ||
      !input.reminderBody.trim() ||
      input.reminderBody.length > 40000 ||
      input.reminderBody.includes("[Votre signature"))
  )
    throw Error("Relance incomplète.");
  return {
    id: input.id,
    project: String(input.project || "").slice(0, 200),
    supplierName: String(input.supplierName || "").slice(0, 200),
    recipient: input.recipient,
    subject: input.subject,
    body: input.body,
    reminderBody: input.reminderBody || "",
    reminderEnabled: input.reminderEnabled === true,
    scheduledAt: input.scheduledAt || null,
    reminderDays: Math.max(1, Math.min(30, Number(input.reminderDays) || 3)),
  };
}
export function makeMime(job, from, followup = false) {
  if (!validEmail(from) || !validEmail(job.recipient))
    throw Error("Adresse incorrecte.");
  const subject =
    followup && !/^re:/i.test(job.subject) ? "Re: " + job.subject : job.subject;
  const headers = [
    `From: ${from}`,
    `To: ${job.recipient}`,
    `Subject: =?UTF-8?B?${mailBase64(subject)}?=`,
    `Message-ID: <${job.outboundId}@atelier.local>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  if (followup && job.rfcMessageId && /^<[^\r\n<>]+>$/.test(job.rfcMessageId))
    headers.push(
      "In-Reply-To: " + job.rfcMessageId,
      "References: " + job.rfcMessageId,
    );
  return mailBase64(
    headers.join("\r\n") +
      "\r\n\r\n" +
      mailBase64(followup ? job.reminderBody : job.body)
        .match(/.{1,76}/g)
        .join("\r\n"),
  ).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function detectReply(thread, job) {
  const newer = (thread.messages || []).filter(
    (m) =>
      Number(m.internalDate) > Date.parse(job.sentAt) &&
      !(m.labelIds || []).some((label) => ["SENT", "DRAFT"].includes(label)) &&
      m.id !== job.messageId,
  );
  if (!newer.length) return null;
  const bounced = newer.some((m) =>
    (m.payload?.headers || []).some(
      (h) =>
        h.name.toLowerCase() === "from" &&
        /mailer-daemon|postmaster/i.test(h.value),
    ),
  );
  return bounced ? "Adresse à vérifier" : "Réponse reçue"; // Tout message entrant arrête la relance, même une absence automatique.
}
export function addJobs(account, inputs, now = Date.now()) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 50)
    throw Error("Choisissez entre 1 et 50 messages.");
  const validated = inputs.map(input => ({...validateJob(input),scheduledAt:mailSchedule(input.scheduledAt, now)})); // Valider tout le lot avant de le modifier.
  if (
    validated.some((input) =>
      (account.closedProjects || []).includes(input.project),
    )
  )
    throw Error("Projet arrêté : aucun nouvel envoi autorisé.");
  account.jobs ??= [];
  for (const input of validated)
    if (!account.jobs.some((j) => j.id === input.id))
      account.jobs.push({
        ...input,
        state: "En attente d’envoi",
        createdAt: new Date(now).toISOString(),
        reminderCount: 0,
        history: [
          {
            at: new Date(now).toISOString(),
            event: "Lot validé par l’utilisateur",
          },
        ],
      });
  return account.jobs;
}
/** État durable écrit AVANT l'appel Gmail : un résultat ambigu n'est jamais renvoyé automatiquement. */
export async function processAccount(account, api, persist, now = Date.now()) {
  for (const job of account.jobs || []) {
    if (account.disabled) return;
    if(api.authorize){try{await api.authorize(job);}catch{job.error="Accès au projet à vérifier : envoi et relance suspendus.";persist();continue;}}
    if (job.paused && job.state === "En attente d’envoi") continue;
    if (job.state === "Envoi en cours") {
      job.state = "Envoi à vérifier";
      job.error =
        "Traitement interrompu. Vérifiez les messages envoyés avant toute autre demande.";
      persist();
      continue;
    }
    if (job.state === "En attente d’envoi") {
      if (job.scheduledAt && Date.parse(job.scheduledAt) > now) continue;
      job.outboundId = randomUUID();
      job.state = "Envoi en cours";
      persist();
      try {
        const sent = await api.send({ raw: makeMime(job, account.email) });
        if (!sent.id || !sent.threadId)
          throw Error("Réponse Gmail incomplète.");
        job.messageId = sent.id;
        job.threadId = sent.threadId;
        job.sentAt = new Date(now).toISOString();
        job.state = "En attente de réponse";
        job.nextReminderAt = new Date(
          now + job.reminderDays * DAY,
        ).toISOString();
        job.history.push({ at: job.sentAt, event: "Envoi confirmé par Gmail" });
        delete job.error;
        persist();
      } catch {
        job.state = "Envoi à vérifier";
        job.error =
          "Gmail n’a pas confirmé l’envoi. Aucun nouvel essai automatique.";
        persist();
      }
      continue;
    }
    if (job.state !== "En attente de réponse" || !job.threadId) continue;
    try {
      const thread = await api.thread(job.threadId);
      job.lastCheckedAt = new Date(now).toISOString();
      const reply = detectReply(thread, job);
      if (reply) {
        job.state = reply;
        job.reminderEnabled = false;
        job.replyAt = new Date(now).toISOString();
        job.history.push({
          at: job.replyAt,
          event: reply + " · relance arrêtée",
        });
        persist();
        continue;
      }
      const original = (thread.messages || []).find(
        (m) => m.id === job.messageId,
      );
      job.rfcMessageId = (original?.payload?.headers || []).find(
        (h) => h.name.toLowerCase() === "message-id",
      )?.value;
      if (
        !job.reminderEnabled ||
        job.paused ||
        job.reminderCount >= 1 ||
        now < Date.parse(job.nextReminderAt)
      ) {
        persist();
        continue;
      }
      if (!job.rfcMessageId) {
        job.error = "Fil incomplet : relance suspendue.";
        persist();
        continue;
      }
      // La consultation juste avant la relance ne permet pas de garantir l'absence d'une réponse arrivée à la même milliseconde.
      job.state = "Envoi en cours";
      job.outboundId = randomUUID();
      persist();
      try {
        const sent = await api.send({
          raw: makeMime(job, account.email, true),
          threadId: job.threadId,
        });
        if (!sent.id) throw Error("Non confirmé");
        job.reminderCount = 1;
        job.reminderSentAt = new Date(now).toISOString();
        job.state = "En attente de réponse";
        job.history.push({
          at: job.reminderSentAt,
          event: "Relance confirmée par Gmail",
        });
        delete job.error;
        persist();
      } catch {
        job.state = "Envoi à vérifier";
        job.error = "Relance non confirmée. Aucun nouvel essai automatique.";
        persist();
      }
    } catch {
      job.error = "Vérification Gmail impossible : aucune relance envoyée.";
      persist();
    }
  }
}
