import { useEffect, useMemo, useRef, useState } from "react";
import { Scissors } from "lucide-react";
import { Button, Drawer, focusRing } from "../ui";
import { heroShadeBackground } from "../../lib/heroShade";
import {
  QUALITIES, SPEEDS, VIDEO_LIMITS, canEncodeSmooth, clipPlan, clock, defaultClip, keepsOriginal, mb, planVideo, probeVideo, recorderType, shrinkVideo,
} from "./heroVideoPrep";

/* =========================================================
   Trim, speed up and size a hero video before it goes up, or again after (Nov 25 2026, the owner: "Can I trim,
   speed up videos after upload?"). The preview loops just the chosen part at the chosen speed, under the shade the
   page will draw. "Make the loop" re-encodes it here in the browser (heroVideoPrep.js: silent, ≤ 20 s, MP4), then
   `upload(file, onProgress)` sends it and `onDone({ url, file })` gets the result. No server work, no video service.
   `source`: a File just picked, or the https URL of the uploaded video. An uploaded one is downloaded once first
   (our Sanity CDN allows it): loops made by a browser are streaming MP4s whose length is only known from the whole
   file, so editing the local copy shows the real length.
========================================================= */

const seg = (on) => `h-9 min-w-[56px] rounded-lg px-3 text-sm font-semibold tabular-nums transition ${on ? "bg-[#151035] text-white" : "border border-[#E3E0EE] bg-white text-[#4A4566] hover:bg-[#F6F5FA]"} ${focusRing}`;

