/* =========================================================
   Image URLs sized for how they're shown (Oct 24 2026: the
   organiser said scrolling lagged; logos came at up to
   5157×2700 px, and SVG/ICO ones as 512 px PNGs, for tiles
   about 100×35 px). Cloudinary's and Sanity's image
   pipelines send an image no bigger than asked; other hosts
   are left alone. Same rules on iOS (ImageCDN.swift) and
   Android (ImageCdn.kt). Pure (imageCdn.test.mjs).
========================================================= */

/** Logo tiles (Home, Organisations): about 130×40 CSS px, up to twice the height at the admin panel's scale, at 3×. */
export const TILE = { w: 400, h: 200 };
/** The partner sheet's big logo. */
export const PAGE = { w: 1080, h: 480 };
/** Feed photos: no wider than a phone screen. */
export const PHOTO = { w: 1280, h: 1600 };

const TRANSFORM_PART = /^[a-z]{1,3}_[^_/]+/;
const VERSION = /^v\d+$/;
const isTransformation = (p) => !!p && !p.includes(".") && p.split(",").every((x) => TRANSFORM_PART.test(x));

function hostAndPath(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)/i.exec(url);
  if (!m) return null;
  return { host: m[1].replace(/^.*@/, "").replace(/:\d+$/, "").toLowerCase(), path: m[2] || "" };
}

/** …/image/upload/[their transformations/]v123/id.png → …/image/upload/[theirs/]c_limit,w_W,h_H/v123/id.png */
function cloudinary(url, w, h) {
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at < 0) return url;
  const head = url.slice(0, at + marker.length);
  const limit = `c_limit,w_${w},h_${h}`;
  const parts = url.slice(at + marker.length).split("/");
  if (parts[0] === limit) return url;
  // Keep their transformations (e.g. f_png,w_512,h_512,c_fit for an SVG logo) and add ours after them.
  let i = parts.findIndex((p) => VERSION.test(p) || !isTransformation(p));
  if (i < 0) i = parts.length;
  parts.splice(i, 0, limit);
  return head + parts.join("/");
}

/** Sanity: w/h/fit=max (an SVG also gets fm=png, which Sanity rasterises). */
export function sanitySized(url, w, h) {
  const q = url.indexOf("?");
  const base = q >= 0 ? url.slice(0, q) : url;
  const kept = q >= 0 ? url.slice(q + 1).split("&").filter((x) => x && !["w", "h", "fit", "max-w", "max-h"].includes(x.split("=")[0])) : [];
  const params = [...kept, `w=${w}`, `h=${h}`, "fit=max"];
  const path = hostAndPath(base)?.path || base;
  if (path.toLowerCase().endsWith(".svg") && !kept.some((x) => x.split("=")[0] === "fm")) params.push("fm=png");
  return `${base}?${params.join("&")}`;
}

/** `url` at most w×h pixels (aspect kept, never enlarged); "" stays "". */
export function sized(url, w, h) {
  if (!url) return url;
  const hp = hostAndPath(url);
  if (!hp) return url;
  if (hp.host === "res.cloudinary.com") return cloudinary(url, w, h);
  if (hp.host === "cdn.sanity.io" && hp.path.startsWith("/images/")) return sanitySized(url, w, h);
  return url;
}
