import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Film, ImagePlus, Lock, RotateCcw, Scissors, Trash2, UploadCloud } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Card, Field, Input, Select, Switch, Textarea, focusRing } from "../ui";
import { uploadImage } from "./imageUpload";
import { uploadRaw } from "./uploadFile";
import { describe } from "./heroVideoPrep";
import VideoEditor from "./VideoEditor";
import WhyComeBox from "../../components/WhyComeBox";
import { VANCOUVER_BODY, WHY_FITS, WHY_HEIGHTS, defaultHeading, neutralBody, resolveWhy } from "../../lib/whyCome";

/* =========================================================
   Event pages › Why come (Nov 25 2026, the owner: edit the section's text, put a photo, GIF or video in its box,
   resize it, edit the video). Saved on the event like every other field (draft → staging → publish); the website
   draws it from the same rules (src/lib/whyCome.js) and the same box (components/WhyComeBox.jsx), so the preview
   here is what the page shows.
   - Photos are downscaled here (imageUpload.js); GIFs go up exactly as they are (re-drawing one would stop it
     moving), at most 6 MB.
   - Videos go through the hero video's editor (trim, speed, size, made silent in the browser: VideoEditor.jsx) and
     its upload (management only). The poster (first frame) is picked here from the video and saved as a photo.
   No paid service: everything is done in the browser and stored on Sanity like the other site files.
========================================================= */

const GIF_MAX = 6 * 1024 * 1024;
const GIF_WARN = 3 * 1024 * 1024;
const seg = (on) => `h-9 rounded-lg px-3 text-sm font-semibold transition ${on ? "border border-[#D6308C] bg-[#D6308C] text-white" : "border border-ttfc-line bg-ttfc-panel text-ttfc-text hover:bg-ttfc-panel2"} ${focusRing}`;

const readDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error("That file couldn't be read."));
  r.readAsDataURL(file);
});

/** The video's frame at `t` seconds → a JPEG File (the poster). */
function grabFrame(url, t) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.preload = "auto";
    v.src = url;
    v.onerror = () => reject(new Error("The video couldn't be read here."));
    v.onloadedmetadata = () => { v.currentTime = Math.min(Math.max(0, t), Math.max(0, (v.duration || 0) - 0.05)); };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext("2d").drawImage(v, 0, 0);
        c.toBlob((b) => (b ? resolve(new File([b], "why-come-poster.jpg", { type: "image/jpeg" })) : reject(new Error("The frame couldn't be saved."))), "image/jpeg", 0.86);
      } catch { reject(new Error("This frame couldn't be read from the video here. Open the admin on the website itself and try again.")); }
    };
  });
}

