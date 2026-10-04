import { useId, useRef, useState } from "react";
import { ImagePlus, Lock, RefreshCw, Sparkles, UploadCloud } from "lucide-react";
import { Banner, Button, Spinner } from "../ui";
import { useToast } from "../toastContext";
import { uploadImage } from "./imageUpload";
import { LIVE_NOTE } from "./cmsMeta";

export function CmsBanners({ configured }) {
  return (
    <div className="mb-6 space-y-3">
      {configured === false && (
        <Banner tone="warn" icon={Lock} title="Read-only for now">
          Editing is read-only until SANITY_WRITE_TOKEN is added on Render. You can still browse everything below.
        </Banner>
      )}
      <Banner tone="info" icon={Sparkles}>{LIVE_NOTE} No deploy or Sanity Studio needed.</Banner>
    </div>
  );
}

const checker =
  "bg-[length:16px_16px] [background-image:linear-gradient(45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.05)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.05)_75%)] [background-position:0_0,0_8px,8px_-8px,-8px_0]";

/**
 * Pick → downscale → upload. Calls onUploaded({ assetId, url, preview }).
 * Shows the whole image (no cropping) so staff see exactly what was uploaded.
 */
export function ImagePicker({ label, kind = "photo", url, onUploaded, disabled, required, error, aspect = "aspect-[4/3]" }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const handle = async (file) => {
    if (!file || disabled) return;
    setBusy(true); setLocalErr("");
    try {
      const out = await uploadImage(file, { kind });
      onUploaded(out);
      toast.success(kind === "logo" ? "Logo uploaded — remember to save" : "Photo uploaded — remember to save");
    } catch (err) {
      setLocalErr(err.message);
      toast.error(err);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shownError = localErr || error;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ttfc-text/90">
        {label}{required && <span className="ml-0.5 text-ttfc-pink" aria-hidden="true">*</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
        className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
          drag ? "border-ttfc-pink bg-ttfc-pink/5" : shownError ? "border-red-400/50" : "border-ttfc-line"
        } ${kind === "logo" ? checker : "bg-ttfc-ink/60"}`}
      >
        {url ? (
          <img src={url} alt="Preview" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-ttfc-muted">
            <ImagePlus className="h-8 w-8" aria-hidden="true" />
            <span>{disabled ? "No image" : "Drag an image here, or use the button below"}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ttfc-ink/80 text-sm text-ttfc-text">
            <Spinner /> Uploading…
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={url ? RefreshCw : UploadCloud}
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {url ? `Replace ${kind === "logo" ? "logo" : "photo"}` : `Upload ${kind === "logo" ? "logo" : "photo"}`}
        </Button>
        <span className="text-xs text-ttfc-dim">
          {kind === "logo" ? "PNG or SVG with a transparent background works best." : "A clear head-and-shoulders photo. Resized automatically."}
        </span>
      </div>
      {shownError && <p className="text-xs text-red-300" role="alert">{shownError}</p>}
    </div>
  );
}
