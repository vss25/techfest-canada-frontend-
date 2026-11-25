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

import { muxMp4 } from "./mp4Mux.js";

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

/* ---------- Trim, speed and size (Nov 25 2026, the owner: "Can I trim, speed up videos after upload?") ---------- */

export const SPEEDS = Object.freeze([0.5, 1, 1.5, 2, 4, 8]);   // 4× and 8×: Nov 25 2026, the owner
/** The finished loop's size: 1080p looks sharp full screen; 720p is about half the file (half the bandwidth). */
export const QUALITIES = Object.freeze({
  "1080": { label: "Full HD (1080p)", maxWidth: 1920, maxHeight: 1080, bitrate: 2_500_000 },
  "720": { label: "Smaller file (720p)", maxWidth: 1280, maxHeight: 720, bitrate: 1_300_000 },
});
export const MIN_CLIP_SECONDS = 2;

/**
 * Check a trim + speed choice against the clip:
 *   { start, end, speed, outSeconds, bytes } (outSeconds = how long the finished loop plays, bytes ≈ its size)
 *   or { error } in plain words.
 */
export function clipPlan({ duration, start = 0, end, speed = 1, quality = "1080" }, limits = VIDEO_LIMITS) {
  if (!Number.isFinite(duration) || duration <= 0) return { error: "This video's length can't be read." };
  if (!SPEEDS.includes(speed)) return { error: `Pick a speed: ${SPEEDS.map((x) => `${x}×`).join(", ")}.` };
  const q = QUALITIES[quality] || QUALITIES["1080"];
  const s = Math.max(0, Math.min(Number(start) || 0, duration));
  const e = Math.max(0, Math.min(end == null ? duration : Number(end), duration));
  if (e - s < MIN_CLIP_SECONDS - 0.01) return { error: `Keep at least ${MIN_CLIP_SECONDS} seconds.` };
  const outSeconds = (e - s) / speed;
  if (outSeconds > limits.maxSeconds + 0.5) {
    return { error: `The loop would play for ${Math.round(outSeconds)} seconds. Keep it to ${limits.maxSeconds}: trim it shorter${speed < SPEEDS[SPEEDS.length - 1] ? " or speed it up" : ""}.` };
  }
  return { start: s, end: e, speed, quality: q === QUALITIES["720"] ? "720" : "1080", outSeconds, bytes: Math.round((q.bitrate / 8) * outSeconds) };
}

/** The first span the editor offers: the whole clip, or its first 20 seconds. */
export function defaultClip(duration, limits = VIDEO_LIMITS) {
  return { start: 0, end: Math.min(duration, limits.maxSeconds), speed: 1, quality: "1080" };
}

/** True when the picked file can go up untouched: the whole clip, normal speed, already within the limits. */
export function keepsOriginal(plan, clip, duration) {
  return plan?.action === "keep" && clip.speed === 1 && clip.start <= 0.05 && clip.end >= duration - 0.05 && clip.quality === "1080";
}

/** "0:07.5" */
export function clock(seconds) {
  const t = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec.toFixed(1)}`;
}

export const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;

/** "5.8 MB · 1920 × 1080 · 20 s" */
export function describe({ size, width, height, duration }) {
  return [size ? mb(size) : "", width && height ? `${width} × ${height}` : "", Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)} s` : ""].filter(Boolean).join(" · ");
}

/** A video's shape and length, from the browser → { width, height, duration, video, release }. `source` is a File or
 *  the https URL of one already uploaded (our Sanity CDN answers with CORS, so the browser may re-encode it). */
export function probeVideo(source) {
  return new Promise((resolve, reject) => {
    const isUrl = typeof source === "string";
    const url = isUrl ? source : URL.createObjectURL(source);
    const video = document.createElement("video");
    if (isUrl) video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const release = () => { video.removeAttribute("src"); video.load(); if (!isUrl) URL.revokeObjectURL(url); };
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, video, release });
    video.onerror = () => { release(); reject(new Error("This browser can't read that video. Export it as an MP4 (H.264) and try again.")); };
    video.src = url;
  });
}

/* ---------- The smooth way (Nov 25 2026): WebCodecs + a plain MP4 (mp4Mux.js) ----------
   Steps through the clip at exact times (start + i × speed / 30 s), draws each frame, encodes it with the
   browser's own H.264 encoder (a keyframe every second) and writes a plain MP4 with its length and index up
   front. The result loops without a hitch, moves evenly at any speed, and making it doesn't depend on the tab
   being in front. Browsers without VideoEncoder (older Safari, Firefox) use the real-time recorder below. */

export const LOOP_FPS = 30;

/** True when this browser can make the smooth kind. */
export function canEncodeSmooth() {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined" && typeof VideoEncoder.isConfigSupported === "function";
}

/** The source time of each frame of the finished loop. Pure. */
export function frameTimes(plan, fps = LOOP_FPS) {
  const n = Math.max(1, Math.round(plan.outSeconds * fps));
  const last = Math.max(plan.start, plan.end - 0.001);
  return Array.from({ length: n }, (_, i) => Math.min(last, plan.start + (i * plan.speed) / fps));
}

async function pickH264(width, height, bitrate) {
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.42001f"]) {
    const config = { codec, width, height, bitrate, framerate: LOOP_FPS, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(config)).supported) return config; } catch { /* try the next */ }
  }
  return null;
}

const seekTo = (video, t) => new Promise((resolve, reject) => {
  if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= 2) { resolve(); return; }
  const done = () => { clearTimeout(timer); video.removeEventListener("seeked", done); resolve(); };
  const timer = setTimeout(() => { video.removeEventListener("seeked", done); reject(new Error("The video stopped responding while the loop was made. Try again.")); }, 8000);
  video.addEventListener("seeked", done);
  video.currentTime = t;
});

