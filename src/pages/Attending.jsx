import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AtSign, Camera, Check, Copy, Download, ExternalLink, ImagePlus, Linkedin, Loader2, Lock, Move, RotateCcw, Trash2,
  ZoomIn, ZoomOut,
} from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { ATT_CSS as CSS } from "./attendingStyles";
import { API } from "../lib/forms";
import {
  CARD_FORMATS, DEFAULT_CROP, ZOOM_MAX, ZOOM_MIN, canvasPngBlob, cardFileName, clampCrop, drawCard, ensureGlyphs,
  loadCardAssets, photoCircle, prepareImage,
} from "../lib/attendingCard";
import {
  ENQUIRE, LINKEDIN_PAGE, canShareFile, clearDraft, copyText, copyTextNow, defaultPostText, downloadBlob, isMobileDevice, isTrackToken,
  linkedinShareUrl, peekDraft, readFragment, saveDraft, sendAttendingEvent,
} from "../lib/attending";

/* =========================================================
   /attending: "I'm attending TTFC 2026" (a "ghost" page)
   ---------------------------------------------------------
   No navbar or footer link, not in any sitemap, noindex (meta tag
   here + X-Robots-Tag in vercel.json). People arrive from the
   "Show the world you're attending" email, whose button carries
   their name, title and company in the URL fragment
   (#fn=…&ln=…&title=…&co=…). The page reads it once, then removes
   it from the address bar.

   They make a branded image (src/lib/attendingCard.js) with:
     a) their LinkedIn photo ("Use my LinkedIn photo": the backend's
        LinkedIn OpenID sign-in, GET /api/attending/linkedin, sends
        them back with #li=1&pic=…; the picture is fetched directly,
        or through GET /api/attending/photo when LinkedIn's CDN
        refuses cross-origin reads),
     b) a photo from their device or camera, or
     c) no photo: their initials on the brand gradient,
   then post it to LinkedIn with pre-written (editable) text:
     - phones: the share sheet with the PNG + text (straight to the app);
     - computers: "Post to LinkedIn" sends the finished PNG + text to
       the backend (POST /api/attending/post), then LinkedIn asks them
       to allow posting and the backend posts it with the image
       attached; they come back to #posted=1&post=<URL>. If that fails
       or isn't switched on, the manual way: the PNG downloads, the
       text is copied, LinkedIn's share box opens, they attach it.
   The image is drawn in the browser. Only the finished image is
   uploaded, and only when they post it.
   Who did what (Oct 19 2026): links from emails sent since carry
   &r=<token> (who it was sent to, signed by the backend). The page
   keeps it (in the draft too, for the trips to LinkedIn) and tells
   the backend once when opened from the link (visit), when the
   phone's share sheet finishes (share) and on "Download and open
   LinkedIn" (manual); "Post to LinkedIn" sends it with the draft so
   the post is theirs. Never waited for, never in the way.
   From the TTFC app (Oct 22 2026): the app opens this page for the
   signed-in person (GET /api/app/attending-link: their name and r
   token, plus ?from=app). Then "Post to LinkedIn" is the main button
   on phones too, because only a post made that way is confirmed and
   earns the +50 points; the phone's share sheet is the second way.
   Afterwards: "Back to the TTFC app". ?demo=1 (the app's demo mode)
   never contacts the server or LinkedIn.
========================================================= */

const SHAPES = ["square", "landscape"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LI_ERRORS = {
  cancelled: "LinkedIn sign-in was cancelled. Try again, or upload a photo instead.",
  unavailable: "LinkedIn sign-in isn't available right now. Upload a photo instead.",
  no_photo: "Your LinkedIn profile doesn't have a photo we can use. Upload one instead.",
};
const liErrorText = (code) => LI_ERRORS[code] || "We couldn't get your LinkedIn photo. Upload a photo instead.";
const POST_ERRORS = {
  cancelled: "You cancelled on LinkedIn, so nothing was posted. Try again whenever you’re ready.",
  unavailable: "Posting straight to LinkedIn isn’t available right now. You can still download it and open LinkedIn.",
  expired: "That took a little too long. Press “Post to LinkedIn” again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
};
const postErrorText = (code) => POST_ERRORS[code] || "LinkedIn didn’t accept the post. Try again, or download it and open LinkedIn.";

const EMPTY = { firstName: "", lastName: "", title: "", company: "" };
const filled = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => !!v));

