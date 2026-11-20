import { useMemo, useState } from "react";
import { useAutosave } from "./useAutosave";
import { AutosaveNote } from "./AutosaveNote";
import { Crop, Mic2, Plus, Search, Star, Trash2, Pencil, X as XIcon } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, PageHeader, Select, SkeletonGrid, Switch, Textarea, focusRing, EditPanel, TableWrap, Card,
} from "../ui";
import { CmsBanners, ImagePicker } from "./CmsParts";
import { ReadinessStrip } from "./ReadinessCard";
import { ChangeBadge } from "./workflow";
import { changeState } from "./workflowState";
import { useAdminEvent } from "../eventContext";
import { SECTORS, SPEAKER_TYPES, TECH_PILLARS, labelOf, LIVE_NOTE } from "./cmsMeta";
import { buildBody, nextOrder } from "./fields";
import useCmsStatus from "./useCmsStatus";
import { FramedPreview } from "./PhotoFramer";
import PhotoStudio from "./PhotoStudio";
import { dimsFromAssetId } from "./framing";
import { useEditFromUrl, useInitialQuery } from "../search/deepLink";

const KEYS = ["name", "title", "company", "bio", "order", "rowPosition", "featured", "speakerType", "techPillar", "sector",
  "linkedin", "twitter", "github", "website"];
const NUMBER_KEYS = ["order", "rowPosition"];

const blank = (order) => ({
  name: "", title: "", company: "", bio: "", order: String(order), rowPosition: "", featured: false,
  speakerType: "", techPillar: "", sector: "", linkedin: "", twitter: "", github: "", website: "",
});

const toForm = (d) => ({
  ...blank(d.order ?? ""),
  ...Object.fromEntries(KEYS.map((k) => [k, d[k] ?? (k === "featured" ? false : "")])),
  order: d.order != null ? String(d.order) : "",
  rowPosition: d.rowPosition != null ? String(d.rowPosition) : "",
});

const refIds = (d) => (d?.events || []).map((r) => r?._ref).filter(Boolean).sort();

