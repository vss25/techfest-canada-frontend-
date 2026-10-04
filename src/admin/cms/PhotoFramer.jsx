import { useRef, useState } from "react";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { Button, Modal, focusRing } from "../ui";
import { useDebounced } from "../hooks";
import { speakerPhotoUrl } from "../../utils/sanity";
import { MAX_ZOOM, MIN_ZOOM, region, stateFromImage, toSanity } from "./framing";

const FRAME = 280;

/** Small previews built with the same Sanity image URL the website uses. */
export function FramedPreview({ assetId, framing, size = 96, round = false, className = "" }) {
  if (!assetId) return null;
  const url = speakerPhotoUrl({ asset: { _ref: assetId }, ...(framing || {}) }, size * 2);
  return (
    <img src={url} alt="" width={size} height={size}
      className={`shrink-0 border border-ttfc-line bg-ttfc-ink object-cover ${round ? "rounded-full" : "rounded-xl"} ${className}`}
      style={{ width: size, height: size }} />
  );
}

/**
 * "Adjust photo": drag to reposition, slider (or +/−, arrow keys) to zoom.
 * Calls onApply({ crop, hotspot }) with Sanity crop/hotspot values.
 */
export default function PhotoFramer({ open, onClose, onApply, assetId, imageUrl, dims, image }) {
  const [state, setState] = useState(() => stateFromImage(image, dims));
  const drag = useRef(null);
  const debounced = useDebounced(state, 300);

  if (!dims) return null;
  const { left, top, side } = region(state, dims);
  const scale = FRAME / side;
  const update = (patch) => setState((s) => region({ ...s, ...patch }, dims).state);
  const moveBy = (dxPx, dyPx) => setState((s) => region({ ...s, cx: s.cx + dxPx / dims.width, cy: s.cy + dyPx / dims.height }, dims).state);

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    // Dragging the photo right shows more of its left side → region moves left.
    moveBy((-dx / FRAME) * side, (-dy / FRAME) * side);
  };
  const onPointerUp = () => { drag.current = null; };
  // Trackpad pinch (ctrl+wheel) zooms; plain scrolling is left alone.
  const onWheel = (e) => { if (e.ctrlKey) update({ zoom: state.zoom - e.deltaY * 0.01 }); };
  const onKeyDown = (e) => {
    const step = side * (e.shiftKey ? 0.1 : 0.02);
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[e.key]) { e.preventDefault(); moveBy(...map[e.key]); }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); update({ zoom: state.zoom + 0.1 }); }
    if (e.key === "-" || e.key === "_") { e.preventDefault(); update({ zoom: state.zoom - 0.1 }); }
  };

  const src = imageUrl.startsWith("data:") ? imageUrl : `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}w=1400&fit=max&auto=format`;
  const preview = toSanity(debounced, dims);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Adjust photo"
      description="Drag the photo to move it and use the slider to zoom. The website and the app show exactly the square below."
      footer={<>
        <Button variant="ghost" icon={RotateCcw} onClick={() => setState({ zoom: 1, cx: 0.5, cy: 0.5 })} className="sm:mr-auto">Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onApply(toSanity(state, dims))}>Use this framing</Button>
      </>}
    >
      <div className="flex flex-col items-center gap-6 pb-2 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-3">
          <div
            role="application"
            aria-label="Photo framing. Use arrow keys to move, plus and minus to zoom."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
            className={`relative cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-ttfc-ink active:cursor-grabbing ${focusRing}`}
            style={{ width: FRAME, height: FRAME }}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ width: dims.width * scale, height: dims.height * scale, left: -left * scale, top: -top * scale }}
            />
            {/* circle guide (agenda chips and some cards are round) */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(11,7,22,0.35)] ring-1 ring-white/40" />
            <span className="pointer-events-none absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
              <Move className="h-3 w-3" aria-hidden="true" /> Drag to move
            </span>
          </div>
          <div className="flex w-full max-w-[280px] items-center gap-2">
            <button type="button" onClick={() => update({ zoom: state.zoom - 0.1 })} aria-label="Zoom out" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 ${focusRing}`}><Minus className="h-4 w-4" /></button>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={state.zoom}
              onChange={(e) => update({ zoom: Number(e.target.value) })} aria-label="Zoom" className="h-2 flex-1 cursor-pointer accent-[#E8458B]" />
            <button type="button" onClick={() => update({ zoom: state.zoom + 0.1 })} aria-label="Zoom in" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 ${focusRing}`}><Plus className="h-4 w-4" /></button>
            <span className="w-12 text-right text-xs tabular-nums text-ttfc-muted">{state.zoom.toFixed(1)}×</span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">On the website</p>
          <div className="flex items-end gap-4">
            <div className="text-center"><FramedPreview assetId={assetId} framing={preview} size={112} /><p className="mt-1 text-[11px] text-ttfc-dim">Speaker card</p></div>
            <div className="text-center"><FramedPreview assetId={assetId} framing={preview} size={48} round /><p className="mt-1 text-[11px] text-ttfc-dim">Agenda</p></div>
          </div>
          <p className="max-w-[220px] text-xs text-ttfc-muted">Previews come straight from the image service, so they match the site exactly. Remember to save the speaker afterwards.</p>
        </div>
      </div>
    </Modal>
  );
}
