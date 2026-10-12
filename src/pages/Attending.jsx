import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, Camera, Check, Copy, Download, ExternalLink, ImagePlus, Linkedin, Loader2, Lock, Move, RotateCcw, Trash2,
  ZoomIn, ZoomOut,
} from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { API } from "../lib/forms";
import {
  CARD_FORMATS, DEFAULT_CROP, ZOOM_MAX, ZOOM_MIN, canvasPngBlob, cardFileName, clampCrop, drawCard, ensureGlyphs,
  loadCardAssets, photoCircle, prepareImage,
} from "../lib/attendingCard";
import {
  ENQUIRE, canShareFile, clearDraft, copyText, copyTextNow, defaultPostText, downloadBlob, isMobileDevice, linkedinShareUrl,
  peekDraft, readFragment, saveDraft,
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
     - otherwise: the PNG downloads, the text is copied, and LinkedIn's
       share box opens with the text filled in; they attach the image.
   Everything happens in the browser. The photo is never uploaded.
========================================================= */

const SHAPES = ["square", "landscape"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LI_ERRORS = {
  cancelled: "LinkedIn sign-in was cancelled. Try again, or upload a photo instead.",
  unavailable: "LinkedIn sign-in isn't available right now. Upload a photo instead.",
  no_photo: "Your LinkedIn profile doesn't have a photo we can use. Upload one instead.",
};
const liErrorText = (code) => LI_ERRORS[code] || "We couldn't get your LinkedIn photo. Upload a photo instead.";

const EMPTY = { firstName: "", lastName: "", title: "", company: "" };
const filled = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => !!v));

/** First render: what the link (or the trip back from LinkedIn) brought. Doesn't change anything. */
function initialState() {
  if (typeof window === "undefined") return { fields: EMPTY, text: defaultPostText(), format: "square", picture: "", error: "", clear: false, returning: false };
  const frag = readFragment(window.location.hash);
  const returning = !!(frag.linkedin || frag.linkedinError);
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
  const [photoBusy, setPhotoBusy] = useState(!!init.picture);
  const [photoError, setPhotoError] = useState(init.error);
  const [copied, setCopied] = useState(false);
  const [guide, setGuide] = useState(null); // { copied, name, mode } after "Share on LinkedIn" without the share sheet
  const [shared, setShared] = useState(false);
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const dragRef = useRef(null);
  const startedRef = useRef(false);
  const copiedTimer = useRef(0);
  const mobile = useMemo(() => isMobileDevice(), []);
  const ready = !!assets;

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
  const onLinkedinClick = () => saveDraft({ fields, text, format });

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

  /* Sharing. Everything happens inside the click, so the share sheet, the copy and the new tab are allowed. */
  const share = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const name = cardFileName(format);
    const blob = canvasPngBlob(canvas);
    const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
    setShared(false);
    if (mobile && file && canShareFile(file)) {
      if (copyTextNow(text)) flashCopied(); // in case the app keeps only the image
      navigator.share({ files: [file], text, title: "I'm attending TTFC 2026" }).then(
        () => { setShared(true); setGuide(null); },
        (err) => { if (err?.name !== "AbortError") setGuide({ mode: "fallback", copied: true, name }); },
      );
      return;
    }
    downloadBlob(blob, name);
    const ok = copyTextNow(text);
    window.open(linkedinShareUrl(text), "_blank", "noopener,noreferrer");
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
              <p className="att-private"><Lock size={13} aria-hidden="true" /> Your photo stays on this device. It’s never uploaded.</p>
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
          </Step>

          <div className="att-actions">
            <button type="button" className="att-btn" onClick={share} disabled={!ready} aria-busy={!ready || undefined}>
              <Linkedin size={20} aria-hidden="true" /> Share on LinkedIn
            </button>
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
                  <span><b>Attach the image.</b> In LinkedIn’s post box, click the photo icon, choose the image you just downloaded, then Post.</span>
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
        <p>Made in your browser: nothing you add here is stored or uploaded.</p>
        <p>Questions? <a className="att-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
      </footer>
    </div>
  );
}

