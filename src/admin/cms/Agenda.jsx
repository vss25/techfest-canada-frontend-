import { useId, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Coffee, Copy, Download, Mic, Pencil, Plus, Star, Trash2, UserRound, X,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, PageHeader, Select, SkeletonGrid,
  Switch, Tabs, Textarea, focusRing,
} from "../ui";
import { CmsBanners } from "./CmsParts";
import { LIVE_NOTE } from "./cmsMeta";
import useCmsStatus from "./useCmsStatus";
import { SESSIONS, DAYS, buildSpeakerIndex, matchSpeaker, formatTime12, getDuration } from "../../data/agenda";
import { FORMAT_KEYS, FORMAT_MAP, PILLARS, SECTORS, SESSION_TYPE_SUGGESTIONS } from "../../data/sessionFormats";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };
const byTime = (a, b) => (Number(a.day) - Number(b.day)) || String(a.time).localeCompare(String(b.time));

function FormatBadge({ format }) {
  const f = FORMAT_MAP[format];
  if (!f) return null;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: f.bg, color: f.tc, borderColor: `${f.tc}55` }}>
      {f.label}
    </span>
  );
}

const blank = (day) => ({
  title: "", day, time: "09:00", endTime: "09:30", type: "", format: "keynote", featured: false, isBreak: false,
  pillar: "", sector: "", stage: "", description: "", speakers: [], moderator: { name: "", org: "" },
});

const toForm = (d) => ({
  title: d.title || "", day: Number(d.day) || 1, time: d.time || "09:00", endTime: d.endTime || d.time || "09:30",
  type: d.type || "", format: d.format || "", featured: !!d.featured, isBreak: !!d.isBreak,
  pillar: d.pillar || "", sector: d.sector || "", stage: d.stage || "", description: d.description || "",
  speakers: (d.speakers || []).map((p) => ({ name: p.name || "", org: p.org || "", tentative: !!p.tentative })),
  moderator: { name: d.moderator?.name || "", org: d.moderator?.org || "" },
});

/** Form → request body. Speakers/moderator are sent as plain objects (the server adds _key). */
function toBody(form, original) {
  const people = form.speakers.map((p) => ({ name: p.name.trim(), org: p.org.trim() || undefined, tentative: p.tentative || undefined }))
    .filter((p) => p.name);
  const mod = form.moderator.name.trim() ? { name: form.moderator.name.trim(), org: form.moderator.org.trim() || undefined } : null;
  const body = {
    title: form.title.trim(), day: Number(form.day), time: form.time, endTime: form.endTime,
    type: form.type.trim() || null, format: form.format || null, featured: !!form.featured, isBreak: !!form.isBreak,
    pillar: form.pillar || null, sector: form.sector || null, stage: form.stage.trim() || null,
    description: form.description.trim() || null, speakers: people, moderator: mod,
  };
  if (!original) {
    // Creating: drop empty optional fields instead of "unsetting" them.
    for (const k of Object.keys(body)) if (body[k] === null) delete body[k];
  }
  return body;
}

function uniqueSessionId(day, existing) {
  const used = new Set(existing.map((s) => s.sessionId).filter(Boolean));
  for (;;) {
    const id = `d${day}-${Math.random().toString(36).slice(2, 6)}`;
    if (!used.has(id)) return id;
  }
}

/** Name input with suggestions from the Speakers list; warns when the name doesn't match a CMS speaker. */
function PersonName({ value, onChange, listId, index, label, placeholder }) {
  const match = value.trim() ? matchSpeaker(index, value) : null;
  return (
    <div className="min-w-0 flex-1">
      <Input value={value} onChange={(e) => onChange(e.target.value)} list={listId} placeholder={placeholder || "Name"} aria-label={label} className="py-2 text-sm" />
      {value.trim() && !match && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-200/90">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Not in the Speakers list — no photo or profile link on the website
        </p>
      )}
      {match && match.name !== value.trim() && (
        <p className="mt-1 text-[11px] text-ttfc-dim">Matches “{match.name}”</p>
      )}
    </div>
  );
}

