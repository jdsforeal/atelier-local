const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const model = require("../public/cloud-model.js");
const calls = [];
const db = {
  projects: [{ id: "p", name: "Clip", budget: 3500, looks: [] }],
  pieces: [],
  contacts: [],
  suppliers: [],
  tasks: [],
  requests: [],
  supplierDrafts: [],
  expenses: [],
  quotes: [],
  quoteVersions: [],
  selectionHistory: [],
  clientBoards: [],
};
const context = {
  ...model,
  db,
  save: () => true,
  window: { ATELIER_CLOUD: {} },
  document: { querySelector: () => null },
  clearTimeout,
  setTimeout,
  demoMode: false,
  pid: "p",
  cloudExternalize: async (x) => x,
};
vm.createContext(context);
vm.runInContext(
  fs
    .readFileSync("public/cloud-workspace.js", "utf8")
    .split("async function cloudLoadStudio")[0] +
    "\nstate=cloudState;flush=cloudFlush;",
  context,
);
const s = context.state;
s.active = true;
s.pending = true;
s.user = { id: "owner" };
s.studio = { id: "studio", owner_id: "owner" };
s.projects = [{ id: "remote", external_id: "p", creator_id: "owner" }];
s.globalRevision = 1;
s.client = {
  rpc: async (name, args) => {
    calls.push({ name, args });
    return {
      data:
        name === "atelier_save_project"
          ? Object.fromEntries(Object.keys(args.p_documents).map((k) => [k, 1]))
          : 2,
      error: null,
    };
  },
};
(async () => {
  await context.flush();
  assert.equal(s.pending, false);
  assert.equal(s.error, "");
  assert.equal(calls[0].name, "atelier_save_project");
  assert.equal(calls[0].args.p_documents.creative.project.budget, undefined);
  assert.equal(calls[0].args.p_documents.finance.project.budget, 3500);
  context.db.projects[0].name = "Modifié";
  s.pending = true;
  s.client.rpc = async () => ({
    error: { message: "ATELIER_CONFLICT" },
    data: null,
  });
  await context.flush();
  assert.equal(s.pending, true);
  assert.equal(s.conflict, true);
  s.conflict = false;
  s.pending = true;
  s.error = "";
  s.user = { id: "assistant" };
  s.members = [{ project_id: "remote", user_id: "assistant", can_edit: true }];
  calls.length = 0;
  s.client.rpc = async (name, args) => {
    calls.push({ name, args });
    return { data: { creative: 2 }, error: null };
  };
  await context.flush();
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0].args.p_documents), ["creative"]);
  console.log(
    "Synchronisation : sections atomiques, coûts non envoyés sans droit, conflit conservé et aucune écriture globale par une assistante.",
  );
})();
