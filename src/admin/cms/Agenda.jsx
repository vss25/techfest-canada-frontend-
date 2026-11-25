import { useId, useMemo, useState } from "react";
import { useAutosave } from "./useAutosave";
import { AutosaveNote } from "./AutosaveNote";
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Clock, Coffee, Copy, Download, ListChecks, Mic, Pencil, Plus, Star, Trash2, UserRound, X,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EditPanel, EmptyState, ErrorState, Field, IconButton, Input, Modal, PageHeader, Select, SkeletonGrid,
  Switch, TableWrap, Tabs, Textarea, focusRing,
} from "../ui";
import { CmsBanners } from "./CmsParts";
import { ReadinessStrip } from "./ReadinessCard";
import { ChangeBadge } from "./workflow";
import { changeState } from "./workflowState";
import { LIVE_NOTE } from "./cmsMeta";
import useCmsStatus from "./useCmsStatus";
import { EARLIER_STEPS, LATER_STEPS, planShift, stageOf } from "./agendaShift";
import {
  AUTO_HINTS, BADGE_LABELS, FEATURE_LABELS, LIVE_FEATURES, LIVE_MODES, MODE_LABELS, autoReason, globalSwitches, liveMode,
} from "./sessionLive";
import { SESSIONS, DAYS, buildSpeakerIndex, matchSpeaker, formatTime12, getDuration } from "../../data/agenda";
import { approvedAgendaFor } from "../../data/approvedAgendas";
import { FORMAT_KEYS, FORMAT_MAP, PILLARS, SECTORS } from "../../data/sessionFormats";
import { AgendaTypesDialog } from "./AgendaTypes";
import { useAgendaTypes } from "./useAgendaTypes";
import { useEditFromUrl } from "../search/deepLink";
import { useAdminEvent } from "../eventContext";
import { useAdminTheme } from "../theme";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };
const byTime = (a, b) => (Number(a.day) - Number(b.day)) || String(a.time).localeCompare(String(b.time));

function FormatBadge({ format }) {
  const { theme } = useAdminTheme();
  const f = FORMAT_MAP[format];
  if (!f) return null;
  // Light panel: the website's light-mode colours, the text deepened for AA contrast at this small size.
  const style = theme === "light"
    ? { background: f.bgL, color: `color-mix(in srgb, ${f.tcL} 70%, #000)`, borderColor: `${f.tcL}55` }
    : { background: f.bg, color: f.tc, borderColor: `${f.tc}55` };
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={style}>
      {f.label}
    </span>
  );
}

const blank = (day) => ({
  title: "", day, time: "09:00", endTime: "09:30", type: "", format: "keynote", featured: false, isBreak: false,
  pillar: "", sector: "", stage: "", description: "", speakers: [], moderator: { name: "", org: "" },
  polls: "auto", qa: "auto", events: [],
});

const refIds = (d) => (d?.events || []).map((r) => r?._ref).filter(Boolean);

