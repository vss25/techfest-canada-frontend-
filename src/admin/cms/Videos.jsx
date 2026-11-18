import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Play, Plus, Trash2, Video } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import { Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Switch, Textarea } from "../ui";
import { CmsBanners } from "./CmsParts";
import { ChangeBadge } from "./workflow";
import useCmsStatus from "./useCmsStatus";

/* =========================================================
   Admin › Content › Videos (Nov 18 2026): "Add ability to add our videos on YouTube or Vimeo so
   that we can show the videos on our website but it doesn't need to increase my operational /
   hosting cost."
   Paste a YouTube or Vimeo link: the title and the picture come from the provider
   (GET /api/cms/video-info). Pick where it shows: the home page, the Media page, event pages,
   speakers' profiles. Only the link is stored; YouTube or Vimeo plays it, so it costs nothing to
   host. Saves like every other content: Save → send to staging → publish (Website changes).
========================================================= */

const EMPTY = { title: "", url: "", thumbnailUrl: "", provider: "", description: "", recordedOn: "", showOnHome: false, showOnMedia: true,
                events: [], speakers: [], order: "", active: true };
const KEYS = ["title", "url", "thumbnailUrl", "description", "recordedOn", "showOnHome", "showOnMedia", "events", "speakers", "order", "active"];
const refsOf = (list) => (Array.isArray(list) ? list.map((r) => r?._ref || r).filter(Boolean) : []);
const formOf = (d) => ({ ...EMPTY, ...Object.fromEntries(KEYS.map((k) => [k, d?.[k] ?? EMPTY[k]])), provider: d?.provider || "",
                         events: refsOf(d?.events), speakers: refsOf(d?.speakers), order: d?.order ?? "" });

function Thumb({ url, provider, className = "" }) {
  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-[#151035] ${className}`}>
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
      <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"><Play className="h-5 w-5" aria-hidden="true" /></span></span>
      {provider && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{provider}</span>}
    </div>
  );
}

