import { useId, useRef, useState } from "react";
import { Film, Lock, Scissors, Trash2, UploadCloud } from "lucide-react";
import { useToast } from "../toastContext";
import { Button, Select } from "../ui";
import { HelpLabel } from "../HelpButton";
import { uploadRaw } from "./uploadFile";
import { VIDEO_LIMITS, describe } from "./heroVideoPrep";
import VideoEditor from "./VideoEditor";
import { HERO_SHADES, heroShadeBackground, shadeKey } from "../../lib/heroShade";

/* =========================================================
   Event pages › Top of the page › Background video (Nov 24 2026). One short silent loop per event, shown behind the
   top of that event's page on computers in place of the city photo (which stays its first frame and what phones,
   data saver and reduced motion see). Every new video, and the uploaded one again, goes through VideoEditor (trim,
   speed, size; made here with heroVideoPrep.js), is uploaded with the Large site files upload (management only), and
   is saved in the event's heroVideoUrl like any other field: draft → staging → publish. The shade over the photo /
   video (heroShade, src/lib/heroShade.js) is picked here too.
========================================================= */

export default function EventVideoField({ url, posterUrl, onChange, disabled, canUpload, shade, onShadeChange, media, onMediaChange }) {
  const id = useId();
  const shadeId = useId();
  const mediaId = useId();
  // Photo or video at the top of the page, never both (Nov 25 2026). Unset: the video when there is one.
  const shows = media === "photo" || media === "video" ? media : (url ? "video" : "photo");
  const inputRef = useRef(null);
  const toast = useToast();
  const [editing, setEditing] = useState(null);  // a File just picked, or the uploaded URL to edit again
  const [info, setInfo] = useState("");        // "5.8 MB · 1920 × 1080 · 20 s" of the file just uploaded
  const [err, setErr] = useState("");
  const off = disabled || !canUpload;
  const level = shadeKey(shade);

  // Every new video opens the editor first: trim, speed and size, then it goes up (VideoEditor.jsx).
  const pick = (file) => {
    if (!file || off) return;
    if (inputRef.current) inputRef.current.value = "";
    setErr(""); setInfo("");
    if (!String(file.type).startsWith("video/")) { setErr("Choose a video file (MP4 works everywhere)."); return; }
    setEditing(file);
  };
  const done = ({ url: next, file }) => {
    setEditing(null);
    onChange(next);
    setInfo(describe(file));
    toast.success("Video ready. Remember to save, then send it to staging.");
  };

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
            <span>{off ? "No video: the city photo shows" : "Drag a video here, or use the button below"}</span>
          </div>
        )}
        {(url || posterUrl) && <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: heroShadeBackground(level, "full") }} />}
      </div>
      <input ref={inputRef} id={id} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="sr-only" disabled={off}
        onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={UploadCloud} onClick={() => inputRef.current?.click()} disabled={off}>{url ? "Replace video" : "Upload video"}</Button>
        {url && <Button size="sm" icon={Scissors} onClick={() => { setErr(""); setEditing(url); }} disabled={off}>Trim or speed up</Button>}
        {url && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { onChange(""); setInfo(""); }} disabled={disabled}>Remove</Button>}
      </div>
      {info && <p className="text-xs text-ttfc-muted tabular-nums">Uploaded: {info}</p>}
      <p className="text-xs leading-relaxed text-ttfc-dim">
        Fills the top of this event&apos;s page like the city photo, on phones and computers, when &quot;Show at the top&quot; is Video. Visitors with data saver or reduced motion turned on see the photo.
        Before it goes up you pick the part to loop (up to {VIDEO_LIMITS.maxSeconds} seconds) and its speed; it always plays silently, on a loop. Trim or speed it up again later with the button above.
      </p>
      {!canUpload && !disabled && <p className="flex items-center gap-1.5 text-xs text-ttfc-muted"><Lock className="h-3 w-3" aria-hidden="true" /> Only management can upload videos.</p>}
      {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
      {onMediaChange && (
        <div className="mt-2 grid gap-1.5">
          <label htmlFor={mediaId} className="text-sm font-semibold">Show at the top of the page</label>
          <Select id={mediaId} value={shows} onChange={(e) => onMediaChange(e.target.value)} disabled={disabled}>
            <option value="photo">Photo</option>
            <option value="video" disabled={!url}>{url ? "Video" : "Video (upload one first)"}</option>
          </Select>
          <p className="text-xs text-ttfc-dim">
            {shows === "video"
              ? "The video plays on phones and computers, with the photo as its first frame while it loads. Phones download it too: the smaller 720p size keeps that light."
              : url ? "Only the photo shows. The video stays saved: pick Video to show it again." : "Only the photo shows."}
          </p>
        </div>
      )}
      {onShadeChange && (
        <div className="mt-2 grid gap-1.5">
          <label htmlFor={shadeId} className="text-sm font-semibold">Shade over the photo or video</label>
          <Select id={shadeId} value={level} onChange={(e) => onShadeChange(e.target.value)} disabled={disabled}>
            {HERO_SHADES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
          <p className="text-xs text-ttfc-dim">{HERO_SHADES.find((o) => o.key === level)?.hint} The preview above shows it.</p>
        </div>
      )}
      {editing && <VideoEditor source={editing} shade={level} name="event-hero" upload={uploadRaw} onDone={done} onClose={() => setEditing(null)} />}
    </div>
  );
}
