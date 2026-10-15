/** Document client autonome : une page par look/piste, puis suites de six options. */
async function clientSelectionPages(board) {
  const pages = [];
  const load = (src) =>
    new Promise((resolve) => {
      if (!src) return resolve(null);
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 8000);
      image.src = src;
    });
  const line = (ctx, text, x, y, w) => {
    text = String(text || "");
    while (ctx.measureText(text).width > w && text.length)
      text = text.slice(0, -2) + "…";
    ctx.fillText(text, x, y);
  };
  for (const look of board.looks) {
    const variants = (look.variants || []).filter((v) =>
      look.pieces.some((x) => x.variantId === v.id),
    );
    const groups = variants.length
      ? variants.map((v) => ({
          name: v.name,
          pieces: look.pieces.filter(
            (x) => !x.variantId || x.variantId === v.id,
          ),
        }))
      : [{ name: "Sélection et alternatives", pieces: look.pieces }];
    for (const group of groups)
      for (let start = 0; start < group.pieces.length; start += 6) {
        const c = document.createElement("canvas");
        c.width = 1800;
        c.height = 1273;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#f7f5ef";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#526248";
        ctx.font = "22px Arial";
        line(ctx, "ATELIER / SÉLECTION CLIENT", 65, 55, 1500);
        ctx.fillStyle = "#292d26";
        ctx.font = "48px Georgia";
        line(ctx, look.name, 65, 118, 1600);
        ctx.font = "25px Arial";
        line(ctx, board.name + " · " + group.name, 65, 162, 1600);
        ctx.font = "19px Arial";
        line(
          ctx,
          "Date du projet : " +
            (board.date || "à définir") +
            " · Sélection au " +
            new Date(board.createdAt).toLocaleDateString("fr-FR") +
            " · Disponibilités à confirmer avant réservation",
          65,
          198,
          1680,
        );
        const links = [];
        const batch = group.pieces.slice(start, start + 6);
        const loaded = await Promise.all(batch.map((x) => load(x.image)));
        for (const [i, x] of batch.entries()) {
          const left = 65 + (i % 3) * 565,
            top = 235 + Math.floor(i / 3) * 480,
            w = 540;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(left, top, w, 448);
          const image = loaded[i];
          if (image) {
            const ratio = Math.min(500 / image.width, 290 / image.height);
            ctx.drawImage(
              image,
              left + (w - image.width * ratio) / 2,
              top + 12 + (290 - image.height * ratio) / 2,
              image.width * ratio,
              image.height * ratio,
            );
          } else {
            ctx.fillStyle = "#858579";
            ctx.font = "22px Arial";
            ctx.fillText(
              "Image à ajouter / inaccessible",
              left + 30,
              top + 150,
            );
          }
          ctx.fillStyle = "#526248";
          ctx.font = "17px Arial";
          line(
            ctx,
            (look.needs.find((n) => n.id === x.needId)?.name || "Pièce") +
              " · " +
              (x.selection || "À comparer"),
            left + 20,
            top + 327,
            500,
          );
          ctx.fillStyle = "#292d26";
          ctx.font = "23px Arial";
          line(ctx, x.name, left + 20, top + 361, 500);
          ctx.font = "19px Arial";
          line(
            ctx,
            [x.brand, x.mode, board.showPrices ? euro(x.price) : ""]
              .filter(Boolean)
              .join(" · "),
            left + 20,
            top + 392,
            500,
          );
          line(ctx, x.availability, left + 20, top + 423, 500);
          if (x.url)
            links.push({ url: x.url, x: left, y: top, width: w, height: 448 });
        }
        ctx.fillStyle = "#70756b";
        ctx.font = "18px Arial";
        ctx.fillText(
          "Choix créatif ≠ disponibilité confirmée ≠ acquisition engagée",
          65,
          1230,
        );
        ctx.fillText(String(pages.length + 1), 1695, 1230);
        pages.push({
          jpeg: c.toDataURL("image/jpeg", 0.94),
          width: c.width,
          height: c.height,
          links,
        });
      }
  }
  if (!pages.length)
    throw Error("Ajoutez au moins une pièce visible dans un look.");
  return pages;
}
async function exportClientSelection(board) {
  const blob = moodboardPdf(await clientSelectionPages(board));
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download =
    "Atelier-selection-" + board.name.replace(/[^a-z0-9à-ÿ]+/gi, "-") + ".pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
