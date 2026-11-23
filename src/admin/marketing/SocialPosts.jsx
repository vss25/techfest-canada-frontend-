import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Copy, Download, ImagePlus, Megaphone, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { useAdmin } from "../adminContext";
import { useAdminEvent } from "../eventContext";
import { useAutosave } from "../cms/useAutosave";
import { AutosaveNote } from "../cms/AutosaveNote";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Select, Tabs, Textarea,
} from "../ui";
import { CHANNELS, STATUS, TIMEZONES, isoToZoned, lengthFor, textFor, whenLabel, zonedToIso } from "./socialShared";
import TemplatePost from "./TemplatePost";

/* =========================================================
   Admin › Marketing › Social posts (Nov 18 2026), the approved design's composer:
   the main post (LinkedIn) with X and Instagram versions Claude writes from it ("Write X and
   Instagram versions"; "Suggest another" keeps every version so the team can flip back; each
   can be edited; "Use the main text" drops it), channel switches with character counts, one
   photo cropped per channel, a time and time zone, Submit for approval (management approves,
   asks for changes or rejects), then post by hand: copy the text, download the photo, mark
   posted with the post's link (a contract's promised post is ticked with it).
   "Write about…" drafts the main post from a speaker, session, partner or event page.
   Drafts save automatically 30 seconds after a change. API: /api/console/social.
========================================================= */

const BLANK = { title: "", text: "", channels: { linkedin: true, instagram: true, x: true }, versions: { x: { own: false, list: [], chosen: 0 }, instagram: { own: false, list: [], chosen: 0 } },
                image: null, scheduledAt: null, timezone: "America/Toronto", source: null, contractRef: null };
const LIMIT = Object.fromEntries(CHANNELS.map((c) => [c.key, c.limit]));
const SLOTS = [["09:00", "9:00 AM"], ["12:00", "12:00 PM"], ["17:30", "5:30 PM"]];

const formOf = (p) => ({
  title: p.title || "", text: p.text || "", channels: { ...BLANK.channels, ...(p.channels || {}) },
  versions: { x: { ...BLANK.versions.x, ...(p.versions?.x || {}) }, instagram: { ...BLANK.versions.instagram, ...(p.versions?.instagram || {}) } },
  image: p.image?.url ? { url: p.image.url, alt: p.image.alt || "" } : null, scheduledAt: p.scheduledAt || null,
  images: Object.fromEntries(["linkedin", "instagram", "x"].filter((c) => p.images?.[c]?.url).map((c) => [c, { url: p.images[c].url, alt: p.images[c].alt || "" }])),
  template: p.template || "",
  timezone: p.timezone || "America/Toronto", source: p.source?.kind ? p.source : null, contractRef: p.contractRef?.contractId ? p.contractRef : null,
  eventKey: p.eventKey || "", eventName: p.eventName || "",
});

/* A templated post has its own designed image per channel (Nov 23 2026); others crop the one photo. */
const imageOf = (form, ch) => (form.images?.[ch]?.url ? form.images[ch].url.split("?")[0] : form.image ? cropUrl(form.image.url, ch) : "");
const hasImage = (form) => !!form.image || Object.keys(form.images || {}).length > 0;
const cropUrl = (url, ch) => {
  const size = { linkedin: [1200, 627], instagram: [1080, 1350], x: [1600, 900] }[ch];
  return url ? `${String(url).split("?")[0]}?w=${size[0]}&h=${size[1]}&fit=crop&crop=entropy&auto=format&q=85` : "";
};

/* ---------------- "Write about…": website content as source material ---------------- */
const SOURCES = [
  { key: "speaker", label: "A speaker", name: (d) => d.name, text: (d) => [`Speaker: ${d.name}`, [d.title, d.company].filter(Boolean).join(", "), d.bio].filter(Boolean).join("\n"), img: (d) => d.imageUrl },
  { key: "session", label: "A session", name: (d) => d.title, text: (d) => [`Session: ${d.title}`, d.day && `Day ${d.day}`, d.time, d.stage, d.description || d.summary].filter(Boolean).join("\n"), img: () => "" },
  { key: "partner", label: "A partner", name: (d) => d.name, text: (d) => [`Partner: ${d.name}`, d.description, d.website].filter(Boolean).join("\n"), img: (d) => d.logoUrl },
  { key: "event", label: "An event page", name: (d) => d.name, text: (d) => [`Event: ${d.name}`, d.city, d.startDate, d.tagline, d.theme, d.description, d.statusNote].filter(Boolean).join("\n"), img: (d) => d.heroImageUrl || d.citySkylineUrl },
];

