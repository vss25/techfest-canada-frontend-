import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Eye, Lock, Plus, Trash2, Upload, X } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdmin } from "../adminContext";
import {
  Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader,
  Select, Switch, Textarea,
} from "../ui";
import { ImagePicker } from "./CmsParts";
import useCmsStatus from "./useCmsStatus";
import { eventPath, formatDateRange } from "../../lib/events";
import { previewUrl } from "../../lib/preview";

/* =========================================================
   Admin › Website content › Event pages (redesign step 1).
   Create an event, edit its public page as a draft, preview
   it on the real website, then publish (management).
   Backend: /api/cms/event (?drafts=1 list, PATCH ?draft=1,
   POST /:id/publish, DELETE /:id/draft). Visitors only ever
   see published content; drafts show in preview for staff.
========================================================= */

const TEXT_FIELDS = [
  "name", "city", "type", "year", "startDate", "endDate", "statusNote", "venueName", "venueAddress",
  "description", "photoCredit", "theme", "tagline", "formatLine", "audience", "pageMode", "notifyHeading",
];
const PAGE_MODES = [
  { value: "auto", label: "Automatic: coming-soon page until the event has its own sessions" },
  { value: "coming-soon", label: "Always the coming-soon page" },
  { value: "full", label: "Always the full page" },
];

function stateOf(ev) {
  if (ev.unpublished) return { tone: "warn", label: "Draft, not on the website yet" };
  if (ev.hasDraft) return { tone: "purple", label: "Live, with unpublished changes" };
  return { tone: "good", label: "Live" };
}

function toForm(ev) {
  const f = {};
  for (const k of TEXT_FIELDS) f[k] = ev?.[k] ?? "";
  f.year = ev?.year ? String(ev.year) : "";
  f.pageMode = ev?.pageMode || "auto";
  f.showReport = ev?.showReport !== false;
  f.knownSoFar = (ev?.knownSoFar || []).map(({ label, value }) => ({ label, value }));
  f.comingNext = (ev?.comingNext || []).map(({ label, when, done }) => ({ label, when: when || "", done: !!done }));
  // "City photo" on the approved design: its own field, so the previous design's photo stays as it was.
  f.citySkyline = ev?.citySkyline?.asset?._ref || "";
  f.citySkylineUrl = ev?.citySkylineUrl || "";
  return f;
}

/** Only what changed, in the shape the backend takes ("" clears a field). */
function diff(form, base) {
  const out = {};
  for (const k of TEXT_FIELDS) if (String(form[k] ?? "") !== String(base[k] ?? "")) out[k] = k === "year" ? Number(form[k]) || "" : form[k];
  if (form.showReport !== base.showReport) out.showReport = form.showReport;
  if (JSON.stringify(form.knownSoFar) !== JSON.stringify(base.knownSoFar)) out.knownSoFar = form.knownSoFar;
  if (JSON.stringify(form.comingNext) !== JSON.stringify(base.comingNext)) out.comingNext = form.comingNext;
  if (form.citySkyline !== base.citySkyline) out.citySkyline = form.citySkyline || "";
  return out;
}

function NewEvent({ onCreated, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", city: "", type: "briefing", year: String(new Date().getFullYear() + 1) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const autoName = `${f.city.trim() || "City"} ${f.type === "main-event" ? "Main Event" : "Briefing"} ${f.year}`;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api.post("/cms/event", { ...f, name: f.name.trim() || autoName, year: Number(f.year), pageMode: "auto" });
      toast.success("Event created as a draft. It isn't on the website until it's published.");
      onCreated(created);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <Card className="mb-6 max-w-3xl">
      <form onSubmit={submit} className="grid gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">New event</h2>
          <button type="button" onClick={onCancel} className="ml-auto text-ttfc-muted hover:text-ttfc-text" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" required><Input value={f.city} onChange={set("city")} placeholder="Halifax" required /></Field>
          <Field label="Type">
            <Select value={f.type} onChange={set("type")}>
              <option value="briefing">Briefing (one day)</option>
              <option value="main-event">Main Event</option>
            </Select>
          </Field>
          <Field label="Year" required><Input type="number" min="2026" max="2100" value={f.year} onChange={set("year")} required /></Field>
        </div>
        <Field label="Event name" hint={`Leave blank for “${autoName}”.`}><Input value={f.name} onChange={set("name")} placeholder={autoName} /></Field>
        <p className="text-sm text-ttfc-muted">Its address will be {`/${f.city.trim().toLowerCase().replace(/\s+/g, "-") || "city"}/${f.year}/${f.type}`}. You can fill in everything else next.</p>
        <div className="flex gap-2"><Button type="submit" variant="primary" disabled={busy || !f.city.trim()} icon={CalendarPlus}>{busy ? "Creating…" : "Create draft event"}</Button></div>
      </form>
    </Card>
  );
}

