/** Document de chiffrage autonome, sans capture de la page de l'application. */
function quoteAmounts(q) {
  const lines = q.lines.map((l) => {
    const qty = Number(l.qty),
      rate = Number(l.rate);
    if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty < 0 || rate < 0)
      throw Error("Vérifiez les quantités et tarifs du devis.");
    return {
      ...l,
      qty,
      rate,
      amount: Math.round((qty * rate + Number.EPSILON) * 100) / 100,
    };
  });
  const subtotal =
    Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
  const raw = q.document?.taxRate;
  const taxRate = raw === undefined || raw === "" ? null : Number(raw);
  if (
    taxRate !== null &&
    (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
  )
    throw Error("Taux de TVA incorrect.");
  const tax = taxRate === null ? null : Math.round(subtotal * taxRate) / 100;
  return {
    lines,
    subtotal,
    taxRate,
    tax,
    total: tax === null ? null : Math.round((subtotal + tax) * 100) / 100,
  };
}
function quoteDocumentSettings() {
  const p = project(),
    q = db.quotes.find((x) => x.project === p.id);
  if (!q) return;
  const d = q.document || {},
    s = db.quoteSettings || {};
  modal(
    "Coordonnées et présentation du devis",
    field("issuer", "Votre entreprise / votre nom", "text", s.issuer || "") +
      field("issuerAddress", "Votre adresse", "textarea", s.address || "") +
      field(
        "issuerEmail",
        "Votre e-mail professionnel",
        "email",
        s.email || "",
      ) +
      field(
        "issuerIdentifier",
        "Identifiant professionnel — facultatif",
        "text",
        s.identifier || db.studioTaxProfile?.vatNumber || "",
      ) +
      field(
        "clientName",
        "Client",
        "text",
        q.qontoPreparation?.client?.name || d.clientName || p.client || "",
      ) +
      field(
        "clientAddress",
        "Adresse du client — facultatif",
        "textarea",
        q.qontoPreparation?.client?.address || d.clientAddress || "",
      ) +
      field(
        "reference",
        "Référence du devis",
        "text",
        d.reference || q.number || "",
      ) +
      field(
        "issued",
        "Date du devis",
        "date",
        d.issued || new Date().toLocaleDateString("en-CA"),
      ) +
      field(
        "validUntil",
        "Valable jusqu’au — facultatif",
        "date",
        d.validUntil || "",
      ) +
      field(
        "taxRate",
        "TVA en % — laisser vide si non déterminée",
        "number",
        d.taxRate ?? "",
      ) +
      field(
        "conditions",
        "Conditions / précisions",
        "textarea",
        d.conditions || "",
      ) +
      '<p class="note">L’export est marqué BROUILLON. Complétez et vérifiez les mentions adaptées à votre activité avant utilisation auprès d’un client.</p>',
    (data) => {
      if (
        data.taxRate !== "" &&
        (!Number.isFinite(Number(data.taxRate)) || Number(data.taxRate) > 100)
      )
        throw Error("Taux de TVA attendu entre 0 et 100 %.");
      if (data.issued && data.validUntil && data.validUntil < data.issued)
        throw Error("La fin de validité doit suivre la date du devis.");
      db.quoteSettings = {
        issuer: data.issuer,
        address: data.issuerAddress,
        email: data.issuerEmail,
        identifier: data.issuerIdentifier,
      };
      if (q.qontoPreparation?.client) {
        const client = q.qontoPreparation.client;
        if (
          client.name !== data.clientName ||
          client.address !== data.clientAddress
        )
          client.confirmed = false;
        client.name = data.clientName;
        client.address = data.clientAddress;
      }
      q.document = {
        clientName: data.clientName,
        clientAddress: data.clientAddress,
        reference: data.reference,
        issued: data.issued,
        validUntil: data.validUntil,
        taxRate: data.taxRate,
        conditions: data.conditions,
      };
    },
  );
  $("#form").elements.taxRate.step = "0.01";
}
function quotePdfPages(p, q, settings = {}) {
  const amounts = quoteAmounts(q),
    d = q.document || {},
    pages = [];
  const W = 1240,
    H = 1754,
    M = 85;
  let c, ctx, y;
  const font = (size = 22, bold = false) => {
    ctx.font = `${bold ? "600" : "400"} ${size}px Arial`;
  };
  function text(value, x, top, size = 22, bold = false, align = "left") {
    font(size, bold);
    ctx.textAlign = align;
    ctx.fillStyle = "#293026";
    ctx.fillText(String(value ?? ""), x, top);
    ctx.textAlign = "left";
  }
  function wrap(value, width, size = 22) {
    font(size);
    const result = [];
    for (const paragraph of String(value || "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        let rest = word;
        while (ctx.measureText(rest).width > width) {
          if (line) {
            result.push(line);
            line = "";
          }
          let part = "";
          for (const ch of rest) {
            if (ctx.measureText(part + ch).width > width) break;
            part += ch;
          }
          if (!part) part = rest[0];
          result.push(part);
          rest = rest.slice(part.length);
        }
        if (ctx.measureText(line + (line ? " " : "") + rest).width > width) {
          result.push(line);
          line = rest;
        } else line += (line ? " " : "") + rest;
      }
      result.push(line);
    }
    return result;
  }
  function rule(top) {
    ctx.strokeStyle = "#dce0d5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M, top);
    ctx.lineTo(W - M, top);
    ctx.stroke();
  }
  function paragraph(value, x, top, width, size = 22, maxLines = 100) {
    const lines = wrap(value, width, size).slice(0, maxLines);
    lines.forEach((line, i) => text(line, x, top + i * (size + 9), size));
    return top + lines.length * (size + 9);
  }
  function tableHead() {
    ctx.fillStyle = "#eceee6";
    ctx.fillRect(M, y - 28, W - 2 * M, 55);
    text("DÉSIGNATION", M + 15, y, 18, true);
    text("QTÉ", 790, y, 18, true, "right");
    text("TARIF HT", 970, y, 18, true, "right");
    text("MONTANT HT", W - M - 15, y, 18, true, "right");
    y += 64;
  }
  function page(first = false, withTable = true) {
    if (c) finish();
    c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    text("atelier", M, 100, 47, true);
    text("DEVIS · BROUILLON", W - M, 95, 26, true, "right");
    text(
      "Document de travail · à vérifier avant envoi au client",
      W - M,
      127,
      16,
      false,
      "right",
    );
    rule(155);
    y = 208;
    if (first) {
      let end = paragraph(
        settings.issuer || "Émetteur à compléter",
        M,
        y,
        490,
        25,
        12,
      );
      end = paragraph(
        [settings.address, settings.email, settings.identifier]
          .filter(Boolean)
          .join("\n"),
        M,
        end + 12,
        490,
        20,
        18,
      );
      let clientEnd = paragraph(
        d.clientName || p.client || "Client à compléter",
        665,
        y,
        485,
        25,
        12,
      );
      clientEnd = paragraph(
        q.qontoPreparation?.client?.address || d.clientAddress || "",
        665,
        clientEnd + 12,
        485,
        20,
        18,
      );
      y = Math.max(end, clientEnd) + 44;
      y = paragraph(p.name, M, y, W - 2 * M, 30, 12) + 12;
      text(
        `Référence : ${d.reference || q.number || q.id?.slice(0, 8) || "À compléter"} · Version ${q.version || 1}`,
        M,
        y,
        19,
      );
      y += 32;
      text(
        `Date : ${d.issued ? date(d.issued) : date(new Date().toLocaleDateString("en-CA"))}${d.validUntil ? " · Valable jusqu’au " + date(d.validUntil) : ""}`,
        M,
        y,
        19,
      );
      y += 66;
    } else {
      text(`${d.reference || q.number || p.name} · suite`, M, y, 21);
      y += 55;
    }
    if (withTable) tableHead();
    else {
      text("Récapitulatif et conditions", M, y, 24, true);
      y += 55;
    }
  }
  function finish() {
    text(
      `Brouillon · ${d.reference || q.number || q.id?.slice(0, 8) || "Atelier"}`,
      M,
      H - 65,
      17,
    );
    text(`Page ${pages.length + 1}`, W - M, H - 65, 17, false, "right");
    pages.push({
      jpeg: c.toDataURL("image/jpeg", 0.94),
      width: W,
      height: H,
      pointWidth: 595,
      pointHeight: 842,
    });
  }
  page(true);
  for (const line of amounts.lines) {
    const chunks = wrap(line.name || "Ligne sans libellé", 620, 22);
    let first = true;
    while (chunks.length) {
      if (y > 1470) page();
      const count = Math.min(
        chunks.length,
        Math.max(1, Math.floor((1490 - y) / 31)),
      );
      const part = chunks.splice(0, count);
      part.forEach((s, i) => text(s, M + 15, y + i * 31, 22));
      if (first) {
        text(line.qty.toLocaleString("fr-BE"), 790, y, 21, false, "right");
        text(euro(line.rate), 970, y, 21, false, "right");
        text(euro(line.amount), W - M - 15, y, 21, true, "right");
        first = false;
      }
      y += part.length * 31 + 25;
      rule(y - 12);
      y += 20;
      if (chunks.length) page();
    }
  }
  if (y > 1250) page(false, false);
  y += 35;
  text("Total HT", 830, y, 25, true);
  text(euro(amounts.subtotal), W - M - 15, y, 25, true, "right");
  y += 45;
  if (amounts.taxRate === null) {
    text("TVA non renseignée · montant TTC non calculé", M, y, 19);
    y += 40;
  } else {
    text(`TVA (${amounts.taxRate} %)`, 830, y, 22);
    text(euro(amounts.tax), W - M - 15, y, 22, false, "right");
    y += 48;
    text("Total TTC", 830, y, 29, true);
    text(euro(amounts.total), W - M - 15, y, 29, true, "right");
    y += 55;
  }
  y += 30;
  for (const line of wrap(
    d.conditions || "Conditions à compléter avant validation du devis.",
    W - 2 * M,
    20,
  )) {
    if (y > 1510) page(false, false);
    text(line, M, y, 20);
    y += 30;
  }
  y += 25;
  for (const line of wrap(
    "Les cautions du projet ne sont pas ajoutées automatiquement à ce devis. Ce document est un brouillon de chiffrage ; il ne vaut pas validation du client.",
    W - 2 * M,
    17,
  )) {
    if (y > 1530) page(false, false);
    text(line, M, y, 17);
    y += 26;
  }
  finish();
  return pages;
}
const quoteExportRender = render;
render = function () {
  quoteExportRender();
  if (view !== "detail" || tab !== "quote") return;
  const panel = $(".quote-panel");
  if (!panel) return;
  panel.insertAdjacentHTML(
    "afterbegin",
    '<div class="actions"><button class="primary" data-quote-pdf>Prévisualiser le devis</button><button data-quote-settings>Coordonnées et TVA</button></div>',
  );
  const q = db.quotes.find((x) => x.project === pid);
  try {
    const a = quoteAmounts(q);
    panel.querySelector(".quote-total").textContent =
      `Total HT : ${euro(a.subtotal)}${a.total === null ? " · TVA à préciser" : " · TTC : " + euro(a.total)}`;
  } catch {}
};
document.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-quote-settings")) quoteDocumentSettings();
  if (!b.hasAttribute("data-quote-pdf")) return;
  b.disabled = true;
  try {
    const p = project(),
      q = db.quotes.find((x) => x.project === p.id);
    if (!q?.lines?.length) throw Error("Ajoutez au moins une ligne au devis.");
    const pages = quotePdfPages(p, q, db.quoteSettings);
    previewDocument(
      pages,
      `Devis-${p.name.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 70)}-brouillon-v${q.version || 1}.pdf`,
      "Devis · " + p.name,
    );
  } catch (error) {
    toast(error.message);
  } finally {
    b.disabled = false;
  }
});
render();
if (typeof module !== "undefined") module.exports = { quoteAmounts };
