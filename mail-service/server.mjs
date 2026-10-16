/** Service Gmail privé. À déployer séparément de GitHub Pages, sur un serveur toujours actif. */
import http from "node:http";
import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import { addJobs, processAccount } from "./core.mjs";
import { mailRecipientGuard, guardMailTransport } from "./safety.mjs";
const env = process.env;
const assertRecipient=mailRecipientGuard(env.MAIL_MODE || "sandbox",env.MAIL_TEST_RECIPIENTS || "");
for (const key of [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MAIL_PUBLIC_URL",
  "MAIL_ALLOWED_ORIGIN",
  "MAIL_ENCRYPTION_KEY",
  "MAIL_DATA_PATH",
])
  if (!env[key]) throw Error("Configuration manquante : " + key);
const publicURL = new URL(env.MAIL_PUBLIC_URL);
const allowedOrigin = new URL(env.MAIL_ALLOWED_ORIGIN).origin;
if (
  publicURL.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(publicURL.hostname)
)
  throw Error("HTTPS requis.");
const key = Buffer.from(env.MAIL_ENCRYPTION_KEY, "base64");
if (key.length !== 32) throw Error("Clé de chiffrement de 32 octets requise.");
const file = path.resolve(env.MAIL_DATA_PATH);
mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
function seal(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}
function open(value) {
  const box = JSON.parse(value),
    decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(box.iv, "base64"),
    );
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(box.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
}
let store;
try {
  store = open(readFileSync(file, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT")
    throw Error("Impossible de lire le stockage chiffré. Démarrage arrêté.");
  store = { accounts: {}, sessions: {} };
}
function persist() {
  writeFileSync(file + ".tmp", seal(store), { mode: 0o600 });
  renameSync(file + ".tmp", file);
}
const pending = new Map(),
  rates = new Map();
let working = false;
const hash = (text) => createHash("sha256").update(text).digest("hex");
const callback = new URL("/oauth/callback", publicURL).href;
const scopes = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];
async function oauth(parameters) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      ...parameters,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error("Connexion Google à renouveler.");
  return r.json();
}
async function gmail(token, route, options = {}) {
  const r = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/" + route,
    {
      ...options,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!r.ok) throw Error("Gmail indisponible.");
  return r.json();
}
async function tick() {
  if (working) return;
  working = true;
  try {
    for (const account of Object.values(store.accounts)) {
      if (
        account.disabled ||
        !(account.jobs || []).some((j) =>
          [
            "En attente d’envoi",
            "En attente de réponse",
            "Envoi en cours",
          ].includes(j.state),
        )
      )
        continue;
      try {
        const token = await oauth({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        });
        delete account.connectionError;
        await processAccount(
          account,
          guardMailTransport({
            send: (body) =>
              gmail(token.access_token, "messages/send", {
                method: "POST",
                body: JSON.stringify(body),
              }),
            thread: (id) =>
              gmail(
                token.access_token,
                "threads/" +
                  encodeURIComponent(id) +
                  "?format=metadata&metadataHeaders=From&metadataHeaders=Message-ID",
              ),
          },assertRecipient),
          persist,
        );
      } catch {
        account.connectionError =
          "Connexion Gmail à renouveler : envois et relances suspendus.";
        persist();
      }
    }
  } finally {
    working = false;
  }
}
function summary(account) {
  return {
    email: account.email,
    error: account.connectionError || "",
    jobs: (account.jobs || []).map(
      ({
        id,
        state,
        sentAt,
        threadId,
        reminderEnabled,
        reminderCount,
        nextReminderAt,
        reminderSentAt,
        lastCheckedAt,
        replyAt,
        error,
        paused,
        history,
      }) => ({
        id,
        state,
        sentAt,
        threadId,
        reminderEnabled,
        reminderCount,
        nextReminderAt,
        reminderSentAt,
        lastCheckedAt,
        replyAt,
        error,
        paused,
        history,
      }),
    ),
  };
}
async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 2000000) throw Error("Lot trop volumineux.");
  }
  return JSON.parse(text || "{}");
}
function reply(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const origin = req.headers.origin;
  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(origin === allowedOrigin ? 204 : 403);
    res.end();
    return;
  }
  const url = new URL(req.url, publicURL);
  try {
    if (url.pathname === "/health") {
      reply(res, 200, { ok: true });
      return;
    }
    if (url.pathname === "/oauth/callback") {
      const state = pending.get(url.searchParams.get("state"));
      pending.delete(url.searchParams.get("state"));
      if (!state || state.expires < Date.now() || !url.searchParams.get("code"))
        throw Error("Connexion annulée ou expirée.");
      const token = await oauth({
        grant_type: "authorization_code",
        code: url.searchParams.get("code"),
        redirect_uri: callback,
        code_verifier: state.verifier,
      });
      if (!scopes.every((s) => (token.scope || "").split(" ").includes(s)))
        throw Error("Autorisations Gmail incomplètes.");
      const profile = await gmail(token.access_token, "profile");
      const email = profile.emailAddress.toLowerCase();
      const account = (store.accounts[email] ??= { email, jobs: [] });
      account.refreshToken = token.refresh_token || account.refreshToken;
      if (!account.refreshToken)
        throw Error("Autorisation hors ligne manquante.");
      account.disabled = false;
      delete account.connectionError;
      const session = randomBytes(32).toString("base64url");
      store.sessions[hash(session)] = {
        email,
        expires: Date.now() + 12 * 3600000,
      };
      persist();
      const nonce = randomBytes(18).toString("base64");
      const payload = JSON.stringify({
        type: "atelier-gmail-connected",
        nonce: state.nonce,
        token: session,
        email,
      }).replace(/</g, "\\u003c");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
      });
      res.end(
        `<p>Gmail connecté. Vous pouvez fermer cette fenêtre.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${payload},${JSON.stringify(allowedOrigin)});window.close();}</script>`,
      );
      return;
    }
    if (origin !== allowedOrigin) {
      reply(res, 403, { error: "Origine non autorisée." });
      return;
    }
    if (url.pathname === "/api/mail/connect" && req.method === "POST") {
      const ip = req.socket.remoteAddress;
      const rate = rates.get(ip) || { start: Date.now(), count: 0 };
      if (Date.now() - rate.start > 600000) {
        rate.start = Date.now();
        rate.count = 0;
      }
      rates.set(ip, rate);
      if (++rate.count > 20)
        throw Error("Trop de tentatives. Réessayez plus tard.");
      const input = await body(req);
      if (!/^[a-f0-9-]{36}$/.test(input.nonce || ""))
        throw Error("Connexion incorrecte.");
      for (const [id, s] of pending)
        if (s.expires < Date.now()) pending.delete(id);
      const state = randomBytes(32).toString("base64url"),
        verifier = randomBytes(32).toString("base64url");
      pending.set(state, {
        nonce: input.nonce,
        verifier,
        expires: Date.now() + 600000,
      });
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: callback,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
        code_challenge: Buffer.from(
          createHash("sha256").update(verifier).digest(),
        ).toString("base64url"),
        code_challenge_method: "S256",
      });
      reply(res, 200, { url: auth.href });
      return;
    }
    const session =
      store.sessions[
        hash((req.headers.authorization || "").replace(/^Bearer /, ""))
      ];
    if (!session || session.expires < Date.now()) {
      reply(res, 401, {
        error: "Reconnectez Gmail pour accéder à votre suivi.",
      });
      return;
    }
    const account = store.accounts[session.email];
    if (url.pathname === "/api/mail/status" && req.method === "GET") {
      reply(res, 200, summary(account));
      return;
    }
    if (url.pathname === "/api/mail/send" && req.method === "POST") {
      const input = await body(req);
      if (input.confirmed !== true) throw Error("Validation du lot requise.");
      if(!Array.isArray(input.messages))throw Error("Liste de messages requise.");
      input.messages.forEach(message=>assertRecipient(message.recipient));
      addJobs(account, input.messages);
      persist();
      reply(res, 202, summary(account));
      void tick();
      return;
    }
    if (url.pathname === "/api/mail/pause" && req.method === "POST") {
      const input = await body(req);
      account.closedProjects = [
        ...new Set([
          ...(account.closedProjects || []),
          ...(input.projects || []),
        ]),
      ];
      for (const job of account.jobs || [])
        if (
          (input.ids || []).includes(job.id) ||
          (input.projects || []).includes(job.project)
        ) {
          job.paused = true;
          job.reminderEnabled = false;
          if (job.state === "En attente d’envoi")
            job.state = "Annulé avant envoi";
        }
      persist();
      reply(res, 200, summary(account));
      return;
    }
    if (url.pathname === "/api/mail/check" && req.method === "POST") {
      void tick();
      reply(res, 202, summary(account));
      return;
    }
    if (url.pathname === "/api/mail/disconnect" && req.method === "POST") {
      // Déconnecter arrête aussi les traitements automatiques du compte.
      account.disabled = true;
      for (const [id, s] of Object.entries(store.sessions))
        if (s.email === account.email) delete store.sessions[id];
      persist();
      reply(res, 200, { ok: true });
      return;
    }
    reply(res, 404, { error: "Action inconnue." });
  } catch (error) {
    reply(res, 400, {
      error: error.message.startsWith("Unexpected")
        ? "Requête incorrecte."
        : error.message,
    });
  }
});
server.listen(Number(env.PORT || 8787), "0.0.0.0", () =>
  console.log("Service Atelier prêt."),
);
setInterval(() => void tick(), 60000).unref();
void tick();
