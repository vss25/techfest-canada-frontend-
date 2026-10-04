import { useMemo, useState } from "react";
import { ImageOff, Minus, Moon, Plus, RotateCcw, Search, Sun, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, PageHeader, Select, SkeletonGrid, Switch, focusRing,
} from "../ui";
import { CmsBanners, ImagePicker } from "./CmsParts";
import { PARTNER_CATEGORIES, LIVE_NOTE } from "./cmsMeta";
import { buildBody, nextOrder } from "./fields";
import useCmsStatus from "./useCmsStatus";

const scaleOf = (d) => (Number.isFinite(Number(d?.logoScale)) && d?.logoScale !== null && d?.logoScale !== "" ? Number(d.logoScale) : 100);
const clampScale = (n) => Math.min(250, Math.max(30, Math.round(n)));

/** Mimics how the logo appears on the website: partner grid tile or marquee pill (same CSS sizes). */
function WebsiteLogoPreview({ url, scale, kind }) {
  const s = scale / 100;
  const src = url && !url.startsWith("data:") ? `${url}?h=${Math.round(140 * Math.max(1, s))}&fit=max&auto=format` : url;
  if (kind === "grid") {
    return (
      <div className="flex h-[140px] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-[18px] bg-white px-8 py-7 shadow-lg">
        {src && <img src={src} alt="" className="h-auto w-auto object-contain" style={{ maxHeight: `min(${70 * s}px, 100%)`, maxWidth: `min(${100 * s}%, 100%)` }} />}
      </div>
    );
  }
  return (
    <div className="inline-flex min-h-[64px] items-center justify-center rounded-xl bg-white px-8 py-3 shadow-lg">
      {src && <img src={src} alt="" className="w-auto object-contain" style={{ height: 36 * s, maxWidth: 160 * s }} />}
    </div>
  );
}

const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.name || "").localeCompare(b.name || "");

function LogoTile({ doc, readOnly, light, onEdit, onToggleActive, onScale }) {
  const active = doc.active !== false;
  const scale = scaleOf(doc);
  return (
    <article className={`group flex flex-col overflow-hidden rounded-[18px] border bg-ttfc-panel transition hover:border-ttfc-purple/50 ${active ? "border-ttfc-line" : "border-dashed border-ttfc-line/80"}`}>
      <button
        type="button"
        onClick={() => onEdit(doc)}
        aria-label={`Edit ${doc.name}`}
        className={`relative flex aspect-[16/9] items-center justify-center p-5 transition ${light ? "bg-[#F6F4FB]" : "bg-ttfc-ink"} ${active ? "" : "opacity-45"} ${focusRing}`}
      >
        {doc.logoUrl ? (
          <img src={`${doc.logoUrl}?w=400&fit=max&auto=format`} alt="" loading="lazy" className="object-contain"
            style={{ maxHeight: `${Math.min(100, 55 * (scale / 100))}%`, maxWidth: `${Math.min(100, 75 * (scale / 100))}%` }} />
        ) : (
          <ImageOff className="h-7 w-7 text-ttfc-dim" aria-hidden="true" />
        )}
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
        </span>
      </button>
      <div className="flex items-center gap-2 border-t border-ttfc-line p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ttfc-text" title={doc.name}>{doc.name}</p>
          <p className="text-xs text-ttfc-dim">
            {doc.order != null ? `Order ${doc.order}` : "No order"}
            {!active && <> · <span className="text-amber-300">Hidden</span></>}
          </p>
        </div>
        <Switch checked={active} disabled={readOnly} onChange={() => onToggleActive(doc)} ariaLabel={`${active ? "Hide" : "Show"} ${doc.name}`} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ttfc-line/60 px-3 py-1.5" role="group" aria-label={`Logo size for ${doc.name}`}>
        <span className="text-[11px] text-ttfc-dim">Size</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onScale(doc, -10)} disabled={readOnly || scale <= 30} aria-label={`Make ${doc.name} smaller`}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text disabled:opacity-30 ${focusRing}`}><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-11 text-center text-xs tabular-nums text-ttfc-text">{scale}%</span>
          <button type="button" onClick={() => onScale(doc, 10)} disabled={readOnly || scale >= 250} aria-label={`Make ${doc.name} bigger`}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text disabled:opacity-30 ${focusRing}`}><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </article>
  );
}

