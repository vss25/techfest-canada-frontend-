import { useMemo, useState } from "react";
import { Crop, Mic2, Plus, Search, Star, Trash2, Pencil, X as XIcon } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, PageHeader, Select, SkeletonGrid, Switch,
  Textarea, focusRing,
} from "../ui";
import { CmsBanners, ImagePicker } from "./CmsParts";
import { SECTORS, SPEAKER_TYPES, TECH_PILLARS, labelOf, LIVE_NOTE } from "./cmsMeta";
import { buildBody, nextOrder } from "./fields";
import useCmsStatus from "./useCmsStatus";
import PhotoFramer, { FramedPreview } from "./PhotoFramer";
import { dimsFromAssetId } from "./framing";
import { speakerPhotoUrl } from "../../utils/sanity";

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

function SpeakerCard({ s, readOnly, onEdit, onToggleFeatured, onOrder }) {
  const [order, setOrder] = useState(s.order != null ? String(s.order) : "");
  const commit = () => {
    if (order === String(s.order ?? "")) return;
    if (order === "" || !Number.isFinite(Number(order))) { setOrder(String(s.order ?? "")); return; }
    onOrder(s, Number(order), () => setOrder(String(s.order ?? "")));
  };
  return (
    <article className="group flex flex-col overflow-hidden rounded-[18px] border border-ttfc-line bg-ttfc-panel transition hover:border-ttfc-purple/50">
      <button type="button" onClick={() => onEdit(s)} className={`relative block aspect-square w-full overflow-hidden bg-ttfc-ink ${focusRing}`} aria-label={`Edit ${s.name}`}>
        {s.imageUrl ? (
          <img src={s.image?.asset?._ref ? speakerPhotoUrl(s.image, 480) : `${s.imageUrl}?w=480&fit=max&auto=format`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex h-full items-center justify-center text-ttfc-dim"><Mic2 className="h-10 w-10" aria-hidden="true" /></span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
        </span>
        {s.featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ttfc-orange px-2 py-0.5 text-[11px] font-bold text-[#1a0f00] shadow">
            <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Featured
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-ttfc-text" title={s.name}>{s.name}</h3>
          <p className="line-clamp-2 text-xs text-ttfc-muted">{[s.title, s.company].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {s.speakerType && <Badge tone="pink">{labelOf(SPEAKER_TYPES, s.speakerType)}</Badge>}
          {s.techPillar && <Badge tone="purple">{labelOf(TECH_PILLARS, s.techPillar)}</Badge>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-1.5 text-xs text-ttfc-dim">
            Order
            <input
              type="number"
              inputMode="numeric"
              value={order}
              disabled={readOnly}
              onChange={(e) => setOrder(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setOrder(String(s.order ?? "")); }}
              className="h-8 w-16 rounded-lg border border-ttfc-line bg-ttfc-ink px-2 text-center text-sm text-ttfc-text focus:border-ttfc-purple focus:outline-none focus:ring-2 focus:ring-ttfc-purple/30 disabled:opacity-60"
              aria-label={`Display order for ${s.name}`}
            />
          </label>
          <button
            type="button"
            onClick={() => onToggleFeatured(s)}
            disabled={readOnly}
            aria-pressed={!!s.featured}
            aria-label={s.featured ? `Unfeature ${s.name}` : `Feature ${s.name}`}
            title={s.featured ? "Featured — click to unfeature" : "Feature this speaker"}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-50 ${s.featured ? "bg-ttfc-orange/20 text-ttfc-orange" : "text-ttfc-dim hover:bg-white/5 hover:text-ttfc-text"} ${focusRing}`}
          >
            <Star className="h-4 w-4" fill={s.featured ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function SpeakerDrawer({ open, doc, creating, defaultOrder, readOnly, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (doc ? toForm(doc) : blank(defaultOrder)));
  const [image, setImage] = useState({ assetId: null, url: doc?.imageUrl || "" });
  // Framing ("Adjust photo"): Sanity crop + hotspot. `framingChanged` = needs saving.
  const [framing, setFraming] = useState(() => (doc?.image?.crop || doc?.image?.hotspot ? { crop: doc.image.crop, hotspot: doc.image.hotspot } : null));
  const [framingChanged, setFramingChanged] = useState(false);
  const [framerOpen, setFramerOpen] = useState(false);
  const assetId = image.assetId || doc?.image?.asset?._ref || null;
  const dims = dimsFromAssetId(assetId) || doc?.imageDims || null;
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.title.trim()) errs.title = "Job title is required";
    if (!form.company.trim()) errs.company = "Company is required";
    if (form.order === "" || !Number.isFinite(Number(form.order))) errs.order = "Enter a number (lower shows first)";
    if (form.rowPosition !== "" && !Number.isFinite(Number(form.rowPosition))) errs.rowPosition = "Enter a whole number";
    if (!image.url) errs.image = "A profile photo is required";
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }

    const body = buildBody({ form, original: doc, keys: KEYS, numberKeys: NUMBER_KEYS, boolKeys: ["featured"], creating });
    if (assetId && (image.assetId || framingChanged)) {
      body.image = framing ? { asset: assetId, crop: framing.crop, hotspot: framing.hotspot } : assetId;
    }
    if (!creating && !Object.keys(body).length) { toast.info("Nothing changed"); onClose(); return; }
    setSaving(true);
    try {
      const saved = creating ? await api.post("/cms/speaker", body) : await api.patch(`/cms/speaker/${doc._id}`, body);
      toast.success(creating ? `${form.name} added. ${LIVE_NOTE}` : `Saved. ${LIVE_NOTE}`);
      onSaved({ ...(doc || {}), ...saved, imageUrl: image.url, image: assetId ? { asset: { _ref: assetId }, ...(framing || {}) } : doc?.image });
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const opt = (list) => [<option key="" value="">Not set</option>, ...list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={creating ? "Add a speaker" : doc?.name || "Edit speaker"}
      description={readOnly ? "Read-only until editing is switched on." : "Fields marked * are required."}
      footer={
        <>
          {!creating && (
            <Button variant="dangerOutline" icon={Trash2} disabled={readOnly || saving} onClick={() => onDelete(doc)}>Delete</Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
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
          onUploaded={({ assetId: id, url, preview }) => {
            setImage({ assetId: id, url: url || preview }); setFraming(null); setFramingChanged(false);
            setErrors((x) => ({ ...x, image: undefined }));
          }}
        />
        {assetId && dims && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ttfc-line bg-ttfc-ink/40 p-3">
            <FramedPreview assetId={assetId} framing={framing} size={72} />
            <FramedPreview assetId={assetId} framing={framing} size={40} round />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">How it appears on the website</p>
              <p className="text-xs text-ttfc-muted">{framingChanged ? "New framing — save to publish it." : framing ? "Custom framing." : "Centred automatically."}</p>
            </div>
            <Button size="sm" icon={Crop} onClick={() => setFramerOpen(true)} disabled={readOnly}>Adjust photo</Button>
          </div>
        )}
        {framerOpen && (
          <PhotoFramer
            open
            onClose={() => setFramerOpen(false)}
            assetId={assetId}
            imageUrl={image.url}
            dims={dims}
            image={framing}
            onApply={(f) => { setFraming(f); setFramingChanged(true); setFramerOpen(false); toast.info("Framing set — save the speaker to publish it"); }}
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
    </Drawer>
  );
}

export default function Speakers() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/speaker");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [pillar, setPillar] = useState("");
  const [sector, setSector] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState(null); // { doc, creating, key }
  const [deleting, setDeleting] = useState(null);

  const list = useMemo(() => data || [], [data]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((s) =>
      (!needle || [s.name, s.title, s.company].some((x) => (x || "").toLowerCase().includes(needle))) &&
      (!type || s.speakerType === type) && (!pillar || s.techPillar === pillar) && (!sector || s.sector === sector) &&
      (!featuredOnly || s.featured));
  }, [list, q, type, pillar, sector, featuredOnly]);
  const filtered = q || type || pillar || sector || featuredOnly;

  const patchLocal = (id, fields) => setData((xs) => (xs || []).map((x) => (x._id === id ? { ...x, ...fields } : x)));

  const toggleFeatured = async (s) => {
    patchLocal(s._id, { featured: !s.featured });
    try {
      await api.patch(`/cms/speaker/${s._id}`, { featured: !s.featured });
      toast.success(!s.featured ? `${s.name} is now featured` : `${s.name} is no longer featured`);
    } catch (err) {
      patchLocal(s._id, { featured: s.featured });
      toast.error(err);
    }
  };

  const changeOrder = async (s, order, revert) => {
    patchLocal(s._id, { order });
    try {
      await api.patch(`/cms/speaker/${s._id}`, { order });
      toast.success(`${s.name} moved to position ${order}`);
      setData((xs) => [...(xs || [])].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      patchLocal(s._id, { order: s.order });
      revert();
      toast.error(err);
    }
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
        eyebrow="Website content"
        title="Speakers"
        description="Everyone shown on the Speakers page and in the app. Click a photo to edit; star to feature; change the number to reorder."
        actions={<Button variant="primary" icon={Plus} disabled={readOnly} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add speaker</Button>}
      />
      <CmsBanners configured={configured} />

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((s) => (
                <SpeakerCard key={`${s._id}:${s.order}`} s={s} readOnly={readOnly}
                  onEdit={(doc) => setEditing({ doc, creating: false, key: doc._id })}
                  onToggleFeatured={toggleFeatured} onOrder={changeOrder} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Search} title="No speakers match" body="Try a different search or clear the filters." />
          )}
        </>
      )}

      {editing && (
        <SpeakerDrawer
          key={editing.key}
          open
          doc={editing.doc}
          creating={editing.creating}
          defaultOrder={nextOrder(list)}
          readOnly={readOnly}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
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