export default function VideoEditor({ source: given, name, shade = "default", upload, onDone, onClose }) {
  const isUrl = typeof given === "string";
  const [source, setSource] = useState(isUrl ? null : given);   // always a File once ready
  const [loadErr, setLoadErr] = useState("");
  useEffect(() => {
    if (!isUrl) return undefined;
    const ctrl = new AbortController();
    fetch(given, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((b) => setSource(new File([b], "current-video.mp4", { type: b.type || "video/mp4" })))
      .catch((e) => { if (e?.name !== "AbortError") setLoadErr("The current video couldn't be downloaded here. Upload the original file again instead."); });
    return () => ctrl.abort();
  }, [given, isUrl]);
  const src = useMemo(() => (source ? URL.createObjectURL(source) : ""), [source]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const videoRef = useRef(null);
  const [meta, setMeta] = useState(null);          // { width, height, duration, plan }
  const [clip, setClip] = useState(null);          // { start, end, speed, quality }
  const [phase, setPhase] = useState("");          // "" | "shrink" | "upload"
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(0);
  const [waiting, setWaiting] = useState(false);   // the tab went to the background while making the loop
  const busy = !!phase;

  // Read the video once: its shape, length and whether it could go up as it is.
  useEffect(() => {
    if (!source) return undefined;
    let alive = true;
    probeVideo(source).then((p) => {
      p.release();
      if (!alive) return;
      const plan = isUrl ? { action: "shrink", reasons: [] } : planVideo({ type: source.type, size: source.size, width: p.width, height: p.height, duration: p.duration }, { canShrink: !!recorderType() || canEncodeSmooth() });
      if (plan.action === "refuse") { setErr(plan.error); return; }
      setMeta({ width: p.width, height: p.height, duration: p.duration, plan });
      setClip(defaultClip(p.duration));
    }, (e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [source, isUrl]);

  // The preview plays only the chosen part, looping, at the chosen speed (and stops while the loop is made, so the
  // browser decodes one copy at a time).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return undefined;
    if (busy) { v.pause(); return undefined; }
    v.playbackRate = clip.speed;
    if (v.currentTime < clip.start || v.currentTime > clip.end) v.currentTime = clip.start;
    let raf = 0;
    const loop = () => {
      if (v.currentTime >= clip.end - 0.03 || v.currentTime < clip.start - 0.25) v.currentTime = clip.start;
      setNow(v.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    v.play().catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, [clip, busy]);

  const plan = meta && clip ? clipPlan({ duration: meta.duration, ...clip }) : null;
  const untouched = !isUrl && meta && clip && keepsOriginal(meta.plan, clip, meta.duration);
  const canShrink = !!recorderType() || canEncodeSmooth();
  const set = (k, v) => setClip((c) => {
    const next = { ...c, [k]: v };
    // Keep the handles in order, at least 2 seconds apart.
    if (k === "start" && next.end - v < 2) next.end = Math.min(meta.duration, v + 2);
    if (k === "end" && v - next.start < 2) next.start = Math.max(0, v - 2);
    return next;
  });

  const make = async () => {
    if (!plan || plan.error || busy) return;
    setErr("");
    try {
      let file = source;
      if (!untouched) {
        if (!canShrink) throw new Error("This browser can't make video loops. Open this page in Chrome or Edge.");
        setPhase("shrink"); setPct(0);
        file = await shrinkVideo(source, { ...clip, name, onProgress: setPct, onWaiting: setWaiting });
      }
      if (file.size > VIDEO_LIMITS.maxUploadBytes) throw new Error(`The video is ${mb(file.size)}. Trim it shorter or pick the smaller size.`);
      setPhase("upload"); setPct(0);
      const res = await upload(file, setPct);
      onDone({ url: res.url, file });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setPhase(""); setPct(0);
    }
  };

  const close = () => { if (!busy) onClose(); };
  const label = phase === "shrink" && waiting ? "Paused: come back to this tab to finish the loop" : phase === "shrink" ? `Making the loop… ${Math.round(pct * 100)}% (keep this tab open)` : phase === "upload" ? `Uploading… ${Math.round(pct * 100)}%` : "";
  const dur = meta?.duration || 0;

  return (
    <Drawer open onClose={close} width="max-w-2xl" title={isUrl ? "Edit the video" : "Trim and speed up"}
      description="Pick the part to loop and how fast it plays. It always plays silently, on a loop. The finished loop replaces the current one when you save the page."
      footer={<>
        <span className="flex-1 text-xs text-[#6B6688]" aria-live="polite">{label}</span>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon={Scissors} onClick={make} loading={busy} disabled={!plan || !!plan.error}>{untouched ? "Upload as it is" : "Make the loop"}</Button>
      </>}>
      <div className="grid gap-5">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#151035]">
          <video ref={videoRef} src={src || undefined} muted playsInline autoPlay preload="auto"
            aria-label="Preview of the loop" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: heroShadeBackground(shade, "full") }} />
          {dur > 0 && clip && (
            <div className="absolute inset-x-3 bottom-3">
              <div className="relative h-1.5 rounded-full bg-white/25">
                <div className="absolute inset-y-0 rounded-full bg-[#F5A623]" style={{ left: `${(clip.start / dur) * 100}%`, right: `${100 - (clip.end / dur) * 100}%` }} />
                <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-white" style={{ left: `${(now / dur) * 100}%` }} />
              </div>
            </div>
          )}
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-[#151035]/70 text-sm font-semibold text-white">{label}</div>}
        </div>

        {!meta && !err && !loadErr && <p className="text-sm text-[#6B6688]">{isUrl && !source ? "Downloading the current video…" : "Reading the video…"}</p>}
        {loadErr && <p role="alert" className="text-sm text-[#B91C1C]">{loadErr}</p>}
        {meta && clip && (
          <>
            <section className="grid gap-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#6B6688]">Trim</h3>
              <label className="grid gap-1.5 text-sm">
                <span className="flex justify-between font-semibold text-[#151035]">Starts at <span className="tabular-nums text-[#4A4566]">{clock(clip.start)}</span></span>
                <input type="range" min={0} max={dur} step={0.1} value={clip.start} disabled={busy} onChange={(e) => set("start", Number(e.target.value))} className="w-full accent-[#F5A623]" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="flex justify-between font-semibold text-[#151035]">Ends at <span className="tabular-nums text-[#4A4566]">{clock(clip.end)}</span></span>
                <input type="range" min={0} max={dur} step={0.1} value={clip.end} disabled={busy} onChange={(e) => set("end", Number(e.target.value))} className="w-full accent-[#F5A623]" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => set("start", Math.min(Math.round(now * 10) / 10, dur - 2))}>Start here</Button>
                <Button size="sm" disabled={busy} onClick={() => set("end", Math.max(Math.round(now * 10) / 10, 2))}>End here</Button>
                <span className="self-center text-xs text-[#6B6688]">The whole video is {clock(dur)}.</span>
              </div>
            </section>
            <section className="grid gap-2">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#6B6688]">Speed</h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Speed">
                {SPEEDS.map((s) => <button key={s} type="button" role="radio" aria-checked={clip.speed === s} disabled={busy} className={seg(clip.speed === s)} onClick={() => set("speed", s)}>{s}×</button>)}
              </div>
            </section>
            <section className="grid gap-2">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#6B6688]">Size</h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                {["1080", "720"].map((k) => [k, QUALITIES[k]]).map(([k, q]) => <button key={k} type="button" role="radio" aria-checked={clip.quality === k} disabled={busy} className={seg(clip.quality === k)} onClick={() => set("quality", k)}>{q.label}</button>)}
              </div>
              <p className="text-xs text-[#6B6688]">The smaller file looks a little softer on big screens and halves what each visitor downloads.</p>
            </section>
            <p className={`rounded-lg px-3 py-2 text-sm ${plan?.error ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#F6F5FA] text-[#4A4566]"}`} role="status">
              {plan?.error || (untouched
                ? `This video is already ready: it goes up as it is (${mb(source.size)}).`
                : `The loop: ${Math.round(plan.outSeconds)} s, silent, ${clip.quality === "720" ? "720p" : "1080p"}, about ${mb(plan.bytes)}.`)}
            </p>
          </>
        )}
        {err && <p role="alert" className="text-sm text-[#B91C1C]">{err}</p>}
      </div>
    </Drawer>
  );
}