/** First render: what the link (or the trip back from LinkedIn) brought. Doesn't change anything. */
function initialState() {
  if (typeof window === "undefined") return { fields: EMPTY, text: defaultPostText(), format: "square", picture: "", error: "", clear: false, returning: false, posted: null, postError: "", photoData: "", track: "", fromLink: false, fromApp: false, demo: false };
  const frag = readFragment(window.location.hash);
  const query = new URLSearchParams(window.location.search);
  const returning = !!(frag.linkedin || frag.linkedinError || frag.posted || frag.postError);
  const draft = returning ? peekDraft() : null;
  const saved = { ...EMPTY, ...(draft?.fields && typeof draft.fields === "object" ? draft.fields : {}) };
  for (const k of Object.keys(saved)) saved[k] = typeof saved[k] === "string" ? saved[k].slice(0, 120) : "";
  // From the email link the fragment wins; back from LinkedIn, it only fills what's empty.
  const fields = returning ? { ...saved, ...filled(Object.fromEntries(Object.entries(frag.fields).filter(([k]) => !saved[k]))) }
    : { ...EMPTY, ...filled(frag.fields) };
  return {
    fields,
    text: typeof draft?.text === "string" && draft.text.trim() ? draft.text.slice(0, 3000) : defaultPostText(),
    format: SHAPES.includes(draft?.format) ? draft.format : "square",
    picture: frag.linkedin?.picture || "",
    error: frag.linkedinError ? liErrorText(frag.linkedinError) : frag.linkedin && !frag.linkedin.picture ? LI_ERRORS.no_photo : "",
    clear: frag.had,
    returning,
    posted: frag.posted,
    postError: frag.postError ? postErrorText(frag.postError) : "",
    // Back from "Post to LinkedIn": the photo they had (a JPEG data URL), its source and framing.
    photoData: !frag.linkedin && typeof draft?.photo === "string" && draft.photo.startsWith("data:image/jpeg;base64,") ? draft.photo : "",
    photoSource: ["upload", "camera", "linkedin"].includes(draft?.photoSource) ? draft.photoSource : "upload",
    crop: draft?.crop && typeof draft.crop === "object" ? draft.crop : null,
    // Who the email link was for: from the link, or back from LinkedIn from the draft.
    track: frag.track || (returning && isTrackToken(draft?.r) ? draft.r : ""),
    fromLink: !!frag.track,
    // Opened from the TTFC app (kept in the draft for the trip to LinkedIn and back).
    fromApp: query.get("from") === "app" || (returning && draft?.app === true),
    demo: query.get("demo") === "1",
  };
}

