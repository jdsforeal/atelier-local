/** PDF autonome : chaque planche est une image JPEG haute résolution ; liens sources cliquables. */
function moodboardPdf(pages) {
  const encoder = new TextEncoder();
  const bytes = (s) => encoder.encode(s);
  const objects = [];
  const add = (data) => {
    objects.push(typeof data === "string" ? bytes(data) : data);
    return objects.length;
  };
  const concat = (arrays) => {
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
    let offset = 0;
    for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
    }
    return out;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");
  const ids = [];
  for (const page of pages) {
    const pw = page.pointWidth || 842,
      ph = page.pointHeight || 595;
    const raw = atob(page.jpeg.split(",")[1]);
    const jpeg = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const img = add(
      concat([
        bytes(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
        ),
        jpeg,
        bytes("\nendstream"),
      ]),
    );
    const stream = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    const content = add(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    const annotations = (page.links || [])
      .filter((l) => /^https?:\/\//.test(l.url))
      .map((link) => {
        const x = (link.x * pw) / page.width,
          y = ph - ((link.y + link.height) * ph) / page.height;
        const url = encodeURI(link.url).replace(/[\\()]/g, "\\$&");
        return add(
          `<< /Type /Annot /Subtype /Link /Rect [${x} ${y} ${x + (link.width * pw) / page.width} ${y + (link.height * ph) / page.height}] /Border [0 0 0] /A << /S /URI /URI (${url}) >> >>`,
        );
      });
    ids.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R /Annots [${annotations.map((id) => id + " 0 R").join(" ")}] >>`,
      ),
    );
  }
  objects[1] = bytes(
    `<< /Type /Pages /Kids [${ids.map((id) => id + " 0 R").join(" ")}] /Count ${ids.length} >>`,
  );
  const parts = [bytes("%PDF-1.4\n% Atelier moodboard\n")];
  let length = parts[0].length;
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = concat([
      bytes(`${index + 1} 0 obj\n`),
      object,
      bytes("\nendobj\n"),
    ]);
    parts.push(chunk);
    length += chunk.length;
  });
  const xref = length;
  parts.push(
    bytes(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  );
  return new Blob(parts, { type: "application/pdf" });
}
if (typeof module !== "undefined") module.exports = { moodboardPdf };