const toForm = (d) => ({
  title: d.title || "", day: Number(d.day) || 1, time: d.time || "09:00", endTime: d.endTime || d.time || "09:30",
  type: d.type || "", format: d.format || "", featured: !!d.featured, isBreak: !!d.isBreak,
  pillar: d.pillar || "", sector: d.sector || "", stage: d.stage || "", description: d.description || "",
  speakers: (d.speakers || []).map((p) => ({ name: p.name || "", org: p.org || "", tentative: !!p.tentative })),
  moderator: { name: d.moderator?.name || "", org: d.moderator?.org || "" },
  polls: liveMode(d.polls), qa: liveMode(d.qa), events: refIds(d),
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
  // Live switches: always on create; on edit only when changed (missing = "auto").
  for (const k of LIVE_FEATURES) if (!original || liveMode(original[k]) !== form[k]) body[k] = form[k];
  // Which events the session is on (redesign step 1): sent on create when picked, on edit when changed.
  const evs = [...(form.events || [])].sort();
  if (original ? JSON.stringify(evs) !== JSON.stringify(refIds(original).sort()) : evs.length) body.events = evs;
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

/** Auto / On / Off for one live feature, with what Auto resolves to for the form as it is now. */
function LiveModeControl({ feature, value, onChange, reason, globalOff, readOnly }) {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset className="min-w-0" aria-describedby={hintId}>
      <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">{FEATURE_LABELS[feature]}</legend>
      <div className="inline-flex overflow-hidden rounded-xl border border-ttfc-line bg-ttfc-ink/40">
        {LIVE_MODES.map((m) => (
          <label key={m}
            className={`relative inline-flex h-9 min-w-[3.5rem] items-center justify-center border-r border-ttfc-line px-3 text-sm font-semibold transition last:border-r-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ttfc-purple ${
              readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${
              value === m ? "bg-ttfc-purple/30 text-ttfc-contrast" : "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text"}`}>
            <input type="radio" name={name} value={m} checked={value === m} onChange={() => onChange(m)} disabled={readOnly} className="sr-only" />
            {MODE_LABELS[m]}
          </label>
        ))}
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-ttfc-dim">
        {AUTO_HINTS[reason]}
        {globalOff && <span className="block text-amber-200/90">Switched off for the whole app in App text &amp; switches, so it's off here too.</span>}
      </p>
    </fieldset>
  );
}

/* "Day 1 · Feb 3": the day's date from the event's start date (Nov 2026: the built-in DAYS are
   Toronto 2026's, Oct 26–27, which is wrong for every 2027 event). No event, or one without a
   start date: the built-in label for 2026, else just "Day 1". */
/** How many days the event runs: its dates when set, else 1 for a Briefing and 2 for the Main Event (and with no event). */
function eventDays(ev) {
  if (ev?.startDate && ev?.endDate) {
    const n = Math.round((Date.parse(`${ev.endDate}T12:00:00Z`) - Date.parse(`${ev.startDate}T12:00:00Z`)) / 86400000) + 1;
    if (n >= 1) return Math.min(n, 2);
  }
  return ev?.type === "briefing" ? 1 : 2;
}

function dayLabel(d, ev) {
  if (ev?.startDate) {
    const t = new Date(`${ev.startDate}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + d - 1);
    return `Day ${d} · ${t.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  }
  if (ev) return `Day ${d}`;
  return `${DAYS[d].label} · ${DAYS[d].date}`;
}

function SessionDrawer({ types = [], onEditTypes, doc, creating, defaultDay, defaultEventId, eventList = [], all, speakerIndex, speakerNames, readOnly, globalLive, onClose, onSaved, onAutoSaved, onDuplicate, onDelete, onShift }) {
  const toast = useToast();
  // Whose dates the Day picker shows: the event the agenda is filtered to, else the session's own first event.
  const dayEvent = eventList.find((e) => e._id === (defaultEventId || refIds(doc)[0]));
  const listId = useId();
  const [form, setForm] = useState(() => (doc ? toForm(doc) : { ...blank(defaultDay), events: defaultEventId ? [defaultEventId] : [] }));
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

  const save = async (e, { auto: isAuto = false } = {}) => {
    e?.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Give the session a title";
    if (!TIME_RE.test(form.time)) errs.time = "Pick a start time";
    if (!TIME_RE.test(form.endTime)) errs.endTime = "Pick an end time";
    else if (TIME_RE.test(form.time) && toMin(form.endTime) <= toMin(form.time)) errs.endTime = "End time must be after the start";
    // Autosave keeps an incomplete draft (empty fields are checked when it's sent to staging);
    // it waits only while the end time is before the start.
    if (isAuto && TIME_RE.test(form.time) && TIME_RE.test(form.endTime) && errs.endTime) return `${errs.endTime}.`;
    if (!isAuto) {
      setErrors(errs);
      if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }
    }
    const body = toBody(form, creating ? null : doc);
    if (creating) body.sessionId = uniqueSessionId(form.day, all);
    if (isAuto) {
      // Autosave: saved as a draft, quietly, and the editor stays open.
      const saved = creating ? await api.post("/cms/session?draft=1", body) : await api.patch(`/cms/session/${doc._id}?draft=1`, body);
      onAutoSaved({ ...(doc || {}), ...body, ...(saved || {}), hasDraft: true });
      return true;
    }
    setSaving(true);
    try {
      const saved = creating ? await api.post("/cms/session?draft=1", body) : await api.patch(`/cms/session/${doc._id}?draft=1`, body);
      auto.markSaved();
      toast.success(creating ? `Session added. ${LIVE_NOTE}` : `Saved. ${LIVE_NOTE}`);
      onSaved({ ...(doc || {}), ...body, ...(saved || {}) });
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  // 30 seconds after the last change, or on closing the panel: saved as a draft (useAutosave.js).
  const auto = useAutosave({ value: form, enabled: !readOnly, save: () => save(null, { auto: true }) });

  const dur = TIME_RE.test(form.time) && TIME_RE.test(form.endTime) && toMin(form.endTime) > toMin(form.time) ? getDuration(form.time, form.endTime) : null;

  return (
    <EditPanel
      open
      onClose={onClose}
      title={creating ? "Add a session" : `Edit session: ${doc?.title || form.title}`}
      description={readOnly ? "Read-only until editing is switched on." : "Fields marked * are required."}
      footer={<>
        {!creating && doc && (
          <>
            {onShift && doc.time && <Button icon={Clock} onClick={() => onShift(doc)} disabled={readOnly || saving}>Running late…</Button>}
            <Button icon={Copy} onClick={() => onDuplicate(doc)} disabled={readOnly || saving}>Duplicate</Button>
            <Button icon={Trash2} onClick={() => { auto.cancel(); onDelete(doc); }} disabled={readOnly || saving} className="text-[#B91C1C]">Delete</Button>
          </>
        )}
        <span className="flex-1" />
        {!readOnly && <AutosaveNote auto={auto} className="self-center" />}
        <Button onClick={() => { auto.cancel(); onClose(); }} disabled={saving}>Cancel</Button>
        <Button variant="primary" type="submit" form="session-form" loading={saving} disabled={readOnly}>{creating ? "Add session" : "Save changes"}</Button>
      </>}
    >
      <datalist id={listId}>{speakerNames.map((n) => <option key={n} value={n} />)}</datalist>
      <form id="session-form" onSubmit={save} className="space-y-5" noValidate>
        <Field label="Title" required error={errors.title}>
          {(id) => <Input id={id} value={form.title} onChange={set("title")} maxLength={200} disabled={readOnly} data-autofocus />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Day">{(id) => (
            <Select id={id} value={String(form.day)} onChange={(e) => set("day")(Number(e.target.value))} disabled={readOnly}>
              <option value="1">{dayLabel(1, dayEvent)}</option>
              {(eventDays(dayEvent) > 1 || Number(form.day) === 2) && <option value="2">{dayLabel(2, dayEvent)}</option>}
            </Select>
          )}</Field>
          <Field label="Starts" required error={errors.time}>{(id) => <Input id={id} type="time" step={300} value={form.time} onChange={set("time")} disabled={readOnly} />}</Field>
          <Field label="Ends" required error={errors.endTime} hint={dur ? `${dur} long` : undefined}>{(id) => <Input id={id} type="time" step={300} value={form.endTime} onChange={set("endTime")} disabled={readOnly} />}</Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Session type" hint={<>Shown on the session, e.g. “Case Study”. {onEditTypes && !readOnly && (
            <button type="button" onClick={onEditTypes} className={`font-semibold text-ttfc-pink underline-offset-2 hover:underline ${focusRing}`}>Add or edit types</button>
          )}</>}>{(id) => (
            <Select id={id} value={form.type} disabled={readOnly}
              onChange={(e) => {
                const v = e.target.value;
                const t = types.find((x) => x.label === v);
                setForm((f) => ({ ...f, type: v, ...(t ? { format: t.format } : {}) }));
              }}>
              <option value="">Not set</option>
              {types.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
              {form.type && !types.some((t) => t.label === form.type) && <option value={form.type}>{form.type} (not in the list)</option>}
            </Select>
          )}</Field>
          <Field label="Colour" hint="Set by the session type; change it here for just this session.">{(id) => (
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
          {eventList.length > 0 && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Events</legend>
              <p className="mb-2 text-xs text-ttfc-dim">The event pages this session appears on. None ticked = every event (the old behaviour).</p>
              <div className="flex flex-wrap gap-2">
                {eventList.map((ev) => {
                  const on = form.events.includes(ev._id);
                  return (
                    <label key={ev._id} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${on ? "border-ttfc-pink bg-ttfc-pink/10" : "border-ttfc-line"}`}>
                      <input type="checkbox" checked={on} disabled={readOnly}
                        onChange={(e) => setForm((f) => ({ ...f, events: e.target.checked ? [...f.events, ev._id] : f.events.filter((x) => x !== ev._id) }))} />
                      {ev.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
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
                    <input type="checkbox" checked={p.tentative} onChange={(e) => setSpeaker(i, { tentative: e.target.checked })} className="h-4 w-4 accent-ttfc-pink" disabled={readOnly} />
                    Tentative (not confirmed yet)
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || readOnly} aria-label={`Move ${p.name || "speaker"} up`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-ttfc-contrast/5 disabled:opacity-30 ${focusRing}`}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === form.speakers.length - 1 || readOnly} aria-label={`Move ${p.name || "speaker"} down`} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ttfc-muted hover:bg-ttfc-contrast/5 disabled:opacity-30 ${focusRing}`}><ArrowDown className="h-4 w-4" /></button>
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

        <fieldset className="rounded-2xl border border-ttfc-line p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Live features</legend>
          <p className="mb-3 text-xs text-ttfc-muted">What the app offers during this session. Auto turns them on for moderated sessions, not keynotes or breaks.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {LIVE_FEATURES.map((k) => (
              <LiveModeControl key={k} feature={k} value={form[k]} onChange={set(k)} reason={autoReason(form)}
                globalOff={globalLive?.[k] === false} readOnly={readOnly} />
            ))}
          </div>
        </fieldset>

        <Field label="Description" hint={`${form.description.length}/1500 — optional.`}>
          {(id) => <Textarea id={id} rows={4} value={form.description} onChange={set("description")} maxLength={1500} disabled={readOnly} />}
        </Field>
      </form>
    </EditPanel>
  );
}

function SessionRow({ s, speakerIndex, selected, onEdit }) {
  const people = [...(s.speakers || []), ...(s.moderator?.name ? [s.moderator] : [])].filter((p) => p.name);
  const named = people.filter((p) => matchSpeaker(speakerIndex, p.name)).length;
  const open = () => onEdit(s);
  return (
    <tr className="is-clickable" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}
      style={selected ? { background: "#FBE9F3", boxShadow: "inset 3px 0 0 #D6308C" } : undefined}>
      <td className="whitespace-nowrap tabular-nums">
        {s.time ? formatTime12(s.time) : <span className="font-semibold text-[#B45309]">No time</span>}
      </td>
      <td className="font-semibold">
        <span className="flex items-center gap-1.5">
          {s.featured && <Star className="h-3.5 w-3.5 shrink-0 text-[#F5A623]" fill="currentColor" aria-label="Featured" />}
          {s.isBreak && <Coffee className="h-3.5 w-3.5 shrink-0 text-[#8A86A0]" aria-label="Break" />}
          {s.title}
        </span>
      </td>
      <td>{s.type || FORMAT_MAP[s.format]?.label || "—"}</td>
      <td className="whitespace-nowrap text-[#4A4566]" title={people.map((p) => p.name).join(", ") || undefined}>
        {s.isBreak ? "—" : people.length ? `${named} of ${people.length} named` : "None yet"}
      </td>
      <td>{changeState(s) ? <ChangeBadge doc={s} /> : <Badge tone="good">Live</Badge>}</td>
    </tr>
  );
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const signed = (m) => `${m > 0 ? "+" : "\u2212"}${Math.abs(m)}`;
const range12 = (a, b) => (b ? `${formatTime12(a)}\u2013${formatTime12(b)}` : formatTime12(a));
const SHIFT_NOTE = "The app and website update within a minute. Reminders move with the new times.";

/** "Running late": pick minutes and scope, preview what moves, then one server call. */
function ShiftDialog({ session, all, readOnly, onClose, onShifted, onStale }) {
  const minutesName = useId();
  const scopeName = useId();
  const [minutes, setMinutes] = useState(5);
  const [scope, setScope] = useState("stage");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plans = useMemo(() => ({
    stage: planShift(all, session._id, minutes, "stage"),
    day: planShift(all, session._id, minutes, "day"),
  }), [all, session._id, minutes]);
  const plan = plans[scope];
  const n = plan.changes?.length || 0;
  const stage = stageOf(session.stage);

  const close = () => { if (!busy) onClose(); };
  const confirm = async () => {
    setBusy(true); setError("");
    try {
      const r = await api.post("/cms/session/shift", { id: session._id, minutes, scope });
      onShifted(r, { id: session._id, minutes, scope });
    } catch (err) {
      setBusy(false);
      setError(err?.message || "Something went wrong");
      if (err?.status === 409) onStale();
    }
  };

  const segment = (steps, label) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ttfc-dim">{label}</span>
      <div className="inline-flex overflow-hidden rounded-xl border border-ttfc-line bg-ttfc-ink/40">
        {steps.map((m) => (
          <label key={m}
            className={`relative inline-flex h-9 min-w-[3rem] cursor-pointer items-center justify-center border-r border-ttfc-line px-2.5 text-sm font-semibold tabular-nums transition last:border-r-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ttfc-purple ${
              minutes === m ? "bg-ttfc-purple/30 text-ttfc-contrast" : "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text"}`}>
            <input type="radio" name={minutesName} value={m} checked={minutes === m} onChange={() => setMinutes(m)} disabled={busy} className="sr-only" />
            {signed(m)}<span className="sr-only"> minutes {m > 0 ? "later" : "earlier"}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const scopeOption = (value, label) => {
    const count = plans[value].changes?.length;
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ttfc-line p-3 transition hover:bg-ttfc-contrast/[0.02] has-[:checked]:border-ttfc-purple/60 has-[:checked]:bg-ttfc-purple/10">
        <input type="radio" name={scopeName} value={value} checked={scope === value} onChange={() => setScope(value)} disabled={busy}
          className="mt-0.5 h-4 w-4 shrink-0 accent-ttfc-pink" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ttfc-text">{label}</span>
          {count !== undefined && <span className="block text-xs text-ttfc-dim">{plural(count, "session")} change</span>}
        </span>
      </label>
    );
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Shift times from \u201c${session.title || "this session"}\u201d`}
      description={SHIFT_NOTE}
      footer={<>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon={Clock} loading={busy} onClick={confirm} disabled={readOnly || !!plan.error || !n}>
          {plan.error || !n ? "Shift times" : `Shift ${plural(n, "session")}`}
        </Button>
      </>}
    >
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Move by (minutes)</legend>
        <div className="flex flex-wrap gap-3">
          {segment(LATER_STEPS, "Later")}
          {segment(EARLIER_STEPS, "Earlier")}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Which sessions</legend>
        <div className="grid gap-2">
          {scopeOption("stage", `Only ${stage}`)}
          {scopeOption("day", `All stages on ${DAYS[Number(session.day)]?.label || `Day ${session.day}`}`)}
        </div>
      </fieldset>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ttfc-text/90">What changes</p>
        {plan.error ? (
          <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{plan.error}</p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-ttfc-line bg-ttfc-ink/40">
            {plan.changes.map((c) => (
              <li key={c._id} className="border-b border-ttfc-line/70 px-3 py-2 last:border-0">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ttfc-text">
                  {c.isBreak && <Coffee className="h-3.5 w-3.5 shrink-0 text-ttfc-dim" aria-label="Break" />}
                  <span className="truncate">{c.title || "Untitled session"}</span>
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-ttfc-muted">
                  {c.anchor ? (
                    <>Ends <span className="text-ttfc-dim">{formatTime12(c.from.endTime)}</span> → <span className="font-semibold text-ttfc-text">{formatTime12(c.endTime)}</span>
                      <span className="text-ttfc-dim"> · starts at {formatTime12(c.time)} as before</span></>
                  ) : (
                    <><span className="text-ttfc-dim">{range12(c.from.time, c.from.endTime)}</span> → <span className="font-semibold text-ttfc-text">{range12(c.time, c.endTime)}</span>
                      {scope === "day" && stageOf(c.stage) !== stage && <span className="text-ttfc-dim"> · {stageOf(c.stage)}</span>}</>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!plan.error && n === 1 && <p className="mt-2 text-xs text-ttfc-dim">Nothing comes after it, so only its end time changes.</p>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Modal>
  );
}

export default function Agenda() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/session?drafts=1");
  const speakers = useApi("/cms/speaker?drafts=1");
  const eventsApi = useApi("/cms/event?drafts=1");
  const agendaTypes = useAgendaTypes();
  const [typesOpen, setTypesOpen] = useState(false);
  const eventList = useMemo(() => (eventsApi.data || []).filter((e) => e?.name), [eventsApi.data]);
  // The event chosen in the top bar (the approved design's switcher), unless this page picks "All events".
  const { current: chosenEvent } = useAdminEvent();
  const [picked, setPicked] = useState(null);
  const eventId = picked ?? chosenEvent?._id ?? "";
  const showAll = () => setPicked("");
  const followSwitcher = () => setPicked(null);
  const eventName = eventList.find((e) => e._id === eventId)?.name || chosenEvent?.name || "";
  const appContent = useApi("/console/app-content");   // the global polls / Q&A switches (on if it can't be read)
  const [day, setDay] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [shifting, setShifting] = useState(null);

  const allSessions = useMemo(() => [...(data || [])].sort(byTime), [data]);
  // The event picker above the days: only that event's sessions (untagged ones are on every event).
  const list = useMemo(() => (eventId
    ? allSessions.filter((s) => { const ids = refIds(s); return !ids.length || ids.includes(eventId); })
    : allSessions), [allSessions, eventId]);
  // From the global search: ?edit=<id> opens that session on its day.
  useEditFromUrl(list, (doc) => {
    if (Number(doc.day) === 1 || Number(doc.day) === 2) setDay(Number(doc.day));
    setEditing({ doc, creating: false, key: doc._id });
  });
  const speakerIndex = useMemo(() => buildSpeakerIndex(speakers.data || []), [speakers.data]);
  const globalLive = useMemo(() => globalSwitches(appContent.data), [appContent.data]);
  const speakerNames = useMemo(() => (speakers.data || []).map((d) => d.name).filter(Boolean).sort(), [speakers.data]);
  // Sessions made elsewhere (e.g. Sanity Studio) without a day or time don't show on the site.
  const unscheduled = list.filter((s) => !(Number(s.day) === 1 || Number(s.day) === 2) || !s.time);
  // The built-in agenda is Toronto 2026's: compare it with every session, whatever event is picked.
  const imported = new Set(allSessions.map((s) => s.sessionId).filter(Boolean));
  const missing = SESSIONS.filter((s) => !imported.has(s.id)).length;
  const counts = { 1: list.filter((s) => Number(s.day) === 1).length, 2: list.filter((s) => Number(s.day) === 2).length };
  // A one-day Briefing has no Day 2 tab (unless a session was put on day 2 anyway, so it can be found and fixed).
  const tabEvent = eventList.find((e) => e._id === eventId);
  const dayKeys = eventDays(tabEvent) > 1 || counts[2] > 0 ? [1, 2] : [1];
  const shownDay = dayKeys.includes(day) ? day : 1;
  const dayList = list.filter((s) => Number(s.day) === shownDay && s.time);

  // The approved design's agenda for this event (Vancouver): copied in as saved changes, never straight to the website.
  const chosenRecord = eventList.find((e) => e._id === eventId);
  const approved = eventId ? approvedAgendaFor(chosenRecord || chosenEvent) : null;
  const ownTitles = new Set(allSessions.filter((x) => refIds(x).includes(eventId)).map((x) => x.title));
  const approvedMissing = approved ? approved.filter((a) => !ownTitles.has(a.title)) : [];
  const [copying, setCopying] = useState(false);
  const copyApproved = async () => {
    setCopying(true);
    const made = [];
    try {
      for (const a of approvedMissing) {
        const body = toBody({ ...blank(1), ...a, events: [eventId] }, null);
        body.sessionId = uniqueSessionId(1, [...allSessions, ...made]);
        const saved = await api.post("/cms/session?draft=1", body);
        made.push({ ...body, ...(saved || {}) });
      }
      toast.success(`${plural(made.length, "session")} copied from the approved design. They're saved here, not on the website: send them to staging from Website changes.`);
    } catch (err) { toast.error(err); } finally {
      if (made.length) setData((xs) => [...(xs || []), ...made]);
      setDay(1);
      setCopying(false);
    }
  };

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
      const saved = await api.post("/cms/session?draft=1", body);
      setData((xs) => [...(xs || []), { ...body, ...(saved || {}) }]);
      toast.success("Session duplicated — edit the copy to change it");
    } catch (err) { toast.error(err); }
  };

  const applyMoved = (moved = []) => {
    const byId = new Map(moved.map((m) => [m._id, m]));
    setData((xs) => (xs || []).map((x) => (byId.has(x._id) ? { ...x, time: byId.get(x._id).time, endTime: byId.get(x._id).endTime } : x)));
  };

  // Undo = the same shift with the opposite minutes, limited to exactly the sessions that moved.
  const undoShift = async (req, only) => {
    try {
      const r = await api.post("/cms/session/shift", { id: req.id, minutes: -req.minutes, scope: req.scope, only });
      applyMoved(r.moved);
      toast.success("Shift undone. The times are back to how they were.");
    } catch (err) { toast.error(err); } finally { reload(); }
  };

  const onShifted = (r, req) => {
    setShifting(null);
    applyMoved(r.moved);
    reload();
    const n = r.moved?.length || 0;
    const only = (r.moved || []).map((m) => m._id).filter((x) => x !== req.id);
    toast.success(`${plural(n, "session")} moved ${Math.abs(req.minutes)} min ${req.minutes > 0 ? "later" : "earlier"}.`, {
      action: { label: "Undo", onClick: () => undoShift(req, only) },
    });
  };

  // An autosave keeps the panel open; a new session becomes an edit of the saved one.
  const onAutoSaved = (doc) => {
    setEditing((ed) => (ed ? { ...ed, doc, creating: false } : ed));
    setData((xs) => {
      const arr = xs || [];
      return arr.some((x) => x._id === doc._id) ? arr.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)) : [...arr, doc];
    });
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
        title="Agenda"
        description="Every session on the website's Agenda page and in the app: titles, times, formats, speakers and moderators."
        actions={(
          <div className="flex flex-wrap gap-2">
            {approvedMissing.length > 0 && (
              <Button icon={Download} loading={copying} disabled={readOnly} onClick={copyApproved}
                title="Adds the sessions written into the approved website design as saved changes for this event. Nothing goes to the website until you send it to staging and publish.">
                Copy the approved design's agenda ({approvedMissing.length})
              </Button>
            )}
            {missing > 0 && !eventId && (
              <Button icon={Download} loading={importing} disabled={readOnly} onClick={importAgenda}
                title="Adds the built-in Toronto 2026 sessions that aren't in the CMS yet. Never changes sessions you've edited.">
                Import Toronto 2026 agenda ({missing})
              </Button>
            )}
            <Button icon={ListChecks} disabled={readOnly} onClick={() => setTypesOpen(true)}
              title="The choices in the Session type dropdown: add case studies, roundtables, receptions and more">Session types</Button>
            {(allSessions.length > 0 || eventId) && <Button variant="primary" icon={Plus} disabled={readOnly} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add session</Button>}
          </div>
        )}
      />
      <CmsBanners configured={configured} />
      <ReadinessStrip />

      {loading ? <SkeletonGrid count={4} className="h-20" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !allSessions.length && !eventId ? (
        <EmptyState
          icon={CalendarDays}
          title="The agenda isn't in the CMS yet"
          body={`The website is still showing the built-in agenda. Import it once (${SESSIONS.length} sessions) and you can edit everything here. Importing never overwrites sessions that already exist.`}
          action={<Button variant="primary" icon={Download} loading={importing} disabled={readOnly} onClick={importAgenda}>Import the current agenda ({SESSIONS.length} sessions)</Button>}
        />
      ) : (
        <>
          {unscheduled.length > 0 && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-3.5" title={`Needs a day & time (${unscheduled.length})`}>
              These don't appear on the website or in the app until they have a day, start and end time:{" "}
              {unscheduled.map((s, i) => (
                <span key={s._id}>{i > 0 && ", "}
                  <button type="button" className={`font-semibold underline ${focusRing}`} onClick={() => setEditing({ doc: s, creating: false, key: s._id })}>{s.title || "Untitled"}</button>
                </span>
              ))}.
            </Banner>
          )}
          <Card className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-base font-bold text-[#151035]">{eventId && eventName ? `Sessions · ${eventName}` : "Sessions · all events"}</h2>
              <span className="text-xs text-[#6B6688]">Click a row to edit it</span>
              {chosenEvent && (
                <button type="button" onClick={eventId ? showAll : followSwitcher} className={`ml-auto text-[13px] font-semibold text-[#D6308C] hover:underline ${focusRing}`}>
                  {eventId ? "Show all events" : `Only ${chosenEvent.name}`}
                </button>
              )}
            </div>
            {dayKeys.length > 1 ? (
              <Tabs value={shownDay} onChange={setDay} label="Day"
                tabs={dayKeys.map((d) => ({ key: d, label: dayLabel(d, tabEvent), count: counts[d] }))} />
            ) : tabEvent && <p className="-mt-1 text-[13px] text-[#6B6688]">{dayLabel(1, tabEvent)} · one-day event</p>}
            {dayList.length ? (
              <TableWrap>
                <thead><tr><th style={{ width: 90 }}>Time</th><th>Session</th><th>Format</th><th>Speakers</th><th>Status</th></tr></thead>
                <tbody>
                  {dayList.map((s) => (
                    <SessionRow key={s._id} s={s} speakerIndex={speakerIndex} selected={editing?.doc?._id === s._id}
                        onEdit={(doc) => setEditing({ doc, creating: false, key: doc._id })} />
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState icon={CalendarDays} title={dayKeys.length > 1 ? `Nothing on day ${shownDay} yet` : "No sessions yet"}
                action={!readOnly && <Button variant="primary" icon={Plus} onClick={() => setEditing({ doc: null, creating: true, key: Date.now() })}>Add session</Button>} />
            )}
          </Card>
          <p className="mt-3 text-xs text-[#8A86A0]">
            Pillars: {PILLARS.map((p) => p.label).join(", ")}. Session ids stay the same when you edit, so links to a session keep working.
          </p>
        </>
      )}

      {editing && (
        <SessionDrawer
          types={agendaTypes.types}
          onEditTypes={() => setTypesOpen(true)}
          key={editing.key}
          doc={editing.doc}
          creating={editing.creating}
          defaultDay={day}
          defaultEventId={eventId}
          eventList={eventList}
          all={list}
          speakerIndex={speakerIndex}
          speakerNames={speakerNames}
          readOnly={readOnly}
          globalLive={globalLive}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
          onAutoSaved={onAutoSaved}
          onDuplicate={duplicate}
          onDelete={setDeleting}
          onShift={(doc) => setShifting(doc)}
        />
      )}

      {shifting && (
        <ShiftDialog
          key={shifting._id}
          session={shifting}
          all={list}
          readOnly={readOnly}
          onClose={() => setShifting(null)}
          onShifted={onShifted}
          onStale={reload}
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
          if (editing?.doc?._id === deleting._id) setEditing(null);
        }}
      />
      <AgendaTypesDialog open={typesOpen} onClose={() => setTypesOpen(false)} types={agendaTypes.types} onSaved={agendaTypes.set} />
    </>
  );
}

