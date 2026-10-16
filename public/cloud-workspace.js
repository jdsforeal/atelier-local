/** Pilote connecté. Les droits sont contrôlés par PostgreSQL ; l'interface les rend compréhensibles. */
const cloudState = {
  client: null,
  user: null,
  studio: null,
  studios: [],
  projects: [],
  members: [],
  revisions: new Map(),
  baselines: new Map(),
  globalRevision: 0,
  globalBaseline: "",
  active: false,
  loading: false,
  busy: false,
  pending: false,
  error: "",
  conflict: false,
  timer: null,
};
const cloudLocalSave = save;
const cloudClone = (value) => JSON.parse(JSON.stringify(value));
const cloudConfig = window.ATELIER_CLOUD || {};
function cloudConfigured() {
  return (
    cloudConfig.enabled === true &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cloudConfig.url || "") &&
    /^(sb_publishable_|eyJ)/.test(cloudConfig.publishableKey || "") &&
    !String(cloudConfig.publishableKey).startsWith("sb_secret_")
  );
}
async function cloudResult(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
function cloudRights(projectId = pid) {
  const p = cloudState.projects.find((x) => x.external_id === projectId);
  const manager =
    cloudState.studio?.owner_id === cloudState.user?.id ||
    (!!p && p.creator_id === cloudState.user?.id);
  const member =
    cloudState.members.find(
      (m) => m.project_id === p?.id && m.user_id === cloudState.user?.id,
    ) || {};
  return {
    manager,
    can_edit: manager || !!member.can_edit,
    budget_read: manager || !!member.budget_read,
    budget_edit: manager || !!member.budget_edit,
    prepare_requests: manager || !!member.prepare_requests,
    send_requests: manager || !!member.send_requests,
    can_invite: manager || !!member.can_invite,
  };
}
function cloudSectionWritable(id, section) {
  const r = cloudRights(id);
  return section === "creative"
    ? r.can_edit
    : section === "finance"
      ? r.budget_edit
      : r.prepare_requests;
}
function cloudSetStatus() {
  const node = document.querySelector("#cloud-status");
  if (node) {
    node.textContent = cloudState.error
      ? cloudState.error
      : cloudState.busy
        ? "Enregistrement en ligne…"
        : cloudState.pending
          ? "Modifications à synchroniser"
          : cloudState.active
            ? "Enregistré en ligne · studio privé"
            : "Espace local";
    node.classList.toggle("cloud-error", !!cloudState.error);
  }
}
save = function () {
  if (!cloudState.active || demoMode) return cloudLocalSave();
  cloudState.pending = true;
  cloudSetStatus();
  clearTimeout(cloudState.timer);
  cloudState.timer = setTimeout(() => cloudFlush(), 700);
  return true;
};
async function cloudFlush() {
  if (
    !cloudState.active ||
    cloudState.busy ||
    !cloudState.pending ||
    cloudState.conflict
  )
    return;
  cloudState.busy = true;
  cloudState.pending = false;
  cloudState.error = "";
  cloudSetStatus();
  const snapshot = cloudClone(db);
  try {
    for (const p of snapshot.projects) {
      let meta = cloudState.projects.find((x) => x.external_id === p.id);
      if (!meta) {
        const id = await cloudResult(
          cloudState.client.rpc("atelier_create_project", {
            p_studio: cloudState.studio.id,
            p_external: p.id,
            p_name: p.name,
          }),
        );
        meta = {
          id,
          external_id: p.id,
          studio_id: cloudState.studio.id,
          creator_id: cloudState.user.id,
          name: p.name,
        };
        cloudState.projects.push(meta);
      }
      const docs = cloudProjectDocuments(snapshot, p);
      const changes = {},
        expected = {},
        localKeys = {};
      for (const [section, local] of Object.entries(docs)) {
        if (!cloudSectionWritable(p.id, section)) continue;
        const key = meta.id + ":" + section,
          json = JSON.stringify(local);
        if (cloudState.baselines.get(key) === json) continue;
        changes[section] = await cloudExternalize(
          local,
          cloudState.client,
          cloudState.studio.id,
          meta.id,
        );
        expected[section] = cloudState.revisions.get(key) || 0;
        localKeys[section] = json;
      }
      if (Object.keys(changes).length) {
        const revisions = await cloudResult(
          cloudState.client.rpc("atelier_save_project", {
            p_project: meta.id,
            p_documents: changes,
            p_expected: expected,
          }),
        );
        for (const [section, revision] of Object.entries(revisions)) {
          cloudState.revisions.set(meta.id + ":" + section, revision);
          cloudState.baselines.set(meta.id + ":" + section, localKeys[section]);
        }
      }
    }
    if (cloudState.studio.owner_id === cloudState.user.id) {
      const globals = cloudGlobalDocument(snapshot),
        json = JSON.stringify(globals);
      if (json !== cloudState.globalBaseline) {
        const data = await cloudExternalize(
          globals,
          cloudState.client,
          cloudState.studio.id,
          null,
        );
        cloudState.globalRevision = await cloudResult(
          cloudState.client.rpc("atelier_save_globals", {
            p_studio: cloudState.studio.id,
            p_expected: cloudState.globalRevision,
            p_data: data,
          }),
        );
        cloudState.globalBaseline = json;
      }
    }
  } catch (error) {
    cloudState.pending = true;
    cloudState.error = /ATELIER_CONFLICT|40001/.test(
      error.message || error.code || "",
    )
      ? "Une autre personne a modifié le projet. Exportez vos changements puis rechargez la version en ligne."
      : "Non synchronisé : " + error.message;
    cloudState.conflict = /ATELIER_CONFLICT|40001/.test(
      error.message || error.code || "",
    );
  } finally {
    cloudState.busy = false;
    cloudSetStatus();
    if (cloudState.pending && !cloudState.error)
      cloudState.timer = setTimeout(cloudFlush, 500);
  }
}
async function cloudLoadStudio(id, preserveView = false) {
  const previousView = { view, pid, tab };
  if (cloudState.pending || cloudState.busy)
    throw Error(
      "Synchronisez ou exportez les changements avant de changer de studio.",
    );
  cloudState.loading = true;
  cloudState.error = "";
  cloudRenderGate();
  try {
    const studio = cloudState.studios.find((s) => s.id === id);
    if (!studio) throw Error("Studio inaccessible.");
    const projects = await cloudResult(
      cloudState.client
        .from("atelier_projects")
        .select("*")
        .is("purged_at", null)
        .eq("studio_id", id),
    );
    const ids = projects.map((x) => x.id);
    const docs = ids.length
      ? await cloudResult(
          cloudState.client
            .from("atelier_documents")
            .select("*")
            .in("project_id", ids),
        )
      : [];
    const members = ids.length
      ? await cloudResult(
          cloudState.client
            .from("atelier_members")
            .select("*")
            .in("project_id", ids),
        )
      : [];
    const globals = await cloudResult(
      cloudState.client.from("atelier_globals").select("*").eq("studio_id", id),
    );
    const resolved = await cloudResolveAssets(
      { docs, globals },
      cloudState.client,
    );
    const records = projects.filter(p=>!p.deleted_at).map((p) => ({
      namespace: p.id,
      externalId: p.external_id,
      ...Object.fromEntries(
        resolved.docs
          .filter((d) => d.project_id === p.id)
          .map((d) => [d.section, d.data]),
      ),
    }));
    let next = cloudHydrate(
      resolved.globals[0]?.data,
      records,
      emptyPersonalWorkspace(),
    );
    // Un projet créé sans document à cause d'une coupure reste récupérable.
    for (const p of projects.filter(p=>!p.deleted_at))
      if (!next.projects.some((x) => x.id === p.external_id))
        next.projects.push({
          id: p.external_id,
          name: p.name,
          looks: [],
          boards: [],
          status: "Préparation",
        });
    cloudState.studio = studio;
    cloudState.projects = projects;
    cloudState.members = members;
    cloudState.revisions.clear();
    cloudState.baselines.clear();
    db = next;
    normalize();
    prepareLookChoices(db, atelierCatalog);
    cloudState.globalRevision = globals[0]?.revision || 1;
    cloudState.globalBaseline = JSON.stringify(cloudGlobalDocument(db));
    for (const p of db.projects) {
      const meta = projects.find((x) => x.external_id === p.id);
      const parts = cloudProjectDocuments(db, p);
      for (const section of ["creative", "finance", "requests"]) {
        const doc = docs.find(
          (x) => x.project_id === meta.id && x.section === section,
        );
        cloudState.revisions.set(meta.id + ":" + section, doc?.revision || 0);
        cloudState.baselines.set(
          meta.id + ":" + section,
          JSON.stringify(parts[section]),
        );
      }
    }
    cloudState.active = true;
    cloudState.assetsResolvedAt = Date.now();
    cloudState.reloadRequested = false;
    cloudState.conflict = false;
    cloudState.pending = false;
    sessionStorage.setItem("atelier-cloud-studio", id);
    pid = db.projects[0]?.id;
    view = "home";
    if (
      preserveView &&
      (!previousView.pid || db.projects.some((p) => p.id === previousView.pid))
    ) {
      view = previousView.view;
      pid = previousView.pid;
      tab = previousView.tab;
    }
  } finally {
    cloudState.loading = false;
    render();
  }
}
async function cloudRefreshAccount() {
  cloudState.studios = await cloudResult(
    cloudState.client.from("atelier_studios").select("*").order("created_at"),
  );
  const preferred = sessionStorage.getItem("atelier-cloud-studio");
  if (cloudState.studios.length)
    await cloudLoadStudio(
      cloudState.studios.find((s) => s.id === preferred)?.id ||
        cloudState.studios[0].id,
    );
  else {
    cloudState.active = false;
    cloudState.loading = false;
    render();
    cloudAccount();
  }
}
function cloudSignIn() {
  if (!cloudConfigured()) {
    modal(
      "Connexion en préparation",
      "<p>Le pilote privé est en cours de configuration. Les projets locaux et la simulation restent disponibles.</p><p>La connexion Google sera activée après installation et vérification des protections dans le projet Supabase.</p>",
      () => {},
    );
    $('#form > button[type="submit"]').hidden = true;
    return;
  }
  const redirect = new URL(location.pathname, location.origin);
  redirect.searchParams.set("mode", "personal");
  return cloudResult(
    cloudState.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect.href, scopes: "openid email profile" },
    }),
  );
}
function cloudRenderGate() {
  if (cloudState.loading) {
    document.querySelector("#cloud-loading")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "cloud-loading";
    overlay.innerHTML =
      '<div class="panel"><h2>Ouverture de votre studio privé…</h2><p>Vérification de votre connexion et de vos accès.</p></div>';
    document.body.append(overlay);
  } else document.querySelector("#cloud-loading")?.remove();
}
function cloudAccount() {
  const user = cloudState.user;
  modal(
    "Compte et studio",
    user
      ? `<p>Connecté : <strong>${esc(user.email)}</strong></p><p>Cette connexion identifie votre compte Atelier. Elle ne donne pas accès à Gmail.</p>${cloudState.studios.length ? `<label>Studio<select id="cloud-studio-select">${cloudState.studios.map((s) => `<option value="${esc(s.id)}" ${s.id === cloudState.studio?.id ? "selected" : ""}>${esc(s.name)}${s.owner_id === user.id ? " · propriétaire" : " · invité(e)"}</option>`).join("")}</select></label><button type="button" data-cloud-open-studio>Ouvrir ce studio</button>` : ""}<div class="actions"><button type="button" data-cloud-new-studio>Créer mon studio privé</button><button type="button" data-cloud-inbox>Mes invitations</button>${cloudState.active ? '<button type="button" data-cloud-reload>Recharger la version en ligne</button><button type="button" data-cloud-flush>Réessayer la synchronisation</button>' : ""}<button type="button" data-cloud-signout>Se déconnecter</button></div>`
      : '<p>Retrouvez vos projets privés sur vos appareils. Les invitations concernent uniquement les projets choisis.</p><button type="button" class="primary" data-cloud-login>Continuer avec Google</button><p class="note">Gmail et Qonto sont des connexions séparées. Aucun abonnement payant n’est activé.</p>',
    () => {},
  );
  $('#form > button[type="submit"]').hidden = true;
}
async function cloudInbox() {
  const invitations = await cloudResult(
    cloudState.client
      .from("atelier_invitations")
      .select("*")
      .eq("email", cloudState.user.email.toLowerCase())
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
  );
  modal(
    "Invitations à un projet",
    invitations
      .map(
        (i) =>
          `<div class="panel"><p>Invitation à rejoindre <strong>${esc(i.project_name)}</strong> · expire le ${date(i.expires_at.slice(0, 10))}</p><p>${i.permissions.can_edit ? "Contribution" : "Consultation"}${i.permissions.budget_read ? " · budget visible" : ""}${i.permissions.can_invite ? " · invitations autorisées" : ""}</p><button type="button" data-cloud-accept="${esc(i.id)}">Accepter cette invitation</button></div>`,
      )
      .join("") || "<p>Aucune invitation en attente pour cette adresse.</p>",
    () => {},
  );
  $('#form > button[type="submit"]').hidden = true;
}
const cloudPermissionLabels = {
  can_edit: "Modifier les looks, pièces et tâches",
  budget_read: "Consulter le budget et les tarifs",
  budget_edit: "Modifier le budget et les devis",
  prepare_requests: "Préparer les demandes fournisseurs",
  send_requests: "Autoriser l’envoi lorsque Gmail sera connecté",
  can_invite: "Inviter d’autres personnes dans la limite de ses droits",
};
function cloudPermissionFields(rights = {}, ceiling = cloudRights()) {
  return Object.entries(cloudPermissionLabels)
    .filter(([k]) => ceiling.manager || ceiling[k])
    .map(
      ([k, label]) =>
        `<label class="cloud-right"><input name="${k}" type="checkbox" ${rights[k] ? "checked" : ""}> ${esc(label)}</label>`,
    )
    .join("");
}
function cloudReadPermissions(form) {
  const values = Object.fromEntries(
    Object.keys(cloudPermissionLabels).map((k) => [
      k,
      form.elements[k]?.checked || false,
    ]),
  );
  if (values.budget_edit) values.budget_read = true;
  if (values.send_requests) values.prepare_requests = true;
  return values;
}
async function cloudTeam() {
  if (cloudState.pending) await cloudFlush();
  const meta = cloudState.projects.find((x) => x.external_id === pid);
  if (!meta) return toast("Le projet doit être synchronisé avant de gérer ses accès.");
  const members = await cloudResult(
    cloudState.client
      .from("atelier_members")
      .select("*")
      .eq("project_id", meta.id),
  );
  const rights = cloudRights();
  const invitations = rights.can_invite
    ? await cloudResult(
        cloudState.client
          .from("atelier_invitations")
          .select("*")
          .eq("project_id", meta.id)
          .is("accepted_at", null)
          .is("revoked_at", null),
      )
    : [];
  modal(
    "Accès et équipe",
    `<p><strong>Projet privé</strong> · Copier son adresse ne donne aucun accès.</p><p>Responsable : ${meta.creator_id === cloudState.user.id ? esc(cloudState.user.email) : "créateur du projet"}</p>${members.map((m) => `<div class="panel"><strong>${esc(m.email)}</strong><p>${m.can_edit ? "Contribution" : "Consultation"}${m.budget_read ? " · budget partagé" : ""}${m.can_invite ? " · peut inviter" : ""}</p>${rights.manager ? `<button type="button" data-cloud-member="${esc(m.user_id)}">Modifier les droits</button><button type="button" data-cloud-revoke="${esc(m.user_id)}">Retirer l’accès</button>` : ""}</div>`).join("")}${invitations.map((i) => `<p>${esc(i.email)} <button type="button" data-cloud-copy-invite="${esc(i.id)}">Copier le lien</button> · ${new Date(i.expires_at) > new Date() ? "En attente" : "Expirée"} ${rights.manager ? `<button type="button" data-cloud-cancel-invite="${esc(i.id)}">Annuler l’invitation</button>` : ""}</p>`).join("")}${rights.can_invite ? '<button type="button" class="primary" data-cloud-invite>Inviter un·e assistant·e</button>' : '<p class="note">Seul le responsable ou une personne autorisée peut inviter.</p>'}<p class="note">Un accès retiré bloque les prochaines requêtes ; les fichiers déjà téléchargés ne peuvent pas être effacés à distance.</p>`,
    () => {},
  );
  $('#form > button[type="submit"]').hidden = true;
}

