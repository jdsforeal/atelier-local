/** Tableau des demandes. Les autorisations Gmail restent dans le service privé. */
const mailSelection = new Set();
let mailFilter = "Tout",
  mailBusy = false,
  mailSession = null,
  mailPopup = null,
  mailNonce = "",
  mailLastSync = 0,
  mailServiceError = "";
try {
  mailSession = JSON.parse(
    sessionStorage.getItem("atelier-mail-session") || "null",
  );
} catch {}
const mailServiceURL = String(window.ATELIER_MAIL_SERVICE_URL || "").replace(
  /\/$/,
  "",
);
function mailGroups(p) {
  return groupSupplierPieces(db, p.id, atelierSuppliers)
    .map((g) => ({
      ...g,
      pieces: g.pieces.filter(
        (x) =>
          !["Stock du studio"].includes(x.mode) &&
          !["Confirmé", "Reçu", "Retour en cours"].includes(x.status),
      ),
    }))
    .filter((g) => g.pieces.length);
}
function mailRows(p) {
  const groups = mailGroups(p);
  const drafts = db.supplierDrafts || [];
  const rows = groups.map((g) => ({
    group: g,
    draft: mailDraftFor(
      p,
      g,
      drafts.find((d) => d.project === p.id && d.key === g.key),
      db.mailSettings?.signature || "",
    ),
  }));
  for (const d of drafts.filter((d) => d.project === p.id))
    if (!rows.some((r) => r.draft.id === d.id))
      rows.push({
        group: null,
        draft: { ...d, orphan: !d.sentAt && !d.deliveryState },
      });
  return rows;
}
function mailRecord(d) {
  let existing = (db.supplierDrafts ??= []).find((x) => x.id === d.id);
  if (!existing) {
    existing = structuredClone(d);
    delete existing.currentSignature;
    delete existing.stale;
    delete existing.orphan;
    db.supplierDrafts.push(existing);
  }
  if (demoMode) existing.simulation = true;
  return existing;
}
function mailIsSent(d) {
  return Boolean(d.sentAt || d.deliveryState);
}
function mailCurrentRows() {
  const p = project();
  return p ? mailRows(p) : [];
}
function mailCanEdit(p, d) {
  return (
    !mailBusy &&
    !["Terminé", "Annulé"].includes(p.status) &&
    !mailIsSent(d) &&
    !d.orphan
  );
}
function mailStatus(d) {
  return d.orphan ? "Pièces à vérifier" : mailDisplayState(d);
}
function mailTime(s) {
  return s
    ? new Date(s).toLocaleString("fr-BE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}
function mailRowHTML(p, { group: g, draft: d }) {
  const locked = !mailCanEdit(p, d),
    error = mailValidationError(d),
    status = mailStatus(d);
  const contacts = g?.contacts || [];
  const options = [
    ...new Map(
      contacts.filter((c) => mailAddress(c.email)).map((c) => [c.email, c]),
    ).values(),
  ];
  if (d.recipient && !options.some((c) => c.email === d.recipient))
    options.push({ email: d.recipient, name: d.recipient });
  return `<article class="mail-row ${d.state === "Validé" && !d.stale ? "mail-approved" : ""}" data-mail-row="${esc(d.id)}"><div class="mail-row-head"><label class="mail-tick"><input type="checkbox" data-mail-select="${esc(d.id)}" ${mailSelection.has(d.id) ? "checked" : ""} ${locked || g?.key === "unassigned" ? "disabled" : ""}><strong>${esc(d.supplierName)}</strong></label><span class="mail-state">${esc(status)}</span></div><div class="mail-row-grid"><div><label>Destinataire<select data-mail-field="recipient" data-mail-id="${esc(d.id)}" ${locked ? "disabled" : ""}><option value="">Choisir un contact lié</option>${options.map((c) => `<option value="${esc(c.email)}" ${c.email === d.recipient ? "selected" : ""}>${esc(c.name)} · ${esc(c.email)}</option>`).join("")}</select></label><p class="mail-pieces">${g ? `${g.pieces.length} pièce(s) · ${[...new Set(g.pieces.map((x) => x.name))].map(esc).join(" · ")}` : `${(d.pieces || []).length} pièce(s) dans la demande enregistrée`}</p>${!options.length && !mailIsSent(d) ? `<p class="note">Ajoutez une adresse au contact lié.</p>${g?.supplier ? `<button data-add-supplier-contact="${esc(g.supplier.id)}">Ajouter un contact</button>` : ""}` : ""}</div><div><strong>${esc(d.subject)}</strong><p class="mail-excerpt">${esc(d.body?.replace(/\n+/g, " ").slice(0, 180) || "Message à compléter")}</p>${d.sentAt ? `<small>Envoyé le ${mailTime(d.sentAt)} · vérifié ${mailTime(d.lastCheckedAt)}</small>` : ""}${d.error ? `<p class="mail-error">${esc(d.error)}</p>` : ""}</div><div class="mail-row-actions">${!mailIsSent(d) ? `<label class="mail-tick"><input type="checkbox" data-mail-approve="${esc(d.id)}" ${d.state === "Validé" && !d.stale ? "checked" : ""} ${locked || g?.key === "unassigned" ? "disabled" : ""}> Message relu et validé</label>${error ? `<small>${esc(error)}</small>` : ""}<label class="mail-tick"><input type="checkbox" data-mail-field="reminderEnabled" data-mail-id="${esc(d.id)}" ${d.reminderEnabled ? "checked" : ""} ${locked ? "disabled" : ""}> Relancer si aucune réponse</label><label>Délai<select data-mail-field="reminderDays" data-mail-id="${esc(d.id)}" ${locked ? "disabled" : ""}>${[2, 3, 5, 7, 14].map((n) => `<option value="${n}" ${Number(d.reminderDays || 3) === n ? "selected" : ""}>Après ${n} jours</option>`).join("")}</select></label>` : `<p>${d.reminderCount ? "Relance envoyée le " + mailTime(d.reminderSentAt) : d.reminderEnabled && !d.paused ? "Relance prévue le " + mailTime(d.nextReminderAt) : "Relance arrêtée / non activée"}</p>${d.reminderEnabled && !d.paused ? `<button data-mail-pause="${esc(d.id)}" ${!mailSession || mailBusy ? "disabled" : ""}>Arrêter la relance</button>` : ""}${d.threadId ? `<a href="https://mail.google.com/mail/u/${encodeURIComponent(d.mailAccount || mailSession?.email || "0")}/#all/${encodeURIComponent(d.threadId)}" target="_blank" rel="noopener">Voir la conversation ↗</a>` : ""}`}</div></div><details class="mail-editor"><summary>${mailIsSent(d) ? "Voir le message envoyé et le journal" : "Lire et modifier le message et sa relance"}</summary><label>Objet<input value="${esc(d.subject)}" data-mail-field="subject" data-mail-id="${esc(d.id)}" ${locked ? "disabled" : ""}></label><label>Message<textarea rows="10" data-mail-field="body" data-mail-id="${esc(d.id)}" ${locked ? "disabled" : ""}>${esc(d.body)}</textarea></label><label>Relance · envoyée au maximum une fois<textarea rows="5" data-mail-field="reminderBody" data-mail-id="${esc(d.id)}" ${locked ? "disabled" : ""}>${esc(d.reminderBody || "")}</textarea></label>${d.history ? `<ul>${d.history.map((h) => `<li>${mailTime(h.at)} · ${esc(h.event)}</li>`).join("")}</ul>` : ""}</details></article>`;
}
function mailRefresh() {
  const open = [
    ...document.querySelectorAll("[data-mail-row] details[open]"),
  ].map((el) => el.closest("[data-mail-row]").dataset.mailRow);
  render();
  for (const row of document.querySelectorAll("[data-mail-row]"))
    if (open.includes(row.dataset.mailRow))
      row.querySelector("details").open = true;
}
const mailPreviousMessages = messages;
messages = function (p) {
  const rows = mailRows(p);
  const selected = rows.filter((r) => mailSelection.has(r.draft.id));
  const ready = selected.filter(
    (r) =>
      mailCanEdit(p, r.draft) &&
      r.draft.state === "Validé" &&
      !r.draft.stale &&
      !r.draft.orphan &&
      !mailIsSent(r.draft) &&
      !mailValidationError(r.draft),
  );
  const counts = {
    Tout: rows.length,
    "À préparer": rows.filter(
      (r) =>
        !mailIsSent(r.draft) && (r.draft.state !== "Validé" || r.draft.stale),
    ).length,
    Validés: rows.filter(
      (r) =>
        !mailIsSent(r.draft) && r.draft.state === "Validé" && !r.draft.stale,
    ).length,
    "En attente": rows.filter(
      (r) => r.draft.deliveryState === "En attente de réponse",
    ).length,
    Réponses: rows.filter((r) => r.draft.deliveryState === "Réponse reçue")
      .length,
  };
  const visible = rows.filter(
    ({ draft: d }) =>
      mailFilter === "Tout" ||
      (mailFilter === "À préparer" &&
        !mailIsSent(d) &&
        (d.state !== "Validé" || d.stale)) ||
      (mailFilter === "Validés" &&
        d.state === "Validé" &&
        !d.stale &&
        !mailIsSent(d)) ||
      (mailFilter === "En attente" &&
        d.deliveryState === "En attente de réponse") ||
      (mailFilter === "Réponses" && d.deliveryState === "Réponse reçue"),
  );
  return `<div class="section-head"><div><h2>Vos demandes, d’un coup d’œil.</h2><p>Un message par fournisseur. Relisez, validez puis envoyez les messages cochés en un seul lot.</p></div><button data-mail-settings>Ma signature et mes réglages</button></div><div class="mail-connection"><div><strong>${demoMode ? "Simulation · aucun envoi réel" : mailSession ? "Gmail connecté · " + esc(mailSession.email) : "Gmail non connecté"}</strong><p>${mailSession ? "Le service hébergé assure le suivi même lorsque ce navigateur est fermé." : "Les brouillons et leur validation fonctionnent ici. L’envoi et les relances nécessitent l’activation du service Gmail par le propriétaire."}</p>${mailServiceError ? `<p class="mail-error">${esc(mailServiceError)}</p>` : ""}</div><div class="actions">${!demoMode && mailSession ? "<button data-mail-sync>Vérifier les réponses</button><button data-mail-connect>Renouveler la connexion</button><button data-mail-disconnect>Déconnecter et suspendre</button>" : "<button data-mail-connect " + (demoMode ? "disabled" : "") + ">Connecter Gmail</button>"}</div></div><div class="toolbar mail-filters">${Object.entries(
    counts,
  )
    .map(
      ([name, n]) =>
        `<button data-mail-filter="${esc(name)}" class="${mailFilter === name ? "primary" : ""}">${name} (${n})</button>`,
    )
    .join(
      "",
    )}</div><div class="mail-batch"><div><strong>${selected.length} sélectionné(s) · ${ready.length} prêt(s) à envoyer</strong><small>Un message distinct par fournisseur.</small></div><div class="actions"><button data-mail-expand>Afficher tous les textes</button><button data-mail-all>Tout sélectionner</button><button data-mail-reminders ${!selected.length || mailBusy ? "disabled" : ""}>Relance à J+3</button><button data-mail-validate ${!selected.length || mailBusy ? "disabled" : ""}>Valider la sélection</button><button class="primary" data-mail-send ${!ready.length || !mailSession || mailBusy || demoMode ? "disabled" : ""}>${mailBusy ? "Traitement en cours…" : `Envoyer les ${ready.length} messages validés`}</button></div></div>${visible.map((r) => mailRowHTML(p, r)).join("") || '<div class="empty">Aucune demande dans cette vue. Ajoutez des options et associez leurs fournisseurs et contacts pour commencer.</div>'}<p class="note">Une réponse signifie qu’un message est arrivé dans la conversation, pas que les pièces sont confirmées. Les réponses automatiques arrêtent aussi la relance et demandent votre lecture.</p><details><summary>Ancien historique des échanges</summary>${supplierOldMessages(p).split('<details class="draft-disclosure">')[0]}</details>`;
};
async function mailAPI(route, body) {
  if (demoMode) throw Error("La simulation ne peut pas accéder à Gmail.");
  if (!mailServiceURL)
    throw Error(
      "Le propriétaire doit d’abord activer le service Gmail d’Atelier. Cette configuration se fait une seule fois pour toute l’application.",
    );
  const result = await fetch(mailServiceURL + "/api/mail/" + route, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(mailSession ? { Authorization: "Bearer " + mailSession.token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(35000),
  });
  const data = await result.json();
  if (result.status === 401) {
    mailSession = null;
    sessionStorage.removeItem("atelier-mail-session");
  }
  if (!result.ok) throw Error(data.error || "Service indisponible.");
  return data;
}
function applyMailStatus(data) {
  if (mailSession && data.email !== mailSession.email)
    throw Error("Compte Gmail inattendu.");
  mailServiceError = data.error || "";
  for (const status of data.jobs || []) {
    const d = (db.supplierDrafts || []).find((x) => x.id === status.id);
    if (d && (!d.mailAccount || d.mailAccount === data.email)) {
      d.deliveryState = status.state;
      for (const k of [
        "sentAt",
        "threadId",
        "reminderEnabled",
        "reminderCount",
        "nextReminderAt",
        "reminderSentAt",
        "lastCheckedAt",
        "replyAt",
        "error",
        "paused",
        "history",
      ])
        d[k] = status[k];
      d.mailAccount = data.email;
    }
  }
  save();
  mailLastSync = Date.now();
}
async function syncMailStatus() {
  if (!mailSession || demoMode) return;
  applyMailStatus(await mailAPI("status"));
  const closed = db.projects
    .filter((p) => ["Terminé", "Annulé"].includes(p.status))
    .map((p) => p.id);
  if (closed.length)
    applyMailStatus(await mailAPI("pause", { projects: closed }));
}
function mailSettings() {
  modal(
    "Mes réglages de messages",
    field(
      "signature",
      "Signature ajoutée aux nouveaux messages",
      "textarea",
      db.mailSettings?.signature || "",
    ) +
      '<p class="note">Les messages déjà rédigés gardent leur texte. Aucun mot de passe Gmail à saisir ici. La connexion Google se fait par une autorisation personnelle.</p>',
    (data) => {
      db.mailSettings = { ...db.mailSettings, signature: data.signature };
      if (data.signature.trim())
        for (const d of db.supplierDrafts || []) {
          if (mailIsSent(d)) continue;
          for (const field of ["body", "reminderBody"]) {
            if (d[field]?.includes("[Votre signature")) {
              d[field] = d[field].replace(
                /\[Votre signature[^\]]*\]/g,
                data.signature,
              );
              d.state = "À relire";
            }
          }
        }
    },
  );
}
function updateMailDraft(id, fn) {
  const p = project(),
    row = mailRows(p).find((r) => r.draft.id === id);
  if (!row || !mailCanEdit(p, row.draft))
    throw Error("Ce message est verrouillé ou déjà transmis.");
  const d = mailRecord(row.draft);
  fn(d, row);
  if (!save()) throw Error("Modification non enregistrée.");
}
// La saisie invalide immédiatement la validation, même avant la sortie du champ.
let mailSaveTimer;
document.addEventListener("input", (event) => {
  const t = event.target;
  if (!t.matches("textarea[data-mail-field],input[data-mail-field]")) return;
  const row = mailCurrentRows().find((r) => r.draft.id === t.dataset.mailId);
  if (!row || !mailCanEdit(project(), row.draft)) return;
  const d = mailRecord(row.draft);
  d[t.dataset.mailField] = t.value;
  d.state = "À relire";
  const article = t.closest("[data-mail-row]");
  article.querySelector("[data-mail-approve]").checked = false;
  article.querySelector(".mail-state").textContent = "À relire";
  article.classList.remove("mail-approved");
  clearTimeout(mailSaveTimer);
  mailSaveTimer = setTimeout(() => save(), 300);
});
document.addEventListener("change", (event) => {
  const t = event.target;
  try {
    if (t.dataset.mailSelect) {
      if (t.checked) mailSelection.add(t.dataset.mailSelect);
      else mailSelection.delete(t.dataset.mailSelect);
      mailRefresh();
    }
    if (t.dataset.mailField) {
      updateMailDraft(t.dataset.mailId, (d) => {
        d[t.dataset.mailField] = t.type === "checkbox" ? t.checked : t.value;
        d.state = "À relire";
      });
      mailRefresh();
    }
    if (t.dataset.mailApprove) {
      updateMailDraft(t.dataset.mailApprove, (d, row) => {
        if (t.checked) {
          const check = { ...row.draft, stale: false };
          const error = mailValidationError(check);
          if (error) throw Error(error);
          d.signature = row.draft.currentSignature;
          d.state = "Validé";
        } else d.state = "À relire";
      });
      mailRefresh();
    }
  } catch (error) {
    toast(error.message);
    mailRefresh();
  }
});
document.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  try {
    if (b.hasAttribute("data-mail-settings")) mailSettings();
    if (b.dataset.mailFilter) {
      mailFilter = b.dataset.mailFilter;
      mailRefresh();
    }
    if (b.hasAttribute("data-mail-expand")) {
      const details = [...document.querySelectorAll("[data-mail-row] details")];
      const open = details.some((el) => !el.open);
      details.forEach((el) => (el.open = open));
      b.textContent = open
        ? "Réduire tous les textes"
        : "Afficher tous les textes";
    }
    if (b.hasAttribute("data-mail-all")) {
      const rows = mailCurrentRows().filter(
        (r) => mailCanEdit(project(), r.draft) && r.group?.key !== "unassigned",
      );
      const all = rows.every((r) => mailSelection.has(r.draft.id));
      for (const r of rows)
        if (all) mailSelection.delete(r.draft.id);
        else mailSelection.add(r.draft.id);
      mailRefresh();
    }
    if (b.hasAttribute("data-mail-reminders")) {
      for (const row of mailCurrentRows().filter(
        (r) => mailSelection.has(r.draft.id) && mailCanEdit(project(), r.draft),
      )) {
        const d = mailRecord(row.draft);
        d.reminderEnabled = true;
        d.reminderDays = 3;
        d.state = "À relire";
      }
      save();
      mailRefresh();
      toast(
        "Relance à J+3 activée pour la sélection. Validez les textes avant l’envoi.",
      );
    }
    if (b.hasAttribute("data-mail-validate")) {
      let count = 0,
        issues = 0;
      for (const row of mailCurrentRows().filter((r) =>
        mailSelection.has(r.draft.id),
      )) {
        if (
          !mailCanEdit(project(), row.draft) ||
          row.group?.key === "unassigned" ||
          mailValidationError({ ...row.draft, stale: false })
        ) {
          issues++;
          continue;
        }
        const d = mailRecord(row.draft);
        d.signature = row.draft.currentSignature;
        d.state = "Validé";
        count++;
      }
      save();
      mailRefresh();
      toast(
        `${count} message(s) validé(s)${issues ? " · " + issues + " à compléter" : ""}.`,
      );
    }
    if (b.hasAttribute("data-mail-connect")) {
      if (demoMode) return;
      if (!mailServiceURL)
        throw Error(
          "Connexion non activée : le propriétaire doit configurer Google et héberger le service une seule fois. Les utilisatrices n’auront ensuite qu’à cliquer sur Connecter Gmail.",
        );
      mailPopup = window.open(
        "about:blank",
        "atelier-gmail",
        "popup,width=540,height=720",
      );
      if (!mailPopup) throw Error("Autorisez la fenêtre de connexion Gmail.");
      mailNonce = crypto.randomUUID();
      try {
        const data = await mailAPI("connect", { nonce: mailNonce });
        mailPopup.location = data.url;
      } catch (e) {
        mailPopup.close();
        throw e;
      }
    }
    if (b.hasAttribute("data-mail-sync")) {
      await mailAPI("check", {});
      await syncMailStatus();
      mailRefresh();
      toast("Vérification demandée. Le suivi sera actualisé automatiquement.");
    }
    if (b.dataset.mailPause) {
      applyMailStatus(await mailAPI("pause", { ids: [b.dataset.mailPause] }));
      mailRefresh();
      toast("Relance arrêtée.");
    }
    if (b.hasAttribute("data-mail-disconnect")) {
      await mailAPI("disconnect", {});
      mailSession = null;
      sessionStorage.removeItem("atelier-mail-session");
      mailRefresh();
      toast("Compte déconnecté, envois et relances suspendus.");
    }
    if (b.hasAttribute("data-mail-send")) {
      const rows = mailCurrentRows().filter(
        (r) =>
          mailSelection.has(r.draft.id) &&
          mailCanEdit(project(), r.draft) &&
          r.draft.state === "Validé" &&
          !r.draft.stale &&
          !r.draft.orphan &&
          !mailIsSent(r.draft) &&
          !mailValidationError(r.draft),
      );
      if (!rows.length || !mailSession || demoMode) return;
      modal(
        "Envoyer le lot depuis " + mailSession.email,
        `<p>${rows.length} messages individuels seront transmis. Relances : ${rows.filter((r) => r.draft.reminderEnabled).length}, au maximum une par message.</p><ul>${rows.map((r) => `<li><strong>${esc(r.draft.supplierName)}</strong> · ${esc(r.draft.recipient)}<br>${esc(r.draft.subject)}</li>`).join("")}</ul><p>Les relances autorisées continueront avec le service hébergé, même après la fermeture du site. Vous pouvez les arrêter depuis ce tableau.</p><label class="mail-tick"><input type="checkbox" name="confirmSend" required> Je confirme l’envoi de ce lot et les relances cochées.</label>`,
        (data) => {
          if (!data.confirmSend) throw Error("Confirmez le lot.");
          void sendMailBatch(rows.map((r) => r.draft));
        },
      );
    }
  } catch (error) {
    toast(error.message);
  }
});
async function sendMailBatch(drafts) {
  mailBusy = true;
  mailRefresh();
  try {
    for (const draft of drafts) mailRecord(draft);
    if (!save()) throw Error("Sauvegarde impossible : aucun message transmis.");
    const data = await mailAPI("send", { confirmed: true, messages: drafts });
    applyMailStatus(data);
    for (const d of drafts) mailSelection.delete(d.id);
    toast(
      "Lot pris en charge par le service. Les confirmations Gmail apparaîtront dans le suivi.",
    );
  } catch (error) {
    toast(error.message + " Vérifiez le suivi avant de réessayer.");
  } finally {
    mailBusy = false;
    mailRefresh();
  }
}
window.addEventListener("message", async (event) => {
  if (
    !mailServiceURL ||
    event.origin !== new URL(mailServiceURL).origin ||
    event.source !== mailPopup ||
    event.data?.type !== "atelier-gmail-connected" ||
    event.data.nonce !== mailNonce
  )
    return;
  mailSession = { token: event.data.token, email: event.data.email };
  sessionStorage.setItem("atelier-mail-session", JSON.stringify(mailSession));
  mailNonce = "";
  try {
    await syncMailStatus();
    mailRefresh();
    toast("Gmail connecté. Aucun message envoyé sans validation de lot.");
  } catch (error) {
    mailServiceError = error.message;
    mailRefresh();
  }
});
setInterval(async () => {
  if (!mailSession || demoMode || mailBusy || Date.now() - mailLastSync < 15000)
    return;
  try {
    await syncMailStatus();
    if (
      view === "detail" &&
      tab === "messages" &&
      !document.activeElement?.matches("input,textarea,select")
    )
      mailRefresh();
  } catch (error) {
    mailServiceError = error.message;
    if (
      view === "detail" &&
      tab === "messages" &&
      !document.activeElement?.matches("input,textarea,select")
    )
      mailRefresh();
  }
}, 20000);
mailRefresh();
