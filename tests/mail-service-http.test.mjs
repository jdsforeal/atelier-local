import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import path from "node:path";
const directory = await mkdtemp(path.join(tmpdir(), "atelier-mail-http-"));
const port = 18000 + Math.floor(Math.random() * 5000),
  base = `http://127.0.0.1:${port}`;
const processHandle = spawn(process.execPath, ["mail-service/server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    MAIL_REQUIRE_CLOUD: "0",
    GOOGLE_CLIENT_ID: "test-client",
    GOOGLE_CLIENT_SECRET: "test-only-not-a-credential",
    MAIL_PUBLIC_URL: base,
    MAIL_ALLOWED_ORIGIN: "http://127.0.0.1:5173",
    MAIL_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    MAIL_DATA_PATH: path.join(directory, "mail.enc"),
  },
  stdio: "ignore",
});
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(base + "/health");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(ready, "service démarré sans connexion Gmail");
  assert.equal(
    (
      await fetch(base + "/api/mail/status", {
        headers: { Origin: "https://other.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/mail/status", {
        headers: { Origin: "http://127.0.0.1:5173" },
      })
    ).status,
    401,
  );
  const connect = await fetch(base + "/api/mail/connect", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nonce: "12345678-1234-1234-1234-123456789abc" }),
  });
  assert.equal(connect.status, 200);
  const result = await connect.json();
  const auth = new URL(result.url);
  assert.equal(auth.origin, "https://accounts.google.com");
  assert.equal(auth.searchParams.get("access_type"), "offline");
  assert.equal(auth.searchParams.get("code_challenge_method"), "S256");
  assert.equal(auth.searchParams.get("redirect_uri"), base + "/oauth/callback");
  assert.ok(auth.searchParams.get("state").length > 30);
  assert.ok(!result.url.includes("test-only-not-a-credential"));
  const noSession = await fetch(base + "/api/mail/send", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5173",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirmed: true, messages: [] }),
  });
  assert.equal(noSession.status, 401);
  const callback = await fetch(
    base + "/oauth/callback?state=unknown&code=fake",
  );
  assert.equal(callback.status, 400);
  console.log(
    "Service HTTP : origine contrôlée, routes privées, OAuth hors ligne avec PKCE, état inconnu rejeté : OK. Aucun appel à Google.",
  );
} finally {
  processHandle.kill();
  await new Promise((resolve) => processHandle.once("exit", resolve));
  await rm(directory, { recursive: true, force: true });
}
