/* =========================================================
   An event's hero video, made ready in the browser before it goes up (Nov 24 2026, the owner: "optimized, sized
   well to fit the entire screen like the current hero image, and doesn't impact operational cost").
   - Full-screen is done by the page (object-fit: cover, like the photo), so the file only needs to be big enough
     for a 1080p screen: at most 1920 × 1080, the first 20 seconds, no sound, about 2.5 Mbps → about 6 MB.
   - Done here, on the uploader's computer, with the browser's own encoder (canvas → MediaRecorder MP4): no new
     library, no server work, no paid video service. The website then serves one small file from Sanity's CDN to
     computers only (phones show the photo).
   - A file that's already within the limits goes up as it is (no second encode, no quality lost).
   Pure parts (planVideo, targetSize, describe) are tested in heroVideoPrep.test.mjs.
========================================================= */

export const VIDEO_LIMITS = Object.freeze({
  maxWidth: 1920,
  maxHeight: 1080,
  maxSeconds: 20,
  bitrate: 2_500_000,          // bits per second of the shrunk copy
  keepAsIsBytes: 8_000_000,    // an MP4 within the size limits and under this goes up untouched
  maxUploadBytes: 40 * 1024 * 1024,  // the server's limit (backend services/siteFiles.js)
});

const MP4_TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1.4d002a", "video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/mp4"];

/** The MP4 type this browser can record, or "" (then it can't shrink videos). */
export function recorderType() {
  try {
    if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) return "";
    return MP4_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  } catch { return ""; }
}

/** The shrunk copy's size: within the limits, same shape, even numbers (encoders need them). */
export function targetSize(width, height, limits = VIDEO_LIMITS) {
  const scale = Math.min(1, limits.maxWidth / width, limits.maxHeight / height);
  const even = (n) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/**
 * What to do with a picked video:
 *   { action: "keep" }      already small enough: upload as it is
 *   { action: "shrink", reasons }  re-encode it here
 *   { action: "refuse", error }    can't be used (with what to do instead)
 */
export function planVideo({ type, size, width, height, duration }, { canShrink, limits = VIDEO_LIMITS } = {}) {
  if (!width || !height || !Number.isFinite(duration) || duration <= 0) {
    return { action: "refuse", error: "This browser can't read that video. Export it as an MP4 (H.264) and try again." };
  }
  const reasons = [];
  if (width > limits.maxWidth || height > limits.maxHeight) reasons.push(`it's ${width} × ${height}`);
  if (duration > limits.maxSeconds + 0.5) reasons.push(`it's ${Math.round(duration)} seconds long`);
  if (size > limits.keepAsIsBytes) reasons.push(`it's ${mb(size)}`);
  if (type !== "video/mp4") reasons.push("it isn't an MP4");
  if (!reasons.length) return { action: "keep" };
  if (canShrink) return { action: "shrink", reasons };
  return {
    action: "refuse",
    error: `This browser can't shrink videos (${reasons.join(", ")}). Open this page in Chrome or Edge, or export the video as an MP4 at 1920 × 1080 or smaller, ${limits.maxSeconds} seconds or less, under ${mb(limits.keepAsIsBytes)}.`,
  };
}

export const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;

/** "5.8 MB · 1920 × 1080 · 20 s" */
export function describe({ size, width, height, duration }) {
  return [size ? mb(size) : "", width && height ? `${width} × ${height}` : "", Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)} s` : ""].filter(Boolean).join(" · ");
}

/** A video file's shape and length, from the browser → { width, height, duration, video, url } (call `release`). */
export function probeVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const release = () => { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); };
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, video, release });
    video.onerror = () => { release(); reject(new Error("This browser can't read that video. Export it as an MP4 (H.264) and try again.")); };
    video.src = url;
  });
}

/**
 * Re-encode in real time: play the video muted, draw each frame onto a canvas at the target size, record the
 * canvas as MP4. Takes as long as the clip (≤ 20 s). The tab has to stay open and visible meanwhile.
 * → File (video/mp4), with its width / height / duration.
 */
export async function shrinkVideo(file, { onProgress = () => {}, limits = VIDEO_LIMITS } = {}) {
  const type = recorderType();
  if (!type) throw new Error("This browser can't shrink videos. Open this page in Chrome or Edge.");
  const probe = await probeVideo(file);
  const { video, release } = probe;
  try {
    const { width, height } = targetSize(probe.width, probe.height, limits);
    const end = Math.min(probe.duration, limits.maxSeconds);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingQuality = "high";
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: limits.bitrate });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const done = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/mp4" }));
      recorder.onerror = (e) => reject(e.error || new Error("The browser stopped while shrinking the video. Try again."));
    });

    video.currentTime = 0;
    await new Promise((r) => { if (video.readyState >= 2) r(); else video.onloadeddata = () => r(); });
    ctx.drawImage(video, 0, 0, width, height);
    recorder.start(1000);
    await video.play();

    await new Promise((resolve) => {
      const useVfc = typeof video.requestVideoFrameCallback === "function";
      const tick = () => {
        ctx.drawImage(video, 0, 0, width, height);
        onProgress(Math.min(1, video.currentTime / end));
        if (video.ended || video.currentTime >= end) { resolve(); return; }
        if (useVfc) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
      };
      video.onended = () => resolve();
      tick();
    });
    video.pause();
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    const blob = await done;
    onProgress(1);
    const name = String(file.name || "hero-video").replace(/\.[a-z0-9]{1,5}$/i, "") + "-1080p.mp4";
    const out = new File([blob], name, { type: "video/mp4" });
    return Object.assign(out, { width, height, duration: end });
  } finally {
    release();
  }
}