const CSS = `
body.att-open { background: #06020f !important; padding-bottom: 0 !important; }
.att-root {
  position: relative; min-height: 100vh; min-height: 100dvh; color: #fff; overflow-x: hidden;
  font-family: 'DM Sans', system-ui, Helvetica, Arial, sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 26px 16px 32px; box-sizing: border-box;
}
.att-root *, .att-root *::before, .att-root *::after { box-sizing: border-box; }
.att-brand { position: relative; z-index: 1; margin-bottom: 6px; }
.att-brand img { height: 128px; max-width: 70vw; width: auto; display: block; }

.att-hero { position: relative; z-index: 1; text-align: center; max-width: 720px; margin: 0 auto 26px; }
.att-eyebrow { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase; color: #ffc56b; margin: 0 0 12px; }
.att-title { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: clamp(1.6rem, 5.6vw, 2.6rem); line-height: 1.12; letter-spacing: -0.3px; margin: 0;
  background: linear-gradient(100deg, #fff 30%, #f6d0ff 70%, #ffd9a0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.att-sub { margin: 14px auto 0; color: rgba(255,255,255,0.84); font-size: 16px; line-height: 1.6; max-width: 560px; }

.att-grid { position: relative; z-index: 1; width: 100%; max-width: 1120px; display: grid; gap: 18px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) {
  .att-grid { grid-template-columns: minmax(0, 1.06fr) minmax(0, 1fr); gap: 24px; }
  .att-preview-col { position: sticky; top: 20px; }
}

.att-card {
  position: relative; width: 100%; border-radius: 28px; padding: 22px;
  background: linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%), rgba(10,4,24,0.55);
  -webkit-backdrop-filter: blur(24px) saturate(130%); backdrop-filter: blur(24px) saturate(130%);
  border: 1px solid rgba(255,255,255,0.13);
  box-shadow: 0 30px 90px rgba(3,0,12,0.55), inset 0 1px 0 rgba(255,255,255,0.14);
}
.att-card::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(130deg, #7a3fd1, #e8458b 45%, #f5a623 90%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; opacity: .35; transition: opacity .35s ease;
}
.att-card:hover::before, .att-card:focus-within::before { opacity: .8; }

.att-preview-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.att-seg { display: inline-flex; padding: 4px; border-radius: 99px; background: rgba(6,2,15,0.5); border: 1px solid rgba(255,255,255,0.12); }
.att-seg-btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 99px; border: 0; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.75); background: transparent; transition: background .2s, color .2s, box-shadow .2s; }
.att-seg-btn:hover { color: #fff; }
.att-seg-btn[data-on] { color: #fff; background: linear-gradient(120deg, rgba(122,63,209,0.75), rgba(232,69,139,0.6)); box-shadow: 0 6px 20px rgba(232,69,139,0.3); }
.att-seg-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.att-shape { display: inline-block; border: 1.5px solid currentColor; border-radius: 3px; opacity: .9; }
.att-shape-square { width: 12px; height: 12px; }
.att-shape-landscape { width: 16px; height: 9px; }
.att-dims { font-family: 'Orbitron', sans-serif; font-size: 10.5px; letter-spacing: 1.2px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }

.att-canvas-wrap { position: relative; width: 100%; border-radius: 18px; overflow: hidden; background: #06020f;
  box-shadow: 0 24px 60px rgba(3,0,12,0.6), 0 0 0 1px rgba(255,255,255,0.08); }
.att-canvas { display: block; width: 100%; height: 100%; outline: none; }
.att-canvas[data-photo] { cursor: grab; touch-action: none; }
.att-canvas[data-photo]:active { cursor: grabbing; }
.att-canvas:focus-visible { box-shadow: inset 0 0 0 3px #e8458b; }
.att-canvas-busy { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  background: rgba(6,2,15,0.55); color: rgba(255,255,255,0.85); font-size: 14px; }

.att-frame { margin-top: 14px; }
.att-zoom { display: flex; align-items: center; gap: 8px; }
.att-icon-btn { flex: none; width: 38px; height: 38px; border-radius: 99px; display: grid; place-items: center; cursor: pointer; color: #fff;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); transition: border-color .2s, background .2s; }
.att-icon-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.att-icon-btn:focus-visible { outline: 2px solid #e8458b; outline-offset: 2px; }
.att-range { flex: 1; min-width: 0; height: 38px; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }
.att-range::-webkit-slider-runnable-track { height: 6px; border-radius: 99px; background: linear-gradient(90deg, #7a3fd1, #e8458b var(--fill), rgba(255,255,255,0.14) var(--fill)); }
.att-range::-moz-range-track { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.14); }
.att-range::-moz-range-progress { height: 6px; border-radius: 99px; background: linear-gradient(90deg, #7a3fd1, #e8458b); }
.att-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -8px; border-radius: 99px; background: #fff; border: 0; box-shadow: 0 0 0 4px rgba(232,69,139,0.45), 0 4px 14px rgba(0,0,0,0.4); }
.att-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 99px; background: #fff; border: 0; box-shadow: 0 0 0 4px rgba(232,69,139,0.45), 0 4px 14px rgba(0,0,0,0.4); }
.att-range:focus-visible { outline: none; }
.att-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px #e8458b; }
.att-hint { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; font-size: 13px; color: rgba(255,255,255,0.76); line-height: 1.5; }
.att-hint-center { justify-content: center; margin-top: 14px; }

.att-controls { padding: 24px 24px 22px; }
.att-step + .att-step { margin-top: 24px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.08); }
.att-step-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.att-step-n { flex: none; width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800;
  background: linear-gradient(135deg, #7a3fd1, #e8458b); box-shadow: 0 0 16px rgba(232,69,139,0.45); }
.att-step-title { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.6px; margin: 0; flex: 1; }
.att-step-aside { margin: 0 !important; }

.att-photo-actions { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 520px) { .att-photo-actions { grid-template-columns: 1fr 1fr; } .att-photo-actions[data-count="3"] .att-btn-li { grid-column: 1 / -1; } }
.att-btn-li, .att-btn-soft { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 50px; padding: 0 18px; border-radius: 16px;
  font: inherit; font-size: 15px; font-weight: 700; color: #fff; text-decoration: none; cursor: pointer; transition: transform .15s, box-shadow .25s, border-color .2s, background .2s; }
.att-btn-li { background: linear-gradient(120deg, #0a66c2, #2b7fd6); box-shadow: 0 10px 28px rgba(10,102,194,0.35), inset 0 1px 0 rgba(255,255,255,0.25); }
.att-btn-li:hover { box-shadow: 0 12px 34px rgba(10,102,194,0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
.att-btn-soft { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); }
.att-btn-soft:hover { border-color: rgba(255,255,255,0.36); background: rgba(255,255,255,0.1); box-shadow: 0 0 22px rgba(122,63,209,0.28); }
.att-btn-soft:focus-within, .att-btn-li:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.att-btn-li:active, .att-btn-soft:active { transform: scale(0.985); }
.att-file { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0 0 0 0); }
.att-photo-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 14px; margin-top: 12px; }
.att-private { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12.5px; color: rgba(255,255,255,0.72); }

.att-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.att-field { margin-bottom: 12px; }
.att-field:last-child { margin-bottom: 0; }
.att-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; color: rgba(255,255,255,0.9); }
.att-optional { color: rgba(255,255,255,0.62); font-weight: 500; }
.att-input { width: 100%; height: 50px; border-radius: 14px; padding: 0 15px; font: inherit; font-size: 16px; color: #fff;
  background: rgba(6,2,15,0.5); border: 1px solid rgba(255,255,255,0.15); outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.att-input::placeholder { color: rgba(255,255,255,0.3); }
.att-input:hover { border-color: rgba(255,255,255,0.28); }
.att-input:focus { border-color: #e8458b; box-shadow: 0 0 0 4px rgba(232,69,139,0.2), 0 0 24px rgba(232,69,139,0.18); background: rgba(6,2,15,0.65); }
.att-textarea { height: auto; min-height: 160px; overflow-y: auto; padding: 13px 15px; resize: vertical; line-height: 1.55; font-size: 15px; }
.att-count { margin: 6px 2px 0; text-align: right; font-size: 12px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }

.att-actions { margin-top: 22px; }
.att-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 58px; padding: 0 22px; border-radius: 99px; border: 0; cursor: pointer;
  font: inherit; font-size: 17px; font-weight: 700; color: #fff; letter-spacing: 0.2px;
  background: linear-gradient(90deg, #7a3fd1, #e8458b, #f5a623, #e8458b, #7a3fd1); background-size: 300% 100%; background-position: 0% 0;
  box-shadow: 0 12px 34px rgba(232,69,139,0.38), inset 0 1px 0 rgba(255,255,255,0.3); transition: background-position .6s ease, transform .15s ease, box-shadow .25s; }
.att-btn:hover:not(:disabled) { background-position: 60% 0; box-shadow: 0 14px 44px rgba(232,69,139,0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
.att-btn:active:not(:disabled) { transform: scale(0.985); }
.att-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.att-btn:disabled { cursor: progress; opacity: 0.7; }
.att-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.att-btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 14px; border-radius: 99px; cursor: pointer;
  font: inherit; font-size: 14.5px; font-weight: 700; color: #fff; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); transition: border-color .2s, background .2s, color .2s; }
.att-btn-ghost:hover:not(:disabled) { border-color: rgba(255,255,255,0.42); background: rgba(255,255,255,0.1); }
.att-btn-ghost:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.att-btn-ghost:disabled { opacity: .6; cursor: progress; }
.att-btn-ghost[data-done] { border-color: rgba(120,230,170,0.6); color: #b9f5d2; background: rgba(60,200,130,0.12); }

.att-text-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; background: none; border: 0; padding: 4px 0; color: #ffb3d1; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
.att-text-btn:hover { color: #fff; }
.att-text-btn:focus-visible { outline: 2px solid #e8458b; outline-offset: 3px; border-radius: 6px; }
.att-error { display: flex; gap: 7px; align-items: flex-start; margin: 12px 0 0; padding: 11px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; color: #ffc2cb;
  background: rgba(255,90,110,0.1); border: 1px solid rgba(255,120,140,0.3); }
.att-error svg { flex: none; margin-top: 2px; }
.att-done { display: flex; align-items: center; gap: 8px; margin: 16px 0 0; padding: 12px 14px; border-radius: 14px; font-size: 14px; color: #c9f7dc; background: rgba(60,200,130,0.12); border: 1px solid rgba(120,230,170,0.35); }

.att-guide { margin-top: 18px; padding: 16px 16px 12px; border-radius: 18px; background: linear-gradient(120deg, rgba(122,63,209,0.26), rgba(232,69,139,0.18)); border: 1px solid rgba(255,255,255,0.18); }
.att-guide-title { margin: 0 0 12px; font-weight: 700; font-size: 15px; color: #ffd9a0; }
.att-guide-steps { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 10px; }
.att-guide-steps li { display: flex; gap: 11px; align-items: flex-start; font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.88); }
.att-guide-steps b { color: #fff; }
.att-guide-n { flex: none; width: 24px; height: 24px; border-radius: 99px; display: grid; place-items: center; font-size: 12px; font-weight: 800; margin-top: 1px;
  border: 1.5px solid rgba(255,255,255,0.4); }
.att-guide-steps li[data-done] .att-guide-n { border-color: transparent; background: linear-gradient(135deg, #7a3fd1, #e8458b); box-shadow: 0 0 12px rgba(232,69,139,0.5); }
.att-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; overflow-wrap: anywhere; }

.att-foot { position: relative; z-index: 1; margin: 24px 0 0; padding: 0; background: none; border: 0; font-size: 13px; color: rgba(255,255,255,0.72); text-align: center; line-height: 1.7; }
.att-foot p { margin: 0; }
.att-link { color: #ffb3d1; text-decoration: underline; text-underline-offset: 2px; }
.att-link:hover { color: #fff; }
.att-sr { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); border: 0; white-space: nowrap; }
.att-spin { animation: attSpin 0.9s linear infinite; }
@keyframes attSpin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .att-root { padding: 16px 16px 28px; }
  .att-brand img { height: 96px; }
  .att-hero { margin-bottom: 18px; }
  .att-sub { font-size: 15px; }
  .att-card { border-radius: 24px; padding: 16px; }
  .att-controls { padding: 20px 16px 18px; }
  .att-canvas-wrap { border-radius: 14px; }
  .att-dims { display: none; }
  .att-seg { width: 100%; }
  .att-seg-btn { flex: 1; justify-content: center; }
  .att-grid2 { gap: 10px; }
  .att-grid2 .att-field:last-child { margin-bottom: 12px; }
  .att-btn-ghost { font-size: 13.5px; padding: 0 8px; gap: 6px; white-space: nowrap; }
}
@media (prefers-reduced-motion: reduce) {
  .att-spin { animation-duration: 2s; }
  .att-btn, .att-btn-li, .att-btn-soft { transition: none; }
}
`;
