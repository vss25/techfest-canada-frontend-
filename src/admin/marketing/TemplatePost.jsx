import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Maximize2, Minus, Move, Plus, RotateCcw, Sparkles } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import { Link } from "react-router-dom";
import { Banner, Button, Field, Modal, Select, Spinner, Switch } from "../ui";
import { TEMPLATES, buildPost, templateOf } from "./postTemplates";
import { designsFor, loadArtAssets, loadImg, renderPost, sizeFor } from "./postArt";
import { rulesProblems } from "./templateLayout";

/* =========================================================
   Social posts › "Create from a template" (Nov 23 2026). One click makes a finished post for LinkedIn, X and
   Instagram: Claude writes each channel's copy from the agenda, speaker profiles, partner or event page (the
   template's rules, no em-dashes), and the page draws the template's image in each channel's size.

   The owner (Nov 23): "update photos of individuals, template library for each type of post, and edit the
   placement of images, logos or individuals … preview it and expand it before finalizing it … use the finalized
   image within the LinkedIn post". So:
     - Design: the library for the kind of post (postArt.js DESIGNS), picked with one click.
     - Photos: every person's photo can be replaced ("Change photo"); it's cut out and framed automatically.
     - Expand: a channel's image opens large; drag any photo or logo to move it, the size buttons or the mouse
       wheel resize it, arrows nudge it; per channel, with a reset.
     - Create post: the images as they are now are saved on the post (LinkedIn's is the post's LinkedIn image),
       ready to download and post with the copy.
========================================================= */

