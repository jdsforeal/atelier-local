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
    function productTaxEvidence(text, specification = {}) {
      const clean = productText(String(text).slice(0, 3e4)), normal = clean.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      const ht = /\b(?:htva|ht|hors taxes|hors tva|excl(?:uding)?\.?\s*(?:vat|tax)|prix\s+ht)\b/.test(normal);
      const ttc = /\b(?:tvac|ttc|tva (?:comprise|incluse)|(?:incl(?:uding)?\.?\s*(?:vat|tax))|taxes comprises)\b/.test(normal);
      const included = specification?.valueAddedTaxIncluded;
      const structured = typeof included === "boolean" ? included ? "TTC" : "HT" : "unknown";
      const visible = ht === ttc ? "unknown" : ht ? "HT" : "TTC";
      const basis = structured !== "unknown" && visible !== "unknown" && structured !== visible ? "unknown" : structured !== "unknown" ? structured : visible;
      const rates = [...normal.matchAll(/\b(?:tva|vat|btw)\s*(?:de|a|at|:)?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1].replace(",", ".")));
      for (const m of normal.matchAll(/\b(\d{1,2}(?:[.,]\d+)?)\s*%\s*(?:de\s+)?(?:tva|vat|btw)\b/g)) rates.push(Number(m[1].replace(",", ".")));
      const unique = [...new Set(rates)];
      const rate = unique.length === 1 ? unique[0] : null;
      const reverse = /autoliquidation|reverse charge/.test(normal);
      return { basis: reverse ? "unknown" : basis, rate: reverse ? null : rate, confirmed: false, excerpt: ht || ttc || unique.length || reverse ? clean.slice(0, 500) : "", reverse, conflict: ht && ttc || unique.length > 1 || structured !== "unknown" && visible !== "unknown" && structured !== visible };
    }
    function productTaxVisibleText(html) {
      return String(html).replace(/<(script|style|header|footer|nav|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").split(/<\/(?:p|div|li|span)>|<br\s*\/?\s*>/i).map(productText).filter((t) => t.length < 350 && !/livraison|shipping|frais de port|delivery/i.test(t) && /\b(?:htva|ht|tvac|ttc|tva|vat|hors taxes|taxes comprises|autoliquidation|reverse charge)\b/i.test(t)).slice(0, 6).join(" ");
    }
    var PRODUCT_SHOPS = [
      { hosts: ["ghbass-eu.com", "www.ghbass-eu.com"], name: "G.H.BASS", ownBrand: true },
      { hosts: ["lottusse.com", "www.lottusse.com"], name: "Lottusse", ownBrand: true },
      { hosts: ["prada.com", "www.prada.com"], name: "Prada", ownBrand: true },
      { hosts: ["asos.com", "www.asos.com"], name: "ASOS", ownBrand: false },
      { hosts: ["zalando.fr", "www.zalando.fr", "zalando.be", "www.zalando.be", "fr.zalando.be", "nl.zalando.be", "zalando.de", "www.zalando.de", "zalando.nl", "www.zalando.nl"], name: "Zalando", ownBrand: false },
      { hosts: ["chanel.com", "www.chanel.com"], name: "Chanel", ownBrand: true },
      { hosts: ["mango.com", "www.mango.com", "shop.mango.com"], name: "Mango", ownBrand: true },
      { hosts: ["hm.com", "www.hm.com", "www2.hm.com"], name: "H&M", ownBrand: true },
      { hosts: ["zara.com", "www.zara.com"], name: "Zara", ownBrand: true },
      { hosts: ["uniqlo.com", "www.uniqlo.com"], name: "Uniqlo", ownBrand: true },
      { hosts: ["sezane.com", "www.sezane.com"], name: "S\xE9zane", ownBrand: true },
      { hosts: ["massimodutti.com", "www.massimodutti.com"], name: "Massimo Dutti", ownBrand: true },
      { hosts: ["maje.com", "www.maje.com", "fr.maje.com", "be.maje.com"], name: "Maje", ownBrand: true },
      { hosts: ["cos.com", "www.cos.com"], name: "COS", ownBrand: true },
      { hosts: ["arket.com", "www.arket.com"], name: "Arket", ownBrand: true }
    ];
    function productShop2(value) {
      try {
        return PRODUCT_SHOPS.find((shop) => shop.hosts.includes(new URL(value).hostname));
      } catch {
        return void 0;
      }
    }
    function productFromURL2(value) {
      const valid = productPublicURL(value);
      if (!valid) throw Error("Collez un lien https vers une fiche produit.");
      const url = new URL(valid), host = url.hostname.replace(/^www\./, "");
      const shop = productShop2(valid);
      let name = "", brand = shop?.ownBrand ? shop.name : "", supplier = shop?.name || "";
      const segments = url.pathname.split("/").filter(Boolean).map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      });
      if (host === "asos.com") {
        const index = segments.indexOf("prd");
        if (index >= 2) {
          brand = segments[index - 2].replace(/-/g, " ");
          const slug = segments[index - 1];
          const prefix = segments[index - 2] + "-";
          name = (slug.startsWith(prefix) ? slug.slice(prefix.length) : slug).replace(/-/g, " ");
        }
      } else {
        const productIndex = segments.indexOf("product");
        let slug = productIndex >= 0 ? segments[productIndex + 1] || "" : segments.at(-1) || "";
        if (shop?.name === "Prada") slug = segments[segments.indexOf("p") + 1] || "";
        if (shop?.name === "Lottusse") slug = slug.replace(/-[A-Z]{2}\d+-\d+$/i, "");
        if (shop?.name === "Mango") slug = [...segments].reverse().find((s) => s.includes("-")) || "";
        slug = slug.replace(/\.(html?|aspx)$/i, "").replace(/-(?:p\d{6,}|l\d{6,}|[a-z0-9]{8,}-[a-z0-9]{3})$/i, "");
        if (slug.includes("-") && !/^\d+$/.test(slug) && !/^(?:productpage\.|[a-z]+\d)/i.test(slug)) name = slug.replace(/-/g, " ");
      }
      name = name ? name[0].toLocaleUpperCase("fr") + name.slice(1) : "";
      if (brand && !/^\d+$/.test(brand)) brand = brand.split(" ").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
      return { url: valid, name, brand, supplier, description: "", price: null, currency: "", images: [], source: "url", notice: "Propositions d\xE9duites du lien : nom et marque \xE0 v\xE9rifier. Aucun prix ni photo r\xE9cup\xE9r\xE9." };
    }
    function productAssignedJSON(html, marker) {
      const start = html.indexOf(marker);
      if (start < 0) return null;
      const eq = html.indexOf("=", start + marker.length);
      if (eq < 0 || eq - start > marker.length + 10) return null;
      let first = eq + 1;
      while (/\s/.test(html[first] || "") && first < html.length) first++;
      if (html[first] !== "{") return null;
      let depth = 0, quoted = false, escaped = false;
      for (let i = first; i < html.length; i++) {
        const c = html[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === '"') quoted = false;
          continue;
        }
        if (c === '"') quoted = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) {
          try {
            return JSON.parse(html.slice(first, i + 1));
          } catch {
            return null;
          }
        }
      }
      return null;
    }
    function productJSON(text) {
      const raw = text.trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
      try {
        return JSON.parse(raw);
      } catch {
        return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, "&"));
      }
    }
    function productSchemaType(node, type) {
      return [node?.["@type"]].flat().some((value) => typeof value === "string" && value.split(/[\/#]/).at(-1) === type);
    }
    function productURLKey(value, base) {
      try {
        const u = new URL(value, base);
        return u.origin + u.pathname.replace(/\/$/, "");
      } catch {
        return "";
      }
    }
    function productOffer(offers, url) {
      const aggregate = productSchemaType(offers, "AggregateOffer") ? offers : null;
      const all = [offers].flat().filter(Boolean).flatMap((o) => productSchemaType(o, "AggregateOffer") ? [o.offers].flat().filter(Boolean) : [o]).map((o) => o.itemOffered ? { ...o.itemOffered.offers, url: o.itemOffered.url } : o);
      if (!all.length && aggregate && aggregate.lowPrice === aggregate.highPrice) return { price: aggregate.lowPrice, priceCurrency: aggregate.priceCurrency };
      const exact = all.find((o) => {
        try {
          return o.url && new URL(o.url, url).href === url;
        } catch {
          return false;
        }
      });
      if (exact) return exact;
      const unique = new Set(all.map((o) => String(o.price ?? o.priceSpecification?.price) + ":" + String(o.priceCurrency ?? o.priceSpecification?.priceCurrency)));
      return unique.size === 1 ? all[0] : void 0;
    }
    function parseProductHTML2(html, url) {
      const result = productFromURL2(url), meta = {};
      for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
        const attrs = {};
        for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
        const key2 = attrs.property || attrs.name;
        if (key2 && attrs.content) meta[key2.toLowerCase()] = productText(attrs.content);
      }
      const products = [], schemaImages = [];
      function collect(node, depth = 0) {
        if (!node || depth > 12) return;
        if (Array.isArray(node)) {
          node.forEach((x) => collect(x, depth + 1));
          return;
        }
        if (typeof node !== "object") return;
        if (productSchemaType(node, "ImageObject")) schemaImages.push(node);
        if (productSchemaType(node, "Product") || productSchemaType(node, "ProductGroup")) products.push(node);
        if (node["@graph"]) collect(node["@graph"], depth + 1);
        if (node.mainEntity) collect(node.mainEntity, depth + 1);
      }
      for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) if (/type\s*=\s*["']application\/ld\+json["']/i.test(script[1])) {
        try {
          collect(productJSON(script[2]));
        } catch {
        }
      }
      const key = productURLKey(url, url);
      let product = products.find((p) => productURLKey(p.url || p["@id"], url) === key) || (products.length === 1 ? products[0] : void 0);
      let ambiguousPrice = false;
      if (productSchemaType(product, "ProductGroup")) {
        const variants = [product.hasVariant].flat().filter((v) => v && typeof v === "object" && productURLKey(v.url || v["@id"], url) === key);
        const requested = new URL(url).searchParams.get("size");
        const variant = requested ? variants.find((v) => String(v.size) === requested) : variants.find((v) => /\/InStock$/.test(v.offers?.availability || "")) || variants[0];
        const prices = new Set(variants.map((v) => JSON.stringify([v.offers?.price, v.offers?.priceCurrency])));
        ambiguousPrice = requested ? !variant : prices.size > 1;
        product = { ...product, ...variant, brand: variant?.brand || product.brand, image: variant?.image || product.image, offers: requested ? variant?.offers : prices.size === 1 ? variant?.offers : product.offers };
      }
      const offer = productOffer(product?.offers, url);
      const title = productText(meta["og:title"] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
      if (/^(access denied|just a moment|robot|security check|vercel security|page not found|404|page introuvable|enable javascript|attention required)/i.test(title)) return { ...result, reason: "blocked", notice: "La boutique bloque la lecture automatique. Les propositions viennent seulement du lien. Ajoutez une capture pour compl\xE9ter." };
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
      if (!product && /\/(?:c|collection|collections|catalogue-par-produit)\/|-[ln]\d+\.html(?:$|\?)/i.test(url)) return { ...result, reason: "not-product", name: "", notice: "Ce lien semble ouvrir une collection, pas une fiche produit. Ouvrez un article pr\xE9cis et copiez son lien." };
      const cleanName = productText(product?.name || meta["og:title"] || "").replace(/\s*(?:[|–]\s*(?:ASOS|UNIQLO.*|ZARA.*|Maje.*)|-\s*ZALANDO\.[A-Z]+)\s*$/i, "");
      if (cleanName) result.name = cleanName;
      const brand = productText(typeof product?.brand === "string" ? product.brand : product?.brand?.name);
      if (brand) result.brand = brand;
      result.description = productText(product?.description || meta["og:description"] || meta.description || "");
      const price = String(offer?.price ?? offer?.priceSpecification?.price ?? (ambiguousPrice ? "" : meta["product:price:amount"] ?? meta["og:price:amount"]) ?? "").replace(",", ".");
      if (/^\d+(\.\d{1,2})?$/.test(price) && Number.isFinite(Number(price))) {
        result.price = Number(price);
        result.currency = String(offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || meta["product:price:currency"] || meta["og:price:currency"] || "").toUpperCase();
      }
      let gallery = [];
      if (new URL(result.url).hostname.replace(/^www\./, "") === "asos.com") {
        const match = html.match(/window\.asos\.pdp\.config\.product\s*=\s*(\{"productCode"[^\n]+?\})\s*;/);
        if (match) {
          try {
            const detail = JSON.parse(match[1]);
            const id = Number(new URL(result.url).pathname.match(/\/prd\/(\d+)/)?.[1]);
            const colour = Number(new URL(result.url).hash.match(/colourWayId-(\d+)/)?.[1]);
            if (detail.id === id) gallery = (detail.images || []).filter((image) => image.productId === id && image.isVisible !== false && (!colour || !image.colourWayId || image.colourWayId === colour) && /^https:\/\/images\.asos-media\.com\/products\//.test(image.url)).map((image) => image.url);
          } catch {
          }
        }
      }
      if (productShop2(url)?.name === "Uniqlo") {
        const state = productAssignedJSON(html, "window.__PRELOADED_STATE__");
        const id = new URL(url).pathname.match(/\/products\/(E\d+-\d+)/)?.[1];
        const detail = Object.values(state?.entity?.pdpEntity || {}).map((x) => x.product).find((p) => p?.productId === id);
        if (detail) {
          const requested = new URL(url).searchParams.get("colorDisplayCode");
          const colour = requested || detail.representative?.color?.displayCode;
          const main = detail.images?.main?.[colour];
          gallery = [main?.image, ...(main?.model || []).map((x) => typeof x === "string" ? x : x.image || x.imageUrl)].filter(Boolean);
          if (requested && !main) gallery = [];
          result.name = productText(detail.name) || result.name;
          result.brand = "Uniqlo";
          result.description = productText([detail.shortDescription, detail.longDescription, detail.composition].filter(Boolean).join(" "));
          const current = detail.prices?.promo || detail.prices?.base;
          if (typeof current?.value === "number" && Number.isFinite(current.value) && current.value >= 0) {
            result.price = current.value;
            result.currency = String(current.currency?.code || "");
          }
          if (gallery.length || requested) delete meta["og:image"];
          product = detail;
        }
      }
      if (productShop2(url)?.name === "G.H.BASS") {
        const primary = product?.image;
        let reference = "";
        try {
          reference = new URL(typeof primary === "string" ? primary : primary?.[0], url).pathname.split("/").at(-1)?.split("-").slice(0, 2).join("-") || "";
        } catch {
        }
        for (const match of html.matchAll(/<li\b[^>]*data-product-slider-nav=["']\d+["'][^>]*>([\s\S]*?)<\/li>/gi)) {
          const src = match[1].match(/<img\b[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
          if (!src || !reference) continue;
          try {
            const asset = new URL(src.replace(/&amp;/g, "&"), url);
            if (asset.hostname === "www.ghbass-eu.com" && asset.pathname.split("/").at(-1).startsWith(reference + "-")) {
              ["width", "height", "crop"].forEach((k) => asset.searchParams.delete(k));
              gallery.push(asset.href);
            }
          } catch {
          }
        }
      }
      if (productShop2(url)?.name === "Lottusse") {
        const next = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
        try {
          const props = JSON.parse(next?.[1] || "{}").props?.pageProps;
          const id = props?.pageProps?.pageInfo?.productId;
          const slug = props?.pageProps?.pageInfo?.slug;
          const detail = Object.values(props?.fallback || {}).find((p) => p?.id === id && p.images);
          if (id && new URL(slug, url).pathname === new URL(url).pathname && detail) gallery = detail.images.map((image) => image.src).filter((src) => typeof src === "string" && new URL(src, url).hostname === "cloud.lottusse.com" && new URL(src, url).pathname.includes("/" + id + "_"));
        } catch {
        }
      }
      if (productShop2(url)?.name === "Prada") {
        const id = new URL(url).pathname.split("/").filter(Boolean).at(-1);
        gallery = schemaImages.map((image) => image.contentUrl || image.url).filter((src) => typeof src === "string" && src.startsWith("https://www.prada.com/content/dam/pradabkg_products/") && src.split("/").at(-1).startsWith(id + "_"));
        const selected = [...html.matchAll(/<div\b([^>]*kl-variant-name=[^>]*)>\s*<a\b([^>]*)>/gi)].find((m) => {
          const href = m[2].match(/href="([^"]+)"/)?.[1];
          return /aria-current="true"/.test(m[2]) && href && productURLKey(href, url) === productURLKey(url, url);
        });
        if (selected) {
          const amount = selected[1].match(/kl-price="([^"]+)"/)?.[1];
          const currency = selected[1].match(/kl-pricecurrency="([^"]+)"/)?.[1];
          if (currency === "\u20AC" && /^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(amount || "")) {
            result.price = Number(amount.replace(/\./g, "").replace(",", "."));
            result.currency = "EUR";
          }
        }
      }
      if (productShop2(url)?.ownBrand) result.brand = productShop2(url).name;
      const rawImages = gallery.length && ["Prada", "G.H.BASS", "Lottusse"].includes(productShop2(url)?.name) ? gallery : [...gallery, ...[product?.image].flat().filter(Boolean), meta["og:image"]].flat();
      const imageKeys = /* @__PURE__ */ new Set();
      for (const item of rawImages) {
        let image = typeof item === "string" ? item : item?.url || item?.contentUrl;
        if (!image) continue;
        try {
          image = new URL(image, result.url).href;
        } catch {
          continue;
        }
        image = productPublicURL(image);
        if (image) {
          const asset = new URL(image);
          let key2 = image;
          if (asset.hostname === "www.ghbass-eu.com") {
            ["width", "height", "crop"].forEach((k) => asset.searchParams.delete(k));
            key2 = asset.href;
          } else if (asset.hostname === "img01.ztat.net") {
            asset.searchParams.delete("imwidth");
            key2 = asset.href;
          } else if (/\.maje\.com$/.test(asset.hostname)) key2 = asset.pathname.replace(/^.*?\/on\//, "/on/");
          if (!imageKeys.has(key2)) {
            imageKeys.add(key2);
            result.images.push(image);
          }
        }
        if (result.images.length >= 8) break;
      }
      if (product || cleanName || result.images.length) {
        result.source = product ? "product-data" : "page";
        result.notice = "Informations publi\xE9es par la boutique. V\xE9rifiez la variante, le prix et le fournisseur avant enregistrement.";
      }
      if (result.source === "url") result.reason = "no-product-data";
      else if (!result.name || !result.images.length || result.price === null) {
        result.reason = "partial";
        result.notice = "Lecture partielle : certaines informations ne sont pas publi\xE9es ou accessibles. Compl\xE9tez les champs manquants et v\xE9rifiez la variante.";
      }
      result.taxEvidence = productTaxEvidence(productTaxVisibleText(html), offer?.priceSpecification);
      return result;
    }
    if (typeof module !== "undefined") module.exports = { productTaxEvidence, productTaxVisibleText, PRODUCT_SHOPS, productShop: productShop2, productPublicURL, productText, productFromURL: productFromURL2, parseProductHTML: parseProductHTML2 };
  }
});

// product-import/fetch-product.mjs
var import_product_import_model = __toESM(require_product_import_model(), 1);
var { parseProductHTML, productFromURL, productShop } = import_product_import_model.default;
async function fetchProduct(value, request = fetch) {
  const fallback = productFromURL(value);
  let url = new URL(fallback.url);
  url.hash = "";
  let reason = "network";
  if (!productShop(url)) return { ...fallback, reason: "unsupported-shop", notice: fallback.notice + " Cette boutique n\u2019est pas encore prise en charge pour la lecture compl\xE8te. Vous pouvez ajouter une capture." };
  try {
    const signal = AbortSignal.timeout(12e3);
    for (let redirects = 0; redirects < 4; redirects++) {
      if (!productShop(url) || url.protocol !== "https:" || url.port || url.username || url.password) {
        reason = "redirect-refused";
        throw Error("Destination refus\xE9e.");
      }
      const response = await request(url.href, { redirect: "manual", signal, headers: { Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw Error("Redirection sans destination.");
        await response.body?.cancel();
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
        reason = [403, 429].includes(response.status) ? "blocked" : [404, 410].includes(response.status) ? "unavailable" : "network";
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
        if (length > 3e6) {
          reason = "too-large";
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
      const data = parseProductHTML(html, fallback.url);
      if (data.source === "url" && data.reason === "no-product-data") data.notice = "La page ne fournit pas de fiche produit exploitable au lecteur (page dynamique ou article retir\xE9). Seules les informations du lien sont propos\xE9es. Ajoutez une capture pour compl\xE9ter.";
      return data;
    }
    throw Error("Trop de redirections.");
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") reason = "timeout";
    const notices = { blocked: "La boutique bloque la lecture automatique.", unavailable: "Cet article est introuvable ou retir\xE9 de la boutique.", timeout: "La boutique met trop de temps \xE0 r\xE9pondre.", "redirect-refused": "Le lien redirige vers une destination non prise en charge.", "too-large": "La page d\xE9passe la taille de lecture autoris\xE9e.", network: "La boutique est momentan\xE9ment inaccessible au lecteur." };
    return { ...fallback, reason, notice: (notices[reason] || notices.network) + " Les propositions viennent seulement du lien ; aucun prix ni photo r\xE9cup\xE9r\xE9. Vous pouvez importer une capture \xE0 la place." };
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
