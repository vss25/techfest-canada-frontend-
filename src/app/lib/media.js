import { post } from "./api";
import { isDemoApi } from "./api";

/* =========================================================
   Photos and videos: shrink photos in the browser, then upload
   straight to Cloudinary with the server's signed parameters
   (POST /social/media/sign), like the apps' FeedMediaService.
========================================================= */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that photo. Try JPEG, PNG or HEIC.")); };
    img.src = url;
  });
}

/** Long edge ≤ maxEdge, JPEG, stepping quality down until it's under maxBytes. */
export async function compressImage(file, { maxEdge = 1600, maxBytes = 900000, square = false } = {}) {
  const { img, url } = await loadImage(file);
  try {
    let w = img.naturalWidth, h = img.naturalHeight;
    let sx = 0, sy = 0, sw = w, sh = h;
    if (square) {
      const side = Math.min(w, h);
      sx = (w - side) / 2; sy = (h - side) / 2; sw = sh = side;
      w = h = side;
    }
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.round(w * scale), ch = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    let q = 0.86, blob = null;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
      if (!blob || blob.size <= maxBytes) break;
      q -= 0.12;
    }
    if (!blob) throw new Error("Couldn't prepare that photo.");
    return { blob, width: cw, height: ch };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

export function videoInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => { resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, url }); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that video. Try a different one.")); };
    v.src = url;
  });
}

/**
 * Uploads one item; returns the post `media` entry {type, url, publicId, width, height, duration}.
 * Demo mode keeps a local object URL instead (nothing leaves the device).
 */
export async function uploadMedia(item) {
  if (isDemoApi()) {
    return { type: item.type, url: item.previewUrl, publicId: "", width: item.width || 0, height: item.height || 0, duration: item.duration || 0 };
  }
  const signed = await post("social/media/sign", { type: item.type });
  const form = new FormData();
  form.append("api_key", signed.apiKey);
  for (const [k, v] of Object.entries(signed.params || {})) form.append(k, String(v));
  form.append("file", item.blob, item.type === "video" ? "video.mp4" : "photo.jpg");
  let res;
  try {
    res = await fetch(signed.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new Error("Upload failed: check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(`Upload failed: ${data?.error?.message || `HTTP ${res.status}`}`);
  return { type: item.type, url: data.secure_url, publicId: data.public_id || "", width: data.width || 0, height: data.height || 0, duration: data.duration || 0 };
}