/** A fixed-width layout drawn at whatever width the admin has (scaled), so "Computer" really is a computer's layout. */
function Scaled({ width, children, label }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return undefined;
    const measure = () => {
      const s = Math.min(1, el.clientWidth / width);
      setScale(s);
      setHeight((inner.current?.offsetHeight || 0) * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);
  return (
    <figure className="grid gap-1">
      <div ref={outer} className="relative w-full overflow-hidden rounded-xl border border-ttfc-line bg-white" style={{ height: height || undefined }}>
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>{children}</div>
      </div>
      <figcaption className="text-[11px] text-ttfc-dim">{label}</figcaption>
    </figure>
  );
}

/** The section as the page draws it (the approved design's spacing and type). */
function SectionPreview({ why, phone, onPick }) {
  return (
    <section style={{ padding: phone ? "40px 16px" : "56px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: phone ? "24px" : "48px 72px", fontFamily: "Poppins, system-ui, sans-serif", color: "#151035", background: "#FFFFFF" }}>
      <div style={{ flex: "1 1 460px", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#D6308C" }}>{why.eyebrow}</p>
        <h2 style={{ margin: 0, fontSize: phone ? "30px" : "40px", lineHeight: phone ? "38px" : "48px", fontWeight: 700, letterSpacing: "-0.015em" }}>{why.heading}</h2>
        {why.body.map((p, i) => <p key={i} style={{ margin: 0, fontSize: phone ? "16px" : "18px", lineHeight: phone ? "26px" : "29px", color: "#3F3F46" }}>{p}</p>)}
      </div>
      <div style={{ flex: "1 1 420px", position: "relative", cursor: onPick ? "crosshair" : undefined }}
        onClick={onPick ? (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onPick(Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100));
        } : undefined}>
        <WhyComeBox why={phone ? { ...why, boxHeight: `${Math.min(why.heightPx, Math.round(375 * 0.62))}px` } : why} eager style={{ flex: "none", width: "100%" }} />
      </div>
    </section>
  );
}

export default function WhyComeEditor({ form, setForm, cityName, cityId, disabled, canUploadVideo }) {
  const toast = useToast();
  const imgInput = useRef(null);
  const vidInput = useRef(null);
  const ids = { media: useId(), height: useId(), fit: useId(), poster: useId() };
  const [busy, setBusy] = useState("");          // "" | "image" | "poster"
  const [editing, setEditing] = useState(null);  // a File just picked, or the uploaded URL, open in VideoEditor
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [posterAt, setPosterAt] = useState(0);
  const [videoLen, setVideoLen] = useState(0);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const why = resolveWhy(form, { cityId, cityName, preview: true });
  const chosen = form.whyMedia === "default" || form.whyMedia === "image" || form.whyMedia === "video" ? form.whyMedia : why.media.kind;
  const vancouver = cityId === "van" || /vancouver/i.test(String(form.city || ""));
  const bodyDefault = vancouver ? VANCOUVER_BODY : neutralBody(cityName);

  // The uploaded video's length, for the poster slider.
  useEffect(() => {
    if (!form.whyVideoUrl) return undefined;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = form.whyVideoUrl;
    v.onloadedmetadata = () => setVideoLen(Number.isFinite(v.duration) ? v.duration : 0);
    return () => { v.removeAttribute("src"); v.load(); };
  }, [form.whyVideoUrl]);

  const pickImage = async (file) => {
    if (imgInput.current) imgInput.current.value = "";
    if (!file || disabled) return;
    setErr("");
    if (!/^image\//.test(file.type)) { setErr("Choose a photo (JPG, PNG, WebP) or a GIF."); return; }
    setBusy("image");
    try {
      let out;
      if (file.type === "image/gif") {
        if (file.size > GIF_MAX) throw new Error(`That GIF is ${(file.size / 1e6).toFixed(1)} MB. GIFs must be 6 MB or smaller: a short video is far lighter, use Video instead.`);
        const data = await readDataUrl(file);
        const res = await api.post("/cms/upload", { data, filename: file.name.replace(/[^\w.-]+/g, "_") || "why-come.gif" });
        out = { assetId: res.assetId, url: res.url };
        if (file.size > GIF_WARN) toast.info("GIF uploaded. It's big for a web page: a short video loop looks the same at a fraction of the size.");
      } else {
        out = await uploadImage(file, { kind: "photo" });
      }
      set({ whyImage: out.assetId, whyImageUrl: out.url || out.preview, whyMedia: "image" });
      toast.success("Uploaded. Remember to save, then send it to staging.");
    } catch (e) { setErr(e.message); toast.error(e); } finally { setBusy(""); }
  };

  const pickVideo = (file) => {
    if (vidInput.current) vidInput.current.value = "";
    if (!file || disabled || !canUploadVideo) return;
    setErr("");
    if (!String(file.type).startsWith("video/")) { setErr("Choose a video file (MP4 or WebM)."); return; }
    setEditing(file);
  };
  const videoDone = ({ url, file }) => {
    setEditing(null);
    set({ whyVideoUrl: url, whyMedia: "video", whyPoster: "", whyPosterUrl: "" });
    setInfo(describe(file));
    setPosterAt(0);
    toast.success("Video ready. Pick its first frame below, then save.");
  };

  const usePoster = async () => {
    if (!form.whyVideoUrl) return;
    setBusy("poster"); setErr("");
    try {
      const file = await grabFrame(form.whyVideoUrl, posterAt);
      const out = await uploadImage(file, { kind: "photo" });
      set({ whyPoster: out.assetId, whyPosterUrl: out.url || out.preview });
      toast.success("First frame saved. Remember to save the page.");
    } catch (e) { setErr(e.message); toast.error(e); } finally { setBusy(""); }
  };

  const focusX = form.whyFocusX === "" || form.whyFocusX == null ? null : Number(form.whyFocusX);
  const focusY = form.whyFocusY === "" || form.whyFocusY == null ? null : Number(form.whyFocusY);

  return (
    <Card className="grid gap-5">
      <div>
        <h3 className="font-semibold">Why come</h3>
        <p className="mt-0.5 text-sm text-ttfc-muted">The section after the top of the page: a few lines on why to attend, beside a photo, GIF or video. Leave a box empty to keep the design&apos;s wording.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Small line above the heading">{(id) => <Input id={id} value={form.whyEyebrow} onChange={(e) => set({ whyEyebrow: e.target.value })} placeholder="Why come" maxLength={40} disabled={disabled} />}</Field>
        <Field label="Heading">{(id) => <Input id={id} value={form.whyHeading} onChange={(e) => set({ whyHeading: e.target.value })} placeholder={defaultHeading(cityName)} maxLength={160} disabled={disabled} />}</Field>
        <Field label="Text" className="sm:col-span-2"
          hint={vancouver ? "Empty: the design's Vancouver paragraph. Blank lines make new paragraphs." : "Empty: a short neutral paragraph about this city (the design's text is about BC, so it shows on Vancouver only). Blank lines make new paragraphs."}>
          {(id) => <Textarea id={id} rows={5} value={form.whyBody} onChange={(e) => set({ whyBody: e.target.value })} placeholder={bodyDefault} maxLength={1500} disabled={disabled} />}
        </Field>
        {!form.whyBody && !disabled && (
          <button type="button" className="-mt-2 justify-self-start text-xs font-semibold text-ttfc-muted underline sm:col-span-2" onClick={() => set({ whyBody: bodyDefault })}>Start from the current text</button>
        )}
      </div>

      <div className="grid gap-2">
        <span id={ids.media} className="text-sm font-semibold">In the box</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={ids.media}>
          {[["default", "The design's photo"], ["image", "Photo or GIF"], ["video", "Video"]].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={chosen === k} className={seg(chosen === k)} disabled={disabled} onClick={() => set({ whyMedia: k })}>{l}</button>
          ))}
        </div>

        {chosen === "image" && (
          <div className="grid gap-2">
            <input ref={imgInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickImage(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={ImagePlus} loading={busy === "image"} disabled={disabled} onClick={() => imgInput.current?.click()}>{form.whyImageUrl ? "Replace photo or GIF" : "Upload photo or GIF"}</Button>
              {form.whyImageUrl && <Button size="sm" variant="ghost" icon={Trash2} disabled={disabled} onClick={() => set({ whyImage: "", whyImageUrl: "" })}>Remove</Button>}
            </div>
            <p className="text-xs text-ttfc-dim">Photos are resized for the web. GIFs go up exactly as they are and keep moving (6 MB at most; a short video is much lighter).</p>
            {!form.whyImageUrl && <p className="text-xs text-ttfc-muted">No photo yet: the design&apos;s photo shows until you upload one.</p>}
          </div>
        )}

        {chosen === "video" && (
          <div className="grid gap-3">
            <input ref={vidInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickVideo(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={UploadCloud} disabled={disabled || !canUploadVideo} onClick={() => vidInput.current?.click()}>{form.whyVideoUrl ? "Replace video" : "Upload video"}</Button>
              {form.whyVideoUrl && <Button size="sm" icon={Scissors} disabled={disabled || !canUploadVideo} onClick={() => setEditing(form.whyVideoUrl)}>Trim or speed up</Button>}
              {form.whyVideoUrl && <Button size="sm" variant="ghost" icon={Trash2} disabled={disabled} onClick={() => set({ whyVideoUrl: "", whyPoster: "", whyPosterUrl: "" })}>Remove</Button>}
            </div>
            {info && <p className="text-xs tabular-nums text-ttfc-muted">Uploaded: {info}</p>}
            {!canUploadVideo && !disabled && <p className="flex items-center gap-1.5 text-xs text-ttfc-muted"><Lock className="h-3 w-3" aria-hidden="true" /> Only management can upload videos.</p>}
            {!form.whyVideoUrl && <p className="text-xs text-ttfc-muted"><Film className="mr-1 inline h-3 w-3" aria-hidden="true" />No video yet: the design&apos;s photo shows until you upload one. You pick the part to loop (up to 20 seconds) before it goes up.</p>}
            {form.whyVideoUrl && (
              <>
                <Switch label="Loop" description="On: plays over and over. Off: plays once and stays on its last frame." checked={form.whyLoop !== false} onChange={(v) => set({ whyLoop: v })} disabled={disabled} />
                <p className="text-xs text-ttfc-dim">It always plays silently, starts on its own and plays inside the page on phones. Visitors with reduced motion or data saver see the first frame only, and it loads only when someone scrolls near it.</p>
                <div className="grid gap-1.5 rounded-xl border border-ttfc-line p-3">
                  <label htmlFor={ids.poster} className="flex justify-between text-sm font-semibold"><span>First frame (shown while it loads)</span><span className="tabular-nums text-ttfc-muted">{posterAt.toFixed(1)} s</span></label>
                  <div className="relative aspect-[16/9] w-full max-w-xs overflow-hidden rounded-lg bg-[#2A2357]">
                    <PosterScrub url={form.whyVideoUrl} at={posterAt} />
                  </div>
                  <input id={ids.poster} type="range" min={0} max={Math.max(0.1, videoLen)} step={0.1} value={posterAt} disabled={disabled || !videoLen} onChange={(e) => setPosterAt(Number(e.target.value))} className="w-full max-w-xs accent-[#F5A623]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" loading={busy === "poster"} disabled={disabled || !videoLen} onClick={usePoster}>Use this frame</Button>
                    <span className="text-xs text-ttfc-dim">{form.whyPosterUrl ? "A frame is saved." : "None picked: the design's photo shows while it loads."}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <span id={ids.height} className="text-sm font-semibold">Box size</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={ids.height}>
            {WHY_HEIGHTS.map((h) => <button key={h.key} type="button" role="radio" aria-checked={why.height === h.key} className={seg(why.height === h.key)} disabled={disabled} onClick={() => set({ whyHeight: h.key })}>{h.label.split(" ")[0]} · {h.px}px</button>)}
          </div>
          <p className="text-xs text-ttfc-dim">Height on computers; it scales down on narrow screens.</p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={ids.fit} className="text-sm font-semibold">Fit</label>
          <Select id={ids.fit} value={why.fit} onChange={(e) => set({ whyFit: e.target.value })} disabled={disabled}>
            {WHY_FITS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Preview</span>
          <span className="text-xs text-ttfc-dim">{why.fit === "cover" ? "Click the picture to choose what stays in view when it's cropped." : "The whole picture shows; framing doesn't apply."}</span>
        </div>
        <Scaled width={1216} label="Computer"><SectionPreview why={why} onPick={why.fit === "cover" && !disabled ? (x, y) => set({ whyFocusX: x, whyFocusY: y }) : undefined} /></Scaled>
        <div className="max-w-[240px]"><Scaled width={375} label="Phone width"><SectionPreview why={why} phone /></Scaled></div>
        {why.fit === "cover" && (focusX !== null || focusY !== null) && !disabled && (
          <button type="button" className="inline-flex items-center gap-1 justify-self-start text-xs font-semibold text-ttfc-muted underline" onClick={() => set({ whyFocusX: "", whyFocusY: "" })}>
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Back to the centre ({why.position})
          </button>
        )}
      </div>

      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      {editing && <VideoEditor source={editing} shade="none" name="why-come" upload={uploadRaw} onDone={videoDone} onClose={() => setEditing(null)} />}
    </Card>
  );
}

/** The frame at `at` seconds, for picking the poster. */
function PosterScrub({ url, at }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (v && v.readyState >= 1) v.currentTime = at;
  }, [at]);
  return <video ref={ref} src={url} muted playsInline preload="auto" onLoadedMetadata={(e) => { e.currentTarget.currentTime = at; }} className="absolute inset-0 h-full w-full object-cover" aria-label="The chosen first frame" />;
}