const CH = ["linkedin", "x", "instagram"];
const CH_LABEL = { linkedin: "LinkedIn", x: "X", instagram: "Instagram" };
const sized = (url, w) => (url && /cdn\.sanity\.io\/images\//.test(url) ? `${url.split("?")[0]}?w=${w}&auto=format&fm=png` : url);
const idOf = (d) => d?._id || "";
const byName = (a, b) => String(a.name || "").trim().localeCompare(String(b.name || "").trim(), "en", { sensitivity: "base" });

/* Every speaker photo is cut out (the website's own photo studio, run in this browser) and framed as a
   transparent 4:5 portrait, so it stands on the template's purple card or white page like TTFC's posts.
   One cut-out per photo per page. No cut-out (no person found, the tools didn't load): the photo as it is. */
const portraits = new Map();
function portraitOf(source, { wide = false } = {}) {
  if (!source) return Promise.resolve(null);
  const key = `${source instanceof File ? `${source.name}:${source.size}:${source.lastModified}` : source}|${wide}`;
  if (!portraits.has(key)) {
    portraits.set(key, (async () => {
      const { preparePhoto } = await import("../cms/speakerPhoto");
      const prep = await preparePhoto(source);
      const src = prep.cutout || prep.original;
      let { x, y, h } = prep.crop;
      if (wide) { const g = h * 0.35; x -= (g * 4) / 5 / 2; h += g; y = Math.max(0, y - g * 0.15); }  // more shoulders for the big photo
      const w = (h * 4) / 5;
      const c = document.createElement("canvas");
      c.width = 800; c.height = 1000;
      c.getContext("2d").drawImage(src, x, y, w, h, 0, 0, 800, 1000);
      return { canvas: c, cutout: !!prep.cutout, note: prep.note || "" };
    })().catch((err) => { portraits.delete(key); throw err; }));
  }
  return portraits.get(key);
}

/** What each movable thing is called in the editor. */
function itemLabel(key, spec) {
  if (key === "brand") return "TTFC logo";
  if (key === "logo") return "Partner logo";
  if (key === "photo") return "Event photo";
  const i = Number(String(key).replace("person", ""));
  return spec?.people?.[i]?.name || "Photo";
}

/* ---------------- the large editor ---------------- */
function Editor({ spec, assets, channel, setChannel, adjust, setAdjust, onClose }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [selected, setSelected] = useState("");
  const adj = useMemo(() => adjust[channel] || {}, [adjust, channel]);
  // The image as it stands (and where each photo or logo landed), redrawn on every change; then shown with the selection.
  const drawn = useMemo(() => renderPost({ ...spec, adjust: adj }, channel, assets), [spec, adj, channel, assets]);
  const boxes = drawn.boxes;
  useEffect(() => {
    const out = ref.current;
    if (!out) return;
    out.width = drawn.width; out.height = drawn.height;
    const ctx = out.getContext("2d");
    ctx.drawImage(drawn, 0, 0);
    const b = boxes.filter((x) => x.key === selected).pop();
    if (b) {
      ctx.save();
      ctx.strokeStyle = "#D6308C"; ctx.lineWidth = Math.max(3, drawn.width / 300); ctx.setLineDash([12, 8]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
  }, [drawn, boxes, selected]);

  const keys = useMemo(() => [...new Set(boxes.map((b) => b.key))], [boxes]);

  const update = (key, patch) => setAdjust((all) => {
    const cur = all[channel] || {};
    const it = { dx: 0, dy: 0, s: 1, ...(cur[key] || {}) };
    const next = { ...it, ...patch(it) };
    next.s = Math.max(0.3, Math.min(3, next.s));
    next.dx = Math.max(-1, Math.min(1, next.dx));
    next.dy = Math.max(-1, Math.min(1, next.dy));
    return { ...all, [channel]: { ...cur, [key]: next } };
  });
  const toCanvas = (e) => {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ref.current.width, y: ((e.clientY - r.top) / r.height) * ref.current.height };
  };
  const onDown = (e) => {
    const p = toCanvas(e);
    const hit = [...boxes].reverse().find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    if (!hit) { setSelected(""); return; }
    setSelected(hit.key);
    drag.current = { key: hit.key, x: p.x, y: p.y };
    ref.current.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = toCanvas(e);
    const { key, x, y } = drag.current;
    const W = ref.current.width, H = ref.current.height;
    drag.current = { key, x: p.x, y: p.y };
    update(key, (it) => ({ dx: it.dx + (p.x - x) / W, dy: it.dy + (p.y - y) / H }));
  };
  const onUp = () => { drag.current = null; };
  // The mouse wheel resizes the selected photo or logo (a listener that may stop the page from scrolling).
  const wheel = useRef(null);
  useEffect(() => {
    wheel.current = (e) => {
      if (!selected) return;
      e.preventDefault();
      update(selected, (it) => ({ s: it.s * (e.deltaY < 0 ? 1.05 : 0.95) }));
    };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const on = (e) => wheel.current?.(e);
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);
  const onKey = (e) => {
    if (!selected) return;
    const step = e.shiftKey ? 0.02 : 0.005;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    update(selected, (it) => ({ dx: it.dx + d[0], dy: it.dy + d[1] }));
  };
  const [W, H] = sizeFor(spec.kind, channel, spec.design);
  const chip = (on) => ({ borderColor: on ? "#D6308C" : "#E3E0EE", background: on ? "#FBE9F3" : "#fff" });

  return (
    <Modal open onClose={onClose} size="xl" title="Adjust the image"
      description="Drag a photo or logo to move it. Make it bigger or smaller with the buttons or your mouse wheel; arrow keys nudge it. Each channel keeps its own placement."
      footer={<div className="flex flex-wrap items-center justify-end gap-2">
        <Button icon={RotateCcw} onClick={() => setAdjust((all) => ({ ...all, [channel]: {} }))}>Reset {CH_LABEL[channel]}</Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CH.map((c) => (
            <button key={c} type="button" aria-pressed={channel === c} onClick={() => setChannel(c)} className="h-8 rounded-full border px-3 text-xs font-semibold" style={chip(channel === c)}>
              {CH_LABEL[c]} · {sizeFor(spec.kind, c, spec.design).join(" × ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-[#6B6688]"><Move className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Move:</span>
          {keys.map((k) => (
            <button key={k} type="button" aria-pressed={selected === k} onClick={() => setSelected(k)} className="h-7 rounded-full border px-2.5 font-semibold" style={chip(selected === k)}>{itemLabel(k, spec)}</button>
          ))}
          {selected && <>
            <Button size="sm" icon={Minus} onClick={() => update(selected, (it) => ({ s: it.s / 1.1 }))}>Smaller</Button>
            <Button size="sm" icon={Plus} onClick={() => update(selected, (it) => ({ s: it.s * 1.1 }))}>Bigger</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdjust((all) => { const cur = { ...(all[channel] || {}) }; delete cur[selected]; return { ...all, [channel]: cur }; })}>Put it back</Button>
          </>}
        </div>
        <div className="flex justify-center rounded-lg bg-[#F1F0F5] p-2">
          <canvas ref={ref} tabIndex={0} role="img" aria-label={`${CH_LABEL[channel]} image, ${W} by ${H}. Select a photo or logo and use the arrow keys to move it.`}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
            className="h-auto max-h-[62vh] w-auto max-w-full cursor-move touch-none rounded-md shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]"
            style={{ aspectRatio: `${W} / ${H}` }} />
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- the dialog ---------------- */
export default function TemplatePost({ open, onClose, onCreated, writing }) {
  const toast = useToast();
  const { current } = useAdminEvent();
  const [template, setTemplate] = useState("");
  const [itemId, setItemId] = useState("");
  const [eventId, setEventId] = useState("");
  const [design, setDesign] = useState("");
  const [photos, setPhotos] = useState({});         // person index → File (a replaced photo)
  const [notes, setNotes] = useState({});           // person index → what the cut-out said
  const [adjust, setAdjust] = useState({});         // channel → { key: { dx, dy, s } }
  const [loaded, setLoaded] = useState(null);       // { assets, people, logo, scene } for the current choice
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState("");       // the channel open in the large editor
  const [step, setStep] = useState("");
  const [allEvents, setAllEvents] = useState(false);  // also list speakers / sessions / partners from other events
  const fileRefs = useRef({});

  const t = templateOf(template);
  const events = useApi(open ? "/cms/event?drafts=1" : null);
  const speakers = useApi(open && t && (t.source === "speaker" || t.source === "session") ? "/cms/speaker?drafts=1" : null);
  const sessions = useApi(open && t && (t.source === "speaker" || t.source === "session") ? "/cms/session?drafts=1" : null);
  const partners = useApi(open && t?.source === "partner" ? "/cms/partner?drafts=1" : null);
  const uploaded = useApi(open ? "/console/post-templates" : null);   // ready ones join the design library

  const evList = useMemo(() => (Array.isArray(events.data) ? events.data : []).filter((e) => String(e.name || "").trim()).sort((a, b) => String(a.startDate || "9").localeCompare(String(b.startDate || "9"))), [events.data]);
  useEffect(() => { if (!eventId && evList.length) setEventId(idOf(evList.find((e) => idOf(e) === idOf(current)) || evList.find((e) => e.startDate && e.startDate >= new Date().toISOString().slice(0, 10)) || evList[0])); }, [evList, eventId, current]);
  const event = evList.find((e) => idOf(e) === eventId) || null;

  const list = (d) => (Array.isArray(d) ? d : []);
  // What can be announced, then what belongs to the chosen event: a record's events (none = every event), and for
  // partners also the event rows of the Partners page. Switched-off partners never show (they're off the website too).
  const usable = !t ? [] : t.source === "speaker" ? list(speakers.data).filter((x) => String(x.name || "").trim()).sort(byName)
    : t.source === "session" ? list(sessions.data).filter((s) => !s.isBreak && (s.speakers || []).length).sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`))
      : t.source === "partner" ? list(partners.data).filter((p) => p.active !== false && String(p.name || "").trim()).sort(byName)
        : evList;
  const onEvent = (x) => {
    const refs = [...(x.events || []), ...(x.eventRows || []).map((r) => r?.event)].map((e) => e?._ref || e?._id || e).filter(Boolean);
    return !refs.length || refs.includes(eventId);
  };
  const forEvent = t?.source === "event" ? usable : usable.filter(onEvent);
  const items = allEvents ? usable : forEvent;
  const switchedOff = t?.source === "partner" ? list(partners.data).filter((p) => p.active === false).length : 0;
  const item = t?.source === "event" ? event : items.find((x) => idOf(x) === itemId) || null;
  const built = useMemo(() => (t ? buildPost({ template, item, event, speakers: list(speakers.data), sessions: list(sessions.data) }) : null),
    [t, template, item, event, speakers.data, sessions.data]);
  const kind = built?.spec?.kind || "";
  const custom = useMemo(() => (uploaded.data?.templates || []).filter((x) => x.status === "ready" && x.kind === kind), [uploaded.data, kind]);
  const designs = useMemo(() => (kind ? [
    ...designsFor(kind),
    ...custom.map((x) => ({ key: `tpl:${x.id}`, label: x.name, hint: x.notes || "Uploaded in Post templates", template: x })),
  ] : []), [kind, custom]);
  const chosenTemplate = designs.find((d) => d.key === design)?.template || null;
  // An uploaded template's blank designs, loaded once each.
  const [backgrounds, setBackgrounds] = useState({});
  useEffect(() => {
    if (!chosenTemplate) { setBackgrounds({}); return undefined; }
    let alive = true;
    Promise.all(CH.map(async (c) => {
      const url = chosenTemplate.channels?.[c]?.background?.url;
      return [c, url ? await loadImg(`${url.split("?")[0]}?w=${sizeFor(kind, c)[0]}&fm=png`).catch(() => null) : null];
    })).then((pairs) => { if (alive) setBackgrounds(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [chosenTemplate, kind]);

  // Reset what depends on the template / the item.
  useEffect(() => { setItemId(""); setPhotos({}); setNotes({}); setAdjust({}); setDesign(""); }, [template]);
  useEffect(() => { setPhotos({}); setNotes({}); setAdjust({}); }, [itemId]);
  useEffect(() => { if (kind && !designs.some((d) => d.key === design)) setDesign(designs[0].key); }, [kind, designs, design]);
  // A new event: pick again from its own list.
  useEffect(() => { setItemId(""); }, [eventId]);

  // Load what the images need (photos cut out, logos, the city photo). Drawing itself is quick and happens on every change.
  useEffect(() => {
    if (!open || !built || built.problems?.length) { setLoaded(null); return undefined; }
    let alive = true;
    setLoading(true);
    (async () => {
      const assets = await loadArtAssets();
      const people = await Promise.all((built.people || []).map(async (p, i) => {
        const source = photos[i] || sized(p.url, 1400);
        const made = await portraitOf(source, { wide: kind === "keynote" }).catch(() => null);
        if (photos[i] && made && alive) setNotes((n) => ({ ...n, [i]: made.note }));
        const img = made?.canvas || (await loadImg(photos[i] ? URL.createObjectURL(photos[i]) : sized(p.url, 800)).catch(() => null));
        return { ...p, img, cutout: !!made?.cutout };
      }));
      const logo = built.logoUrl ? await loadImg(sized(built.logoUrl, 1000)).catch(() => null) : null;
      const scene = built.photoUrl ? await loadImg(sized(built.photoUrl, 1800)).catch(() => null) : null;
      if (alive) setLoaded({ assets, people, logo, scene });
    })().catch((err) => { if (alive) { setLoaded(null); toast.error(err); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, built, photos, kind, toast]);

  const spec = useMemo(() => (built && loaded && design ? {
    ...built.spec, design, people: loaded.people, logo: loaded.logo, photo: loaded.scene,
    template: chosenTemplate, backgrounds: chosenTemplate ? backgrounds : null,
  } : null), [built, loaded, design, chosenTemplate, backgrounds]);
  // What this post breaks of the chosen template's rules (only uploaded templates carry rules).
  const ruleIssues = useMemo(() => (spec && chosenTemplate ? rulesProblems(spec, chosenTemplate.channels?.linkedin) : []), [spec, chosenTemplate]);
  const previews = useMemo(() => {
    if (!spec) return null;
    return Object.fromEntries(CH.map((c) => { const canvas = renderPost({ ...spec, adjust: adjust[c] || {} }, c, loaded.assets); return [c, { canvas, url: canvas.toDataURL("image/jpeg", 0.85) }]; }));
  }, [spec, adjust, loaded]);

  const create = async () => {
    if (!built || built.problems.length || !previews) return;
    let texts = built.fallback;
    let usedFallback = !writing;
    try {
      if (writing) {
        setStep("Writing the copy for each channel…");
        try {
          const r = await adminFetch("/console/social/write", { method: "POST", body: { channels: CH, template, source: built.source, link: built.link, eventName: built.eventName } });
          texts = { ...built.fallback, ...Object.fromEntries(CH.filter((c) => String(r.texts?.[c] || "").trim()).map((c) => [c, r.texts[c]])) };
        } catch (err) {
          if (!["no_key", "budget"].includes(err?.code)) throw err;
          usedFallback = true;
        }
      }
      setStep("Saving the images…");
      const base = built.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "post";
      const images = {};
      for (const c of CH) {
        const r = await adminFetch("/cms/upload", { method: "POST", body: { data: previews[c].canvas.toDataURL("image/jpeg", 0.92), filename: `ttfc-${base}-${c}.jpg` } });
        images[c] = { url: r.url, alt: `${built.title}. ${built.eventName}.` };
      }
      setStep("Creating the post…");
      const at = new Date().toISOString();
      const r = await adminFetch("/console/social/posts", { method: "POST", body: {
        title: built.title, text: texts.linkedin, template, images,
        channels: { linkedin: true, x: true, instagram: true },
        versions: Object.fromEntries(["x", "instagram"].map((c) => [c, { own: true, list: [{ text: texts[c], ai: !usedFallback, at }], chosen: 0 }])),
        eventKey: event?.eventKey?.current || event?.eventKey || "", eventName: built.eventName,
        source: { kind: t.source, id: idOf(item), label: built.title },
      } });
      toast.success(usedFallback ? "Post created with the template's standard wording (Claude isn't available right now)." : "Post created. Check it, then submit it for approval.");
      onCreated?.(r.post);
    } catch (err) { toast.error(err); } finally { setStep(""); }
  };

  const listLoading = events.loading || speakers.loading || sessions.loading || partners.loading;
  const itemText = (x) => (t?.source === "session" ? `Day ${x.day} ${x.time || ""} · ${x.title}` : x.name || x.title || "Untitled");
  const busy = !!step;
  const people = built?.people || [];
  const chip = (on) => ({ borderColor: on ? "#D6308C" : "#E3E0EE", background: on ? "#FBE9F3" : "#fff" });
  const onFile = (i, file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error("Choose a photo (JPG, PNG or WebP)."); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("That photo is too big (over 25 MB)."); return; }
    setPhotos((p) => ({ ...p, [i]: file }));
  };

  return (
    <>
      <Modal open={open && !editing} onClose={busy ? () => {} : onClose} size="lg" title="Create from a template"
        description="Pick what to announce and a design. Claude writes the post for LinkedIn, X and Instagram, and the images are made in each size."
        footer={<div className="flex flex-wrap items-center justify-end gap-2">
          {step && <span className="mr-auto inline-flex items-center gap-2 text-xs text-[#6B6688]"><Spinner className="h-4 w-4" />{step}</span>}
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon={Sparkles} loading={busy} disabled={!previews || loading || !!built?.problems?.length} onClick={create}>Create post</Button>
        </div>}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((x) => (
              <button key={x.key} type="button" aria-pressed={template === x.key} onClick={() => setTemplate(x.key)}
                className="flex flex-col gap-0.5 rounded-[10px] border p-3 text-left transition" style={chip(template === x.key)}>
                <b className="text-[13px] text-[#151035]">{x.label}</b>
                <span className="text-xs text-[#6B6688]">{x.hint}</span>
              </button>
            ))}
          </div>

          {t && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Event" hint={t.source === "event" ? undefined : `Pick the event first: the list shows its ${{ speaker: "speakers", session: "sessions", partner: "partners" }[t.source]}.`}>{(id) => (
                  <Select id={id} value={eventId} disabled={events.loading || busy} onChange={(e) => setEventId(e.target.value)}>
                    {evList.map((e) => <option key={idOf(e)} value={idOf(e)}>{[e.name, e.startDate].filter(Boolean).join(" · ")}</option>)}
                  </Select>
                )}</Field>
                {t.source !== "event" && (
                  <Field label={{ speaker: "Speaker", session: "Session", partner: "Partner" }[t.source]}
                    hint={listLoading ? undefined : `${items.length} ${allEvents ? "in all" : "for this event"}`}>{(id) => (
                    <Select id={id} value={itemId} disabled={listLoading || busy || !items.length} onChange={(e) => setItemId(e.target.value)}>
                      <option value="">{listLoading ? "Loading…" : items.length ? "Choose…" : "None yet"}</option>
                      {items.map((x) => <option key={idOf(x)} value={idOf(x)}>{itemText(x)}{allEvents && !onEvent(x) ? " (another event)" : ""}</option>)}
                    </Select>
                  )}</Field>
                )}
              </div>
              {t.source !== "event" && !listLoading && (
                <Switch label="Also show other events" checked={allEvents} onChange={setAllEvents}
                  description="For someone returning from an earlier event, or a partner that isn't tagged to this one yet." />
              )}
              {t.source !== "event" && !listLoading && !forEvent.length && (
                <Banner tone="info" title={`No ${{ speaker: "speakers", session: "sessions", partner: "partners" }[t.source]} for ${event?.name || "this event"} yet`}>
                  {t.source === "session"
                    ? <>Sessions show up once they're on this event's agenda with their speakers: <Link className="font-semibold underline" to="/admin/content/agenda">Content › Agenda</Link>.</>
                    : <>To make one appear here, open it in <Link className="font-semibold underline" to={t.source === "partner" ? "/admin/content/partners" : "/admin/content/speakers"}>{t.source === "partner" ? "Content › Partners & sponsors" : "Content › Speakers"}</Link>, tick {event?.name || "this event"} under Events (or leave Events empty for every event){t.source === "partner" ? ", make sure it's switched on (Active) and has a logo" : " and make sure it has a photo"}, then send it to staging. Or switch on “Also show other events”.</>}
                </Banner>
              )}
              {switchedOff > 0 && !listLoading && <p className="text-xs text-[#6B6688]">{switchedOff} partners are switched off in Content › Partners & sponsors, so they aren't listed.</p>}
            </div>
          )}

          {designs.length > 1 && (item || t?.source === "event") && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[13px] font-semibold text-[#151035]">Design</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {designs.map((d) => (
                  <button key={d.key} type="button" aria-pressed={design === d.key} onClick={() => { setDesign(d.key); setAdjust({}); }}
                    className="flex flex-col gap-0.5 rounded-[10px] border p-2.5 text-left" style={chip(design === d.key)}>
                    <b className="text-[12.5px] text-[#151035]">{d.label}{d.template ? <span className="ml-1 rounded bg-[#EDE9FE] px-1 text-[10px] font-semibold text-[#5B21B6]">Yours</span> : null}</b>
                    <span className="text-[11px] text-[#6B6688]">{d.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {people.length > 0 && !built?.problems?.length && (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#F0EEF6] bg-[#FBFAFE] p-3">
              <p className="text-[13px] font-semibold text-[#151035]">Photos</p>
              {people.map((p, i) => (
                <div key={`${p.name}-${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm text-[#151035]">
                    <b>{p.name}</b>
                    <span className="block text-xs text-[#6B6688]">
                      {photos[i] ? (notes[i] || `Using ${photos[i].name}, cut out automatically.`) : p.url ? "The photo on the website." : "No photo on the website yet."}
                    </span>
                  </span>
                  <input ref={(el) => { fileRefs.current[i] = el; }} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onFile(i, f); }} />
                  <Button size="sm" icon={ImagePlus} disabled={busy} onClick={() => fileRefs.current[i]?.click()}>{photos[i] || p.url ? "Change photo" : "Add photo"}</Button>
                  {photos[i] && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPhotos((x) => { const n = { ...x }; delete n[i]; return n; })}>Use the website photo</Button>}
                </div>
              ))}
            </div>
          )}

          {built?.problems?.length > 0 && t && (item || t.source === "event") && <Banner tone="warn">{built.problems.join(" ")}</Banner>}

          {ruleIssues.length > 0 && <Banner tone="warn" title="Check against the template's rules">{ruleIssues.join(" ")}</Banner>}
          {chosenTemplate && CH.some((c) => !chosenTemplate.channels?.[c]?.background) && (
            <p className="text-xs text-[#6B6688]">{CH.filter((c) => !chosenTemplate.channels?.[c]?.background).map((c) => CH_LABEL[c]).join(" and ")} use{CH.filter((c) => !chosenTemplate.channels?.[c]?.background).length === 1 ? "s" : ""} the built-in design: this template has no design for {CH.filter((c) => !chosenTemplate.channels?.[c]?.background).length === 1 ? "it" : "them"}.</p>
          )}
          {previews ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-[#151035]">The images {loading && <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-[#6B6688]"><Spinner className="h-3.5 w-3.5" /> updating…</span>}</p>
              <p className="text-xs text-[#6B6688]">Click an image to see it large and move or resize the photos and logos.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1.3fr_0.85fr]">
                {CH.map((c) => (
                  <figure key={c} className={`flex flex-col gap-1 ${c === "instagram" ? "col-span-2 mx-auto w-2/3 sm:col-span-1 sm:w-full" : ""}`}>
                    <button type="button" onClick={() => setEditing(c)} aria-label={`Open the ${CH_LABEL[c]} image large`}
                      className="group relative overflow-hidden rounded-lg border border-[#E3E0EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]">
                      <img src={previews[c].url} alt="" className="w-full" />
                      <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-[#151035]/80 px-1.5 py-1 text-[10px] font-semibold text-white">
                        <Maximize2 className="h-3 w-3" aria-hidden="true" /> Expand
                      </span>
                    </button>
                    <figcaption className="text-[11px] text-[#6B6688]">{CH_LABEL[c]} · {sizeFor(kind, c, design).join(" × ")}{Object.keys(adjust[c] || {}).length ? " · adjusted" : ""}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : t && (item || t.source === "event") && !built?.problems?.length ? (
            <div className="flex items-center gap-2 text-xs text-[#6B6688]"><Spinner className="h-4 w-4" /> Making the images (cutting out the photos takes a few seconds the first time)…</div>
          ) : null}

          {!writing && <Banner tone="info">Claude isn't switched on yet, so the post uses the template's standard wording. It's still ready to post.</Banner>}
        </div>
      </Modal>
      {editing && spec && (
        <Editor spec={spec} assets={loaded.assets} channel={editing} setChannel={setEditing} adjust={adjust} setAdjust={setAdjust} onClose={() => setEditing("")} />
      )}
    </>
  );
}
