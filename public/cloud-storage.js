/** Images privées immuables ; les documents ne conservent jamais une URL signée temporaire. */
const cloudAssetSources = new Map();
async function cloudExternalize(value, client, studioId, projectId) {
  if (typeof value === "string") {
    const ref = cloudAssetSources.get(value) || value;
    if (ref.startsWith("atelier-asset:")) {
      const path = ref.slice(14),
        prefix = studioId + "/" + (projectId || "global") + "/";
      if (path.startsWith(prefix)) return ref;
      const signed = await client.storage
        .from("atelier-private")
        .createSignedUrl(path, 60);
      if (signed.error) throw signed.error;
      const response = await fetch(signed.data.signedUrl);
      if (!response.ok) throw Error("Image privée inaccessible.");
      const blob = await response.blob();
      const encoded = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      return cloudExternalize(encoded, client, studioId, projectId);
    }
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(value)) return value;
    const blob = await (await fetch(value)).blob();
    if (blob.size > 10 * 1024 * 1024)
      throw Error(
        "Une image dépasse 10 Mo. Réduisez-la avant synchronisation.",
      );
    const bytes = await blob.arrayBuffer();
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[blob.type];
    const path =
      studioId + "/" + (projectId || "global") + "/" + hash + "." + ext;
    const { error } = await client.storage
      .from("atelier-private")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (
      error &&
      !["409", "Duplicate"].includes(String(error.statusCode)) &&
      !/already exists|duplicate/i.test(error.message)
    )
      throw error;
    return "atelier-asset:" + path;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value)
      out.push(await cloudExternalize(item, client, studioId, projectId));
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value))
      out[k] = await cloudExternalize(v, client, studioId, projectId);
    return out;
  }
  return value;
}
async function cloudResolveAssets(value, client) {
  const paths = new Set();
  const walk = (x) => {
    if (typeof x === "string" && x.startsWith("atelier-asset:"))
      paths.add(x.slice(14));
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  };
  walk(value);
  const map = new Map();
  if (paths.size) {
    const { data, error } = await client.storage
      .from("atelier-private")
      .createSignedUrls([...paths], 3600);
    if (error) throw error;
    for (const row of data || []) {
      if (row.signedUrl) {
        map.set("atelier-asset:" + row.path, row.signedUrl);
        cloudAssetSources.set(row.signedUrl, "atelier-asset:" + row.path);
      }
    }
  }
  const replace = (x) => {
    if (typeof x === "string") return map.get(x) || x;
    if (Array.isArray(x)) return x.map(replace);
    if (x && typeof x === "object")
      return Object.fromEntries(
        Object.entries(x).map(([k, v]) => [k, replace(v)]),
      );
    return x;
  };
  return replace(value);
}