/** → Uint8Array (MP4) or null when this browser has no usable H.264 encoder. */
async function encodeSmooth(video, plan, { width, height, bitrate, onProgress }) {
  const config = await pickH264(width, height, bitrate);
  if (!config) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingQuality = "high";
  const samples = [];
  let avcC = null;
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, key: chunk.type === "key" });
    },
    error: (e) => { failure = e; },
  });
  encoder.configure(config);
  const times = frameTimes(plan);
  try {
    for (let i = 0; i < times.length; i += 1) {
      if (failure) throw failure;
      await seekTo(video, times[i]);
      ctx.drawImage(video, 0, 0, width, height);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / LOOP_FPS), duration: Math.round(1e6 / LOOP_FPS) });
      encoder.encode(frame, { keyFrame: i % LOOP_FPS === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      onProgress(i / times.length);
    }
    await encoder.flush();
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
  if (failure) throw failure;
  return muxMp4({ width, height, fps: LOOP_FPS, avcC, samples });
}

/**
 * Re-encode in real time: play the video muted, draw each frame onto a canvas at the target size, record the
 * canvas as MP4. Takes as long as the clip (≤ 20 s). The tab has to stay open and visible meanwhile.
 * → File (video/mp4), with its width / height / duration.
 */
export async function shrinkVideo(source, { onProgress = () => {}, onWaiting = () => {}, limits = VIDEO_LIMITS, start = 0, end: endAt, speed = 1, quality = "1080", name: nameHint } = {}) {
  const type = recorderType();
  if (!type && !canEncodeSmooth()) throw new Error("This browser can't shrink videos. Open this page in Chrome or Edge.");
  const probe = await probeVideo(source);
  const { video, release } = probe;
  try {
    const q = QUALITIES[quality] || QUALITIES["1080"];
    const plan = clipPlan({ duration: probe.duration, start, end: endAt ?? Math.min(probe.duration, limits.maxSeconds), speed, quality }, limits);
    if (plan.error) throw new Error(plan.error);
    const { width, height } = targetSize(probe.width, probe.height, { ...limits, maxWidth: q.maxWidth, maxHeight: q.maxHeight });
    const end = plan.end;
    const base = String(nameHint || (typeof source === "string" ? "hero-video" : source.name) || "hero-video").replace(/\.[a-z0-9]{1,5}$/i, "");
    if (canEncodeSmooth()) {
      await new Promise((r) => { if (video.readyState >= 2) r(); else video.onloadeddata = () => r(); });
      const mp4 = await encodeSmooth(video, plan, { width, height, bitrate: q.bitrate, onProgress });
      if (mp4) {
        onProgress(1);
        const out = new File([mp4], `${base}-${plan.quality}p.mp4`, { type: "video/mp4" });
        return Object.assign(out, { width, height, duration: plan.outSeconds });
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingQuality = "high";
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: q.bitrate });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const done = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/mp4" }));
      recorder.onerror = (e) => reject(e.error || new Error("The browser stopped while shrinking the video. Try again."));
    });

    await new Promise((r) => { if (video.readyState >= 2) r(); else video.onloadeddata = () => r(); });
    if (plan.start > 0) {
      await new Promise((r) => { video.onseeked = () => r(); video.currentTime = plan.start; });
    }
    // Speed: the canvas is recorded in real time, so playing 2× fast makes a loop that plays 2× fast.
    video.playbackRate = plan.speed;
    // A hidden tab draws no frames, so making the loop waits whenever this tab isn't in front (and says so).
    const whenVisible = () => (document.hidden ? new Promise((r) => {
      onWaiting(true);
      const back = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", back); onWaiting(false); r(); } };
      document.addEventListener("visibilitychange", back);
    }) : Promise.resolve());
    await whenVisible();
    ctx.drawImage(video, 0, 0, width, height);
    recorder.start(1000);
    await video.play();

    let frames = 0;
    let onHide = null;
    await new Promise((resolve) => {
      let finished = false;
      const finish = () => { if (!finished) { finished = true; clearInterval(guard); resolve(); } };
      const useVfc = typeof video.requestVideoFrameCallback === "function";
      const tick = () => {
        if (finished) return;
        ctx.drawImage(video, 0, 0, width, height);
        frames += 1;
        onProgress(Math.min(1, Math.max(0, (video.currentTime - plan.start) / (end - plan.start))));
        if (video.ended || video.currentTime >= end) { finish(); return; }
        if (useVfc) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
      };
      // Stops at the end even if frame callbacks stall.
      const guard = setInterval(() => { if (video.ended || video.currentTime >= end) finish(); }, 100);
      onHide = async () => {
        if (!document.hidden || finished) return;
        video.pause();
        if (recorder.state === "recording") recorder.pause();
        await whenVisible();
        if (finished) return;
        if (recorder.state === "paused") recorder.resume();
        await video.play().catch(() => {});
        tick();
      };
      document.addEventListener("visibilitychange", onHide);
      video.onended = () => finish();
      tick();
    });
    document.removeEventListener("visibilitychange", onHide);
    video.pause();
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    const blob = await done;
    // At least a few frames a second, or the loop came out (nearly) empty: don't upload it.
    if (frames < Math.max(4, plan.outSeconds * 4)) {
      throw new Error("The loop came out empty. Keep this tab open and in front while it's made, then try again.");
    }
    onProgress(1);
    const out = new File([blob], `${base}-${plan.quality}p.mp4`, { type: "video/mp4" });
    return Object.assign(out, { width, height, duration: plan.outSeconds });
  } finally {
    release();
  }
}