function LogoDrawer({ type, singular, withCategory, doc, creating, defaultOrder, readOnly, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const keys = ["name", "url", "order", "active", "logoScale", ...(withCategory ? ["category"] : [])];
  const [form, setForm] = useState(() => ({
    name: doc?.name || "",
    url: doc?.url || "",
    order: doc?.order != null ? String(doc.order) : creating ? String(defaultOrder) : "",
    active: doc ? doc.active !== false : true,
    logoScale: String(scaleOf(doc)),
    category: doc?.category || (withCategory ? "partnersAndSupporters" : ""),
  }));
  const [logo, setLogo] = useState({ assetId: null, url: doc?.logoUrl || "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (withCategory && !form.category) errs.category = "Pick a category";
    if (form.order !== "" && !Number.isFinite(Number(form.order))) errs.order = "Enter a number";
    if (!logo.url) errs.logo = "A logo is required";
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }
    const original = doc ? { ...doc, active: doc.active !== false, logoScale: scaleOf(doc) } : null;
    const body = buildBody({ form, original, keys, numberKeys: ["order", "logoScale"], boolKeys: ["active"], creating });
    if (creating) body.active = !!form.active;
    if (logo.assetId) body.logo = logo.assetId;
    if (!creating && !Object.keys(body).length) { toast.info("Nothing changed"); onClose(); return; }
    setSaving(true);
    try {
      const saved = creating ? await api.post(`/cms/${type}`, body) : await api.patch(`/cms/${type}/${doc._id}`, body);
      toast.success(creating ? `${form.name} added. ${LIVE_NOTE}` : `Saved. ${LIVE_NOTE}`);
      onSaved({ ...(doc || {}), ...saved, logoUrl: logo.url });
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={creating ? `Add a ${singular}` : doc?.name || `Edit ${singular}`}
      description={readOnly ? "Read-only until editing is switched on." : "Fields marked * are required."}
      footer={
        <>
          {!creating && <Button variant="dangerOutline" icon={Trash2} disabled={readOnly || saving} onClick={() => onDelete(doc)}>Delete</Button>}
          <span className="flex-1" />
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form={`logo-form-${type}`} loading={saving} disabled={readOnly}>{creating ? `Add ${singular}` : "Save changes"}</Button>
        </>
      }
    >
      <form id={`logo-form-${type}`} onSubmit={save} className="space-y-5" noValidate>
        <ImagePicker
          label="Logo"
          kind="logo"
          required
          aspect="aspect-[16/9]"
          url={logo.url}
          disabled={readOnly}
          error={errors.logo}
          onUploaded={({ assetId, url, preview }) => { setLogo({ assetId, url: url || preview }); setErrors((x) => ({ ...x, logo: undefined })); }}
        />
        <fieldset className="rounded-2xl border border-ttfc-line p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Logo size on the website</legend>
          <div className="mb-4 flex justify-center rounded-xl bg-ttfc-ink/60 p-5">
            <WebsiteLogoPreview url={logo.url} scale={Number(form.logoScale)} kind={withCategory ? "grid" : "marquee"} />
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min={30} max={250} step={5} value={form.logoScale} disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, logoScale: e.target.value }))}
              aria-label="Logo size" aria-valuetext={`${form.logoScale}%`} className="h-2 flex-1 cursor-pointer accent-[#E8458B]" />
            <span className="w-12 text-right text-sm tabular-nums">{form.logoScale}%</span>
            <Button size="sm" variant="ghost" icon={RotateCcw} disabled={readOnly || form.logoScale === "100"} onClick={() => setForm((f) => ({ ...f, logoScale: "100" }))}>100%</Button>
          </div>
          <p className="mt-2 text-xs text-ttfc-dim">Use this when a logo looks too small or too big next to the others. 100% is the normal size.</p>
        </fieldset>
        <Field label="Name" required error={errors.name}>
          {(id) => <Input id={id} value={form.name} onChange={set("name")} maxLength={withCategory ? 120 : 100} disabled={readOnly} data-autofocus />}
        </Field>
        {withCategory && (
          <Field label="Category" required error={errors.category} hint="Which group the logo appears under on the Partners page.">
            {(id) => (
              <Select id={id} value={form.category} onChange={set("category")} disabled={readOnly}>
                {PARTNER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label="Website link" hint="Optional. Where the logo goes when clicked.">
          {(id) => <Input id={id} type="url" placeholder="example.com" value={form.url} onChange={set("url")} disabled={readOnly} />}
        </Field>
        <Field label="Display order" error={errors.order} hint="Lower numbers appear first.">
          {(id) => <Input id={id} type="number" inputMode="numeric" value={form.order} onChange={set("order")} disabled={readOnly} />}
        </Field>
        <Switch
          label="Show on the website"
          description="Turn off to hide this logo without deleting it."
          checked={!!form.active}
          onChange={(v) => setForm((f) => ({ ...f, active: v }))}
          disabled={readOnly}
        />
        {doc?.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-sm text-ttfc-pink hover:text-pink-300 ${focusRing} rounded-lg`}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open current link
          </a>
        )}
      </form>
    </Drawer>
  );
}

/**
 * Logo editor shared by Partners, Sponsors, Sponsor marquee and Home sponsors.
 * Partners are grouped by category.
 */
export default function LogoCollection({ type, title, singular, description, withCategory = false }) {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi(`/cms/${type}`);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [show, setShow] = useState("all");
  const [light, setLight] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const list = useMemo(() => data || [], [data]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((d) =>
      (!needle || (d.name || "").toLowerCase().includes(needle)) &&
      (!category || d.category === category) &&
      (show === "all" || (show === "active" ? d.active !== false : d.active === false)));
  }, [list, q, category, show]);

  const groups = useMemo(() => {
    if (!withCategory) return [{ key: "all", label: null, items: [...shown].sort(byOrder) }];
    return PARTNER_CATEGORIES
      .map((c) => ({ key: c.value, label: c.label, items: shown.filter((d) => (d.category || "other") === c.value).sort(byOrder) }))
      .filter((g) => g.items.length);
  }, [shown, withCategory]);

  const patchLocal = (id, f) => setData((xs) => (xs || []).map((x) => (x._id === id ? { ...x, ...f } : x)));
  const toggleActive = async (d) => {
    const next = d.active === false;
    patchLocal(d._id, { active: next });
    try {
      await api.patch(`/cms/${type}/${d._id}`, { active: next });
      toast.success(next ? `${d.name} is visible on the website` : `${d.name} is hidden from the website`);
    } catch (err) {
      patchLocal(d._id, { active: d.active });
      toast.error(err);
    }
  };
  const adjustScale = async (d, delta) => {
    const before = scaleOf(d);
    const next = clampScale(before + delta);
    if (next === before) return;
    patchLocal(d._id, { logoScale: next });
    try {
      await api.patch(`/cms/${type}/${d._id}`, { logoScale: next });
      toast.success(`${d.name}: ${next}% size`);
    } catch (err) {
      patchLocal(d._id, { logoScale: d.logoScale });
      toast.error(err);
    }
  };
  const onSaved = (doc) => {
    setEditing(null);
    setData((xs) => {
      const arr = xs || [];
      return arr.some((x) => x._id === doc._id) ? arr.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)) : [...arr, doc];
    });
  };
  const openNew = () => setEditing({ doc: null, creating: true, key: Date.now() });
  const hiddenCount = list.filter((d) => d.active === false).length;

  return (
    <>
      <PageHeader
        eyebrow="Website content"
        title={title}
        description={description}
        actions={<Button variant="primary" icon={Plus} disabled={readOnly} onClick={openNew}>Add {singular}</Button>}
      />
      <CmsBanners configured={configured} />

      <div className="mb-5 flex flex-col gap-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" placeholder={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label={`Search ${title}`} />
        </div>
        {withCategory && (
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="md:w-64">
            <option value="">All categories</option>
            {PARTNER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        )}
        <Select value={show} onChange={(e) => setShow(e.target.value)} aria-label="Filter by visibility" className="md:w-44">
          <option value="all">Shown & hidden</option>
          <option value="active">Shown only</option>
          <option value="hidden">Hidden only</option>
        </Select>
        <Button size="md" icon={light ? Moon : Sun} onClick={() => setLight((v) => !v)} aria-pressed={!light}>
          {light ? "Dark preview" : "Light preview"}
        </Button>
      </div>

      {loading ? (
        <SkeletonGrid count={8} className="aspect-[16/12]" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !list.length ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} body={`Add the first ${singular} and it'll appear on the website within a minute.`}
          action={!readOnly && <Button variant="primary" icon={Plus} onClick={openNew}>Add {singular}</Button>} />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="Nothing matches" body="Try a different search or filter." />
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-ttfc-muted">{list.length} total{hiddenCount ? ` · ${hiddenCount} hidden` : ""}</p>
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label || title}>
              {g.label && (
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ttfc-text">{g.label}</h2>
                  <Badge>{g.items.length}</Badge>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {g.items.map((d) => (
                  <LogoTile key={d._id} doc={d} readOnly={readOnly} light={light}
                    onEdit={(doc) => setEditing({ doc, creating: false, key: doc._id })} onToggleActive={toggleActive} onScale={adjustScale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <LogoDrawer
          key={editing.key}
          type={type}
          singular={singular}
          withCategory={withCategory}
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
        title={`Delete ${deleting?.name || `this ${singular}`}?`}
        body={`It will disappear from the website and the app within about a minute. This can't be undone — to hide it temporarily, switch it off instead.`}
        confirmLabel={`Delete ${singular}`}
        onConfirm={async () => {
          await api.del(`/cms/${type}/${deleting._id}`);
          setData((xs) => (xs || []).filter((x) => x._id !== deleting._id));
          setEditing(null);
          toast.success(`${deleting.name} deleted`);
        }}
      />
    </>
  );
}

