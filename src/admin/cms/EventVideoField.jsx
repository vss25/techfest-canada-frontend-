import { useId, useRef, useState } from "react";
import { Film, Lock, Trash2, UploadCloud } from "lucide-react";
import { useToast } from "../toastContext";
import { Button } from "../ui";
import { HelpLabel } from "../HelpButton";
import { uploadRaw } from "./uploadFile";
import { VIDEO_LIMITS, describe, mb, planVideo, probeVideo, recorderType, shrinkVideo } from "./heroVideoPrep";

/* =========================================================
   Event pages › Top of the page › Background video (Nov 24 2026). One short silent loop per event, shown behind the
   top of that event's page on computers in place of the city photo (which stays its first frame and what phones,
   data saver and reduced motion see). Shrunk here before upload (heroVideoPrep.js), uploaded with the Large site
   files upload (management only), and saved in the event's heroVideoUrl like any other field: draft → staging →
   publish.
========================================================= */

export default function EventVideoField({ url, posterUrl, onChange, disabled, canUpload }) {
  const id = useId();
  const inputRef = useRef(null);
  const toast = useToast();
  const [phase, setPhase] = useState("");      // "" | "read" | "shrink" | "upload"
  const [pct, setPct] = useState(0);
  const [info, setInfo] = useState("");        // "5.8 MB · 1920 × 1080 · 20 s" of the file just uploaded
  const [err, setErr] = useState("");
  const busy = !!phase;
  const off = disabled || !canUpload || busy;

  const pick = async (file) => {
    if (!file || off) return;
    if (inputRef.current) inputRef.current.value = "";
    setErr(""); setInfo(""); setPct(0);
    if (!String(file.type).startsWith("video/")) { setErr("Choose a video file (MP4 works everywhere)."); return; }
    try {
      setPhase("read");
      const probe = await probeVideo(file);
      probe.release();
      const plan = planVideo({ type: file.type, size: file.size, width: probe.width, height: probe.height, duration: probe.duration }, { canShrink: !!recorderType() });
      if (plan.action === "refuse") throw new Error(plan.error);
      let out = Object.assign(file, { width: probe.width, height: probe.height, duration: probe.duration });
      if (plan.action === "shrink") {
        setPhase("shrink");
        const small = await shrinkVideo(file, { onProgress: setPct });
        // A clip that was already fine except for its size: keep whichever is smaller.
        const onlySize = plan.reasons.length === 1 && file.type === "video/mp4" && /MB$/.test(plan.reasons[0]);
        out = onlySize && file.size <= small.size ? out : small;
      }
      if (out.size > VIDEO_LIMITS.maxUploadBytes) throw new Error(`The video is still ${mb(out.size)}. Use a shorter clip, at most ${VIDEO_LIMITS.maxSeconds} seconds.`);
      setPhase("upload"); setPct(0);
      const res = await uploadRaw(out, setPct);
      onChange(res.url);
      setInfo(describe(out));
      toast.success("Video uploaded. Remember to save, then send it to staging.");
    } catch (e) {
      setErr(e.message);
      toast.error(e);
    } finally {
      setPhase(""); setPct(0);
    }
  };

  const label = phase === "read" ? "Reading the video…"
    : phase === "shrink" ? `Shrinking to 1080p… ${Math.round(pct * 100)}% (keep this tab open)`
      : phase === "upload" ? `Uploading… ${Math.round(pct * 100)}%` : "";

  return (
    <div className="flex flex-col gap-1.5">
      <HelpLabel label="Background video" htmlFor={id}>Background video <span className="font-normal text-ttfc-dim">(optional)</span></HelpLabel>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ttfc-line bg-ttfc-ink/60"
      >
        {url ? (
          <video key={url} src={url} poster={posterUrl || undefined} muted loop autoPlay playsInline preload="metadata"
            aria-label="Background video preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-ttfc-muted">
            <Film className="h-8 w-8" aria-hidden="true" />
            <span>{off && !busy ? "No video: the city photo shows" : "Drag a video here, or use the button below"}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ttfc-ink/85 px-6 text-center text-sm text-ttfc-text" aria-live="polite">
            <div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-ttfc-panel2" role="progressbar" aria-label={label}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
              <div className="h-full rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-purple transition-[width] duration-200" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            <span className="tabular-nums">{label}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} id={id} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="sr-only" disabled={off}
        onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={UploadCloud} onClick={() => inputRef.current?.click()} disabled={off} loading={busy}>{url ? "Replace video" : "Upload video"}</Button>
        {url && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { onChange(""); setInfo(""); }} disabled={disabled || busy}>Remove</Button>}
      </div>
      {info && <p className="text-xs text-ttfc-muted tabular-nums">Uploaded: {info}</p>}
      <p className="text-xs leading-relaxed text-ttfc-dim">
        Plays behind the top of this event&apos;s page on computers, filling the screen like the city photo. Phones, data saver and reduced motion show the photo instead.
        We shrink it before upload: 1920 × 1080 at most, the first {VIDEO_LIMITS.maxSeconds} seconds, no sound (about 6 MB).
      </p>
      {!canUpload && !disabled && <p className="flex items-center gap-1.5 text-xs text-ttfc-muted"><Lock className="h-3 w-3" aria-hidden="true" /> Only management can upload videos.</p>}
      {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