function SpeakerDrawer({ open, doc, creating, defaultOrder, readOnly, onClose, onSaved, onAutoSaved, onDelete, eventList = [] }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (doc ? toForm(doc) : blank(defaultOrder)));
  const [image, setImage] = useState({ assetId: null, url: doc?.imageUrl || "" });
  // Framing ("Adjust photo"): Sanity crop + hotspot. `framingChanged` = needs saving.
  const [framing, setFraming] = useState(() => (doc?.image?.crop || doc?.image?.hotspot ? { crop: doc.image.crop, hotspot: doc.image.hotspot } : null));
  const [framingChanged, setFramingChanged] = useState(false);
  // The photo studio (Nov 19 2026): a new photo, or redoing the current one from its original.
  const [studio, setStudio] = useState(null);
  const [original, setOriginal] = useState({ assetId: null, url: doc?.imageOriginalUrl || "" });
  const assetId = image.assetId || doc?.image?.asset?._ref || null;
  const dims = dimsFromAssetId(assetId) || doc?.imageDims || null;
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  // Which event pages the speaker appears on (redesign step 1). None = every event.
  const [evs, setEvs] = useState(() => refIds(doc));

  const save = async (e, { auto: isAuto = false } = {}) => {
    e?.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.title.trim()) errs.title = "Job title is required";
    if (!form.company.trim()) errs.company = "Company is required";
    if (form.order === "" || !Number.isFinite(Number(form.order))) errs.order = "Enter a number (lower shows first)";
    if (form.rowPosition !== "" && !Number.isFinite(Number(form.rowPosition))) errs.rowPosition = "Enter a whole number";
    if (!image.url) errs.image = "A profile photo is required";
    // Autosave keeps an incomplete draft (empty fields are checked when it's sent to staging);
    // it waits only for a value it can't store.
    if (isAuto) { const bad = [errs.order && form.order !== "" && errs.order, errs.rowPosition].filter(Boolean); if (bad.length) return `${bad[0]}.`; }
    if (!isAuto) {
      setErrors(errs);
      if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }
    }

    const body = buildBody({ form, original: doc, keys: KEYS, numberKeys: NUMBER_KEYS, boolKeys: ["featured"], creating });
    if (original.assetId) body.imageOriginal = original.assetId;
    if (assetId && (image.assetId || framingChanged)) {
      body.image = framing ? { asset: assetId, crop: framing.crop, hotspot: framing.hotspot } : assetId;
    }
    const evSorted = [...evs].sort();
    if (creating ? evSorted.length : JSON.stringify(evSorted) !== JSON.stringify(refIds(doc))) body.events = evSorted;
    if (isAuto) {
      // Autosave: saved as a draft, quietly, and the editor stays open.
      if (!creating && !Object.keys(body).length) return false;
      const saved = creating ? await api.post("/cms/speaker?draft=1", body) : await api.patch(`/cms/speaker/${doc._id}?draft=1`, body);
      setImage((i) => ({ ...i, assetId: null }));
      setOriginal((o) => ({ ...o, assetId: null }));
      setFramingChanged(false);
      onAutoSaved({ ...(doc || {}), ...saved, hasDraft: true, events: evSorted.map((id) => ({ _ref: id })), imageUrl: image.url, image: assetId ? { asset: { _ref: assetId }, ...(framing || {}) } : doc?.image });
      return true;
    }
    if (!creating && !Object.keys(body).length) { auto.cancel(); toast.info("Nothing changed"); onClose(); return; }
    setSaving(true);
    try {
      const saved = creating ? await api.post("/cms/speaker?draft=1", body) : await api.patch(`/cms/speaker/${doc._id}?draft=1`, body);
      auto.markSaved();
      toast.success(creating ? `${form.name} added. ${LIVE_NOTE}` : `Saved. ${LIVE_NOTE}`);
      onSaved({ ...(doc || {}), ...saved, events: evSorted.map((id) => ({ _ref: id })), imageUrl: image.url, image: assetId ? { asset: { _ref: assetId }, ...(framing || {}) } : doc?.image });
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  // 30 seconds after the last change, or on closing the panel: saved as a draft (useAutosave.js).
  const auto = useAutosave({ value: JSON.stringify([form, image.url, framing, evs, original.url]), enabled: !readOnly, save: () => save(null, { auto: true }) });

  const opt = (list) => [<option key="" value="">Not set</option>, ...list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)];

  return (
    <EditPanel
      open={open}
      onClose={onClose}
      title={creating ? "Add a speaker" : `Edit speaker: ${doc?.name || ""}`}
      description={readOnly ? "Read-only until editing is switched on." : "Fields marked * are required."}
      footer={
        <>
          {!creating && (
            <Button variant="dangerOutline" icon={Trash2} disabled={readOnly || saving} onClick={() => { auto.cancel(); onDelete(doc); }}>Delete</Button>
          )}
          <span className="flex-1" />
          {!readOnly && <AutosaveNote auto={auto} className="self-center" />}
          <Button onClick={() => { auto.cancel(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form="speaker-form" loading={saving} disabled={readOnly}>
            {creating ? "Add speaker" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="speaker-form" onSubmit={save} className="space-y-5" noValidate>
        <ImagePicker
          label="Profile photo"
          required
          kind="photo"
          aspect="aspect-[4/3]"
          url={image.url}
          disabled={readOnly}
          error={errors.image}
          onFile={(file) => setStudio({ source: file })}
          onUploaded={() => {}}
        />
        {assetId && dims && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ttfc-line bg-ttfc-ink/40 p-3">
            <FramedPreview assetId={assetId} framing={framing} size={72} />
            <FramedPreview assetId={assetId} framing={framing} size={40} round />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">How it appears on the website</p>
              <p className="text-xs text-ttfc-muted">{original.url ? "Made in the photo studio: light purple, 4:5." : "Added before the photo studio. Adjust it to match the others."}</p>
            </div>
            <Button size="sm" icon={Crop} disabled={readOnly}
              onClick={() => setStudio({ source: { url: original.url || image.url, originalAssetId: original.url ? (original.assetId || doc?.imageOriginal?.asset?._ref || null) : assetId } })}>
              Adjust photo
            </Button>
          </div>
        )}
        {studio && (
          <PhotoStudio
            open
            source={studio.source}
            onClose={() => setStudio(null)}
            onDone={({ assetId: id, url, originalAssetId }) => {
              setImage({ assetId: id, url });
              setFraming(null); setFramingChanged(false);
              // A redo of a photo without an original keeps the old photo as the original.
              if (originalAssetId) setOriginal((o) => ({ assetId: originalAssetId === doc?.imageOriginal?.asset?._ref ? null : originalAssetId,
                url: studio.source instanceof File ? URL.createObjectURL(studio.source) : (o.url || studio.source.url) }));
              setErrors((x) => ({ ...x, image: undefined }));
              setStudio(null);
              toast.success("Photo ready. It saves with the speaker.");
            }}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.name} onChange={set("name")} maxLength={120} disabled={readOnly} data-autofocus />}
          </Field>
          <Field label="Job title" required error={errors.title}>
            {(id) => <Input id={id} value={form.title} onChange={set("title")} maxLength={160} disabled={readOnly} />}
          </Field>
          <Field label="Company" required error={errors.company}>
            {(id) => <Input id={id} value={form.company} onChange={set("company")} maxLength={160} disabled={readOnly} />}
          </Field>
          {eventList.length > 0 && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Events</legend>
              <p className="mb-2 text-xs text-ttfc-dim">The event pages this speaker appears on. None ticked = every event.</p>
              <div className="flex flex-wrap gap-2">
                {eventList.map((ev) => {
                  const on = evs.includes(ev._id);
                  return (
                    <label key={ev._id} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${on ? "border-ttfc-pink bg-ttfc-pink/10" : "border-ttfc-line"}`}>
                      <input type="checkbox" checked={on} disabled={readOnly}
                        onChange={(e) => setEvs((x) => (e.target.checked ? [...x, ev._id] : x.filter((y) => y !== ev._id)))} />
                      {ev.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <Field label="Bio" hint={`${form.bio.length}/2000 characters`} className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={6} value={form.bio} onChange={set("bio")} maxLength={2000} disabled={readOnly} />}
          </Field>
        </div>

        <fieldset className="space-y-4 rounded-2xl border border-ttfc-line p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Placement</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display order" required error={errors.order} hint="Lower numbers appear first.">
              {(id) => <Input id={id} type="number" inputMode="numeric" value={form.order} onChange={set("order")} disabled={readOnly} />}
            </Field>
            <Field label="Position in row" error={errors.rowPosition} hint="Optional fine-tuning within a row.">
              {(id) => <Input id={id} type="number" inputMode="numeric" value={form.rowPosition} onChange={set("rowPosition")} disabled={readOnly} />}
            </Field>
          </div>
          <Switch
            label="Featured speaker"
            description="Featured speakers are pinned to the top of the grid regardless of order."
            checked={!!form.featured}
            onChange={(v) => setForm((f) => ({ ...f, featured: v }))}
            disabled={readOnly}
          />
        </fieldset>

        <fieldset className="grid gap-4 rounded-2xl border border-ttfc-line p-4 sm:grid-cols-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Filters on the website</legend>
          <Field label="Speaker type">{(id) => <Select id={id} value={form.speakerType} onChange={set("speakerType")} disabled={readOnly}>{opt(SPEAKER_TYPES)}</Select>}</Field>
          <Field label="Tech pillar">{(id) => <Select id={id} value={form.techPillar} onChange={set("techPillar")} disabled={readOnly}>{opt(TECH_PILLARS)}</Select>}</Field>
          <Field label="Sector">{(id) => <Select id={id} value={form.sector} onChange={set("sector")} disabled={readOnly}>{opt(SECTORS)}</Select>}</Field>
        </fieldset>

        <fieldset className="grid gap-4 rounded-2xl border border-ttfc-line p-4 sm:grid-cols-2">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Links (optional)</legend>
          <Field label="LinkedIn URL">{(id) => <Input id={id} type="url" placeholder="linkedin.com/in/…" value={form.linkedin} onChange={set("linkedin")} disabled={readOnly} />}</Field>
          <Field label="X / Twitter URL">{(id) => <Input id={id} type="url" placeholder="x.com/…" value={form.twitter} onChange={set("twitter")} disabled={readOnly} />}</Field>
          <Field label="GitHub URL">{(id) => <Input id={id} type="url" placeholder="github.com/…" value={form.github} onChange={set("github")} disabled={readOnly} />}</Field>
          <Field label="Personal website URL">{(id) => <Input id={id} type="url" placeholder="example.com" value={form.website} onChange={set("website")} disabled={readOnly} />}</Field>
        </fieldset>
      </form>
    </EditPanel>
  );
}

export default function Speakers() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/speaker?drafts=1");
  const eventsApi = useApi("/cms/event?drafts=1");
  const eventList = useMemo(() => (eventsApi.data || []).filter((e) => e?.name), [eventsApi.data]);
  const initialQ = useInitialQuery(); // "See all in Speakers" from the global search
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState("");
  const [pillar, setPillar] = useState("");
  const [sector, setSector] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState(null); // { doc, creating, key }
  const [deleting, setDeleting] = useState(null);

  const list = useMemo(() => data || [], [data]);
  // From the global search: ?edit=<id> opens that speaker.
  useEditFromUrl(list, (doc) => setEditing({ doc, creating: false, key: doc._id }));
  const { current: chosenEvent } = useAdminEvent();
  const [allEvents, setAllEvents] = useState(false);
  const onEvent = !allEvents && !!chosenEvent;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const evIds = (s) => (s.events || []).map((r) => r?._ref).filter(Boolean);
    return list.filter((s) => (!onEvent || !evIds(s).length || evIds(s).includes(chosenEvent._id)) &&
      (!needle || [s.name, s.title, s.company].some((x) => (x || "").toLowerCase().includes(needle))) &&
      (!type || s.speakerType === type) && (!pillar || s.techPillar === pillar) && (!sector || s.sector === sector) &&
      (!featuredOnly || s.featured));
  }, [list, q, type, pillar, sector, featuredOnly, onEvent, chosenEvent]);
  const filtered = q || type || pillar || sector || featuredOnly;



  // An autosave keeps the panel open; a new speaker becomes an edit of the saved one.
  const onAutoSaved = (doc) => {
    setEditing((ed) => (ed ? { ...ed, doc, creating: false } : ed));
    setData((xs) => {
      const arr = xs || [];
      return arr.some((x) => x._id === doc._id) ? arr.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)) : [...arr, doc];
    });
  };
  const onSaved = (doc) => {
    setEditing(null);
    setData((xs) => {
      const arr = xs || [];
      const exists = arr.some((x) => x._id === doc._id);
      const next = exists ? arr.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)) : [...arr, doc];
      return next.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.name || "").localeCompare(b.name || ""));
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="Speakers"
        description="Everyone shown on the Speakers page and in the app. Click a photo to edit; star to feature; change the number to reorder."
        actions={<Button variant="primary" icon={Plus} disabled={readOnly} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add speaker</Button>}
      />
      <CmsBanners configured={configured} />
      <ReadinessStrip />

      <div className="mb-5 grid gap-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" placeholder="Search name, title or company" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search speakers" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by speaker type">
          <option value="">All speaker types</option>
          {SPEAKER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select value={pillar} onChange={(e) => setPillar(e.target.value)} aria-label="Filter by tech pillar">
          <option value="">All tech pillars</option>
          {TECH_PILLARS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Filter by sector">
          <option value="">All sectors</option>
          {SECTORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <div className="flex items-center gap-2 px-1">
          <Switch checked={featuredOnly} onChange={setFeaturedOnly} ariaLabel="Featured only" />
          <span className="text-sm text-ttfc-muted">Featured only</span>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={10} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !list.length ? (
        <EmptyState icon={Mic2} title="No speakers yet" body="Add the first speaker and they'll appear on the website within a minute."
          action={!readOnly && <Button variant="primary" icon={Plus} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add speaker</Button>} />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm text-ttfc-muted">
            <span>{shown.length} of {list.length} speakers</span>
            {filtered && (
              <button type="button" className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:text-ttfc-text ${focusRing}`}
                onClick={() => { setQ(""); setType(""); setPillar(""); setSector(""); setFeaturedOnly(false); }}>
                <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>
          {shown.length ? (
            <Card className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-base font-bold text-[#151035]">{onEvent && chosenEvent ? `Speakers on ${chosenEvent.name}` : "All speakers"}</h2>
                <span className="text-xs text-[#6B6688]">Click a row to edit it</span>
                {chosenEvent && (
                  <button type="button" onClick={() => setAllEvents((v) => !v)} className={`ml-auto text-[13px] font-semibold text-[#D6308C] hover:underline ${focusRing}`}>
                    {onEvent ? "Show all speakers" : `Only ${chosenEvent.name}`}
                  </button>
                )}
              </div>
              <TableWrap>
                <thead><tr><th>Name</th><th>Title, organisation</th><th>Type</th><th>Order</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s._id} className="is-clickable" tabIndex={0}
                      onClick={() => setEditing({ doc: s, creating: false, key: s._id })}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditing({ doc: s, creating: false, key: s._id }); }}
                      style={editing?.doc?._id === s._id ? { background: "#FBE9F3", boxShadow: "inset 3px 0 0 #D6308C" } : undefined}>
                      <td className="font-semibold">
                        <span className="flex items-center gap-2.5">
                          {s.imageUrl ? <img src={`${s.imageUrl}?w=64&h=64&fit=crop`} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" loading="lazy" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-[#F1F0F5]" aria-hidden="true" />}
                          {s.name}
                        </span>
                      </td>
                      <td className="text-[#4A4566]">{[s.title, s.company].filter(Boolean).join(", ")}</td>
                      <td>{labelOf(SPEAKER_TYPES, s.speakerType) || "Speaker"}</td>
                      <td className="tabular-nums text-[#4A4566]">{s.order ?? "—"}</td>
                      <td>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {changeState(s) ? <ChangeBadge doc={s} /> : <Badge tone="good">Live</Badge>}
                          {s.featured && <Badge tone="warn">Featured</Badge>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          ) : (
            <EmptyState icon={Search} title="No speakers match" body="Try a different search or clear the filters." />
          )}
        </>
      )}

      {editing && (
        <SpeakerDrawer
          eventList={eventList}
          key={editing.key}
          open
          doc={editing.doc}
          creating={editing.creating}
          defaultOrder={nextOrder(list)}
          readOnly={readOnly}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
          onAutoSaved={onAutoSaved}
          onDelete={(doc) => setDeleting(doc)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name || "this speaker"}?`}
        body="They'll be removed from the website and the app within about a minute. This can't be undone."
        confirmLabel="Delete speaker"
        onConfirm={async () => {
          await api.del(`/cms/speaker/${deleting._id}`);
          setData((xs) => (xs || []).filter((x) => x._id !== deleting._id));
          setEditing(null);
          toast.success(`${deleting.name} deleted`);
        }}
      />
    </>
  );
}

