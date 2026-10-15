const assert = require("node:assert/strict");
const {
  studioSection,
  quickPieceAction,
  suggestProductCrop,
} = require("../public/studio-model.js");
const p = { status: "Retours" },
  x = {
    mode: "Prêt",
    status: "Reçu",
    received: "2026-10-12",
    returnDue: "2026-10-20",
  };
assert.equal(studioSection(x, p, "À retourner", "2026-10-15"), true);
assert.equal(studioSection(x, p, "Stock du studio"), false);
assert.throws(() => quickPieceAction(x, "stock"));
quickPieceAction(x, "dispatch", "2026-10-15");
assert.equal(x.status, "Retour en cours");
quickPieceAction(x, "returned", "2026-10-16");
assert.equal(studioSection(x, p, "À retourner"), false);
assert.equal(studioSection(x, p, "Restituées"), true);
assert.equal(x.returned, "2026-10-16");
quickPieceAction(x, "reopen");
assert.equal(x.returned, undefined);
const y = { mode: "Achat" };
quickPieceAction(y, "stock");
assert.equal(studioSection(y, p, "Stock du studio"), true);
const pixels = new Uint8ClampedArray(100 * 100 * 4).fill(255);
for (let y = 25; y < 75; y++)
  for (let x = 35; x < 65; x++) {
    const i = (y * 100 + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
  }
const crop = suggestProductCrop(pixels, 100, 100);
assert(crop.w < 0.5 && crop.h < 0.7 && crop.x >= 0 && crop.x + crop.w <= 1);
console.log(
  "Stock distinct des prêts, retours synchronisés, correction et cadrage conservateur : OK.",
);