const cloudOriginalModal = modal;
modal = function (name, fields, fn) {
  $('#form > button[type="submit"]').hidden = false;
  return cloudOriginalModal(name, fields, fn);
};
const cloudOriginalRender = render;
render = function () {
  cloudOriginalRender();
  cloudRenderGate();
  document.querySelector("#cloud-account-button")?.remove();
  const button = document.createElement("button");
  button.id = "cloud-account-button";
  button.className = "quiet";
  button.textContent = cloudState.user ? "Compte & studio" : "Se connecter";
  button.dataset.cloudAccount = "";
  document.querySelector("header").append(button);
  if (!cloudState.active || demoMode) return;
  $(".aside-bottom small").textContent = cloudState.studio.name;
  const notice = $(".notice");
  notice.innerHTML = `<strong>${esc(cloudState.studio.name)} · STUDIO PRIVÉ</strong> <span id="cloud-status" role="status"></span><button class="quiet" data-cloud-account>Compte & studio</button><button class="quiet" data-cloud-simulation>Ouvrir la simulation</button>`;
  cloudSetStatus();
  if (view === "detail") {
    const rights = cloudRights();
    $(".detail-summary").insertAdjacentHTML(
      "beforeend",
      `<button data-cloud-team>Accès et équipe · privé</button>`,
    );
    if (!rights.budget_read) {
      document
        .querySelectorAll(
          '.tabs [data-tab="quote"],.piece-price,.quote-panel,.budget-grid,[data-tab="budget"]',
        )
        .forEach((x) => x.remove());
      document.querySelectorAll(".detail-summary .tag").forEach((x) => {
        if (x.textContent.includes("Budget"))
          x.textContent = "Budget non partagé";
      });
      document.querySelectorAll(".choice-body p").forEach((x) => {
        if (x.textContent.includes("coût")) x.textContent = "Tarif non partagé";
      });
      if (tab === "quote")
        $("#content").insertAdjacentHTML(
          "beforeend",
          '<p class="panel">Le budget n’est pas partagé avec votre compte.</p>',
        );
    }
    const writable =
      tab === "quote"
        ? rights.budget_edit
        : tab === "messages"
          ? rights.prepare_requests
          : rights.can_edit;
    if (!writable) {
      document
        .querySelectorAll(
          '#content input:not([type="search"]),#content textarea,#content select',
        )
        .forEach((x) => (x.disabled = true));
      document.querySelectorAll("#content button").forEach((x) => {
        if (
          !x.dataset.tab &&
          !x.hasAttribute("data-flow-board") &&
          !x.hasAttribute("data-cloud-team") &&
          !/prévisualiser|télécharger|revenir|ouvrir/i.test(x.textContent)
        )
          x.disabled = true;
      });
    }
  } else if (
    ["contacts", "pieces"].includes(view) &&
    cloudState.studio.owner_id !== cloudState.user.id
  ) {
    $("#content").insertAdjacentHTML(
      "afterbegin",
      '<p class="note">Vous voyez les références partagées dans vos projets. Le carnet complet du studio reste privé.</p>',
    );
  }
};
async function cloudImportLocal() {
  if (cloudState.studio?.owner_id !== cloudState.user?.id)
    throw Error("Import réservé à la propriétaire du studio.");
  const local = JSON.parse(localStorage.getItem(KEY) || "null");
  if (!local) throw Error("Aucune donnée locale à importer.");
  if ((local.projects || []).some((p) => p.simulation))
    throw Error(
      "La simulation ne doit pas être importée dans le studio privé.",
    );
  const cleaned = preparePersonalWorkspace(cloudClone(local));
  if (db.projects.length || db.contacts.length)
    throw Error(
      "Pour le pilote, importez dans un studio vide pour éviter les doublons.",
    );
  modal(
    "Importer les données de cet appareil",
    `<p>${cleaned.projects.length} projet(s) et ${cleaned.contacts.length} contact(s) seront copiés dans <strong>${esc(cloudState.studio.name)}</strong>.</p><p>La copie locale est conservée. Exportez-la avant de continuer si vous ne l’avez pas déjà fait.</p>`,
    () => {
      db = cleaned;
      normalize();
      prepareLookChoices(db, atelierCatalog);
    },
  );
}
document.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  try {
    if (b.hasAttribute("data-cloud-account")) cloudAccount();
    if (b.hasAttribute("data-cloud-login")) await cloudSignIn();
    if (b.hasAttribute("data-cloud-new-studio"))
      modal(
        "Créer mon studio privé",
        field("name", "Nom du studio") +
          "<p>Les projets restent privés. Vous choisirez ensuite qui peut accéder à chaque projet.</p>",
        async (d) => {
          const id = await cloudResult(
            cloudState.client.rpc("atelier_create_studio", { p_name: d.name }),
          );
          cloudState.studios = await cloudResult(
            cloudState.client.from("atelier_studios").select("*"),
          );
          await cloudLoadStudio(id);
        },
      );
    if (b.hasAttribute("data-cloud-open-studio")) {
      await cloudLoadStudio($("#cloud-studio-select").value);
      $("#modal").close();
    }
    if (b.hasAttribute("data-cloud-inbox")) await cloudInbox();
    if (b.dataset.cloudCopyInvite) {
      const link = new URL(location.pathname, location.origin);
      link.searchParams.set("mode", "personal");
      link.searchParams.set("invitation", b.dataset.cloudCopyInvite);
      await navigator.clipboard.writeText(link.href);
      toast("Lien copié. Seule l’adresse invitée pourra accepter.");
    }
    if (b.dataset.cloudAccept) {
      const id = await cloudResult(
        cloudState.client.rpc("atelier_accept_invitation", {
          p_invitation: b.dataset.cloudAccept,
        }),
      );
      const rows = await cloudResult(
        cloudState.client.from("atelier_projects").select("*").eq("id", id),
      );
      if (rows[0])
        sessionStorage.setItem("atelier-cloud-studio", rows[0].studio_id);
      $("#modal").close();
      await cloudRefreshAccount();
      if (rows[0]) {
        pid = rows[0].external_id;
        view = "detail";
        tab = "overview";
        render();
      }
    }
    if (b.hasAttribute("data-cloud-team")) await cloudTeam();
    if (b.hasAttribute("data-cloud-invite")) {
      if (cloudState.pending) await cloudFlush();
      if (!cloudState.projects.some(p => p.external_id === pid)) throw Error("Le projet doit être synchronisé avant de créer une invitation.");
      modal(
        "Inviter dans ce projet",
        field("email", "Adresse Google de la personne invitée", "email") +
          cloudPermissionFields({ can_edit: true }) +
          '<p class="note">Invitation valable sept jours, liée à cette adresse vérifiée. Aucun e-mail automatique : vous pourrez copier un lien à lui transmettre.</p>',
        async (d, f) => {
          await cloudResult(
            cloudState.client.rpc("atelier_invite", {
              p_project: cloudState.projects.find((p) => p.external_id === pid)
                .id,
              p_email: d.email,
              p_permissions: cloudReadPermissions(f),
            }),
          );
          toast(
            "Invitation créée. Copiez le lien à transmettre à la personne invitée.",
          );
          setTimeout(() => cloudTeam().catch(error => toast(error.message)), 0);
        },
      );
    }
    if (b.dataset.cloudMember) {
      const p = cloudState.projects.find((p) => p.external_id === pid);
      const members = await cloudResult(
        cloudState.client
          .from("atelier_members")
          .select("*")
          .eq("project_id", p.id),
      );
      const member = members.find((m) => m.user_id === b.dataset.cloudMember);
      modal(
        "Droits de " + member.email,
        cloudPermissionFields(member),
        async (d, f) => {
          await cloudResult(
            cloudState.client.rpc("atelier_set_member", {
              p_project: p.id,
              p_user: member.user_id,
              p_permissions: cloudReadPermissions(f),
            }),
          );
          cloudState.members = await cloudResult(
            cloudState.client
              .from("atelier_members")
              .select("*")
              .in(
                "project_id",
                cloudState.projects.map((x) => x.id),
              ),
          );
        },
      );
    }
    if (b.dataset.cloudRevoke || b.dataset.cloudCancelInvite) {
      const projectId = cloudState.projects.find(
        (p) => p.external_id === pid,
      ).id;
      modal(
        "Retirer cet accès",
        "<p>La personne ne pourra plus consulter ce projet après vérification de ses droits. Vous pourrez l’inviter de nouveau si nécessaire.</p>",
        async () => {
          await cloudResult(
            cloudState.client.rpc("atelier_revoke", {
              p_project: projectId,
              p_user: b.dataset.cloudRevoke || null,
              p_invitation: b.dataset.cloudCancelInvite || null,
            }),
          );
        },
      );
    }
    if (b.hasAttribute("data-cloud-reload")) {
      if (cloudState.pending) {
        modal(
          "Recharger sans écraser la version en ligne",
          "<p>Exportez d’abord vos changements avec « Exporter mes données ». En continuant, les modifications non synchronisées de cet onglet seront remplacées par la version en ligne.</p>",
          async () => {
            cloudState.pending = false;
            cloudState.conflict = false;
            await cloudLoadStudio(cloudState.studio.id);
          },
        );
      } else await cloudLoadStudio(cloudState.studio.id);
    }
    if (b.hasAttribute("data-cloud-flush")) await cloudFlush();
    if (b.hasAttribute("data-cloud-import")) await cloudImportLocal();
    if (b.hasAttribute("data-cloud-signout")) {
      if (cloudState.pending || cloudState.busy)
        throw Error(
          "Synchronisez ou exportez vos changements avant de vous déconnecter.",
        );
      await cloudState.client.auth.signOut();
      cloudState.active = false;
      cloudState.user = null;
      db =
        JSON.parse(localStorage.getItem(KEY) || "null") ||
        emptyPersonalWorkspace();
      normalize();
      view = "home";
      $("#modal").close();
      render();
    }
    if (b.hasAttribute("data-cloud-simulation")) {
      if (cloudState.pending || cloudState.busy)
        throw Error(
          "Synchronisez vos changements avant d’ouvrir la simulation.",
        );
      location.assign(location.pathname + "?mode=simulation");
    }
  } catch (error) {
    toast(error.message);
  }
});
// Éviter la restauration destructive d'une sauvegarde sur un espace partagé.
document.addEventListener(
  "click",
  (event) => {
    if (!cloudState.active || demoMode) return;
    const b = event.target.closest("button");
    if (b?.id === "restore") {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(
        "Importez les données locales depuis Compte & studio, dans un studio vide.",
      );
    }
  },
  true,
);
window.addEventListener("beforeunload", (event) => {
  if (cloudState.pending || cloudState.busy) {
    event.preventDefault();
    event.returnValue = "";
  }
});
async function cloudStart() {
  if (!cloudConfigured()) {
    render();
    return;
  }
  // Refuser une ancienne clé JWT privilégiée même si elle a été placée par erreur dans la configuration.
  if (cloudConfig.publishableKey.startsWith("eyJ")) {
    try {
      if (
        JSON.parse(atob(cloudConfig.publishableKey.split(".")[1])).role !==
        "anon"
      )
        throw Error();
    } catch {
      toast("Configuration publique invalide. Aucune connexion effectuée.");
      return;
    }
  }
  cloudState.client = AtelierSupabase.createClient(
    cloudConfig.url,
    cloudConfig.publishableKey,
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "atelier-auth-" + new URL(cloudConfig.url).hostname,
      },
    },
  );
  cloudState.loading = true;
  cloudRenderGate();
  try {
    const {
      data: { session },
      error,
    } = await cloudState.client.auth.getSession();
    if (error) throw error;
    if (session) {
      const result = await cloudState.client.auth.getUser();
      if (result.error) throw result.error;
      cloudState.user = result.data.user;
      if (!demoMode) await cloudRefreshAccount();
    }
  } catch (error) {
    if (error.name !== "AuthSessionMissingError") {
      cloudState.error = "Connexion indisponible : " + error.message;
      toast(cloudState.error);
    }
  } finally {
    cloudState.loading = false;
    render();
  }
  cloudState.client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      cloudState.active = false;
      cloudState.user = null;
      db =
        JSON.parse(localStorage.getItem(KEY) || "null") ||
        emptyPersonalWorkspace();
      normalize();
      view = "home";
      render();
    }
    if (event === "SIGNED_IN" && session && !cloudState.user)
      setTimeout(async () => {
        try {
          const { data, error } = await cloudState.client.auth.getUser();
          if (error) throw error;
          cloudState.user = data.user;
          if (!demoMode) await cloudRefreshAccount();
          else render();
        } catch (error) {
          toast(error.message);
        }
      }, 0);
  });
}
const cloudAccountBase = cloudAccount;
cloudAccount = function () {
  cloudAccountBase();
  if (cloudState.active && cloudState.studio.owner_id === cloudState.user.id)
    $("#fields").insertAdjacentHTML(
      "beforeend",
      '<button type="button" data-cloud-import>Importer les données locales de cet appareil</button><p class="note">Les projets locaux restent séparés jusqu’à cet import explicite.</p>',
    );
};
cloudStart();

