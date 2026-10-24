/* =========================================================
   TTFC Check-in: the service worker's version (build time only:
   vite.config.js ttfcDeskPwa and src/checkin/sw.test.mjs; never in the
   app's own JS).
   The version names the worker's cache (ttfc-checkin-shell-<version>) and
   is written into sw.js, so it must change whenever anything an
   installed device gets from the worker changes:
   • the files it precaches (hashed JS/CSS names),
   • the page itself (desk/index.html as built): a change only to the
     page would otherwise leave sw.js byte-identical, and with the page
     served from the cache, installed devices would never get it,
   • the worker's own code (src/checkin/sw.js, the template): a change
     only to it would otherwise install into the running version's
     cache, not atomically beside it,
   • the manifest and the icons (same file names, new contents).
========================================================= */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

/** → 12 hex characters. Every part counts, in order; a part is a string or bytes (Buffer / Uint8Array). */
export function deskSwVersion({ files = [], page = "", template = "", manifest = "", icons = [] } = {}) {
  const h = createHash("sha256");
  const part = (name, v) => { h.update(`\0${name}\0`); h.update(typeof v === "string" ? v : Buffer.from(v || "")); };
  part("files", files.join("\n"));
  part("page", page);
  part("template", template);
  part("manifest", manifest);
  icons.forEach((b, i) => part(`icon${i}`, b));
  return h.digest("hex").slice(0, 12);
}
