import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Copy, ImagePlus, LayoutTemplate, Plus, Trash2, Upload } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, Select, Switch,
} from "../ui";
import { loadArtAssets, loadImg, renderPost } from "./postArt";
import { BOX_LABEL, KIND_LABEL, PALETTE, TEXT_BOXES, defaultBoxes, rulesText, sampleSpec } from "./templateLayout";

/* =========================================================
   Marketing › Post templates (Nov 23 2026). Management uploads a blank design (no words or photos on it) for each
   size and marks where everything goes: drag a box to move it, drag its corner to resize it, and set its rules on
   the right (alignment, colours, sizes, lines, character limits; for photos the gap, card and how many per row;
   for logos the fit and the smallest acceptable file). A live preview with sample content shows the result.
   Ready templates appear in Social posts › Create from a template next to the built-in designs. Staff can look.
   API: /api/console/post-templates (rules: backend services/postTemplateLibrary.js, here templateLayout.js).
========================================================= */

const CH = ["linkedin", "x", "instagram"];
const CH_LABEL = { linkedin: "LinkedIn", x: "X", instagram: "Instagram" };
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const chip = (on) => ({ borderColor: on ? "#D6308C" : "#E3E0EE", background: on ? "#FBE9F3" : "#fff" });

/* ---------------- a colour picker: the brand colours, or any hex ---------------- */
function Colour({ label, value, onChange }) {
  return (
    <Field label={label}>{(id) => (
      <div className="flex flex-wrap items-center gap-1.5">
        {PALETTE.map((c) => (
          <button key={c} type="button" aria-label={c} aria-pressed={value === c} onClick={() => onChange(c)}
            className="h-6 w-6 rounded-md border" style={{ background: c, borderColor: value === c ? "#D6308C" : "#CFCBE0", outline: value === c ? "2px solid #D6308C" : "none" }} />
        ))}
        <Input id={id} className="h-8 min-h-0 w-24 py-0 text-xs" value={value || ""} placeholder="#RRGGBB" onChange={(e) => onChange(e.target.value.trim())} />
      </div>
    )}</Field>
  );
}