// Vérifier régulièrement les accès et les révisions ; ne jamais écraser une saisie locale en cours.
async function cloudPoll() {
  if (
    !cloudState.active ||
    demoMode ||
    cloudState.loading ||
    cloudState.busy ||
    document.hidden
  )
    return;
  try {
    const projects = await cloudResult(
      cloudState.client
        .from("atelier_projects")
        .select("*")
        .is("purged_at", null)
        .eq("studio_id", cloudState.studio.id),
    );
    const ids = projects.map((p) => p.id);
    const members = ids.length
      ? await cloudResult(
          cloudState.client
            .from("atelier_members")
            .select("*")
            .in("project_id", ids),
        )
      : [];
    const docs = ids.length
      ? await cloudResult(
          cloudState.client
            .from("atelier_documents")
            .select("project_id,section,revision")
            .in("project_id", ids),
        )
      : [];
    const changed =
      cloudState.reloadRequested ||
      Date.now() - (cloudState.assetsResolvedAt || 0) > 45 * 60 * 1000 ||
      JSON.stringify(projects) !== JSON.stringify(cloudState.projects) ||
      JSON.stringify(members) !== JSON.stringify(cloudState.members) ||
      docs.some(
        (d) =>
          cloudState.revisions.get(d.project_id + ":" + d.section) !==
          d.revision,
      ) ||
      [...cloudState.revisions.keys()].some(
        (k) =>
          !docs.some((d) => d.project_id + ":" + d.section === k) &&
          cloudState.revisions.get(k) > 0,
      );
    cloudState.projects = projects;
    cloudState.members = members;
    if (changed) {
      if (cloudState.pending) {
        cloudState.conflict = true;
        cloudState.error =
          "La version en ligne ou vos droits ont changé. Exportez les modifications locales puis rechargez.";
        cloudSetStatus();
        return;
      }
      if ($("#modal").open || document.querySelector("#document-preview")) {
        cloudState.reloadRequested = true;
        return;
      }
      await cloudLoadStudio(cloudState.studio.id, true);
    }
  } catch (error) {
    cloudState.error = "Vérification en ligne indisponible : " + error.message;
    cloudSetStatus();
  }
}
setInterval(cloudPoll, 60000);
window.addEventListener("focus", cloudPoll);

