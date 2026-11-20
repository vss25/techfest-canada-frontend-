import { SPEAKER_BG, SPEAKER_OUT, SPEAKER_RATIO, alphaBox, alphaCurve, suggestCrop } from "./photoMath";

/* Speaker photo studio, the browser part (Nov 19 2026): background removal and face
   detection with Google's MediaPipe (Apache-2.0), run in the staff member's own browser.
   The photo never leaves the browser until it is uploaded; only the tools are downloaded
   (once, then cached): the WASM runtime from jsDelivr and two models from Google's
   public model store. Loaded only when someone adds a speaker photo. */

const VERSION = "1.2.3"; // keep in step with @mediapipe/tasks-vision in package.json
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const SEGMENTER = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite";
const FACES = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const MAX = 2000; // longest side we work at

let toolsPromise = null;
/** The segmenter and face detector, loaded once per page. */
function loadTools() {
  if (!toolsPromise) {
    toolsPromise = (async () => {
      const { FilesetResolver, ImageSegmenter, FaceDetector } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks(WASM);
      const make = (Kind, modelAssetPath, extra) => Kind.createFromOptions(files, { baseOptions: { modelAssetPath, delegate: "GPU" }, runningMode: "IMAGE", ...extra })
        .catch(() => Kind.createFromOptions(files, { baseOptions: { modelAssetPath, delegate: "CPU" }, runningMode: "IMAGE", ...extra }));
      const [segmenter, faces] = await Promise.all([
        make(ImageSegmenter, SEGMENTER, { outputConfidenceMasks: true, outputCategoryMask: false }),
        make(FaceDetector, FACES, { minDetectionConfidence: 0.5 }),
      ]);
      return { segmenter, faces };
    })().catch((err) => { toolsPromise = null; throw err; });
  }
  return toolsPromise;
}

const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file couldn't be read as an image."));
    img.src = src;
  });
}

/**
 * Prepares a photo (a File, or the URL of an existing one): the original at working size, the
 * person cut out (transparent background), and the suggested 4:5 crop.
 * → { width, height, original: canvas, cutout: canvas | null, crop, face: boolean, note }
 * `cutout` is null when background removal couldn't run; the studio then offers the original.
 */
export async function preparePhoto(source) {
  if (source instanceof File) {
    if (!/^image\//.test(source.type)) throw new Error("Choose an image file (JPG, PNG or WebP).");
    if (source.size > 25 * 1024 * 1024) throw new Error("That image is too big (over 25 MB).");
  }
  const url = source instanceof File ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImage(url).catch((err) => {
      if (source instanceof File) throw err;
      throw new Error("The current photo couldn't be loaded for editing. Upload the photo again instead.");
    });
    const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.max(1, Math.round(img.naturalWidth * s)), H = Math.max(1, Math.round(img.naturalHeight * s));
    const original = canvasOf(W, H);
    const octx = original.getContext("2d");
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, 0, 0, W, H);

    let cutout = null, face = null, person = null, note = "";
    try {
      const { segmenter, faces } = await loadTools();
      // Faces: the biggest one is the speaker.
      const det = faces.detect(original).detections || [];
      const best = det.map((d) => d.boundingBox).filter(Boolean).sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (best) face = { x: best.originX, y: best.originY, width: best.width, height: best.height };
      // Background: the multiclass model's class 0 is background; the person is everything else.
      const res = segmenter.segment(original);
      const bgMask = res.confidenceMasks && res.confidenceMasks[0];
      if (bgMask) {
        const mw = bgMask.width, mh = bgMask.height;
        const bg = bgMask.getAsFloat32Array();
        const small = canvasOf(mw, mh);
        const sctx = small.getContext("2d");
        const md = sctx.createImageData(mw, mh);
        const alpha = new Float32Array(mw * mh);
        for (let i = 0; i < mw * mh; i++) { alpha[i] = alphaCurve(1 - bg[i]); md.data[i * 4 + 3] = Math.round(alpha[i] * 255); }
        sctx.putImageData(md, 0, 0);
        res.confidenceMasks.forEach((m) => m.close());
        const box = alphaBox(alpha, mw, mh);
        if (box) person = { x: (box.x / mw) * W, y: (box.y / mh) * H, width: (box.width / mw) * W, height: (box.height / mh) * H };
        // Mask scaled up smoothly, then used to keep only the person.
        cutout = canvasOf(W, H);
        const cctx = cutout.getContext("2d");
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = "high";
        cctx.drawImage(small, 0, 0, W, H);
        cctx.globalCompositeOperation = "source-in";
        cctx.drawImage(original, 0, 0);
        cctx.globalCompositeOperation = "source-over";
        if (!person) { cutout = null; note = "No person was found in this photo, so the background was kept."; }
      }
    } catch {
      note = "The background remover couldn't start in this browser, so the original background is kept. You can still crop it.";
    }
    if (!face && !note) note = "No face was found, so the suggested crop is a guess. Adjust it below.";
    return { width: W, height: H, original, cutout, crop: suggestCrop(W, H, face, person), face: !!face, note };
  } finally {
    if (source instanceof File) URL.revokeObjectURL(url);
  }
}

/** The finished 4:5 photo: the crop of the cut-out on the light purple (or of the original). */
export function renderPhoto(prep, crop, { removeBackground = true, out = SPEAKER_OUT } = {}) {
  const c = canvasOf(out.width, out.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = SPEAKER_BG;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  const src = removeBackground && prep.cutout ? prep.cutout : prep.original;
  ctx.drawImage(src, crop.x, crop.y, crop.h * SPEAKER_RATIO, crop.h, 0, 0, out.width, out.height);
  return c;
}

/** Canvas → data URL for the upload (JPEG: the background is solid). */
export const photoDataUrl = (canvas) => canvas.toDataURL("image/jpeg", 0.9);