async function blobToPhoto(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const prepared = prepareImage(img);
    if (!prepared) throw new Error("empty image");
    return prepared;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A photo saved before the trip to LinkedIn (a data URL from this page). */
async function dataUrlToPhoto(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const prepared = prepareImage(img);
  if (!prepared) throw new Error("empty image");
  return prepared;
}

/** LinkedIn's picture: straight from its CDN when it allows it, else through our image proxy (same hosts only). */
async function fetchLinkedinPhoto(picture) {
  try {
    const r = await fetch(picture, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
    if (r.ok) return await r.blob();
  } catch { /* CORS refused: use the proxy */ }
  const r = await fetch(`${API}/attending/photo?u=${encodeURIComponent(picture)}`, { credentials: "omit" });
  if (!r.ok) throw new Error(`photo ${r.status}`);
  return r.blob();
}

function Step({ n, title, children, aside }) {
  return (
    <section className="att-step" aria-labelledby={`att-step-${n}`}>
      <div className="att-step-head">
        <span className="att-step-n" aria-hidden="true">{n}</span>
        <h2 id={`att-step-${n}`} className="att-step-title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function Attending() {
  const [init] = useState(initialState);
  const [fields, setFields] = useState(init.fields);
  const [text, setText] = useState(init.text);
  const [format, setFormat] = useState(init.format);
  const [photo, setPhoto] = useState(null); // { img: canvas, source: "upload" | "camera" | "linkedin" }
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [assets, setAssets] = useState(null);
  const [glyphs, setGlyphs] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(!!(init.picture || init.photoData));
  const [photoError, setPhotoError] = useState(init.error);
  const [copied, setCopied] = useState(false);
  const [guide, setGuide] = useState(null); // { copied, name, mode } after "Share on LinkedIn" without the share sheet
  const [shared, setShared] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(init.posted); // { url } after "Post to LinkedIn"
  const [postError, setPostError] = useState(init.postError);
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const dragRef = useRef(null);
  const startedRef = useRef(false);
  const copiedTimer = useRef(0);
  const mobile = useMemo(() => isMobileDevice(), []);
  const ready = !!assets;
  const track = init.track; // "" without one (an older link, or opened some other way)
  const { fromApp, demo } = init;
  // From the app, phones post through LinkedIn too (confirmed, so it earns the points); the share sheet comes second.
  const apiFirst = !mobile || fromApp;

  /* Hidden page: out of search engines, a quiet title, the dark page background. */
  useEffect(() => {
    const prev = document.title;
    document.title = "I'm attending · TTFC 2026";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    document.body.classList.add("att-open");
    return () => { document.title = prev; robots.remove(); document.body.classList.remove("att-open"); };
  }, []);

  /* Once: clear the fragment (names stay out of the address bar and history), fetch a LinkedIn photo. */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (init.clear) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (init.returning) clearDraft();
    if (init.fromLink) sendAttendingEvent(init.track, "visit");
    if (init.photoData) {
      (async () => {
        try {
          const img = await dataUrlToPhoto(init.photoData);
          setPhoto({ img, source: init.photoSource });
          setCrop(init.crop ? clampCrop({ ...DEFAULT_CROP, ...init.crop }, img) : DEFAULT_CROP);
        } catch { /* they can add it again */ }
        finally { setPhotoBusy(false); }
      })();
      return;
    }
    if (!init.picture) return;
    (async () => {
      try {
        const img = await blobToPhoto(await fetchLinkedinPhoto(init.picture));
        setPhoto({ img, source: "linkedin" });
        setCrop(DEFAULT_CROP);
        setPhotoError("");
      } catch {
        setPhotoError("We couldn't load your LinkedIn photo. Upload a photo instead.");
      } finally {
        setPhotoBusy(false);
      }
    })();
  }, [init]);

  useEffect(() => {
    let live = true;
    loadCardAssets().then((a) => { if (live) setAssets(a); });
    return () => { live = false; };
  }, []);

  /* Names in other scripts or with accents can need more of the font: redraw once it's in. */
  const textKey = `${fields.firstName} ${fields.lastName} ${fields.title} ${fields.company}`;
  useEffect(() => {
    let live = true;
    ensureGlyphs(textKey).then(() => { if (live) setGlyphs((g) => g + 1); });
    return () => { live = false; };
  }, [textKey]);

  /* Draw (coalesced to one frame). */
  useEffect(() => {
    if (!assets || !canvasRef.current) return undefined;
    const raf = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      drawCard(canvasRef.current, { format, ...fields, photo: photo?.img || null, crop, assets });
    });
    return () => cancelAnimationFrame(raf);
  }, [assets, format, fields, photo, crop, glyphs]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  /* The post box grows with the text, so the whole post is visible. */
  useLayoutEffect(() => {
    const ta = textRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight + 2, 640)}px`;
  }, [text]);

  const flashCopied = useCallback(() => {
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2600);
  }, []);

  const setField = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value.slice(0, k === "title" || k === "company" ? 100 : 60) }));

  const onFile = (source) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name || "")) {
      setPhotoError("Choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setPhotoError("That photo is too large. Choose one under 25 MB.");
      return;
    }
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const img = await blobToPhoto(file);
      setPhoto({ img, source });
      setCrop(DEFAULT_CROP);
    } catch {
      setPhotoError("We couldn't open that image. Try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () => { setPhoto(null); setCrop(DEFAULT_CROP); setPhotoError(""); };

  /* Before leaving for LinkedIn's sign-in page, keep what they typed (this tab only). */
  const onLinkedinClick = () => saveDraft({ fields, text, format, r: track });

  /* Drag the photo inside its circle. */
  const toCanvas = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const k = c.width / rect.width;
    return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k, k };
  };
  const onPointerDown = (e) => {
    if (!photo || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = toCanvas(e);
    const circle = photoCircle(format);
    if (Math.hypot(p.x - circle.cx, p.y - circle.cy) > circle.r * 1.3) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, k: p.k, d: circle.r * 2, from: crop };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = ((e.clientX - d.x) * d.k) / d.d;
    const dy = ((e.clientY - d.y) * d.k) / d.d;
    setCrop(clampCrop({ ...d.from, x: d.from.x + dx, y: d.from.y + dy }, photo.img));
  };
  const endDrag = (e) => { if (dragRef.current?.id === e.pointerId) dragRef.current = null; };
  const setZoom = (z) => setCrop((c) => clampCrop({ ...c, zoom: z }, photo?.img));
  const onWheel = (e) => {
    if (!photo || !e.ctrlKey) return; // trackpad pinch only; a plain wheel keeps scrolling the page
    e.preventDefault();
    setCrop((c) => clampCrop({ ...c, zoom: c.zoom * Math.exp(-e.deltaY / 200) }, photo.img));
  };
  const onCanvasKey = (e) => {
    if (!photo) return;
    const step = e.shiftKey ? 0.05 : 0.012;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCrop((c) => clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, photo.img));
    } else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(crop.zoom + 0.1); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(crop.zoom - 0.1); }
  };

  /* Computers: send the finished image + text, then LinkedIn asks to allow posting and the backend posts it. */
  const postToLinkedin = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || posting) return;
    setPosting(true);
    setPostError("");
    setPosted(null);
    setGuide(null);
    const base = { fields, text, format, r: track, ...(fromApp ? { app: true } : {}) };
    if (demo) { // the app's demo: nothing is sent anywhere
      setPosting(false);
      setPosted({ url: "", demo: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    let photoData = "";
    try { photoData = photo?.img ? photo.img.toDataURL("image/jpeg", 0.9) : ""; } catch { /* keep the rest */ }
    if (!photoData || !saveDraft({ ...base, photo: photoData, photoSource: photo.source, crop })) saveDraft(base);
    try {
      const r = await fetch(`${API}/attending/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ image: canvas.toDataURL("image/png"), text, ...(track ? { r: track } : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw Object.assign(new Error(j.error || "failed"), { code: j.code || "failed" });
      window.location.assign(`${API}/attending/linkedin/post?d=${encodeURIComponent(j.id)}`);
    } catch (err) {
      clearDraft();
      setPosting(false);
      setPostError(postErrorText(err?.code));
    }
  };

  /* Sharing. Everything happens inside the click, so the share sheet, the copy and the new tab are allowed. */
  /* Phones: the share sheet with the PNG + text (straight to the LinkedIn app). → false when this browser can't. */
  const shareWithSheet = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return false;
    const name = cardFileName(format);
    const blob = canvasPngBlob(canvas);
    const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
    if (!file || !canShareFile(file)) return false;
    setShared(false);
    if (copyTextNow(text)) flashCopied(); // in case the app keeps only the image
    navigator.share({ files: [file], text, title: "I'm attending TTFC 2026" }).then(
      () => { setShared(true); setGuide(null); sendAttendingEvent(track, "share"); },
      (err) => { if (err?.name !== "AbortError") setGuide({ mode: "fallback", copied: true, name }); },
    );
    return true;
  };
  const share = () => {
    if (!canvasRef.current || !ready) return;
    if (!apiFirst && shareWithSheet()) return;
    postToLinkedin();
  };
  const shareInstead = () => { if (!shareWithSheet()) shareManually(); };

  /* The manual way: download the image, copy the text, open LinkedIn's share box. */
  const shareManually = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const name = cardFileName(format);
    const blob = canvasPngBlob(canvas);
    setShared(false);
    setPostError("");
    downloadBlob(blob, name);
    const ok = copyTextNow(text);
    window.open(linkedinShareUrl(text), "_blank", "noopener,noreferrer");
    sendAttendingEvent(track, "manual");
    if (ok) flashCopied();
    else copyText(text).then((done) => { if (done) flashCopied(); });
    setGuide({ mode: "desktop", copied: ok, name });
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    downloadBlob(canvasPngBlob(canvas), cardFileName(format));
  };

  const copy = async () => { if (await copyText(text)) flashCopied(); };

  const resetText = () => setText(defaultPostText());
  const dims = CARD_FORMATS[format];
  const zoomPct = Math.round(((crop.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100);

  return (
    <div className="att-root">
      <style>{CSS}</style>
      <AuroraBackground />

      <header className="att-brand">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada" width="240" height="150" />
      </header>

      <div className="att-hero">
        <p className="att-eyebrow">TTFC 2026 · 26–27 Oct · Toronto</p>
        <h1 className="att-title">Show the world you're attending</h1>
        <p className="att-sub">Make your personal “I’m attending” image in seconds, then share it on LinkedIn with a post we’ve written for you.</p>
      </div>

      {posted && (
        <div className="att-posted" role="status">
          <span className="att-posted-icon"><Check size={22} aria-hidden="true" /></span>
          <div>
            <p className="att-posted-title">You’re on LinkedIn!</p>
            <p className="att-posted-sub">{posted.demo
              ? "Demo: nothing was posted. In the real app your post goes up with your image attached and +50 points are added."
              : `Your post is live with your image attached.${fromApp ? " Your +50 points are added in the TTFC app." : ""} Thank you for spreading the word, see you in Toronto.`}</p>
            {posted.url && (
              <a className="att-text-btn" href={posted.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> View your post
              </a>
            )}
            {fromApp && <a className="att-back-app" href="/app/points">Back to the TTFC app</a>}
          </div>
        </div>
      )}

      <main className="att-grid">
        <div className="att-preview-col">
          <section className="att-card att-preview" aria-label="Your image">
            <div className="att-preview-bar">
              <div className="att-seg" role="radiogroup" aria-label="Image shape">
                {SHAPES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={format === s} data-on={format === s || undefined}
                    className="att-seg-btn" onClick={() => setFormat(s)}>
                    <span className={`att-shape att-shape-${s}`} aria-hidden="true" />
                    {CARD_FORMATS[s].label}
                  </button>
                ))}
              </div>
              <span className="att-dims" aria-hidden="true">{dims.w} × {dims.h}</span>
            </div>

            <div className="att-canvas-wrap" style={{ aspectRatio: `${dims.w} / ${dims.h}` }}>
              <canvas
                ref={canvasRef}
                width={dims.w}
                height={dims.h}
                className="att-canvas"
                data-photo={photo ? "" : undefined}
                role="img"
                aria-label={`Your “I’m attending TTFC 2026” image${photo ? ". Drag the photo, or use the arrow keys, to position it" : ""}`}
                tabIndex={photo ? 0 : -1}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onWheel={onWheel}
                onKeyDown={onCanvasKey}
              />
              {(!ready || photoBusy) && (
                <div className="att-canvas-busy" role="status">
                  <Loader2 size={26} className="att-spin" aria-hidden="true" />
                  <span>{photoBusy ? "Loading your photo…" : "Preparing your image…"}</span>
                </div>
              )}
            </div>

            {photo ? (
              <div className="att-frame">
                <div className="att-zoom">
                  <button type="button" className="att-icon-btn" onClick={() => setZoom(crop.zoom - 0.15)} aria-label="Zoom out"><ZoomOut size={18} /></button>
                  <input type="range" className="att-range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={crop.zoom}
                    onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" aria-valuetext={`${zoomPct}%`}
                    style={{ "--fill": `${zoomPct}%` }} />
                  <button type="button" className="att-icon-btn" onClick={() => setZoom(crop.zoom + 0.15)} aria-label="Zoom in"><ZoomIn size={18} /></button>
                  <button type="button" className="att-icon-btn" onClick={() => setCrop(DEFAULT_CROP)} aria-label="Reset position and zoom" title="Reset"><RotateCcw size={17} /></button>
                </div>
                <p className="att-hint"><Move size={14} aria-hidden="true" /> Drag the photo to position it, and zoom to frame your face.</p>
              </div>
            ) : (
              <p className="att-hint att-hint-center">Add a photo below, or keep your initials.</p>
            )}
          </section>
        </div>

        <section className="att-card att-controls" aria-label="Make your image">
          <Step n={1} title="Your photo">
            <div className="att-photo-actions" data-count={mobile ? 3 : 2}>
              <a className="att-btn-li" href={`${API}/attending/linkedin`} onClick={onLinkedinClick}>
                <Linkedin size={18} aria-hidden="true" /> Use my LinkedIn photo
              </a>
              <label className="att-btn-soft">
                <ImagePlus size={18} aria-hidden="true" /> {photo && photo.source !== "linkedin" ? "Choose another photo" : "Upload a photo"}
                <input type="file" accept="image/*" className="att-file" onChange={onFile("upload")} />
              </label>
              {mobile && (
                <label className="att-btn-soft">
                  <Camera size={18} aria-hidden="true" /> Take a selfie
                  <input type="file" accept="image/*" capture="user" className="att-file" onChange={onFile("camera")} />
                </label>
              )}
            </div>
            {photoError && <p className="att-error" role="alert"><AlertCircle size={16} aria-hidden="true" /> {photoError}</p>}
            <div className="att-photo-foot">
              <p className="att-private"><Lock size={13} aria-hidden="true" /> Your photo stays on this device. Only the finished image is shared, when you post it.</p>
              {photo && (
                <button type="button" className="att-text-btn" onClick={removePhoto}>
                  <Trash2 size={14} aria-hidden="true" /> Use my initials instead
                </button>
              )}
            </div>
          </Step>

          <Step n={2} title="Your details">
            <div className="att-grid2">
              <div className="att-field">
                <label className="att-label" htmlFor="att-fn">First name</label>
                <input id="att-fn" className="att-input" value={fields.firstName} onChange={setField("firstName")} autoComplete="given-name" placeholder="Jane" />
              </div>
              <div className="att-field">
                <label className="att-label" htmlFor="att-ln">Last name</label>
                <input id="att-ln" className="att-input" value={fields.lastName} onChange={setField("lastName")} autoComplete="family-name" placeholder="Doe" />
              </div>
            </div>
            <div className="att-field">
              <label className="att-label" htmlFor="att-title">Job title <span className="att-optional">(optional)</span></label>
              <input id="att-title" className="att-input" value={fields.title} onChange={setField("title")} autoComplete="organization-title" placeholder="Chief Technology Officer" />
            </div>
            <div className="att-field">
              <label className="att-label" htmlFor="att-co">Company <span className="att-optional">(optional)</span></label>
              <input id="att-co" className="att-input" value={fields.company} onChange={setField("company")} autoComplete="organization" placeholder="Your company" />
            </div>
          </Step>

          <Step n={3} title="Your post" aside={text !== defaultPostText() ? (
            <button type="button" className="att-text-btn att-step-aside" onClick={resetText}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
          ) : null}>
            <label className="att-label att-sr" htmlFor="att-text">LinkedIn post text</label>
            <textarea id="att-text" ref={textRef} className="att-input att-textarea" value={text} onChange={(e) => setText(e.target.value.slice(0, 3000))} rows={10} />
            <p className="att-count" aria-live="off">{text.length.toLocaleString()} / 3,000</p>
            <p className="att-hint">
              <AtSign size={14} aria-hidden="true" />
              {!apiFirst ? (
                <span>To tag us, type <b>@{LINKEDIN_PAGE.name}</b> in LinkedIn and pick our page from the list.</span>
              ) : (
                <span>We’ll tag <a className="att-link" href={LINKEDIN_PAGE.url} target="_blank" rel="noopener noreferrer">{LINKEDIN_PAGE.name}</a>’s LinkedIn page in your post.</span>
              )}
            </p>
          </Step>

          <div className="att-actions">
            <button type="button" className="att-btn" onClick={share} disabled={!ready || posting} aria-busy={!ready || posting || undefined}>
              {posting ? <Loader2 size={20} className="att-spin" aria-hidden="true" /> : <Linkedin size={20} aria-hidden="true" />}
              {posting ? "Opening LinkedIn…" : apiFirst ? "Post to LinkedIn" : "Share on LinkedIn"}
            </button>
            {apiFirst && !postError && (
              <p className="att-hint att-hint-center">LinkedIn asks you to allow it once, then your post goes up with the image attached.</p>
            )}
            {fromApp && (
              <p className="att-hint att-hint-center att-points-note"><span><b>+50 points</b> in the TTFC app. Points are added when you post with Post to LinkedIn.</span></p>
            )}
            {fromApp && mobile && (
              <button type="button" className="att-text-btn att-share-instead" onClick={shareInstead} disabled={!ready || posting}>
                <Linkedin size={14} aria-hidden="true" /> Share with the LinkedIn app instead (no points)
              </button>
            )}
            {postError && (
              <div className="att-error att-post-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <div>
                  <span>{postError}</span>
                  <button type="button" className="att-text-btn" onClick={shareManually} disabled={!ready}>
                    <Download size={14} aria-hidden="true" /> Download and open LinkedIn
                  </button>
                </div>
              </div>
            )}
            <div className="att-actions-row">
              <button type="button" className="att-btn-ghost" onClick={download} disabled={!ready}>
                <Download size={17} aria-hidden="true" /> Download image
              </button>
              <button type="button" className="att-btn-ghost" onClick={copy} data-done={copied || undefined}>
                {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} {copied ? "Copied" : "Copy text"}
              </button>
            </div>
            <p className="att-sr" role="status" aria-live="polite">{copied ? "Post text copied" : ""}</p>
          </div>

          {shared && (
            <p className="att-done" role="status"><Check size={16} aria-hidden="true" /> Shared. Thank you for spreading the word, see you in Toronto!</p>
          )}

          {guide && (
            <div className="att-guide" role="status">
              <p className="att-guide-title">Paste is ready, attach the image you just downloaded</p>
              <ol className="att-guide-steps">
                <li data-done>
                  <span className="att-guide-n"><Check size={14} aria-hidden="true" /></span>
                  <span><b>Image downloaded.</b> Look for <span className="att-mono">{guide.name}</span> in your downloads.</span>
                </li>
                <li data-done={guide.copied || copied || undefined}>
                  <span className="att-guide-n">{guide.copied || copied ? <Check size={14} aria-hidden="true" /> : "2"}</span>
                  <span><b>Post text {guide.copied || copied ? "copied" : "ready"}.</b> LinkedIn opens with it filled in. If it’s empty, paste it ({/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"}+V).</span>
                </li>
                <li>
                  <span className="att-guide-n">3</span>
                  <span><b>Attach the image and tag us.</b> In LinkedIn’s post box, click the photo icon and choose the image you just downloaded. To tag us, type <b>@{LINKEDIN_PAGE.name}</b> and pick our page, then Post.</span>
                </li>
              </ol>
              <a className="att-text-btn" href={linkedinShareUrl(text)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> Open LinkedIn again
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="att-foot">
        <p>Made in your browser. Your image and text go only to LinkedIn; we don’t keep them. We do note when you open this page or post, so we don’t send you reminders you don’t need.</p>
        <p>Questions? <a className="att-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
      </footer>
    </div>
  );
}