const cloudAccessRender = render;
render = function () {
  cloudAccessRender();
  if (!cloudState.active || demoMode) return;
  const owner = cloudState.studio.owner_id === cloudState.user.id;
  if (!owner && view !== "detail") {
    document
      .querySelectorAll('#content [data-action="project"]')
      .forEach((x) => (x.disabled = true));
    if (["contacts", "pieces"].includes(view))
      document.querySelectorAll("#content button").forEach((x) => {
        if (
          !x.dataset.page &&
          !x.dataset.networkTab &&
          !x.dataset.studioSection &&
          !/ouvrir|précédent|suivant/i.test(x.textContent)
        )
          x.disabled = true;
      });
  }
  for (const tile of document.querySelectorAll("[data-project]"))
    if (!cloudRights(tile.dataset.project).budget_read)
      tile
        .querySelectorAll(".card-body > small")
        .forEach((x) => (x.textContent = "Budget non partagé"));
  if (view === "detail" && tab === "quote" && !cloudRights().budget_read) {
    const tabs = $(".tabs");
    while (tabs.nextSibling) tabs.nextSibling.remove();
    tabs.insertAdjacentHTML(
      "afterend",
      '<p class="panel">Le budget et les devis ne sont pas partagés avec votre compte.</p>',
    );
  }
};
const cloudAccessModal = modal;
modal = function (name, fields, fn) {
  const result = cloudAccessModal(name, fields, fn);
  if (
    cloudState.active &&
    !demoMode &&
    view === "detail" &&
    !cloudRights().budget_edit
  )
    document
      .querySelectorAll(
        '#fields [name="price"],#fields [name="caution"],#fields [name="commit"],#fields [name="budget"],#fields [name="cautionReturned"]',
      )
      .forEach((input) => {
        input.disabled = true;
        input.closest("label").hidden = true;
      });
  return result;
};
render();