function WriteAbout({ onWritten, eventName, disabled }) {
  const toast = useToast();
  const [kind, setKind] = useState("");
  const [pick, setPick] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useApi(kind && kind !== "text" ? `/cms/${kind}?drafts=1` : null);
  const src = SOURCES.find((s) => s.key === kind);
  const docs = Array.isArray(list.data) ? list.data : [];
  const doc = docs.find((d) => d._id === pick);
  const write = async () => {
    const source = kind === "text" ? pasted : doc ? src.text(doc) : "";
    if (!source.trim()) { toast.error("Pick something to write about first."); return; }
    setBusy(true);
    try {
      const r = await adminFetch("/console/social/write", { method: "POST", body: { channels: ["linkedin"], source, eventName } });
      onWritten({ text: r.texts.linkedin, image: doc && src.img(doc) ? src.img(doc) : "",
                  source: kind === "text" ? { kind: "text", id: "", label: "Pasted text" } : { kind, id: doc._id, label: src.name(doc) } });
      toast.success("Main post written. Edit it, then write the X and Instagram versions.");
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[#F0EEF6] bg-[#FBFAFE] p-3">
      <p className="text-[13px] font-semibold text-[#151035]">✦ Write about…</p>
      <div className="flex flex-wrap gap-2">
        <Select className="w-44" aria-label="What to write about" value={kind} disabled={disabled} onChange={(e) => { setKind(e.target.value); setPick(""); }}>
          <option value="">Choose…</option>
          {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="text">Pasted text</option>
        </Select>
        {src && (
          <Select className="min-w-0 flex-1" aria-label={src.label} value={pick} disabled={disabled || list.loading} onChange={(e) => setPick(e.target.value)}>
            <option value="">{list.loading ? "Loading…" : `Pick ${src.label.toLowerCase()}`}</option>
            {docs.map((d) => <option key={d._id} value={d._id}>{src.name(d) || "Untitled"}</option>)}
          </Select>
        )}
        <Button size="md" icon={Sparkles} loading={busy} disabled={disabled || !kind} onClick={write}>Write the main post</Button>
      </div>
      {kind === "text" && <Textarea rows={3} aria-label="Text to write about" placeholder="Paste a press release, announcement or notes" value={pasted} onChange={(e) => setPasted(e.target.value)} />}
    </div>
  );
}

/* ---------------- the composer ---------------- */
function Composer({ id, settings, onSaved, onDeleted }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { isManagement } = useAdmin();
  const { current } = useAdminEvent();
  const [params] = useSearchParams();
  const isNew = id === "new";
  const loaded = useApi(isNew ? null : `/console/social/posts/${id}`);
  const post = loaded.data?.post || null;
  const [form, setForm] = useState(null);
  const [base, setBase] = useState("");
  const [tab, setTab] = useState("main");
  const [preview, setPreview] = useState("linkedin");
  const [writing, setWriting] = useState("");
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);
  const [postLinks, setPostLinks] = useState({});
  const [reviewNote, setReviewNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (form) return;
    if (!isNew && post) { const f = formOf(post); setForm(f); setBase(JSON.stringify(f)); }
    if (isNew) {
      const date = params.get("date");
      const ch = params.get("channel");
      const f = formOf({
        ...BLANK, eventKey: current ? (current.eventKey?.current || current.eventKey || "") : "", eventName: current?.name || "",
        scheduledAt: date ? zonedToIso(date, "10:00", "America/Toronto") : null,
        channels: ch ? { linkedin: ch === "linkedin", instagram: ch === "instagram", x: ch === "x" } : BLANK.channels,
        contractRef: params.get("contract") ? { contractId: params.get("contract"), key: params.get("key") || "", label: params.get("label") || "" } : null,
        title: params.get("label") || "",
      });
      setForm(f); setBase("");
    }
  }, [isNew, post, form, params, current]);

  const value = form ? JSON.stringify(form) : "";
  const dirty = !!form && value !== base;
  const status = post?.status || "draft";
  const posted = post?.posted || {};

  const save = async ({ quiet = false } = {}) => {
    if (isNew) {
      const r = await adminFetch("/console/social/posts", { method: "POST", body: form });
      setBase(value); onSaved?.(r.post);
      navigate(`/admin/social?id=${r.post.id}`, { replace: true });
      return true;
    }
    const r = await adminFetch(`/console/social/posts/${id}`, { method: "PATCH", body: form });
    loaded.setData({ post: r.post }); setBase(value); onSaved?.(r.post);
    if (!quiet && r.post.review?.state === "" && post?.review?.state === "approved") toast.info?.("Changed after approval: it needs approving again.");
    return true;
  };
  // A new post is created by its first autosave, once something is written.
  const auto = useAutosave({ value, enabled: !!form, save: async () => {
    if (!dirty || saving) return false;
    if (isNew && !String(form.text || "").trim() && !String(form.title || "").trim()) return false;
    return save({ quiet: true });
  } });
  const saveNow = async () => {
    setSaving(true);
    try { await save(); auto.markSaved(); toast.success(isNew ? "Post saved" : "Saved"); }
    catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const act = async (path, body, msg) => {
    try {
      if (dirty) await save({ quiet: true });
      const r = await adminFetch(`/console/social/posts/${id}${path}`, { method: "POST", body });
      loaded.setData({ post: r.post }); onSaved?.(r.post); toast.success(msg);
    } catch (err) { toast.error(err); }
  };

  if (!isNew && loaded.loading) return <LoadingState />;
  if (!isNew && loaded.error) return <ErrorState error={loaded.error} onRetry={loaded.reload} />;
  if (!form) return <LoadingState />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setVersion = (ch, patch) => setForm((f) => ({ ...f, versions: { ...f.versions, [ch]: { ...f.versions[ch], ...patch } } }));
  const text = (ch) => textFor(form, ch);
  const len = (ch) => lengthFor(ch, text(ch));
  const over = (ch) => form.channels[ch] && len(ch) > LIMIT[ch];

  // Claude writes versions: both at once, or one more for a channel ("Suggest another").
  const writeVersions = async (channels, { another = false } = {}) => {
    if (!form.text.trim()) { toast.error("Write the main post first."); return; }
    setWriting(channels.join(","));
    try {
      const previous = Object.fromEntries(channels.map((c) => [c, another ? form.versions[c].list.map((v) => v.text) : []]));
      const r = await adminFetch("/console/social/write", { method: "POST", body: { channels, main: form.text, previous, instruction, eventName: form.eventName } });
      setForm((f) => {
        const versions = { ...f.versions };
        for (const c of channels) {
          const list = [...(versions[c].list || []), { text: r.texts[c], ai: true, at: new Date().toISOString() }].slice(-12);
          versions[c] = { own: true, list, chosen: list.length - 1 };
        }
        return { ...f, versions };
      });
      if (channels.length === 1) setTab(channels[0]);
      else setTab("x");
      setPreview(channels.length === 1 ? channels[0] : "x");
    } catch (err) { toast.error(err); } finally { setWriting(""); }
  };

  const editTab = tab === "main" ? null : tab;
  const v = editTab ? form.versions[editTab] : null;
  const editingText = editTab ? (v.own && v.list.length ? v.list[v.chosen].text : form.text) : form.text;
  const onEdit = (val) => {
    if (!editTab) return set("text", val);
    if (!v.own || !v.list.length) {
      const list = [...v.list, { text: val, ai: false, edited: true, at: new Date().toISOString() }];
      return setVersion(editTab, { own: true, list, chosen: list.length - 1 });
    }
    setVersion(editTab, { list: v.list.map((x, i) => (i === v.chosen ? { ...x, text: val, edited: true } : x)) });
  };

  const upload = async (file) => {
    if (!/^image\//.test(file.type)) { toast.error("Choose a photo (JPG or PNG)."); return; }
    if (file.size > 6 * 1024 * 1024) { toast.error("Photos must be under 6 MB."); return; }
    const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    try { const r = await adminFetch("/cms/upload", { method: "POST", body: { data, filename: file.name } }); set("image", { url: r.url, alt: "" }); toast.success("Photo added and resized for each channel"); }
    catch (err) { toast.error(err); }
  };

  const zoned = isoToZoned(form.scheduledAt, form.timezone);
  const setWhen = (date, time, tz = form.timezone) => set("scheduledAt", zonedToIso(date, time || "10:00", tz));
  const problems = [!form.text.trim() && "Write the post.", ...CHANNELS.filter((c) => over(c.key)).map((c) => `Shorten the ${c.label} text, or switch ${c.label} off.`)].filter(Boolean);
  const editable = status !== "posted" && status !== "late";
  const anyPosted = CHANNELS.some((c) => posted[c.key]?.at);

  // Preview
  const pv = preview;
  const pvText = text(pv);
  const handle = { linkedin: settings?.handles?.linkedin || "The Tech Festival Canada", instagram: settings?.handles?.instagram || "thetechfestival", x: `The Tech Festival Canada @${settings?.handles?.x || "thetechfestival"}` }[pv];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/social" className="inline-flex items-center gap-1 text-xs font-semibold text-ttfc-muted hover:text-ttfc-text"><ChevronLeft className="h-3.5 w-3.5" /> All posts</Link>
        {!isNew && <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: STATUS[status]?.[1], color: STATUS[status]?.[0], border: `1px solid ${STATUS[status]?.[0]}` }}>{STATUS[status]?.[2]}</span>}
        {form.contractRef && <Badge tone="purple">For contract: {form.contractRef.label}</Badge>}
        {post?.review?.note && ["changes", "rejected"].includes(post.review.state) && <Badge tone="warn">{post.review.by}: {post.review.note}</Badge>}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-[#E3E0EE] bg-white">
          <div className="flex items-center gap-2.5 px-4 pb-1.5 pt-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#151035] text-[11px] font-bold text-white">TTFC</span>
            <div className="min-w-0 flex-1">
              <Input aria-label="Post name (only the team sees it)" placeholder="Name this post (only the team sees it)" value={form.title} disabled={!editable} onChange={(e) => set("title", e.target.value)} className="border-transparent px-0 font-semibold" />
              <p className="text-xs text-[#6B6688]">Post to: Anyone{form.eventName ? ` · ${form.eventName}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-1.5">
            {CHANNELS.map((c) => {
              const on = form.channels[c.key];
              return (
                <button key={c.key} type="button" disabled={!editable} aria-pressed={on} onClick={() => set("channels", { ...form.channels, [c.key]: !on })}
                  className="flex h-[30px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold"
                  style={on ? (over(c.key) ? { background: "#FEE2E2", color: "#B91C1C", borderColor: "#B91C1C" } : { background: "#151035", color: "#fff", borderColor: "#151035" }) : { background: "#fff", color: "#6B6688", borderColor: "#E3E0EE" }}>
                  {c.label}<span className="font-medium opacity-80">{on ? `${len(c.key).toLocaleString()} / ${c.limit.toLocaleString()}` : "off"}</span>
                </button>
              );
            })}
          </div>
          {editable && <div className="px-3 pb-2"><WriteAbout disabled={!editable} eventName={form.eventName}
            onWritten={({ text: t, image, source }) => setForm((f) => ({ ...f, text: t, source, image: f.image || (image && /cdn\.sanity\.io\/images\//.test(image) ? { url: image, alt: "" } : null) }))} /></div>}
          <div role="tablist" aria-label="Text for each channel" className="flex flex-wrap items-center gap-1 border-b border-[#F0EEF6] px-3 pt-2">
            {[["main", "Main post · LinkedIn"], ["x", "X"], ["instagram", "Instagram"]].map(([k, label]) => {
              const on = tab === k;
              const tag = k !== "main" && form.versions[k].own ? (form.versions[k].list[form.versions[k].chosen]?.edited ? "edited" : "suggested") : "";
              return (
                <button key={k} type="button" role="tab" aria-selected={on} onClick={() => { setTab(k); if (k !== "main") setPreview(k); else setPreview("linkedin"); }}
                  className="flex h-[34px] items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-semibold" style={{ color: on ? "#151035" : "#6B6688", boxShadow: `inset 0 -2px 0 ${on ? "#D6308C" : "transparent"}` }}>
                  {label}{tag && <span className="rounded-full bg-[#FBE9F3] px-1.5 text-[10px] font-bold text-[#9D1D63]">{tag}</span>}
                </button>
              );
            })}
            {editable && (
              <button type="button" disabled={!!writing} onClick={() => writeVersions(["x", "instagram"])} className="ml-auto h-[30px] whitespace-nowrap rounded-full px-2.5 text-xs font-semibold text-[#D6308C] disabled:opacity-50">
                {writing === "x,instagram" ? "Writing…" : form.versions.x.own && form.versions.instagram.own ? "✦ Rewrite X and Instagram" : "✦ Write X and Instagram versions"}
              </button>
            )}
          </div>
          <textarea aria-label={{ main: "Main post text", x: "Text for X", instagram: "Instagram caption" }[tab]} value={editingText} disabled={!editable}
            onChange={(e) => onEdit(e.target.value)} placeholder="What do you want to talk about?"
            className="block min-h-[190px] w-full resize-y border-0 bg-white px-4 py-3.5 text-[15px] leading-[23px] text-[#151035] outline-none" />
          {editTab && (
            <div className="flex flex-wrap items-center gap-3 px-4 pb-2.5 text-xs text-[#6B6688]">
              <span>{editTab === "x" ? "Shortened to fit 280, link kept, 1–2 hashtags" : "Hook first, “link in bio”, 3–5 hashtags"}</span>
              {v.own && v.list.length > 1 && (
                <span className="inline-flex items-center gap-1">
                  <button type="button" aria-label="Previous version" disabled={v.chosen === 0} onClick={() => setVersion(editTab, { chosen: v.chosen - 1 })} className="disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  Version {v.chosen + 1} of {v.list.length}
                  <button type="button" aria-label="Next version" disabled={v.chosen >= v.list.length - 1} onClick={() => setVersion(editTab, { chosen: v.chosen + 1 })} className="disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
                </span>
              )}
              {editable && <button type="button" disabled={!!writing} onClick={() => writeVersions([editTab], { another: v.own })} className="font-semibold text-[#D6308C] disabled:opacity-50">{writing === editTab ? "Writing…" : v.own ? "Suggest another" : `Write the ${editTab === "x" ? "X" : "Instagram"} version`}</button>}
              {editable && v.own && <button type="button" onClick={() => setVersion(editTab, { own: false })} className="font-semibold text-[#6B6688]">Use the main text</button>}
            </div>
          )}
          {editable && (
            <div className="px-4 pb-2.5">
              <Input aria-label="Direction for Claude" placeholder="Direction for Claude (optional): shorter, mention the early-bird price, more playful…" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="text-xs" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            {Object.keys(form.images || {}).length > 0 ? (
              <div className="flex items-center gap-2">
                {["linkedin", "x", "instagram"].filter((c) => form.images[c]).map((c) => <img key={c} src={`${imageOf(form, c)}?w=240`} alt="" className={`h-[76px] rounded-lg object-cover ${c === "instagram" ? "w-[61px]" : "w-[120px]"}`} />)}
                <span className="text-[11px] font-bold text-[#B45309]">MADE FOR EACH CHANNEL</span>
              </div>
            ) : form.image ? (
              <div className="flex items-center gap-2">
                <img src={cropUrl(form.image.url, "linkedin")} alt="" className="h-[76px] w-[120px] rounded-lg object-cover" />
                <div className="flex flex-col gap-1 text-[11px]">
                  <span className="font-bold text-[#B45309]">RESIZED FOR {CHANNELS.filter((c) => form.channels[c.key]).length} CHANNELS</span>
                  {editable && <button type="button" className="text-left font-semibold text-[#6B6688]" onClick={() => set("image", null)}>Remove photo</button>}
                </div>
              </div>
            ) : null}
            {editable && !Object.keys(form.images || {}).length && <>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#C9C3DE] bg-[#FBFAFE] text-[11px] font-semibold text-[#D6308C]">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />{form.image ? "Replace" : "Photo"}
              </button>
            </>}
          </div>

          {/* Schedule */}
          <div className="mx-3 mb-2.5 flex flex-col gap-2.5 rounded-[10px] border border-[#E3E0EE] p-3.5">
            <b className="flex items-center gap-1.5 text-sm"><CalendarClock className="h-4 w-4" aria-hidden="true" /> When it goes out</b>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
              <Field label="Date">{(fid) => <Input id={fid} type="date" value={zoned.date} disabled={!editable} onChange={(e) => setWhen(e.target.value, zoned.time)} />}</Field>
              <Field label="Time">{(fid) => <Input id={fid} type="time" value={zoned.time} disabled={!editable || !zoned.date} onChange={(e) => setWhen(zoned.date, e.target.value)} />}</Field>
              <Field label="Time zone">{(fid) => (
                <Select id={fid} value={form.timezone} disabled={!editable} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value, scheduledAt: zoned.date ? zonedToIso(zoned.date, zoned.time, e.target.value) : f.scheduledAt }))}>
                  {TIMEZONES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              )}</Field>
            </div>
            {editable && zoned.date && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B6688]">Good times:
                {SLOTS.map(([t, l]) => (
                  <button key={t} type="button" onClick={() => setWhen(zoned.date, t)} className="h-7 rounded-full border px-2.5 font-semibold text-[#151035]" style={{ borderColor: zoned.time === t ? "#D6308C" : "#E3E0EE", background: zoned.time === t ? "#FBE9F3" : "#fff" }}>{l}</button>
                ))}
                <button type="button" onClick={() => set("scheduledAt", null)} className="font-semibold">Clear</button>
              </div>
            )}
          </div>

          {/* Approval */}
          {!isNew && (
            <div className="mx-3 mb-2.5 flex flex-col gap-2 rounded-[10px] border border-[#E3E0EE] p-3.5">
              {status === "review" ? (
                isManagement ? (
                  <>
                    <b className="text-[13px]">Waiting for approval{post.review?.requestedBy ? ` · sent by ${post.review.requestedBy}` : ""}</b>
                    <Input aria-label="Note to the author" placeholder="Note to the author (for changes or a rejection)" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="dangerOutline" onClick={() => act("/review", { decision: "reject", note: reviewNote }, "Rejected")}>Reject</Button>
                      <Button size="sm" onClick={() => act("/review", { decision: "changes", note: reviewNote }, "Sent back with your note")}>Request changes</Button>
                      <Button size="sm" variant="success" icon={Check} onClick={() => act("/review", { decision: "approve" }, "Approved")}>Approve</Button>
                    </div>
                  </>
                ) : <p className="text-[13px] text-[#6B6688]">Sent for approval. A manager approves it in Social posts.</p>
              ) : ["approved", "scheduled", "missed", "posted", "late"].includes(status) || post.review?.state === "approved" ? (
                <>
                  <b className="text-[13px]">Approved by {post.review?.by}. Post it from the TTFC accounts:</b>
                  {CHANNELS.filter((c) => form.channels[c.key]).map((c) => {
                    const done = posted[c.key]?.at;
                    return (
                      <div key={c.key} className="flex flex-wrap items-center gap-2 border-t border-[#F6F5FA] pt-2 text-[13px]">
                        <span className="w-20 font-semibold">{c.label}</span>
                        {done ? (
                          <>
                            <Badge tone="good">Posted {whenLabel(done, form.timezone)}</Badge>
                            {posted[c.key].url && <a href={posted[c.key].url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#D6308C] underline">Open the post</a>}
                            <button type="button" className="ml-auto text-xs font-semibold text-[#6B6688]" onClick={() => act("/posted", { channel: c.key, posted: false }, `${c.label} marked not posted`)}>Undo</button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" icon={Copy} onClick={() => navigator.clipboard.writeText(text(c.key)).then(() => toast.success(`${c.label} text copied`), () => toast.error("Couldn't copy"))}>Copy text</Button>
                            {hasImage(form) && <a className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ttfc-line px-3 text-xs font-semibold" href={`${imageOf(form, c.key)}${imageOf(form, c.key).includes("?") ? "&" : "?"}dl=ttfc-${c.key}.jpg`}><Download className="h-4 w-4" aria-hidden="true" /> Image {c.size}</a>}
                            <Input className="h-8 min-h-0 w-56 flex-1 py-0 text-xs" aria-label={`${c.label} post link`} placeholder="Link to the post (https://…)" value={postLinks[c.key] || ""} onChange={(e) => setPostLinks((l) => ({ ...l, [c.key]: e.target.value }))} />
                            <Button size="sm" variant="primary" onClick={() => act("/posted", { channel: c.key, url: postLinks[c.key] || "" }, `${c.label} marked posted`)}>Mark posted</Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-[13px] text-[#6B6688]">{problems.length ? problems.join(" ") : isManagement ? "Approve it yourself, or send it to another manager." : "A manager approves it before it goes out."}</span>
                  {isManagement && <Button size="sm" variant="success" icon={Check} disabled={!!problems.length} onClick={async () => { await act("/submit", {}, "Sent for approval"); await act("/review", { decision: "approve" }, "Approved"); }}>Approve now</Button>}
                  <Button size="sm" icon={Send} disabled={!!problems.length} onClick={() => act("/submit", {}, "Sent for approval")}>Submit for approval</Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEF6] px-3 py-2">
            {!isNew && !anyPosted && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>}
            <span className="ml-auto text-xs text-[#6B6688]">{form.scheduledAt ? `Goes out ${whenLabel(form.scheduledAt, form.timezone)}` : "No time set"}</span>
            {!isNew && <AutosaveNote auto={auto} />}
            {editable && <Button variant="primary" loading={saving} disabled={!dirty && !isNew} onClick={saveNow}>{isNew ? "Save post" : "Save"}</Button>}
          </div>
        </section>

        {/* Preview */}
        <section className="flex flex-col gap-2">
          <div className="flex w-fit gap-1 rounded-full bg-[#EDEBF5] p-[3px]">
            {CHANNELS.map((c) => (
              <button key={c.key} type="button" onClick={() => setPreview(c.key)} className="h-7 rounded-full px-3 text-xs font-semibold" style={{ background: pv === c.key ? "#fff" : "transparent", color: pv === c.key ? "#151035" : "#6B6688" }}>{c.label}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-[10px] border border-[#E3E0EE] bg-white">
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <span className="flex h-10 w-10 items-center justify-center bg-[#151035] text-[10px] font-bold text-white" style={{ borderRadius: pv === "linkedin" ? 6 : 999 }}>TTFC</span>
              <span className="flex flex-col"><b className="text-[13px]">{handle}</b><span className="text-[11px] text-[#6B6688]">{form.scheduledAt ? whenLabel(form.scheduledAt, form.timezone) : "Now"}</span></span>
            </div>
            <p className="whitespace-pre-wrap px-3.5 pb-2.5 text-[13px] leading-5">
              {pv === "linkedin" && pvText.length > 210 ? <>{pvText.slice(0, 210)}… <span className="text-[#6B6688]">see more</span></> : pvText || <span className="text-[#8A86A0]">Nothing written yet</span>}
            </p>
            {hasImage(form) && (
              <div className="relative w-full overflow-hidden bg-[#151035]" style={{ aspectRatio: CHANNELS.find((c) => c.key === pv).ratio, maxHeight: form.images?.[pv] ? 460 : 340 }}>
                <img src={imageOf(form, pv)} alt={form.images?.[pv]?.alt || form.image?.alt || ""} className={`h-full w-full ${form.images?.[pv] ? "object-contain" : "object-cover"}`} />
                {!form.images?.[pv] && <span className="absolute left-2 top-2 rounded-full bg-[#151035]/85 px-2 py-0.5 text-[10px] font-bold text-[#F5A623]">AUTO-RESIZED {CHANNELS.find((c) => c.key === pv).size}</span>}
              </div>
            )}
            {!form.channels[pv] && <p className="border-t border-[#F0EEF6] px-3.5 py-2 text-xs text-[#B45309]">{CHANNELS.find((c) => c.key === pv).label} is switched off for this post.</p>}
            {over(pv) && <p className="border-t border-[#F0EEF6] px-3.5 py-2 text-xs font-semibold text-[#B91C1C]">{len(pv)} / {LIMIT[pv]}: too long for {CHANNELS.find((c) => c.key === pv).label}.</p>}
          </div>
          <span className="text-xs text-[#6B6688]">Photos are cropped for each channel, keeping the busiest part of the picture in view.</span>
        </section>
      </div>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this post?" body="It can't be brought back." confirmLabel="Delete"
        onConfirm={async () => { await adminFetch(`/console/social/posts/${id}`, { method: "DELETE" }); toast.success("Deleted"); onDeleted?.(); navigate("/admin/social"); }} />
    </div>
  );
}

/* ---------------- this week's schedule (under the composer and the list) ---------------- */
function WeekStrip({ posts }) {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const start = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); return d; }, [offset]);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const todayKey = new Date().toDateString();
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-base font-bold">Schedule · week of {start.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</h2>
        <span className="text-xs text-[#6B6688]">Click a post to open it</span>
        <span className="ml-auto text-[13px] font-semibold text-[#D6308C]">
          <button type="button" onClick={() => setOffset((o) => o - 1)}>‹ Previous week</button> · <button type="button" onClick={() => setOffset((o) => o + 1)}>Next week ›</button>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const list = posts.filter((p) => p.scheduledAt && new Date(p.scheduledAt).toDateString() === d.toDateString());
          return (
            <div key={d.toISOString()} className="flex min-h-[120px] flex-col gap-1.5 rounded-[10px] border border-[#F0EEF6] p-2" style={{ background: d.toDateString() === todayKey ? "#FFFBFD" : "#fff" }}>
              <span className="text-xs font-semibold text-[#4A4566]">{d.toLocaleDateString("en-CA", { weekday: "short", day: "numeric" })}</span>
              {list.map((p) => (
                <button key={p.id} type="button" onClick={() => navigate(`/admin/social?id=${p.id}`)} className="rounded-md bg-[#F6F5FA] px-2 py-1.5 text-left text-[11px] leading-[15px] text-[#151035]" style={{ borderLeft: `3px solid ${STATUS[p.status]?.[0]}` }}>
                  <b>{new Date(p.scheduledAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: p.timezone })}</b><br />{p.title || p.text.slice(0, 40) || "Untitled"}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- settings ---------------- */
function SettingsTab({ data, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...data.settings, brandTags: data.settings.brandTags.join(" "), topicTags: data.settings.topicTags.join(" ") });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const can = data.canEdit;
  const save = async () => {
    setSaving(true);
    try { const r = await adminFetch("/console/social/settings", { method: "PUT", body: form }); onSaved(r.settings); toast.success("Saved"); }
    catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {!data.writing && <Banner tone="warn" title="Writing with Claude isn't switched on yet">The server needs an Anthropic API key (ANTHROPIC_API_KEY on Render). Until then, posts can be written and planned by hand.</Banner>}
      <Banner title={`This month: $${data.usage.costUsd.toFixed(2)} of $${Number(data.settings.monthlyBudgetUsd).toFixed(2)} used for writing (${data.usage.calls} times)`}>Each post written costs about 2–3 cents with {data.model}. Writing stops at the limit until next month.</Banner>
      <Field label="Brand hashtags (always one of these)" hint="Separate with spaces.">{(id) => <Input id={id} value={form.brandTags} disabled={!can} onChange={(e) => set("brandTags", e.target.value)} />}</Field>
      <Field label="Topic hashtags to pick from">{(id) => <Textarea id={id} rows={2} value={form.topicTags} disabled={!can} onChange={(e) => set("topicTags", e.target.value)} />}</Field>
      <Field label="Voice">{(id) => <Textarea id={id} rows={2} value={form.tone} disabled={!can} onChange={(e) => set("tone", e.target.value)} />}</Field>
      <Field label="Words to avoid">{(id) => <Input id={id} value={form.avoid} disabled={!can} onChange={(e) => set("avoid", e.target.value)} />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Spelling">{(id) => (
          <Select id={id} value={form.spelling} disabled={!can} onChange={(e) => set("spelling", e.target.value)}>
            {["Canadian", "American", "British"].map((s) => <option key={s}>{s}</option>)}
          </Select>
        )}</Field>
        <Field label="Monthly writing limit (USD)">{(id) => <Input id={id} inputMode="decimal" value={form.monthlyBudgetUsd} disabled={!can} onChange={(e) => set("monthlyBudgetUsd", e.target.value)} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="LinkedIn page name">{(id) => <Input id={id} value={form.handles.linkedin} disabled={!can} onChange={(e) => set("handles", { ...form.handles, linkedin: e.target.value })} />}</Field>
        <Field label="Instagram handle">{(id) => <Input id={id} value={form.handles.instagram} disabled={!can} onChange={(e) => set("handles", { ...form.handles, instagram: e.target.value })} />}</Field>
        <Field label="X handle">{(id) => <Input id={id} value={form.handles.x} disabled={!can} onChange={(e) => set("handles", { ...form.handles, x: e.target.value })} />}</Field>
      </div>
      {can ? <Button variant="primary" className="self-start" loading={saving} onClick={save}>Save settings</Button> : <p className="text-xs text-ttfc-muted">Management changes these.</p>}
    </div>
  );
}

/* ---------------- the page ---------------- */
const FILTER_STATUSES = { draft: ["draft", "changes"], posted: ["posted", "late"], scheduled: ["scheduled", "approved"] };
const inFilter = (p, k) => k === "all" || (FILTER_STATUSES[k] || [k]).includes(p.status);

export default function SocialPosts() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id") || (params.get("new") ? "new" : "");
  const [tab, setTab] = useState(params.get("tab") || "posts");
  const [filter, setFilter] = useState("all");
  const [fromTemplate, setFromTemplate] = useState(false);
  const list = useApi("/console/social/posts");
  const cfg = useApi("/console/social/settings");
  const posts = list.data?.posts || [];
  const upsert = (p) => list.setData((d) => ({ ...(d || {}), posts: (d?.posts || []).some((x) => x.id === p.id) ? d.posts.map((x) => (x.id === p.id ? p : x)) : [...(d?.posts || []), p] }));

  if (list.loading || cfg.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (cfg.error) return <ErrorState error={cfg.error} onRetry={cfg.reload} />;

  const FILTERS = [["all", "All"], ["review", "In review"], ["draft", "Drafts"], ["scheduled", "Scheduled"], ["posted", "Posted"], ["missed", "Missed"]];
  const rows = posts.filter((p) => inFilter(p, filter)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div>
      <PageHeader title="Social posts" description="Create a finished post from a template in one click, or write once and let Claude write the X and Instagram versions. Preview each channel, schedule it, get it approved, then post it and keep the link."
        actions={<>
          <Button onClick={() => navigate("/admin/calendar")}>Calendar</Button>
          <Button icon={Plus} onClick={() => { setTab("posts"); setParams({ new: "1" }); }}>New post</Button>
          <Button variant="primary" icon={Sparkles} onClick={() => setFromTemplate(true)}>Create from a template</Button>
        </>} />
      {fromTemplate && <TemplatePost open={fromTemplate} writing={!!cfg.data.writing} onClose={() => setFromTemplate(false)}
        onCreated={(p) => { setFromTemplate(false); upsert(p); setTab("posts"); setParams({ id: p.id }); }} />}
      {!id && <Tabs value={tab} onChange={setTab} tabs={[{ key: "posts", label: "Posts", count: posts.length }, { key: "settings", label: "Settings" }]} />}
      {!cfg.data.writing && tab === "posts" && <Banner tone="warn" className="mb-4" title="Writing with Claude isn't switched on yet">Posts can be planned and written by hand; the ✦ buttons work once the server has an Anthropic API key.</Banner>}
      {id ? (
        <div className="flex flex-col gap-4">
          <Composer key={id} id={id} settings={cfg.data.settings} onSaved={upsert} onDeleted={list.reload} />
          <WeekStrip posts={posts} />
        </div>
      ) : tab === "settings" ? (
        <SettingsTab data={cfg.data} onSaved={(s) => cfg.setData((d) => ({ ...d, settings: s }))} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([k, l]) => {
              const n = posts.filter((p) => inFilter(p, k)).length;
              return <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className="h-8 rounded-full border px-3 text-xs font-semibold" style={{ borderColor: filter === k ? "#D6308C" : "#E3E0EE", background: filter === k ? "#FBE9F3" : "#fff" }}>{l} <span className="opacity-70">{n}</span></button>;
            })}
          </div>
          {!rows.length ? (
            <EmptyState icon={Megaphone} title={posts.length ? "Nothing here" : "No posts yet"} body={posts.length ? "Try another filter." : "Write one, or let Claude draft it from a speaker, session, partner or event page."}
              action={<Button variant="primary" icon={Plus} onClick={() => setParams({ new: "1" })}>New post</Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((p) => (
                <button key={p.id} type="button" onClick={() => setParams({ id: p.id })} className="flex flex-col gap-2 rounded-xl border border-[#E3E0EE] bg-white p-3.5 text-left hover:border-[#D6308C]" style={{ borderLeft: `4px solid ${STATUS[p.status]?.[0]}` }}>
                  <div className="flex items-center gap-2">
                    <b className="min-w-0 flex-1 truncate text-sm">{p.title || p.text.split("\n")[0] || "Untitled"}</b>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: STATUS[p.status]?.[1], color: STATUS[p.status]?.[0] }}>{STATUS[p.status]?.[2]}</span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-[18px] text-[#4A4566]">{p.text || "Nothing written yet"}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#6B6688]">
                    {CHANNELS.filter((c) => p.channels?.[c.key]).map((c) => <span key={c.key} className="rounded bg-[#F1F0F5] px-1.5 py-0.5 font-semibold">{c.label}{p.posted?.[c.key]?.at ? " ✓" : ""}</span>)}
                    <span className="ml-auto">{p.scheduledAt ? whenLabel(p.scheduledAt, p.timezone) : "No time set"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <WeekStrip posts={posts} />
        </div>
      )}
    </div>
  );
}
