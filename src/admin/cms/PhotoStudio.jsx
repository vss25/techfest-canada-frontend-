import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Banner, Button, Modal, Spinner, Switch } from "../ui";
import { api } from "../api";
import { useToast } from "../toastContext";
import { SPEAKER_BG, SPEAKER_RATIO, clampCrop, withZoom, zoomOf } from "./photoMath";
import { photoDataUrl, preparePhoto, renderPhoto } from "./speakerPhoto";
import { prepareImage } from "./imageUpload";

/* The speaker photo studio (Nov 19 2026): every speaker photo comes out the same — the person
   cut out onto the design's light purple, 4:5, the face at the same size and height. It
   suggests the crop; the person uploading sees the result as the speaker card shows it and
   can drag, zoom or keep the original background. "Use this photo" uploads the finished
   photo and the original (kept so the photo can be redone).

   source: a File (a new upload) or { url, originalAssetId } (redo an existing photo). */

const PW = 280, PH = Math.round(PW / SPEAKER_RATIO);

export default function PhotoStudio({ open, source, onClose, onDone }) {
  const toast = useToast();
  const [prep, setPrep] = useState(null);
  const [error, setError] = useState("");
  const [crop, setCrop] = useState(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const drag = useRef(null);

  // Prepare the photo (cut-out, face, suggested crop) when the studio opens.
  useEffect(() => {
    if (!open || !source) return undefined;
    let live = true;
    preparePhoto(source instanceof File ? source : source.url)
      .then((p) => { if (!live) return; setPrep(p); setCrop(p.crop); setRemoveBg(!!p.cutout); })
      .catch((err) => { if (live) setError(err?.message || "That photo couldn't be prepared."); });
    return () => { live = false; };
  }, [open, source]);

  // The live preview, drawn exactly as the finished photo.
  useEffect(() => {
    if (!prep || !crop || !canvasRef.current) return;
    const out = renderPhoto(prep, crop, { removeBackground: removeBg, out: { width: PW * 2, height: PH * 2 } });
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, PW * 2, PH * 2);
    ctx.drawImage(out, 0, 0);
  }, [prep, crop, removeBg]);

  const W = prep?.width || 1, H = prep?.height || 1;
  const zoom = crop ? zoomOf(crop, W, H) : 1;
  const setZoom = (z) => setCrop((c) => withZoom(c, z, W, H));
  const move = (dx, dy) => setCrop((c) => clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, W, H));

  const onPointerDown = (e) => {
    if (!crop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!drag.current || !crop) return;
    const k = crop.h / PH; // image pixels per preview pixel
    move(-(e.clientX - drag.current.x) * k, -(e.clientY - drag.current.y) * k);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => { drag.current = null; };
  const onKeyDown = (e) => {
    if (!crop) return;
    const step = crop.h * 0.02;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (keys[e.key]) { e.preventDefault(); move(...keys[e.key]); }
    if (e.key === "+" || e.key === "=") setZoom(zoom * 1.1);
    if (e.key === "-") setZoom(zoom / 1.1);
  };

  const use = async () => {
    if (!prep || !crop) return;
    setSaving(true);
    try {
      const base = (source instanceof File ? source.name : "speaker").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 50) || "speaker";
      const finished = await api.post("/cms/upload", { data: photoDataUrl(renderPhoto(prep, crop, { removeBackground: removeBg })), filename: `${base}-card.jpg` });
      if (!finished?.assetId) throw new Error("Upload didn't return an image id. Try again.");
      // The original, kept for redoing the photo later (an existing photo already has one).
      let originalAssetId = source instanceof File ? null : source.originalAssetId || null;
      if (source instanceof File) {
        const o = await prepareImage(source, { kind: "photo" });
        const up = await api.post("/cms/upload", { data: o.dataUrl, filename: o.filename });
        originalAssetId = up?.assetId || null;
      }
      onDone({ assetId: finished.assetId, url: finished.url, originalAssetId });
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      size="lg"
      title="Speaker photo"
      description="Every speaker photo is the same shape and colour. Check the suggested crop, then drag to move it or zoom."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={use} loading={saving} disabled={!prep || !crop}>Use this photo</Button>
        </>
      }
    >
      {error ? <Banner tone="danger" title="This photo couldn't be prepared">{error}</Banner> : !prep ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-ttfc-muted">
          <Spinner />
          <p>Removing the background and finding the face…</p>
          <p className="text-xs text-ttfc-dim">The first time, this browser downloads the photo tools (about 30 MB). It's quicker after that, and the photo stays on this computer until you choose Use this photo.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <canvas
              ref={canvasRef}
              width={PW * 2}
              height={PH * 2}
              tabIndex={0}
              role="img"
              aria-label="Photo preview. Drag or use the arrow keys to move the crop; plus and minus to zoom."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              className="cursor-grab touch-none rounded-xl outline-none ring-ttfc-pink focus-visible:ring-2 active:cursor-grabbing"
              style={{ width: PW, height: PH, background: SPEAKER_BG }}
            />
            <span className="text-xs text-ttfc-dim">As on the speaker cards · drag to move</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {prep.note && <Banner tone="warn">{prep.note}</Banner>}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Zoom</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" icon={ZoomOut} aria-label="Zoom out" onClick={() => setZoom(zoom / 1.1)} disabled={zoom <= 1.001} />
                <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Zoom" className="h-2 flex-1 cursor-pointer accent-ttfc-pink" />
                <Button size="sm" variant="ghost" icon={ZoomIn} aria-label="Zoom in" onClick={() => setZoom(zoom * 1.1)} disabled={zoom >= 3.999} />
              </div>
            </div>
            <Switch
              label="Light purple background"
              description={prep.cutout ? "The background is removed and replaced with the TTFC light purple. Turn off to keep the photo's own background (if the cut-out looks wrong around hair or glasses)." : "Not available for this photo."}
              checked={removeBg && !!prep.cutout}
              disabled={!prep.cutout}
              onChange={setRemoveBg}
            />
            <div>
              <Button size="sm" icon={RotateCcw} onClick={() => setCrop(prep.crop)}>Use the suggested crop</Button>
              <p className="mt-2 text-xs text-ttfc-dim">{prep.face ? "Suggested from the face: head and shoulders, the same size in every speaker photo." : "No face found: the suggestion is a guess."}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