// Le pilote Gmail local exige un propriétaire et transmet le jeton utilisateur au service privé.
document.addEventListener('click',event=>{
 if(!cloudState.active||demoMode)return;
 if(event.target.closest('[data-mail-connect],[data-mail-send],[data-mail-sync]') && cloudState.studio?.owner_id!==cloudState.user?.id){
 event.preventDefault();event.stopImmediatePropagation();toast('Le pilote Gmail est réservé au propriétaire du studio.');
 }
},true);
const cloudMailAPIBase=mailAPI;
mailAPI=async function(route,body){
 if(!cloudState.active||demoMode)return cloudMailAPIBase(route,body);
 if(cloudState.studio?.owner_id!==cloudState.user?.id)throw Error('Pilote Gmail réservé au propriétaire.');
 if(!mailServiceURL)throw Error('Pour les essais Gmail gratuits, ouvrez Atelier sur cet ordinateur avec le service local.');
 if(route==='send'){await cloudFlush();if(cloudState.busy||cloudState.pending||cloudState.conflict||cloudState.error)throw Error('Attendez la sauvegarde en ligne avant d’envoyer les demandes.');}
 const {data,error}=await cloudState.client.auth.getSession();if(error||!data.session)throw Error('Reconnectez votre compte Atelier.');
 const response=await fetch(mailServiceURL+'/api/mail/'+route,{
 method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Atelier-Token':data.session.access_token,'X-Atelier-Studio':cloudState.studio.id,...(mailSession?{Authorization:'Bearer '+mailSession.token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(35000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Service Gmail indisponible.');return result;
};
