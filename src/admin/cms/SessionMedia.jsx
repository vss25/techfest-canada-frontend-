import { useId, useRef, useState } from "react";
import { Film, Lock, Trash2, UploadCloud } from "lucide-react";
import { Button } from "../ui";
import { useToast } from "../toastContext";
import { ImagePicker } from "./CmsParts";
import { uploadRaw } from "./uploadFile";
import { sessionMediaKind } from "../../lib/sessionMedia";

/* A session's card media (Nov 25 2026, the owner: "allow the ability to add images, edit text, add gif, add video
   here on these thumbnails"). The card's words are the session's own fields above (title, type, times,
   description); this adds what shows at the top of its card on the website:
     - a picture (image, uploaded like every other photo), or
     - a GIF or a short MP4 (mediaUrl, uploaded unchanged with the Large site files upload: management only,
       40 MB at most). When both are set the GIF / video shows and the picture is its first frame. */
const MAX_MB = 40;

export default function SessionMedia({ form, setForm, readOnly, canUploadFile }) {
  const id = useId();
  const inputRef = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(null);   // upload progress 0…1
  const [err, setErr] = useState("");
  const kind = sessionMediaKind(form.mediaUrl);
  const off = readOnly || !canUploadFile || busy !== null;

  const pick = async (file) => {
    if (!file || off) return;
    setErr("");
    if (!/^(image\/gif|video\/mp4)$/.test(file.type)) { setErr("Choose a GIF or an MP4 video."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setErr(`That file is over ${MAX_MB} MB. Use a shorter or smaller one.`); return; }
    setBusy(0);
    try {
      const out = await uploadRaw(file, (p) => setBusy(p));
      setForm((f) => ({ ...f, mediaUrl: out.url }));
      toast.success(`${file.type === "image/gif" ? "GIF" : "Video"} uploaded — remember to save`);
    } catch (e) {
      setErr(e.message);
      toast.error(e);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <fieldset className="space-y-4 rounded-2xl border border-ttfc-line p-4">
      <legend className="px-1 text-[13px] font-semibold text-ttfc-text/90">On the session&apos;s card</legend>
      <p className="text-xs leading-relaxed text-ttfc-dim">
        Shown at the top of this session&apos;s card on the website (the home page&apos;s Agenda highlights, the event page and the Agenda page).
        The card&apos;s words are the title, session type, times and description above. Leave both empty for a card with words only.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <ImagePicker label="Picture" kind="photo" aspect="aspect-[16/9]" url={form.image.url} disabled={readOnly}
            onUploaded={({ assetId, url, preview }) => setForm((f) => ({ ...f, image: { assetId, url: url || preview } }))} />
          {form.image.url && (
            <Button size="sm" variant="ghost" icon={Trash2} disabled={readOnly} onClick={() => setForm((f) => ({ ...f, image: { assetId: null, url: "" } }))}>Remove picture</Button>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor={id} className="block text-[13px] font-semibold text-ttfc-text/90">GIF or video</label>
          <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-dashed border-ttfc-line bg-ttfc-ink/40">
            {kind === "video" ? (
              <video key={form.mediaUrl} src={form.mediaUrl} muted loop autoPlay playsInline preload="metadata" aria-label="Card video preview" className="h-full w-full object-cover" />
            ) : kind === "gif" ? (
              <img src={form.mediaUrl} alt="Card GIF preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-ttfc-muted">
                <Film className="h-7 w-7" aria-hidden="true" />
                <span>{busy !== null ? `Uploading… ${Math.round(busy * 100)}%` : "No GIF or video"}</span>
              </div>
            )}
          </div>
          <input ref={inputRef} id={id} type="file" accept="image/gif,video/mp4" className="sr-only" disabled={off} onChange={(e) => pick(e.target.files?.[0])} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={UploadCloud} disabled={off} onClick={() => inputRef.current?.click()}>
              {busy !== null ? `Uploading… ${Math.round(busy * 100)}%` : form.mediaUrl ? "Replace" : "Upload GIF or MP4"}
            </Button>
            {form.mediaUrl && <Button size="sm" variant="ghost" icon={Trash2} disabled={readOnly} onClick={() => setForm((f) => ({ ...f, mediaUrl: "" }))}>Remove</Button>}
          </div>
          {!canUploadFile && !readOnly && <p className="flex items-center gap-1.5 text-xs text-ttfc-muted"><Lock className="h-3 w-3" aria-hidden="true" /> Only management can upload GIFs and videos.</p>}
          {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
          <p className="text-xs text-ttfc-dim">GIF or MP4, up to {MAX_MB} MB. Videos play silently on a loop.</p>
        </div>
      </div>
    </fieldset>
  );
}