function Rows({ label, hint, rows, onChange, kind }) {
  const blank = kind === "facts" ? { label: "", value: "" } : { label: "", when: "", done: false };
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-semibold">{label}</legend>
      {hint && <p className="text-xs text-ttfc-muted">{hint}</p>}
      {rows.map((r, i) => (
        <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <Input aria-label={kind === "facts" ? "Label" : "Step"} value={r.label} onChange={(e) => set(i, "label", e.target.value)} placeholder={kind === "facts" ? "Date" : "Speakers announced"} />
          {kind === "facts"
            ? <Input aria-label="Value" value={r.value} onChange={(e) => set(i, "value", e.target.value)} placeholder="June 2027" />
            : (
              <div className="flex items-center gap-3">
                <Input aria-label="When" value={r.when} onChange={(e) => set(i, "when", e.target.value)} placeholder="March 2027" />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm"><input type="checkbox" checked={r.done} onChange={(e) => set(i, "done", e.target.checked)} /> Done</label>
              </div>
            )}
          <button type="button" className="justify-self-end p-2 text-ttfc-muted hover:text-ttfc-pink" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
        </div>
      ))}
      {rows.length < 8 && <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...rows, blank])}>Add a row</Button>}
    </fieldset>
  );
}

function Editor({ ev, readOnly, onSaved, onGone }) {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const base = useMemo(() => toForm(ev), [ev]);
  const [form, setForm] = useState(base);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  useEffect(() => { setForm(base); setConfirmDelete(""); }, [base]);
  const changes = diff(form, base);
  const dirty = Object.keys(changes).length > 0;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const path = eventPath({ city: form.city || ev.city, year: form.year || ev.year, type: form.type || ev.type });

  const saveDraft = async () => {
    if (!dirty) return ev;
    const saved = await api.patch(`/cms/event/${ev._id}?draft=1`, changes);
    onSaved({ ...ev, ...saved, citySkylineUrl: form.citySkylineUrl, _id: ev._id, hasDraft: true });
    return saved;
  };
  const run = (name, fn) => async () => {
    setBusy(name);
    try { await fn(); } catch (err) { toast.error(err); } finally { setBusy(""); }
  };
  const onSave = run("save", async () => { await saveDraft(); toast.success("Draft saved. Preview it, then publish when it's ready."); });
  const onPreview = run("preview", async () => {
    // Open the tab first (pop-up blockers allow it only straight from the click), then save.
    const tab = window.open("about:blank", "_blank");
    await saveDraft();
    if (tab) tab.location.href = previewUrl(path); else window.location.href = previewUrl(path);
  });
  const onPublish = run("publish", async () => {
    await saveDraft();
    const out = await api.post(`/cms/event/${ev._id}/publish`);
    onSaved({ ...ev, ...out, citySkylineUrl: form.citySkylineUrl, _id: ev._id, hasDraft: false, unpublished: false });
    toast.success("Published. The page is live on the website within about a minute.");
  });
  const onDiscard = run("discard", async () => {
    const out = await api.del(`/cms/event/${ev._id}/draft`);
    if (out.deleted) { toast.success("Draft event deleted."); onGone(ev._id); return; }
    toast.success("Unpublished changes thrown away.");
    onSaved(null);
  });
  const onDelete = run("delete", async () => {
    await api.del(`/cms/event/${ev._id}`);
    toast.success("Event deleted from the website.");
    onGone(ev._id);
  });

  const st = stateOf(ev);
  const disabled = readOnly || !!busy;
  return (
    <div className="grid gap-6">
      <Card className="sticky top-2 z-10 flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <div className="truncate font-semibold">{form.name || ev.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ttfc-muted">
            <Badge tone={st.tone}>{st.label}</Badge>
            {dirty && <Badge tone="warn">Not saved</Badge>}
            <span>{path}</span>
          </div>
        </div>
        <Button variant="secondary" onClick={onSave} disabled={disabled || !dirty}>{busy === "save" ? "Saving…" : "Save draft"}</Button>
        <Button variant="secondary" icon={Eye} onClick={onPreview} disabled={disabled}>{busy === "preview" ? "Opening…" : "Preview"}</Button>
        {isManagement
          ? <Button variant="primary" icon={Upload} onClick={onPublish} disabled={disabled || (!dirty && !ev.hasDraft)}>{busy === "publish" ? "Publishing…" : "Publish"}</Button>
          : <span className="text-xs text-ttfc-muted">A manager publishes</span>}
      </Card>

      <Card className="grid gap-4">
        <h3 className="font-semibold">Basics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name" required><Input value={form.name} onChange={set("name")} disabled={readOnly} /></Field>
          <Field label="City" required hint="Changing it changes the page's address."><Input value={form.city} onChange={set("city")} disabled={readOnly} /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={set("type")} disabled={readOnly}>
              <option value="briefing">Briefing</option><option value="main-event">Main Event</option>
            </Select>
          </Field>
          <Field label="Year" required><Input type="number" value={form.year} onChange={set("year")} disabled={readOnly} /></Field>
          <Field label="First day" hint="Leave empty until the date is fixed."><Input type="date" value={form.startDate} onChange={set("startDate")} disabled={readOnly} /></Field>
          <Field label="Last day" hint="Same as the first day for a one-day event, or empty."><Input type="date" value={form.endDate} onChange={set("endDate")} disabled={readOnly} /></Field>
          <Field label="Date line while the day isn't fixed" hint="e.g. “February 2027 · One day”. Also orders the events."><Input value={form.statusNote} onChange={set("statusNote")} disabled={readOnly} /></Field>
          <Field label="Venue"><Input value={form.venueName} onChange={set("venueName")} placeholder="Leave empty: “venue to be announced”" disabled={readOnly} /></Field>
          <Field label="Venue address" className="sm:col-span-2"><Input value={form.venueAddress} onChange={set("venueAddress")} disabled={readOnly} /></Field>
        </div>
      </Card>

      <Card className="grid gap-4">
        <h3 className="font-semibold">Top of the page</h3>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ImagePicker
            label="City photo"
            aspect="aspect-[16/9]"
            url={form.citySkylineUrl}
            disabled={readOnly}
            onUploaded={({ assetId, url, preview }) => setForm((f) => ({ ...f, citySkyline: assetId, citySkylineUrl: url || preview }))}
          />
          <div className="grid content-start gap-4">
            <Field label="Photo credit" hint="Shown on the photo. Required for Creative Commons photos."><Input value={form.photoCredit} onChange={set("photoCredit")} placeholder="Photo: Kyle Pearce, CC BY-SA 2.0" disabled={readOnly} /></Field>
            <Field label="Theme"><Input value={form.theme} onChange={set("theme")} placeholder="Energy & Critical Infrastructure" disabled={readOnly} /></Field>
            <Field label="One line under the name"><Input value={form.tagline} onChange={set("tagline")} disabled={readOnly} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Format"><Input value={form.formatLine} onChange={set("formatLine")} placeholder="One day · 8 sessions" disabled={readOnly} /></Field>
              <Field label="Who's in the room"><Input value={form.audience} onChange={set("audience")} placeholder="150 senior delegates" disabled={readOnly} /></Field>
            </div>
          </div>
        </div>
        <Field label="About this event" hint="Paragraphs separated by a blank line. The first one is also the coming-soon page's introduction.">
          <Textarea rows={7} value={form.description} onChange={set("description")} disabled={readOnly} />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <h3 className="font-semibold">Which page shows</h3>
        <Field label="Page version">
          <Select value={form.pageMode} onChange={set("pageMode")} disabled={readOnly}>
            {PAGE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <Rows kind="facts" label="Coming-soon page: What we know so far" hint="Leave empty to show date, venue, format and theme from above." rows={form.knownSoFar} onChange={(v) => setForm((f) => ({ ...f, knownSoFar: v }))} />
        <Rows kind="steps" label="Coming-soon page: Coming next" hint="Tick Done as each step happens. Leave empty for the standard three steps." rows={form.comingNext} onChange={(v) => setForm((f) => ({ ...f, comingNext: v }))} />
        <Field label="Heading on the notify-me form"><Input value={form.notifyHeading} onChange={set("notifyHeading")} placeholder={`Hear first about ${form.name || "this event"}`} disabled={readOnly} /></Field>
        <Switch label="Show the Toronto 2026 post-show report card" checked={form.showReport} onChange={(v) => setForm((f) => ({ ...f, showReport: v }))} disabled={readOnly} />
        <p className="text-sm text-ttfc-muted">Sessions and speakers appear on the full page when they're tied to this event in Agenda and Speakers. Tickets come from Prices &amp; stock.</p>
      </Card>

      <Card className="flex flex-wrap items-center gap-3">
        {(ev.hasDraft || ev.unpublished) && (
          <Button variant="secondary" onClick={onDiscard} disabled={disabled}>
            {ev.unpublished ? "Delete this draft event" : "Throw away unpublished changes"}
          </Button>
        )}
        {isManagement && !ev.unpublished && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input aria-label="Type the event name to delete it" className="w-64" placeholder="Type the event name to delete" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} disabled={readOnly} />
            <Button variant="danger" icon={Trash2} onClick={onDelete} disabled={disabled || confirmDelete.trim() !== String(ev.name || "").trim()}>Delete event</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function EventPages() {
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/event?drafts=1");
  // From the global search or a link: ?edit=<event id> opens that event.
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get("edit") || "");
  const [creating, setCreating] = useState(false);
  const events = useMemo(() => (data || []).filter((e) => e && e.name), [data]);
  const current = events.find((e) => e._id === selected) || null;

  return (
    <>
      <PageHeader
        eyebrow="Website content"
        title="Event pages"
        description="Each event's page on the website. Changes save as a draft that only staff can see in preview. A manager publishes them."
        actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)} disabled={readOnly}>New event</Button>}
      />
      {readOnly && <Banner tone="warn" icon={Lock} className="mb-4 max-w-2xl" title="Read-only for now">Editing needs SANITY_WRITE_TOKEN on the server.</Banner>}
      {creating && (
        <NewEvent
          onCancel={() => setCreating(false)}
          onCreated={(ev) => { setCreating(false); setData((d) => [...(d || []), ev]); setSelected(ev._id); }}
        />
      )}
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !events.length ? (
        <EmptyState title="No events yet" body="Create the first event with New event." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav aria-label="Events" className="grid content-start gap-2">
            {events.map((ev) => {
              const st = stateOf(ev);
              return (
                <button
                  key={ev._id}
                  type="button"
                  onClick={() => setSelected(ev._id)}
                  aria-current={selected === ev._id ? "true" : undefined}
                  className={`rounded-xl border px-4 py-3 text-left transition ${selected === ev._id ? "border-ttfc-pink bg-ttfc-pink/5" : "border-ttfc-line hover:border-ttfc-muted"}`}
                >
                  <div className="font-semibold">{ev.name}</div>
                  <div className="mt-0.5 text-xs text-ttfc-muted">{ev.startDate ? formatDateRange(ev) : ev.statusNote || ev.year}</div>
                  <div className="mt-2"><Badge tone={st.tone}>{st.label}</Badge></div>
                </button>
              );
            })}
          </nav>
          <div>
            {current ? (
              <Editor
                key={current._id}
                ev={current}
                readOnly={readOnly}
                onSaved={(next) => (next ? setData((d) => d.map((e) => (e._id === next._id ? { ...e, ...next } : e))) : reload())}
                onGone={(id) => { setData((d) => d.filter((e) => e._id !== id)); setSelected(""); }}
              />
            ) : (
              <EmptyState title="Pick an event" body="Choose an event on the left to edit its page, or create a new one." />
            )}
          </div>
        </div>
      )}
    </>
  );
}
