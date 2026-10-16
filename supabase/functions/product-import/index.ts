var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// public/product-import-model.js
var require_product_import_model = __commonJS({
  "public/product-import-model.js"(exports, module) {
    function productPublicURL(value) {
      try {
        const url = new URL(String(value).trim());
        if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || /^[\d.]+$/.test(url.hostname) || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)) return "";
        return url.href;
      } catch {
        return "";
      }
    }
    function productText(value) {
      return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&#x([\da-f]+);/gi, (_, n) => {
        const cp = parseInt(n, 16);
        return cp <= 1114111 ? String.fromCodePoint(cp) : "";
      }).replace(/&#(\d+);/g, (_, n) => Number(n) <= 1114111 ? String.fromCodePoint(Number(n)) : "").replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " })[n]).replace(/\s+/g, " ").trim().slice(0, 2e3);
    }
    function productFromURL2(value) {
      const valid = productPublicURL(value);
      if (!valid) throw Error("Collez un lien https vers une fiche produit.");
      const url = new URL(valid), host = url.hostname.replace(/^www\./, "");
      let name = "", brand = "", supplier = "";
      const segments = url.pathname.split("/").filter(Boolean).map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      });
      if (host === "asos.com") {
        supplier = "ASOS";
        const index = segments.indexOf("prd");
        if (index >= 2) {
          brand = segments[index - 2].replace(/-/g, " ");
          const slug = segments[index - 1];
          const prefix = segments[index - 2] + "-";
          name = (slug.startsWith(prefix) ? slug.slice(prefix.length) : slug).replace(/-/g, " ");
        }
      } else {
        const shops2 = { "zara.com": "Zara", "hm.com": "H&M", "mango.com": "Mango", "arket.com": "Arket", "cos.com": "COS", "uniqlo.com": "Uniqlo", "sezane.com": "S\xE9zane" };
        supplier = shops2[host] || "";
        const slug = segments.at(-1)?.replace(/\.(html?|aspx)$/i, "") || "";
        if (slug.includes("-") && !/^\d+$/.test(slug)) name = slug.replace(/-/g, " ");
      }
      name = name ? name[0].toLocaleUpperCase("fr") + name.slice(1) : "";
      if (brand && !/^\d+$/.test(brand)) brand = brand.split(" ").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
      return { url: valid, name, brand, supplier, description: "", price: null, currency: "", images: [], source: "url", notice: "Propositions d\xE9duites du lien : nom et marque \xE0 v\xE9rifier. Aucun prix ni photo r\xE9cup\xE9r\xE9." };
    }
    function parseProductHTML2(html, url) {
      const result = productFromURL2(url), meta = {};
      for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        const attrs = {};
        for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
        const key = attrs.property || attrs.name;
        if (key && attrs.content) meta[key.toLowerCase()] = productText(attrs.content);
      }
      const products = [];
      function collect(node, depth = 0) {
        if (!node || depth > 12) return;
        if (Array.isArray(node)) {
          node.forEach((x) => collect(x, depth + 1));
          return;
        }
        if (typeof node !== "object") return;
        const type = [node["@type"]].flat();
        if (type.includes("Product")) products.push(node);
        if (node["@graph"]) collect(node["@graph"], depth + 1);
        if (node.mainEntity) collect(node.mainEntity, depth + 1);
      }
      for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) if (/type\s*=\s*["']application\/ld\+json["']/i.test(script[1])) {
        try {
          collect(JSON.parse(script[2]));
        } catch {
        }
      }
      const product = products[0], offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
      if (new URL(result.url).hostname.replace(/^www\./, "") === "asos.com") {
        const id = Number(new URL(result.url).pathname.match(/\/prd\/(\d+)/)?.[1]);
        const stock = html.match(/stockPriceResponse\s*=\s*'([^']+)'/);
        if (stock) {
          try {
            const row = JSON.parse(stock[1]).find((x) => x.productId === id);
            const amount = row?.productPrice?.current?.value;
            if (typeof amount === "number" && amount >= 0 && Number.isFinite(amount)) {
              result.price = amount;
              result.currency = String(row.productPrice.currency || "");
            }
          } catch {
          }
        }
      }
      const cleanName = productText(product?.name || meta["og:title"] || "").replace(/\s*[|–]\s*ASOS\s*$/i, "");
      if (cleanName) result.name = cleanName;
      const brand = productText(typeof product?.brand === "string" ? product.brand : product?.brand?.name);
      if (brand) result.brand = brand;
      result.description = productText(product?.description || meta["og:description"] || meta.description || "");
      const price = String(offer?.price ?? meta["product:price:amount"] ?? "").replace(",", ".");
      if (/^\d+(\.\d{1,2})?$/.test(price) && Number.isFinite(Number(price))) {
        result.price = Number(price);
        result.currency = String(offer?.priceCurrency || meta["product:price:currency"] || "").toUpperCase();
      }
      const rawImages = [...[product?.image].flat().filter(Boolean), meta["og:image"]].flat();
      for (const item of rawImages) {
        let image = typeof item === "string" ? item : item?.url || item?.contentUrl;
        if (!image) continue;
        try {
          image = new URL(image, result.url).href;
        } catch {
          continue;
        }
        image = productPublicURL(image);
        if (image && !result.images.includes(image)) result.images.push(image);
        if (result.images.length >= 8) break;
      }
      if (product || cleanName || result.images.length) {
        result.source = product ? "product-data" : "page";
        result.notice = "Informations publi\xE9es par la boutique. V\xE9rifiez la variante, le prix et le fournisseur avant enregistrement.";
      }
      return result;
    }
    if (typeof module !== "undefined") module.exports = { productPublicURL, productText, productFromURL: productFromURL2, parseProductHTML: parseProductHTML2 };
  }
});

