import { api } from "../api";
import { LOGO_OUT, clearEdgeWhite, logoPlacement, logoWarning, opaqueBox } from "./photoMath";

const MAX = 1600;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file couldn't be read as an image.")); };
    img.src = url;
  });
}

/**
 * Downscale an image in the browser to at most 1600 px on the longest side; photos become JPEG at 0.85.
 * Logos (Nov 19 2026) all come out the same: a plain white background made transparent, empty
 * margins trimmed, centred in one 800 × 400 frame with the same padding, as PNG.
 */
export async function prepareImage(file, { kind = "photo", standard = false } = {}) {
  if (!file || !/^image\//.test(file.type)) throw new Error("Choose an image file (JPG, PNG, WebP or SVG).");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is too big (over 25 MB).");
  const { img, url } = await loadImage(file);
  try {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) { w = 1200; h = 1200; } // SVG without intrinsic size
    const scale = Math.min(1, MAX / Math.max(w, h));
    // SVGs are vectors: render them at full target size
    const s = file.type === "image/svg+xml" ? MAX / Math.max(w, h) : scale;
    const cw = Math.max(1, Math.round(w * s));
    const ch = Math.max(1, Math.round(h * s));
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    // standard: the website's logo lists (partners, sponsors, logo strips); other logos as before.
    const png = kind === "logo" && (standard || file.type !== "image/jpeg");
    if (!png) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch); }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, cw, ch);
    if (png && standard) return { ...standardLogo(canvas, file), width: LOGO_OUT.width, height: LOGO_OUT.height };
    const dataUrl = png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
    const base = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "image";
    return { dataUrl, filename: `${base}.${png ? "png" : "jpg"}`, width: cw, height: ch };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function standardLogo(canvas, file) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  clearEdgeWhite(data.data, canvas.width, canvas.height);
  ctx.putImageData(data, 0, 0);
  const box = opaqueBox(data.data, canvas.width, canvas.height);
  const warning = logoWarning(box);
  const out = document.createElement("canvas");
  out.width = LOGO_OUT.width; out.height = LOGO_OUT.height;
  if (box) {
    const at = logoPlacement(box.width, box.height);
    const octx = out.getContext("2d");
    octx.imageSmoothingQuality = "high";
    octx.drawImage(canvas, box.x, box.y, box.width, box.height, at.x, at.y, at.width, at.height);
  }
  const base = (file.name || "logo").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "logo";
  return { dataUrl: out.toDataURL("image/png"), filename: `${base}.png`, warning };
}

/** Downscale + upload → { assetId, url, preview, warning? } */
export async function uploadImage(file, opts) {
  const { dataUrl, filename, warning } = await prepareImage(file, opts);
  const out = await api.post("/cms/upload", { data: dataUrl, filename });
  if (!out?.assetId) throw new Error("Upload didn't return an image id. Try again.");
  return { assetId: out.assetId, url: out.url, preview: dataUrl, warning: warning || "" };
}
