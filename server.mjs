import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(fileURLToPath(new URL("./public/", import.meta.url)));
const port = Number(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/__atelier") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ application: "atelier", directory: path.dirname(root), version: "0.5.0" }));
      return;
    }
    const target = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end("Accès interdit");
      return;
    }
    const data = await readFile(target);
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end("Fichier introuvable");
  }
});
server.on("error", (err) => {
  console.error(
    err.code === "EADDRINUSE"
      ? `Le port ${port} est déjà utilisé. Essayez PORT=5174 npm run dev.`
      : err.message,
  );
  process.exit(1);
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Atelier : http://127.0.0.1:${port}\nArrêter : Ctrl+C`),
);