const Seg = ({ label, value, options, onChange }) => (
  <Field label={label}>{() => (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className="h-8 rounded-lg border px-2.5 text-xs font-semibold" style={chip(value === v)}>{l}</button>
      ))}
    </div>
  )}</Field>
);
const Num = ({ label, value, onChange, min, max, step = 1, hint }) => (
  <Field label={label} hint={hint}>{(id) => <Input id={id} type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />}</Field>
);
const Pct = ({ label, value, onChange, min = 0, max = 100, hint }) => (
  <Field label={`${label}: ${Math.round((value || 0) * 100)}%`} hint={hint}>{(id) => (
    <input id={id} type="range" min={min} max={max} value={Math.round((value || 0) * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} className="w-full accent-[#D6308C]" />
  )}</Field>
);

/* ---------------- the rules of one box ---------------- */
function BoxRules({ k, b, set }) {
  const u = (patch) => set({ ...b, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <Switch label={`Show the ${BOX_LABEL[k].toLowerCase()}`} checked={b.on !== false} onChange={(on) => u({ on })} />
      <Seg label="Across" value={b.align} options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]} onChange={(align) => u({ align })} />
      <Seg label="Up and down" value={b.valign} options={[["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]]} onChange={(valign) => u({ valign })} />
      {TEXT_BOXES.includes(k) && <>
        <Colour label="Colour" value={b.color} onChange={(color) => u({ color })} />
        {k === "title" && <>
          <Switch label="Two colours" description="The words up to the colon (or the first two) in the accent colour." checked={!!b.twoTone} onChange={(twoTone) => u({ twoTone })} />
          {b.twoTone && <Colour label="Accent colour" value={b.accent} onChange={(accent) => u({ accent })} />}
        </>}
        <div className="grid grid-cols-2 gap-2">
          <Num label="Largest size (px)" value={b.size} min={8} max={300} onChange={(size) => u({ size })} />
          <Num label="Smallest size (px)" value={b.minSize} min={6} max={300} onChange={(minSize) => u({ minSize })} />
          <Num label="Lines" value={b.maxLines} min={1} max={8} onChange={(maxLines) => u({ maxLines })} />
          <Num label="Characters (0 = any)" value={b.maxChars} min={0} max={500} onChange={(maxChars) => u({ maxChars })} />
        </div>
        <Field label="Weight">{(id) => (
          <Select id={id} value={String(b.weight)} onChange={(e) => u({ weight: Number(e.target.value) })}>
            {[[400, "Regular"], [500, "Medium"], [600, "Semi-bold"], [700, "Bold"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        )}</Field>
        <div className="flex flex-wrap gap-4">
          <Switch label="Italics" checked={!!b.italic} onChange={(italic) => u({ italic })} />
          <Switch label="Capitals" checked={!!b.upper} onChange={(upper) => u({ upper })} />
        </div>
        <Colour label="Background behind the words (empty = none)" value={b.fill} onChange={(fill) => u({ fill })} />
      </>}
      {k === "people" && <>
        <Seg label="Photos" value={b.card} options={[["card", "Cut out on a card"], ["cutout", "Cut out, no card"], ["photo", "As they are"]]} onChange={(card) => u({ card })} />
        {b.card !== "photo" && <Colour label="Card colour" value={b.cardColor} onChange={(cardColor) => u({ cardColor })} />}
        <Pct label="Corner rounding" value={b.radius} max={50} onChange={(radius) => u({ radius })} />
        <Pct label="Gap between people" value={b.gap} max={30} onChange={(gap) => u({ gap })} hint="A share of the image width." />
        <Pct label="Widest photo" value={b.maxCard} min={10} max={100} onChange={(maxCard) => u({ maxCard })} hint="One speaker stays this size, centred; more people share the row." />
        <Num label="Most people in a row" value={b.perRow} min={1} max={6} onChange={(perRow) => u({ perRow })} />
        <Switch label="Role, name, title and organisation under each photo" checked={!!b.labels} onChange={(labels) => u({ labels })} />
        {b.labels && <>
          <Colour label="Name colour" value={b.nameColor} onChange={(nameColor) => u({ nameColor })} />
          <Colour label="Other words colour" value={b.labelColor} onChange={(labelColor) => u({ labelColor })} />
        </>}
      </>}
      {(k === "logo" || k === "photo") && <>
        <Seg label="Fit" value={b.fit} options={[["contain", "Whole, inside the box"], ["cover", "Fill the box"]]} onChange={(fit) => u({ fit })} />
        <Colour label="Card behind it (empty = none)" value={b.card} onChange={(card) => u({ card })} />
        <Pct label="Corner rounding" value={b.radius} max={50} onChange={(radius) => u({ radius })} />
        {k === "logo" && <Num label="Smallest logo file (px wide)" value={b.minPx} min={0} max={4000} onChange={(minPx) => u({ minPx })} hint="Smaller files are flagged as likely to look blurry." />}
      </>}
      {k === "brand" && <Seg label="TTFC logo" value={b.variant} options={[["dark", "Dark words"], ["white", "White words"]]} onChange={(variant) => u({ variant })} />}
    </div>
  );
}

/* ---------------- the editor ---------------- */
function Editor({ meta, template, onSaved, canEdit }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [t, setT] = useState(() => clone(template));
  const [channel, setChannel] = useState("linkedin");
  const [sel, setSel] = useState("title");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState(null);
  const [bgs, setBgs] = useState({});
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const fileRef = useRef(null);
  const kind = t.kind;
  const [W, H] = meta.sizes[kind][channel];
  const layout = t.channels?.[channel] || null;
  const boxes = useMemo(() => layout?.boxes || {}, [layout]);
  const keys = meta.boxes[kind];
  const dirty = JSON.stringify(t) !== JSON.stringify(template);

  useEffect(() => { loadArtAssets().then(setAssets).catch(() => setAssets({})); }, []);
  // The blank designs, loaded once each.
  useEffect(() => {
    for (const c of CH) {
      const url = t.channels?.[c]?.background?.url;
      if (url && bgs[c]?.srcUrl !== url) loadImg(`${url.split("?")[0]}?w=${meta.sizes[kind][c][0]}&fm=png`).then((img) => setBgs((x) => ({ ...x, [c]: Object.assign(img, { srcUrl: url }) }))).catch(() => {});
    }
  }, [t.channels, kind, meta.sizes]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawn = useMemo(() => {
    if (!assets || !layout?.background) return null;
    const spec = { ...sampleSpec(kind), template: { channels: { [channel]: layout } }, backgrounds: { [channel]: bgs[channel] || null } };
    return renderPost(spec, channel, assets);
  }, [assets, layout, bgs, channel, kind]);

  useEffect(() => {
    const out = canvasRef.current;
    if (!out || !drawn) return;
    out.width = W; out.height = H;
    const ctx = out.getContext("2d");
    ctx.drawImage(drawn, 0, 0);
    for (const k of keys) {
      const b = boxes[k];
      if (!b) continue;
      const on = k === sel;
      ctx.save();
      ctx.lineWidth = on ? Math.max(3, W / 300) : Math.max(1.5, W / 700);
      ctx.strokeStyle = on ? "#D6308C" : b.on === false ? "rgba(120,120,140,0.35)" : "rgba(214,48,140,0.45)";
      ctx.setLineDash(on ? [] : [10, 8]);
      ctx.strokeRect(b.x * W, b.y * H, b.w * W, b.h * H);
      ctx.font = `600 ${Math.round(W / 70)}px Poppins, system-ui, sans-serif`;
      ctx.fillStyle = on ? "#D6308C" : "rgba(214,48,140,0.7)";
      ctx.fillText(BOX_LABEL[k], b.x * W + 4, b.y * H - 6 > 12 ? b.y * H - 6 : b.y * H + Math.round(W / 60));
      if (on) { const hs = Math.max(14, W / 70); ctx.fillRect((b.x + b.w) * W - hs, (b.y + b.h) * H - hs, hs, hs); }
      ctx.restore();
    }
  }, [drawn, boxes, sel, keys, W, H]);

  const setBox = (k, b) => setT((x) => ({ ...x, channels: { ...x.channels, [channel]: { ...x.channels[channel], boxes: { ...x.channels[channel].boxes, [k]: b } } } }));
  const toFrac = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
  };
  const onDown = (e) => {
    if (!canEdit || !layout) return;
    const { fx, fy } = toFrac(e);
    const hs = Math.max(14, W / 70) / W;
    const cur = boxes[sel];
    if (cur && fx >= cur.x + cur.w - hs * 1.5 && fx <= cur.x + cur.w + hs * 0.5 && fy >= cur.y + cur.h - hs * 1.5 * (W / H) && fy <= cur.y + cur.h + hs) {
      drag.current = { k: sel, mode: "resize", fx, fy, b: cur }; canvasRef.current.setPointerCapture?.(e.pointerId); return;
    }
    const order = [sel, ...[...keys].reverse().filter((k) => k !== sel)];
    const hit = order.find((k) => { const b = boxes[k]; return b && fx >= b.x && fx <= b.x + b.w && fy >= b.y && fy <= b.y + b.h; });
    if (!hit) return;
    setSel(hit);
    drag.current = { k: hit, mode: "move", fx, fy, b: boxes[hit] };
    canvasRef.current.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const { fx, fy } = toFrac(e);
    const dx = fx - d.fx, dy = fy - d.fy;
    const b = { ...d.b };
    if (d.mode === "move") { b.x = Math.min(1 - b.w, Math.max(0, d.b.x + dx)); b.y = Math.min(1 - b.h, Math.max(0, d.b.y + dy)); }
    else { b.w = Math.min(1 - b.x, Math.max(0.02, d.b.w + dx)); b.h = Math.min(1 - b.y, Math.max(0.02, d.b.h + dy)); }
    setBox(d.k, b);
  };
  const onUp = () => { drag.current = null; };

  // Upload a blank design: resized (covering) to this size, so every channel's image is exactly its size.
  const upload = async (file) => {
    if (!file || !/^image\//.test(file.type)) { toast.error("Choose an image (PNG or JPG)."); return; }
    setUploading(true);
    try {
      const img = await loadImg(URL.createObjectURL(file));
      const ratio = (img.naturalWidth / img.naturalHeight) / (W / H);
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      const r = await adminFetch("/cms/upload", { method: "POST", body: { data: c.toDataURL("image/jpeg", 0.92), filename: `ttfc-template-${kind}-${channel}.jpg` } });
      setT((x) => ({ ...x, channels: { ...x.channels, [channel]: { background: { url: r.url, w: W, h: H }, boxes: x.channels?.[channel]?.boxes || clone(x.channels?.linkedin?.boxes) || defaultBoxes(kind) } } }));
      if (Math.abs(ratio - 1) > 0.02) toast.info?.(`That design is ${img.naturalWidth} × ${img.naturalHeight}; ${CH_LABEL[channel]} is ${W} × ${H}, so its edges were trimmed to fit.`);
      else toast.success("Blank design added. Now place the boxes.");
    } catch (err) { toast.error(err); } finally { setUploading(false); }
  };
  const copyFromLinkedin = () => setT((x) => ({ ...x, channels: { ...x.channels, [channel]: { ...x.channels[channel], boxes: clone(x.channels.linkedin.boxes) } } }));
  const resetBoxes = () => setT((x) => ({ ...x, channels: { ...x.channels, [channel]: { ...x.channels[channel], boxes: defaultBoxes(kind) } } }));

  const save = async (patch = {}) => {
    setSaving(true);
    try {
      const r = await adminFetch(`/console/post-templates/${t.id}`, { method: "PATCH", body: { name: t.name, notes: t.notes, channels: t.channels, ...patch } });
      setT(clone(r.template)); onSaved(r.template);
      toast.success(patch.status === "ready" ? "Ready: it's offered when posts are made." : patch.status === "draft" ? "Back to draft." : "Saved");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => navigate("/admin/post-templates")}>All templates</Button>
        <Badge tone="purple">{KIND_LABEL[kind]}</Badge>
        <Badge tone={template.status === "ready" ? "good" : "neutral"}>{template.status === "ready" ? "Ready" : "Draft"}</Badge>
      </div>
      <Banner tone="info" className="lg:hidden" title="Easier on a computer">You can look at templates here; placing the boxes works best on a larger screen.</Banner>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">{(id) => <Input id={id} value={t.name} disabled={!canEdit} onChange={(e) => setT((x) => ({ ...x, name: e.target.value }))} />}</Field>
        <Field label="Notes (optional)">{(id) => <Input id={id} value={t.notes || ""} disabled={!canEdit} placeholder="When to use it" onChange={(e) => setT((x) => ({ ...x, notes: e.target.value }))} />}</Field>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CH.map((c) => (
          <button key={c} type="button" aria-pressed={channel === c} onClick={() => setChannel(c)} className="h-8 rounded-full border px-3 text-xs font-semibold" style={chip(channel === c)}>
            {CH_LABEL[c]} · {meta.sizes[kind][c].join(" × ")}{t.channels?.[c]?.background ? "" : " · no design"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload(f); }} />
              <Button size="sm" icon={layout?.background ? Upload : ImagePlus} loading={uploading} onClick={() => fileRef.current?.click()}>
                {layout?.background ? "Replace the blank design" : `Upload the blank ${CH_LABEL[channel]} design`}
              </Button>
              {channel !== "linkedin" && t.channels?.linkedin?.boxes && layout?.background && <Button size="sm" variant="ghost" icon={Copy} onClick={copyFromLinkedin}>Use LinkedIn's box positions</Button>}
              {layout?.background && <Button size="sm" variant="ghost" onClick={resetBoxes}>Reset boxes</Button>}
            </div>
          )}
          {layout?.background ? (
            <div className="flex justify-center rounded-lg bg-[#F1F0F5] p-2">
              <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                role="img" aria-label={`${CH_LABEL[channel]} template preview with sample content`}
                className="h-auto max-h-[70vh] w-auto max-w-full touch-none rounded-md shadow-sm" style={{ aspectRatio: `${W} / ${H}`, cursor: canEdit ? "move" : "default" }} />
            </div>
          ) : (
            <EmptyState icon={ImagePlus} title={`No ${CH_LABEL[channel]} design yet`}
              body={`Upload a blank design, ${W} × ${H} pixels, with no words or photos on it (export it from Canva or Figma). ${channel === "linkedin" ? "LinkedIn's comes first." : "Without one, posts use the built-in design on this channel."}`} />
          )}
          <p className="text-xs text-[#6B6688]">The preview uses sample names. Drag a box to move it; drag the pink corner to resize it.</p>
        </div>
        {layout?.background && (
          <Card className="flex w-full flex-col gap-3 lg:w-[340px]">
            <Field label="Box">{(id) => (
              <Select id={id} value={sel} onChange={(e) => setSel(e.target.value)}>
                {keys.map((k) => <option key={k} value={k}>{BOX_LABEL[k]}{boxes[k]?.on === false ? " (hidden)" : ""}</option>)}
              </Select>
            )}</Field>
            {boxes[sel] ? (canEdit ? <BoxRules k={sel} b={boxes[sel]} set={(b) => setBox(sel, b)} /> : <p className="text-xs text-[#6B6688]">Management changes templates.</p>)
              : canEdit && <Button size="sm" icon={Plus} onClick={() => setBox(sel, defaultBoxes(kind)[sel])}>Add the {BOX_LABEL[sel].toLowerCase()}</Button>}
          </Card>
        )}
      </div>
      {layout?.background && (
        <Card className="flex flex-col gap-1.5">
          <b className="text-[13px] text-[#151035]">This template's rules on {CH_LABEL[channel]}</b>
          <ul className="list-disc pl-5 text-[13px] leading-6 text-[#4A4566]">{rulesText(kind, boxes).map((r) => <li key={r}>{r}</li>)}</ul>
        </Card>
      )}
      {template.problems?.length > 0 && <Banner tone="warn" title="Before it can be marked ready">{template.problems.join(" ")}</Banner>}
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          {template.status === "ready"
            ? <Button loading={saving} onClick={() => save({ status: "draft" })}>Back to draft</Button>
            : <Button loading={saving} disabled={dirty} onClick={() => save({ status: "ready" })} title={dirty ? "Save first" : undefined}>Mark ready</Button>}
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => save()}>Save</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- the page ---------------- */
export default function PostTemplateLibrary() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const list = useApi("/console/post-templates");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "session" });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const id = params.get("edit");

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  const meta = list.data;
  const templates = meta.templates || [];
  const upsert = (tp) => list.setData((d) => ({ ...d, templates: d.templates.some((x) => x.id === tp.id) ? d.templates.map((x) => (x.id === tp.id ? tp : x)) : [tp, ...d.templates] }));

  const create = async () => {
    setBusy(true);
    try {
      const r = await adminFetch("/console/post-templates", { method: "POST", body: form });
      upsert(r.template); setCreating(false); setForm({ name: "", kind: "session" });
      setParams({ edit: r.template.id });
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };

  const editing = id && templates.find((x) => x.id === id);
  return (
    <div>
      <PageHeader title="Post templates" description="Your own blank designs for Social posts › Create from a template, with the rules for where the title, photos, logo, date and venue go."
        actions={meta.canEdit ? <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New template</Button> : null} />
      {editing ? (
        <Editor key={editing.id + editing.updatedAt} meta={meta} template={editing} canEdit={meta.canEdit} onSaved={upsert} />
      ) : !templates.length ? (
        <EmptyState icon={LayoutTemplate} title="No templates yet" body={meta.canEdit ? "Press New template, pick what it's for, then upload a blank design and place the boxes." : "Management adds templates here."}
          action={meta.canEdit ? <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New template</Button> : null} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((tp) => (
            <Card key={tp.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <b className="min-w-0 flex-1 text-sm text-[#151035]">{tp.name}</b>
                <Badge tone={tp.status === "ready" ? "good" : "neutral"}>{tp.status === "ready" ? "Ready" : "Draft"}</Badge>
              </div>
              <span className="text-xs text-[#6B6688]">{KIND_LABEL[tp.kind]} · {CH.filter((c) => tp.channels?.[c]?.background).map((c) => CH_LABEL[c]).join(", ") || "no designs yet"}</span>
              {tp.channels?.linkedin?.background?.url && <img src={`${tp.channels.linkedin.background.url.split("?")[0]}?w=480`} alt="" className="w-full rounded-lg border border-[#E3E0EE]" />}
              {tp.problems?.length > 0 && <p className="text-xs text-[#B45309]">{tp.problems[0]}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setParams({ edit: tp.id })}>{meta.canEdit ? "Edit" : "View"}</Button>
                {meta.canEdit && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(tp)}>Delete</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New template" description="Pick what it's for. You'll upload the blank design and place the boxes next."
        footer={<div className="flex justify-end gap-2"><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!form.name.trim()} onClick={create}>Create</Button></div>}>
        <div className="flex flex-col gap-3">
          <Field label="Name">{(fid) => <Input id={fid} value={form.name} placeholder="Panel, white with dots" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}</Field>
          <Field label="For">{(fid) => (
            <Select id={fid} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              {meta.kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </Select>
          )}</Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this template?" body="Posts already made with it keep their images." confirmLabel="Delete"
        onConfirm={async () => { await adminFetch(`/console/post-templates/${deleting.id}`, { method: "DELETE" }); list.setData((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== deleting.id) })); setDeleting(null); toast.success("Deleted"); }} />
    </div>
  );
}