// product-import/fetch-product.mjs
var import_product_import_model = __toESM(require_product_import_model(), 1);
var { parseProductHTML, productFromURL } = import_product_import_model.default;
var shops = /* @__PURE__ */ new Set(["asos.com", "www.asos.com", "www.zara.com", "www2.hm.com", "www.mango.com", "shop.mango.com", "www.arket.com", "www.cos.com", "www.uniqlo.com", "www.sezane.com"]);
async function fetchProduct(value, request = fetch) {
  const fallback = productFromURL(value);
  let url = new URL(fallback.url);
  url.hash = "";
  if (!shops.has(url.hostname)) return { ...fallback, notice: fallback.notice + " Cette boutique n\u2019est pas encore prise en charge pour la lecture compl\xE8te." };
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      if (!shops.has(url.hostname) || url.protocol !== "https:" || url.port || url.username || url.password) throw Error("Destination refus\xE9e.");
      const response = await request(url.href, { redirect: "manual", signal: AbortSignal.timeout(1e4), headers: { Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw Error("Redirection sans destination.");
        await response.body?.cancel();
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
        await response.body?.cancel();
        throw Error("Page inaccessible.");
      }
      const reader = response.body.getReader();
      let length = 0;
      const chunks = [];
      while (true) {
        const { done, value: value2 } = await reader.read();
        if (done) break;
        length += value2.length;
        if (length > 2e6) {
          await reader.cancel();
          throw Error("Page trop volumineuse.");
        }
        chunks.push(value2);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const html = new TextDecoder().decode(bytes);
      return parseProductHTML(html, fallback.url);
    }
    throw Error("Trop de redirections.");
  } catch {
    return { ...fallback, notice: fallback.notice + " La boutique n\u2019a pas permis la lecture de sa page. Vous pouvez importer une capture \xE0 la place." };
  }
}

// supabase/functions/product-import/entry.ts
var origins = /* @__PURE__ */ new Set(["https://jdsforeal.github.io", "http://127.0.0.1:5173", "http://localhost:5173"]);
var limits = /* @__PURE__ */ new Map();
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", ...origins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin)) return reply(403, { error: "Origine non autoris\xE9e." });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "M\xE9thode refus\xE9e." });
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Connexion Atelier requise." });
  try {
    const auth = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { Authorization: authorization, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" }, signal: AbortSignal.timeout(6e3) });
    if (!auth.ok) return reply(401, { error: "Reconnectez votre compte Atelier." });
    const user = await auth.json();
    if (!user.id) return reply(401, { error: "Compte incorrect." });
    const now = Date.now();
    for (const [id, rate2] of limits) if (now - rate2.start > 6e4) limits.delete(id);
    const rate = limits.get(user.id) || { start: now, count: 0 };
    limits.set(user.id, rate);
    if (++rate.count > 15 || limits.size > 2e3) return reply(429, { error: "Trop de demandes. R\xE9essayez dans une minute." });
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: "Lien manquant." });
    let body = "", size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2e4) {
        await reader.cancel();
        return reply(413, { error: "Lien trop long." });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const data = await fetchProduct(JSON.parse(body).url);
    return reply(200, data);
  } catch {
    return reply(400, { error: "Impossible de lire ce lien produit." });
  }
});