function Editor({ doc, speakers, onClose, onSaved, readOnly }) {
  const toast = useToast();
  const { events } = useAdminEvent();
  const creating = !doc?._id;
  const [form, setForm] = useState(formOf(doc));
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, id) => set(k, form[k].includes(id) ? form[k].filter((x) => x !== id) : [...form[k], id]);

  const lookUp = async (url) => {
    if (!url.trim()) return;
    setLooking(true);
    try {
      const info = await api.get(`/cms/video-info?url=${encodeURIComponent(url.trim())}`);
      setForm((f) => ({ ...f, url: info.url, provider: info.provider, thumbnailUrl: info.thumbnailUrl || f.thumbnailUrl, title: f.title || info.title }));
      if (!info.found) toast.error("The link works, but the title and picture couldn't be read (private video?). Fill the title in yourself.");
    } catch (err) { toast.error(err); } finally { setLooking(false); }
  };

  const save = async () => {
    if (!form.url) { toast.error("Paste the YouTube or Vimeo link."); return; }
    if (!form.title.trim()) { toast.error("Give the video a title."); return; }
    setSaving(true);
    try {
      const body = {};
      const orig = formOf(doc);
      for (const k of KEYS) {
        let v = form[k];
        if (k === "order") v = v === "" ? "" : Number(v);
        if (typeof v === "string") v = v.trim();
        if (!creating && JSON.stringify(v) === JSON.stringify(orig[k])) continue;
        if (creating && (v === "" || (Array.isArray(v) && !v.length))) continue;
        body[k] = v === "" ? null : v;
      }
      const saved = creating ? await api.post("/cms/video?draft=1", body) : await api.patch(`/cms/video/${doc._id}?draft=1`, body);
      toast.success(creating ? "Video added. Send it to staging from Website changes." : "Saved");
      onSaved({ ...(doc || {}), ...form, ...saved, hasDraft: true, events: form.events.map((id) => ({ _ref: id })), speakers: form.speakers.map((id) => ({ _ref: id })) });
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  const shownSpeakers = speakers.filter((s) => form.speakers.includes(s._id) || (q.trim().length >= 2 && s.name?.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 30);

  return (
    <Drawer open onClose={onClose} title={creating ? "Add a video" : form.title || "Video"} description="YouTube or Vimeo plays it, so it costs nothing to host. Only the link is saved."
      footer={readOnly ? <Button onClick={onClose}>Close</Button> : <><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="YouTube or Vimeo link" required hint="Paste the link from the address bar or the Share button. Unlisted videos work too.">{(id) => (
          <div className="flex gap-2">
            <Input id={id} value={form.url} disabled={readOnly} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => set("url", e.target.value)} onBlur={(e) => e.target.value && e.target.value !== formOf(doc).url && lookUp(e.target.value)} />
            <Button loading={looking} disabled={readOnly || !form.url} onClick={() => lookUp(form.url)}>Look up</Button>
          </div>
        )}</Field>
        {form.url && (form.thumbnailUrl || form.provider) && <Thumb url={form.thumbnailUrl} provider={form.provider} />}
        <Field label="Title" required>{(id) => <Input id={id} value={form.title} disabled={readOnly} onChange={(e) => set("title", e.target.value)} />}</Field>
        <Field label="Description" hint="One or two lines under the video.">{(id) => <Textarea id={id} rows={2} value={form.description} disabled={readOnly} onChange={(e) => set("description", e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Recorded on">{(id) => <Input id={id} type="date" value={form.recordedOn} disabled={readOnly} onChange={(e) => set("recordedOn", e.target.value)} />}</Field>
          <Field label="Order" hint="Lower comes first.">{(id) => <Input id={id} inputMode="numeric" value={form.order} disabled={readOnly} onChange={(e) => set("order", e.target.value)} />}</Field>
        </div>
        <div className="flex flex-col gap-3 rounded-[10px] border border-[#F0EEF6] p-3">
          <p className="text-sm font-semibold">Where it shows</p>
          <Switch checked={form.showOnHome} disabled={readOnly} onChange={(v) => set("showOnHome", v)} label="Home page" />
          <Switch checked={form.showOnMedia} disabled={readOnly} onChange={(v) => set("showOnMedia", v)} label="Media page (all videos)" />
          <div>
            <p className="mb-1 text-[13px] font-semibold">Event pages</p>
            <div className="flex flex-wrap gap-1.5">
              {(events || []).map((e) => (
                <button key={e._id} type="button" disabled={readOnly} aria-pressed={form.events.includes(e._id)} onClick={() => toggle("events", e._id)}
                  className="h-8 rounded-full border px-3 text-xs font-semibold" style={{ borderColor: form.events.includes(e._id) ? "#D6308C" : "#E3E0EE", background: form.events.includes(e._id) ? "#FBE9F3" : "#fff" }}>{e.name}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold">Speakers in the video</p>
            <Input aria-label="Find a speaker" placeholder="Type a speaker's name" value={q} disabled={readOnly} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {shownSpeakers.map((s) => (
                <button key={s._id} type="button" disabled={readOnly} aria-pressed={form.speakers.includes(s._id)} onClick={() => toggle("speakers", s._id)}
                  className="h-8 rounded-full border px-3 text-xs font-semibold" style={{ borderColor: form.speakers.includes(s._id) ? "#D6308C" : "#E3E0EE", background: form.speakers.includes(s._id) ? "#FBE9F3" : "#fff" }}>{s.name}</button>
              ))}
            </div>
          </div>
        </div>
        <Switch checked={form.active} disabled={readOnly} onChange={(v) => set("active", v)} label="Shown on the website" description="Off hides it everywhere without deleting it." />
      </div>
    </Drawer>
  );
}

export default function Videos() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const { data, error, loading, reload, setData } = useApi("/cms/video?drafts=1");
  const spk = useApi("/cms/speaker?drafts=1");
  const { events } = useAdminEvent();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const eventName = useMemo(() => Object.fromEntries((events || []).map((e) => [e._id, e.name])), [events]);
  const readOnly = configured === false;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rows = Array.isArray(data) ? data : [];
  const saved = (d) => { setData((xs) => (xs || []).some((x) => x._id === d._id) ? xs.map((x) => (x._id === d._id ? d : x)) : [...(xs || []), d]); setEditing(null); };

  return (
    <div>
      <PageHeader title="Videos" description="TTFC's YouTube and Vimeo videos on the website: the home page, the Media page, event pages and speakers. YouTube or Vimeo plays them, so they cost nothing to host."
        actions={!readOnly && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Add a video</Button>} />
      <CmsBanners configured={configured} />
      {!rows.length ? (
        <EmptyState icon={Video} title="No videos yet" body="Upload the video to TTFC's YouTube channel or Vimeo, then paste its link here."
          action={!readOnly && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Add a video</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => {
            const where = [d.showOnHome && "Home", d.showOnMedia && "Media page", ...refsOf(d.events).map((id) => eventName[id] || "An event"), refsOf(d.speakers).length && `${refsOf(d.speakers).length} speaker${refsOf(d.speakers).length > 1 ? "s" : ""}`].filter(Boolean);
            return (
              <div key={d._id} className={`flex flex-col gap-2 rounded-xl border border-[#E3E0EE] bg-white p-3 ${d.active === false ? "opacity-60" : ""}`}>
                <button type="button" onClick={() => setEditing(d)} aria-label={`Edit ${d.title}`}><Thumb url={d.thumbnailUrl} provider={d.provider} /></button>
                <div className="flex items-start gap-2">
                  <b className="min-w-0 flex-1 text-sm leading-5">{d.title}</b>
                  <ChangeBadge doc={d} />
                  {d.active === false && <Badge>Hidden</Badge>}
                </div>
                <p className="text-xs text-[#6B6688]">{where.length ? where.join(" · ") : "Not placed anywhere yet"}</p>
                <div className="mt-auto flex items-center gap-1 border-t border-[#F0EEF6] pt-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#D6308C] hover:bg-[#F6F5FA]"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Watch</a>
                  <span className="flex-1" />
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(d)}>{readOnly ? "View" : "Edit"}</Button>
                  {!readOnly && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleting(d)}>Delete</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <Editor doc={editing._id ? editing : null} speakers={Array.isArray(spk.data) ? spk.data : []} readOnly={readOnly} onClose={() => setEditing(null)} onSaved={saved} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete “${deleting?.title || ""}”?`}
        body="It comes off the website once the change is published. The video itself stays on YouTube or Vimeo." confirmLabel="Delete"
        onConfirm={async () => { await api.del(`/cms/video/${deleting._id}`); toast.success("Deleted"); reload(); }} />
    </div>
  );
}
