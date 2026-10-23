import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, ErrorState, Field, IconButton, Input, LoadingState, Select, Textarea } from "../ui";
import { when } from "../format";
import ContentSettings from "../content/ContentSettings";
import JourneyView from "../../components/StayJourney";
import { STAY_DEFAULTS } from "../../lib/stayUpdated";
import {
  CITIES, DEFAULT_JOURNEY, JOURNEY_KEY, KIND_LABEL, MAX_LEN, MAX_STOPS, PILLARS, SECTORS, blankStop, checkJourney, journeyFrom,
} from "../../lib/stayJourney";

/* =========================================================
   Admin › Sales & emails › 2027 waitlist › 2027 journey
   (Oct 23 2026). The organiser: "Put canada's map and show
   cities to show the journey … Briefings would pick a sector and
   tech pillar and would be very focused. The briefing will be
   updated later. Put this in the admin panel."
   The stops of thetechfestival.com/stay-updated's map (and the
   web app's): month, city (the known cities), one-day briefing or
   the festival, focus pillar × sector ("To be announced" until
   picked), date, venue, note; add, remove, move up / down; Save
   writes the stay.journey app content key (PUT /console/app-
   content/stay.journey, any staff, like the Wording tab; the
   server checks it with the same rules as checkJourney). A live
   preview of the map and the list shows unsaved changes. The
   heading and introduction above the map are the two text
   settings at the top (ContentSettings scope "journey").
========================================================= */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isDefault = (stops) => same(stops, DEFAULT_JOURNEY);

