import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const directory = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "personal" ? "personal" : "simulation";
const url = `http://127.0.0.1:5173/?mode=${mode}&v=0.5`;
let active;
try { active = await (await fetch("http://127.0.0.1:5173/__atelier")).json(); } catch {}
if (active && active.directory !== directory) {
  console.error("Un autre Atelier utilise le port 5173. Fermez son terminal avant de relancer.");
  process.exit(1);
}
if (!active) {
  const child = spawn(process.execPath, ["server.mjs"], { cwd: directory, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code || 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      const health = await (await fetch("http://127.0.0.1:5173/__atelier")).json();
      if (health.directory === directory) { ready = true; break; }
    } catch {}
  }
  if (!ready) { child.kill(); console.error("Démarrage impossible : vérifiez le port 5173."); process.exit(1); }
}
console.log(`Ouvrir : ${url}\nGardez ce terminal ouvert. Pour arrêter : Ctrl+C.`);
spawn("open", [url], { stdio: "ignore" });
