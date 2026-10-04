/* Photo framing maths for the admin "Adjust photo" tool. Pure functions.
   State: { zoom (1–3), cx, cy } — centre of a square region, as fractions of the image.
   Saved to Sanity as an equal-aspect crop + a hotspot covering the same square, so
   @sanity/image-url (and therefore the website and app) render exactly that square. */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r4 = (n) => Math.round(n * 10000) / 10000;

/** "image-abc123-1200x800-jpg" → { width, height } */
export function dimsFromAssetId(id) {
  const m = /-(\d+)x(\d+)-[a-z0-9]+$/i.exec(String(id || ""));
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

/** Square region in pixels for a state; also returns the normalised state after clamping. */
export function region(state, dims) {
  const W = dims.width, H = dims.height;
  const zoom = clamp(Number(state.zoom) || 1, MIN_ZOOM, MAX_ZOOM);
  const side = Math.min(W, H) / zoom;
  const left = clamp(state.cx * W - side / 2, 0, W - side);
  const top = clamp(state.cy * H - side / 2, 0, H - side);
  return { left, top, side, state: { zoom, cx: (left + side / 2) / W, cy: (top + side / 2) / H } };
}

/** Existing Sanity crop/hotspot → tool state. */
export function stateFromImage(image, dims) {
  if (!dims) return { zoom: 1, cx: 0.5, cy: 0.5 };
  const W = dims.width, H = dims.height;
  const c = image?.crop, h = image?.hotspot;
  if (c) {
    const cw = W * (1 - (c.left || 0) - (c.right || 0));
    const ch = H * (1 - (c.top || 0) - (c.bottom || 0));
    const side = Math.max(1, Math.min(cw, ch));
    const cx = h ? h.x : ((c.left || 0) * W + cw / 2) / W;
    const cy = h ? h.y : ((c.top || 0) * H + ch / 2) / H;
    return region({ zoom: Math.min(W, H) / side, cx, cy }, dims).state;
  }
  if (h) return region({ zoom: 1, cx: h.x, cy: h.y }, dims).state;
  return { zoom: 1, cx: 0.5, cy: 0.5 };
}

/** Tool state → { crop, hotspot } in Sanity's 0..1 terms. */
export function toSanity(state, dims) {
  const W = dims.width, H = dims.height;
  const { left, top, side } = region(state, dims);
  return {
    crop: {
      top: r4(clamp(top / H, 0, 1)),
      bottom: r4(clamp(1 - (top + side) / H, 0, 1)),
      left: r4(clamp(left / W, 0, 1)),
      right: r4(clamp(1 - (left + side) / W, 0, 1)),
    },
    hotspot: {
      x: r4(clamp((left + side / 2) / W, 0, 1)),
      y: r4(clamp((top + side / 2) / H, 0, 1)),
      width: r4(clamp(side / W, 0, 1)),
      height: r4(clamp(side / H, 0, 1)),
    },
  };
}