function StopCard({ stop, i, count, error, onChange, onMove, onRemove }) {
  const id = (k) => `journey-${i}-${k}`;
  const bad = (k) => (error?.index === i && error?.field === k ? true : undefined);
  const set = (k) => (e) => onChange({ ...stop, [k]: e.target.value });
  return (
    <Card className="p-4 sm:p-5" aria-labelledby={id("h")} as="section">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${stop.kind === "festival" ? "bg-gradient-to-br from-amber-400 to-ttfc-pink text-[#2b1600]" : "bg-ttfc-purple text-white"}`} aria-hidden="true">{i + 1}</span>
        <h3 id={id("h")} className="min-w-0 flex-1 truncate text-sm font-semibold text-ttfc-text">
          Stop {i + 1}: {stop.city || "No city"} · {stop.month || "Month to be announced"}
          <span className="ml-2 font-normal text-ttfc-muted">{KIND_LABEL[stop.kind] || KIND_LABEL.briefing}</span>
        </h3>
        <IconButton icon={ArrowUp} label={`Move stop ${i + 1} up`} disabled={i === 0} onClick={() => onMove(i, -1)} />
        <IconButton icon={ArrowDown} label={`Move stop ${i + 1} down`} disabled={i === count - 1} onClick={() => onMove(i, 1)} />
        <IconButton icon={Trash2} label={`Remove stop ${i + 1}`} disabled={count <= 1} onClick={() => onRemove(i)} className="hover:text-red-300" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Month" id={id("month")} hint="e.g. February 2027. Empty = to be announced.">
          <Input id={id("month")} value={stop.month} onChange={set("month")} maxLength={MAX_LEN.month} placeholder="To be announced" aria-invalid={bad("month")} />
        </Field>
        <Field label="City" id={id("city")}>
          <Select id={id("city")} value={stop.city} onChange={set("city")} aria-invalid={bad("city")}>
            {!CITIES.some((c) => c.name === stop.city) && <option value={stop.city}>Pick a city</option>}
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.province}</option>)}
          </Select>
        </Field>
        <Field label="Type" id={id("kind")}>
          <Select id={id("kind")} value={stop.kind} onChange={set("kind")} aria-invalid={bad("kind")}>
            <option value="briefing">One-day briefing</option>
            <option value="festival">The Tech Festival Canada (two days)</option>
          </Select>
        </Field>
        <Field label="Date" id={id("date")} hint="Empty = to be announced.">
          <Input id={id("date")} value={stop.date} onChange={set("date")} maxLength={MAX_LEN.date} placeholder="To be announced" aria-invalid={bad("date")} />
        </Field>
        <Field label="Focus: technology pillar" id={id("pillar")} className="xl:col-span-2">
          <Select id={id("pillar")} value={stop.pillar} onChange={set("pillar")} aria-invalid={bad("pillar")}>
            <option value="">To be announced</option>
            {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Focus: sector" id={id("sector")} className="xl:col-span-2">
          <Select id={id("sector")} value={stop.sector} onChange={set("sector")} aria-invalid={bad("sector")}>
            <option value="">To be announced</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Venue" id={id("venue")} hint="Empty = to be announced." className="sm:col-span-2">
          <Input id={id("venue")} value={stop.venue} onChange={set("venue")} maxLength={MAX_LEN.venue} placeholder="To be announced" aria-invalid={bad("venue")} />
        </Field>
        <Field label="Note (optional)" id={id("note")} hint="A short line under the stop." className="sm:col-span-2">
          <Textarea id={id("note")} rows={1} value={stop.note} onChange={set("note")} maxLength={MAX_LEN.note} aria-invalid={bad("note")} />
        </Field>
      </div>
      {error?.index === i && <p role="alert" className="mt-3 text-sm font-semibold text-red-300">{error.error}</p>}
    </Card>
  );
}

function Editor({ row, title, intro, onSaved }) {
  const toast = useToast();
  const initial = useMemo(() => journeyFrom(row.value || row.default), [row.value, row.default]);
  const [stops, setStops] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [confirmDefault, setConfirmDefault] = useState(false);
  const dirty = !same(stops, initial);
  const check = checkJourney(stops);
  const shownError = check.ok ? null : check;
  const usingDefault = !String(row.value || "").trim() || row.value === row.default;

  // Unsaved changes: the browser asks before leaving the page.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (i, s) => { setServerError(""); setStops((xs) => xs.map((x, k) => (k === i ? s : x))); };
  const move = (i, d) => setStops((xs) => { const ys = [...xs]; const [s] = ys.splice(i, 1); ys.splice(i + d, 0, s); return ys; });
  const remove = (i) => setStops((xs) => xs.filter((_, k) => k !== i));
  const add = () => setStops((xs) => [...xs, blankStop("Toronto", "")]);

  const save = async () => {
    if (!check.ok) return;
    setSaving(true); setServerError("");
    // The organiser's journey exactly: saved as "" (= the default), so it follows the built-in one.
    const value = isDefault(check.stops) ? "" : check.json;
    try {
      await api.put(`/console/app-content/${encodeURIComponent(JOURNEY_KEY)}`, { value });
      toast.success("Saved — the map and the stops are live on the waitlist page and in the web app within about a minute");
      onSaved(value);
    } catch (e) {
      setServerError(e.message);
      toast.error(e);
    } finally { setSaving(false); }
  };

  const previewVars = {
    "--jv-text": "rgb(var(--ttfc-text))", "--jv-mid": "rgb(var(--ttfc-muted))", "--jv-card": "rgb(var(--ttfc-panel2))", "--jv-line": "rgb(var(--ttfc-line))",
    "--jv-accent": "rgb(var(--ttfc-purple))", "--jv-chip": "rgb(var(--ttfc-purple) / 0.14)", "--jv-land": "rgb(var(--ttfc-purple) / 0.12)",
    "--jv-land-edge": "rgb(var(--ttfc-purple) / 0.4)", "--jv-route": "rgb(var(--ttfc-purple))", "--jv-label-bg": "rgb(var(--ttfc-panel))",
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] 2xl:items-start">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ttfc-text">The stops, in order</h2>
            <p className="mt-0.5 text-xs text-ttfc-muted">
              {usingDefault ? "Using the organiser's journey (the default)." : `Changed${row.updatedBy ? ` by ${row.updatedBy}` : ""}${row.updatedAt ? `, ${when(row.updatedAt)}` : ""}.`}
              {" "}{stops.length} of {MAX_STOPS} stops. Anything left empty shows as “to be announced”.
            </p>
          </div>
          <Button icon={RotateCcw} size="sm" variant="ghost" disabled={isDefault(stops)} onClick={() => setConfirmDefault(true)}>Use the organiser's journey</Button>
        </div>

        {stops.map((s, i) => (
          <StopCard key={i} stop={s} i={i} count={stops.length} error={shownError}
            onChange={(x) => update(i, x)} onMove={move} onRemove={remove} />
        ))}

        <Button icon={Plus} onClick={add} disabled={stops.length >= MAX_STOPS} title={stops.length >= MAX_STOPS ? `${MAX_STOPS} stops at most` : undefined}>Add a stop</Button>

        {shownError && shownError.index === undefined && <Banner tone="danger" title="Can't save yet">{shownError.error}</Banner>}
        {serverError && <Banner tone="danger" title="Not saved">{serverError}</Banner>}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-ttfc-line bg-ttfc-panel/95 p-3 shadow-lg backdrop-blur">
          <Button variant="primary" icon={Save} loading={saving} disabled={!dirty || !check.ok} onClick={save}>Save the journey</Button>
          {dirty && <Button icon={Undo2} onClick={() => { setStops(initial); setServerError(""); }}>Undo changes</Button>}
          <p className="min-w-0 flex-1 text-xs text-ttfc-muted" aria-live="polite">
            {!dirty ? "No unsaved changes." : check.ok ? "Unsaved changes: the preview shows them." : shownError.error}
          </p>
        </div>
      </div>

      <section aria-labelledby="journey-preview-h" className="min-w-0 2xl:sticky 2xl:top-4">
        <h2 id="journey-preview-h" className="mb-2 flex items-center gap-2 text-base font-semibold text-ttfc-text"><Eye className="h-4 w-4" aria-hidden="true" />Preview</h2>
        <Card className="p-4 sm:p-5">
          <p className="text-lg font-bold text-ttfc-text">{title}</p>
          {intro && <p className="mt-1 text-sm leading-relaxed text-ttfc-muted">{intro}</p>}
          <div className="mt-4" style={previewVars}>
            <JourneyView stops={check.ok ? check.stops : stops} headingLevel={4} mapTitle={`Map of Canada: ${title}`} />
          </div>
        </Card>
      </section>

      <ConfirmDialog open={confirmDefault} onClose={() => setConfirmDefault(false)} tone="primary" confirmLabel="Use it"
        title="Go back to the organiser's journey?"
        body="Vancouver (February), Montreal (April), Calgary and Toronto (June), Ottawa (September), then the festival in Toronto (November), with focus, dates and venues to be announced. Nothing is saved until you press Save."
        onConfirm={() => { setStops(DEFAULT_JOURNEY.map((s) => ({ ...s }))); setServerError(""); }} />
    </div>
  );
}

export default function JourneyEditor() {
  const { data, error, loading, reload, setData } = useApi("/console/app-content");
  if (loading) return <LoadingState label="Loading the journey…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  const rows = data || [];
  const row = rows.find((r) => r.key === JOURNEY_KEY);
  if (!row) return <p className="text-sm text-ttfc-muted">The journey isn't available yet — the server needs the latest backend update.</p>;
  const text = (k) => String(rows.find((r) => r.key === k)?.value || "").trim() || STAY_DEFAULTS[k];
  const onSaved = (value) => setData((xs) => (xs || []).map((x) => (x.key === JOURNEY_KEY ? { ...x, value, updatedBy: "you", updatedAt: new Date().toISOString() } : x)));
  return (
    <div className="space-y-6">
      <p className="text-sm text-ttfc-muted">
        The map of Canada and the list of stops on thetechfestival.com/stay-updated and in the web app. Each briefing is one day on one technology pillar and one sector; pick them when they're decided.
      </p>
      <ContentSettings scope="journey" />
      <Editor key={`${row.value}`} row={row} title={text("stay.journey_title")} intro={text("stay.journey_intro")} onSaved={onSaved} />
    </div>
  );
}