function SessionDrawer({ doc, creating, defaultDay, all, speakerIndex, speakerNames, readOnly, onClose, onSaved }) {
  const toast = useToast();
  const listId = useId();
  const typeListId = useId();
  const [form, setForm] = useState(() => (doc ? toForm(doc) : blank(defaultDay)));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? (v.target.type === "checkbox" ? v.target.checked : v.target.value) : v }));
  const setSpeaker = (i, patch) => setForm((f) => ({ ...f, speakers: f.speakers.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const move = (i, d) => setForm((f) => {
    const s = [...f.speakers]; const j = i + d;
    if (j < 0 || j >= s.length) return f;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...f, speakers: s };
  });

  const save = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Give the session a title";
    if (!TIME_RE.test(form.time)) errs.time = "Pick a start time";
    if (!TIME_RE.test(form.endTime)) errs.endTime = "Pick an end time";
    else if (TIME_RE.test(form.time) && toMin(form.endTime) <= toMin(form.time)) errs.endTime = "End time must be after the start";
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }
    const body = toBody(form, creating ? null : doc);
    if (creating) body.sessionId = uniqueSessionId(form.day, all);
    setSaving(true);
    try {
      const saved = creating ? await api.post("/cms/session", body) : await api.patch(`/cms/session/${doc._id}`, body);
      toast.success(creating ? `Session added. ${LIVE_NOTE}` : `Saved. ${LIVE_NOTE}`);
      onSaved({ ...(doc || {}), ...body, ...(saved || {}) });
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  const dur = TIME_RE.test(form.time) && TIME_RE.test(form.endTime) && toMin(form.endTime) > toMin(form.time) ? getDuration(form.time, form.endTime) : null;

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={creating ? "Add a session" : form.title || "Edit session"}
      description={readOnly ? "Read-only until editing is switched on." : LIVE_NOTE}
      footer={<>
        <span className="flex-1" />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" type="submit" form="session-form" loading={saving} disabled={readOnly}>{creating ? "Add session" : "Save changes"}</Button>
      </>}
    >
      <datalist id={listId}>{speakerNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={typeListId}>{SESSION_TYPE_SUGGESTIONS.map((n) => <option key={n} value={n} />)}</datalist>
      <form id="session-form" onSubmit={save} className="space-y-5" noValidate>
        <Field label="Title" required error={errors.title}>
          {(id) => <Input id={id} value={form.title} onChange={set("title")} maxLength={200} disabled={readOnly} data-autofocus />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Day">{(id) => (
            <Select id={id} value={String(form.day)} onChange={(e) => set("day")(Number(e.target.value))} disabled={readOnly}>
              <option value="1">{DAYS[1].label} · {DAYS[1].date}</option>
              <option value="2">{DAYS[2].label} · {DAYS[2].date}</option>
            </Select>
          )}</Field>
          <Field label="Starts" required error={errors.time}>{(id) => <Input id={id} type="time" step={300} value={form.time} onChange={set("time")} disabled={readOnly} />}</Field>
          <Field label="Ends" required error={errors.endTime} hint={dur ? `${dur} long` : undefined}>{(id) => <Input id={id} type="time" step={300} value={form.endTime} onChange={set("endTime")} disabled={readOnly} />}</Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Session type label" hint="Shown on the card, e.g. “Fireside Chat”.">
            {(id) => <Input id={id} value={form.type} onChange={set("type")} list={typeListId} maxLength={60} disabled={readOnly} placeholder="Keynote" />}
          </Field>
          <Field label="Format" hint="Sets the colour and badge on the agenda.">{(id) => (
            <Select id={id} value={form.format} onChange={set("format")} disabled={readOnly}>
              <option value="">Not set</option>
              {FORMAT_KEYS.map((k) => <option key={k} value={k}>{FORMAT_MAP[k]?.label || k}</option>)}
            </Select>
          )}</Field>
        </div>

        <div className="grid gap-4 rounded-2xl border border-ttfc-line p-4 sm:grid-cols-2">
          <Switch label="Featured" description="Highlighted on the agenda." checked={form.featured} onChange={set("featured")} disabled={readOnly} />
          <Switch label="Break / meal" description="Shown as a break (no speakers needed)." checked={form.isBreak} onChange={set("isBreak")} disabled={readOnly} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tech pillar">{(id) => (
            <Select id={id} value={form.pillar} onChange={set("pillar")} disabled={readOnly}>
              <option value="">None</option>{PILLARS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          )}</Field>
          <Field label="Sector">{(id) => (
            <Select id={id} value={form.sector} onChange={set("sector")} disabled={readOnly}>
              <option value="">None</option>{SECTORS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          )}</Field>
          <Field label="Stage / room">{(id) => <Input id={id} value={form.stage} onChange={set("stage")} maxLength={80} disabled={readOnly} placeholder="Main stage" />}</Field>
        </div>

        <fieldset className="rounded-2xl border border-ttfc-line p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Speakers</legend>
          {form.speakers.length === 0 && <p className="mb-3 text-sm text-ttfc-dim">No speakers yet.</p>}
          <ol className="space-y-3">
            {form.speakers.map((p, i) => (
              <li key={i} className="rounded-xl border border-ttfc-line bg-ttfc-ink/40 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <PersonName value={p.name} onChange={(v) => setSpeaker(i, { name: v })} listId={listId} index={speakerIndex} label={`Speaker ${i + 1} name`} />
                  <Input value={p.org} onChange={(e) => setSpeaker(i, { org: e.target.value })} placeholder="Organisation (optional)" aria-label={`Speaker ${i + 1} organisation`} className="py-2 text-sm sm:w-48" disabled={readOnly} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="mr-auto inline-flex cursor-pointer items-center gap-2 text-xs text-ttfc-muted">
                    <input type="checkbox" checked={p.tentative} onChange={(e) => setSpeaker(i, { tentative: e.target.checked })} className="h-4 w-4 accent-[#E8458B]" disabled={readOnly} />
                    Tentative (not confirmed yet)
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || readOnly} aria-label={`Move ${p.name || "speaker"} up`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 disabled:opacity-30 ${focusRing}`}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === form.speakers.length - 1 || readOnly} aria-label={`Move ${p.name || "speaker"} down`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-white/5 disabled:opacity-30 ${focusRing}`}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, speakers: f.speakers.filter((_, j) => j !== i) }))} disabled={readOnly} aria-label={`Remove ${p.name || "speaker"}`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-300/80 hover:bg-red-500/10 disabled:opacity-30 ${focusRing}`}><X className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ol>
          <Button className="mt-3" size="sm" icon={Plus} disabled={readOnly || form.speakers.length >= 20}
            onClick={() => setForm((f) => ({ ...f, speakers: [...f.speakers, { name: "", org: "", tentative: false }] }))}>Add speaker</Button>
        </fieldset>

        <fieldset className="rounded-2xl border border-ttfc-line p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Moderator</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <PersonName value={form.moderator.name} onChange={(v) => setForm((f) => ({ ...f, moderator: { ...f.moderator, name: v } }))} listId={listId} index={speakerIndex} label="Moderator name" placeholder="No moderator" />
            <Input value={form.moderator.org} onChange={(e) => setForm((f) => ({ ...f, moderator: { ...f.moderator, org: e.target.value } }))} placeholder="Organisation (optional)" aria-label="Moderator organisation" className="py-2 text-sm sm:w-48" disabled={readOnly} />
            {(form.moderator.name || form.moderator.org) && (
              <Button size="sm" variant="ghost" icon={X} onClick={() => setForm((f) => ({ ...f, moderator: { name: "", org: "" } }))} disabled={readOnly}>Clear</Button>
            )}
          </div>
        </fieldset>

        <Field label="Description" hint={`${form.description.length}/1500 — optional.`}>
          {(id) => <Textarea id={id} rows={4} value={form.description} onChange={set("description")} maxLength={1500} disabled={readOnly} />}
        </Field>
      </form>
    </Drawer>
  );
}

function SessionRow({ s, speakerIndex, readOnly, onEdit, onDuplicate, onDelete }) {
  const people = (s.speakers || []).map((p) => p.name).filter(Boolean);
  const unmatched = [...(s.speakers || []), ...(s.moderator?.name ? [s.moderator] : [])].filter((p) => p.name && !matchSpeaker(speakerIndex, p.name));
  return (
    <li className={`grid gap-3 border-b border-ttfc-line/70 px-4 py-4 last:border-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-start sm:px-5 ${s.isBreak ? "bg-white/[0.02]" : ""}`}>
      <div className="text-sm tabular-nums">
        {s.time ? (
          <>
            <p className="font-semibold text-ttfc-text">{formatTime12(s.time)}</p>
            <p className="text-xs text-ttfc-dim">to {formatTime12(s.endTime || s.time)}{s.endTime ? ` · ${getDuration(s.time, s.endTime)}` : ""}</p>
          </>
        ) : (
          <p className="font-semibold text-amber-200">No time</p>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {s.featured && <Star className="h-3.5 w-3.5 text-ttfc-orange" fill="currentColor" aria-label="Featured" />}
          {s.isBreak && <Coffee className="h-3.5 w-3.5 text-ttfc-dim" aria-label="Break" />}
          <FormatBadge format={s.format} />
          {s.type && <span className="text-xs text-ttfc-muted">{s.type}</span>}
          {s.stage && <Badge>{s.stage}</Badge>}
        </div>
        <p className="mt-1 font-semibold text-ttfc-text">{s.title}</p>
        {(people.length > 0 || s.moderator?.name) && (
          <p className="mt-1 text-xs leading-relaxed text-ttfc-muted">
            {people.length > 0 && <><Mic className="mr-1 inline h-3 w-3" aria-hidden="true" />{people.join(", ")}</>}
            {s.moderator?.name && <span className="ml-2"><UserRound className="mr-1 inline h-3 w-3" aria-hidden="true" />Moderator: {s.moderator.name}</span>}
          </p>
        )}
        {unmatched.length > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-200/90">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" /> No photo/link for: {unmatched.map((p) => p.name).join(", ")}
          </p>
        )}
      </div>
      <div className="flex gap-1 sm:justify-end">
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(s)}>Edit</Button>
        <Button size="sm" variant="ghost" icon={Copy} onClick={() => onDuplicate(s)} disabled={readOnly}>Duplicate</Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onDelete(s)} disabled={readOnly} className="text-red-300/80 hover:text-red-200" aria-label={`Delete ${s.title}`}>
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </div>
    </li>
  );
}

export default function Agenda() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/session");
  const speakers = useApi("/cms/speaker");
  const [day, setDay] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);

  const list = useMemo(() => [...(data || [])].sort(byTime), [data]);
  const speakerIndex = useMemo(() => buildSpeakerIndex(speakers.data || []), [speakers.data]);
  const speakerNames = useMemo(() => (speakers.data || []).map((d) => d.name).filter(Boolean).sort(), [speakers.data]);
  const dayList = list.filter((s) => Number(s.day) === day && s.time);
  // Sessions made elsewhere (e.g. Sanity Studio) without a day or time don't show on the site.
  const unscheduled = list.filter((s) => !(Number(s.day) === 1 || Number(s.day) === 2) || !s.time);
  const imported = new Set(list.map((s) => s.sessionId).filter(Boolean));
  const missing = SESSIONS.filter((s) => !imported.has(s.id)).length;
  const counts = { 1: list.filter((s) => Number(s.day) === 1).length, 2: list.filter((s) => Number(s.day) === 2).length };

  const importAgenda = async () => {
    setImporting(true);
    try {
      const r = await api.post("/cms/session/import", { sessions: SESSIONS });
      toast.success(`Agenda imported: ${missing || r.imported} sessions added${r.skipped?.length ? ` · ${r.skipped.length} skipped` : ""}. Existing sessions weren't changed.`);
      reload();
    } catch (err) { toast.error(err); } finally { setImporting(false); }
  };

  const duplicate = async (s) => {
    const body = toBody({ ...toForm(s), title: `${s.title} (copy)` }, null);
    body.sessionId = uniqueSessionId(s.day, list);
    try {
      const saved = await api.post("/cms/session", body);
      setData((xs) => [...(xs || []), { ...body, ...(saved || {}) }]);
      toast.success("Session duplicated — edit the copy to change it");
    } catch (err) { toast.error(err); }
  };

  const onSaved = (doc) => {
    setEditing(null);
    if (doc.day) setDay(Number(doc.day));
    setData((xs) => {
      const arr = xs || [];
      return arr.some((x) => x._id === doc._id) ? arr.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)) : [...arr, doc];
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Website content"
        title="Agenda"
        description="Every session on the website's Agenda page and in the app: titles, times, formats, speakers and moderators."
        actions={(
          <div className="flex flex-wrap gap-2">
            {missing > 0 && (
              <Button icon={Download} loading={importing} disabled={readOnly} onClick={importAgenda}
                title="Adds the built-in sessions that aren't in the CMS yet. Never changes sessions you've edited.">
                Import current agenda ({missing})
              </Button>
            )}
            {list.length > 0 && <Button variant="primary" icon={Plus} disabled={readOnly} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add session</Button>}
          </div>
        )}
      />
      <CmsBanners configured={configured} />

      {loading ? <SkeletonGrid count={4} className="h-20" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !list.length ? (
        <EmptyState
          icon={CalendarDays}
          title="The agenda isn't in the CMS yet"
          body={`The website is still showing the built-in agenda. Import it once (${SESSIONS.length} sessions) and you can edit everything here. Importing never overwrites sessions that already exist.`}
          action={<Button variant="primary" icon={Download} loading={importing} disabled={readOnly} onClick={importAgenda}>Import the current agenda ({SESSIONS.length} sessions)</Button>}
        />
      ) : (
        <>
          {unscheduled.length > 0 && (
            <div className="mb-6 rounded-[18px] border border-amber-400/40 bg-amber-400/10 p-4">
              <p className="text-sm font-semibold text-amber-200">Needs a day &amp; time ({unscheduled.length})</p>
              <p className="mt-1 text-xs text-ttfc-dim">These don't appear on the website or in the app until they have a day, start and end time. Edit them, or delete them if they were tests.</p>
              <ul className="mt-3 overflow-hidden rounded-[14px] border border-ttfc-line bg-ttfc-panel">
                {unscheduled.map((s) => (
                  <SessionRow key={s._id} s={s} speakerIndex={speakerIndex} readOnly={readOnly}
                    onEdit={(doc) => setEditing({ doc, creating: false, key: doc._id })} onDuplicate={duplicate} onDelete={setDeleting} />
                ))}
              </ul>
            </div>
          )}
          <Tabs value={day} onChange={setDay} label="Day"
            tabs={[1, 2].map((d) => ({ key: d, label: `${DAYS[d].label} · ${DAYS[d].date}`, count: counts[d] }))} />
          {dayList.length ? (
            <ul className="overflow-hidden rounded-[18px] border border-ttfc-line bg-ttfc-panel">
              {dayList.map((s) => (
                <SessionRow key={s._id} s={s} speakerIndex={speakerIndex} readOnly={readOnly}
                  onEdit={(doc) => setEditing({ doc, creating: false, key: doc._id })} onDuplicate={duplicate} onDelete={setDeleting} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarDays} title={`Nothing on ${DAYS[day].label} yet`}
              action={!readOnly && <Button variant="primary" icon={Plus} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add session</Button>} />
          )}
          <p className="mt-3 text-xs text-ttfc-dim">
            Pillars: {PILLARS.map((p) => p.label).join(", ")}. Session ids stay the same when you edit, so links to a session keep working.
          </p>
        </>
      )}

      {editing && (
        <SessionDrawer
          key={editing.key}
          doc={editing.doc}
          creating={editing.creating}
          defaultDay={day}
          all={list}
          speakerIndex={speakerIndex}
          speakerNames={speakerNames}
          readOnly={readOnly}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.title || "this session"}”?`}
        body={`It disappears from the website and the app within about a minute. This can't be undone.`}
        confirmLabel="Delete session"
        onConfirm={async () => {
          await api.del(`/cms/session/${deleting._id}`);
          setData((xs) => (xs || []).filter((x) => x._id !== deleting._id));
          toast.success("Session deleted");
        }}
      />
    </>
  );
}

