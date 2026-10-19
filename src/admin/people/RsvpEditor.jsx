import { useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, Lock, Pencil, Plus, UserCheck } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, Field, Input, SectionTitle, Select, Switch, Textarea } from "../ui";
import { when } from "../format";
import { RSVP_STATUS_LABELS, RSVP_STATUS_TONE } from "./peopleMeta";

/* =========================================================
   A person's RSVP, entered or changed by staff
   (PUT /console/people/:id/rsvp, backend services/rsvpStaff.js).
     - An RSVP the attendee sent is never changed (Oct 19 2026).
       Staff can only add special events to it (a luncheon, the
       Gala Dinner, a CxO Breakfast…): the attendee's own choices
       stay ticked and locked, and staff can take off only what
       staff added. It stays "Confirmed by Individual".
     - Without one, staff enter it ("Confirmed by Staff"). The
       attendee's own RSVP from /rsvp later replaces staff's
       answers, but seats staff gave outside their pass stay.
     - Only what their pass includes on the chosen days (with the
       meals and events switched on or off for that pass: CxO
       Breakfasts, luncheons, the Gala Dinner, the Awards Night),
       unless staff switch on "Include options outside their pass":
       the staff override.
     - Nothing here emails the attendee.
========================================================= */

const GENERIC = /^(sessions|expo|breaks)_d\d$/;
// The RSVP options each pass extra decides (backend services/rsvp.js EXTRA_OPTIONS).
const EXTRA_OF = { cxo_d1: "cxo", cxo_d2: "cxo", lunch_d1: "lunch", lunch_d2: "lunch", gala: "gala", awards: "awards" };

/** Options someone on `tier` coming on `days` can choose: the server's allowedExperiences, with the pass's
    extras switched on or off (`rules.extras`: { cxo, lunch, gala, awards } true / false; `rules.cxo` from an
    older server) and the extras they keep from their RSVP (`rules.keep`). */
const allowedFor = (catalog, tier, days, rules = {}) => new Set((catalog?.options || [])
  .filter((o) => o.kind === "experience" && (!o.day || days.includes(o.day)))
  .filter((o) => {
    const x = EXTRA_OF[o.key];
    const v = !x ? undefined : typeof rules?.extras?.[x] === "boolean" ? rules.extras[x] : x === "cxo" && typeof rules?.cxo === "boolean" ? rules.cxo : undefined;
    return (typeof v === "boolean" ? v : (o.tiers || []).includes(tier)) || (rules?.keep || []).includes(o.key);
  })
  .map((o) => o.key));
/** Only the extras switched on (a pass staff pick here goes by its tier, but what this pass was given stays). */
const onlyYes = (extras) => (extras ? Object.fromEntries(Object.entries(extras).filter(([, v]) => v === true)) : undefined);

function Summary({ r, catalog }) {
  const days = catalog?.days || [];
  const opt = Object.fromEntries((catalog?.options || []).map((o) => [o.key, o]));
  const diet = Object.fromEntries((catalog?.dietary || []).map((d) => [d.key, d.label]));
  const events = (r.options || []).filter((k) => !GENERIC.test(k));
  const added = new Set(r.staffAdded || []);
  const dayName = (k) => days.find((d) => d.key === k)?.label || k;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[150px_1fr]">
      <dt className="text-ttfc-muted">Days</dt>
      <dd>{r.days?.length ? r.days.map(dayName).join(" & ") : <span className="text-ttfc-dim">None</span>}</dd>
      <dt className="text-ttfc-muted">Special events</dt>
      <dd>{events.length ? (
        <ul className="space-y-1">
          {events.map((k) => (
            <li key={k}>
              {opt[k]?.label || k}{opt[k]?.day ? <span className="text-ttfc-dim"> · {dayName(opt[k].day)}{opt[k].time ? `, ${opt[k].time}` : ""}</span> : null}
              {added.has(k) && r.source !== "staff" && <Badge tone="purple" className="ml-2">Added by staff</Badge>}
            </li>
          ))}
        </ul>
      ) : <span className="text-ttfc-dim">None</span>}</dd>
      <dt className="text-ttfc-muted">Dietary</dt>
      <dd>{r.dietary?.length ? r.dietary.map((k) => (k === "other" && r.dietaryOther ? `Other: ${r.dietaryOther}` : diet[k] || k)).join(", ") : <span className="text-ttfc-dim">None</span>}</dd>
      <dt className="text-ttfc-muted">Accessibility</dt>
      <dd className="whitespace-pre-wrap">{r.accessibility || <span className="text-ttfc-dim">None</span>}</dd>
      <dt className="text-ttfc-muted">Pass</dt>
      <dd>{r.tierLabel || "No pass"}{r.tierVerified ? <span className="text-ttfc-dim"> · from their ticket</span> : <span className="text-amber-200/80"> · not verified</span>}</dd>
    </dl>
  );
}

/** The special events, by day, as checkboxes. `locked`: the attendee's own choices (ticked, can't be changed). */
function EventPicker({ catalog, allowed, days, options, setOptions, outside, locked = [] }) {
  const catDays = catalog?.days || [];
  const groups = [
    ...catDays.map((d) => ({ key: d.key, title: d.label, options: (catalog?.options || []).filter((o) => o.kind === "experience" && o.day === d.key) })),
    { key: "any", title: "Either day", options: (catalog?.options || []).filter((o) => o.kind === "experience" && !o.day) },
  ].filter((g) => g.options.length);
  const toggle = (k, on) => setOptions(on ? [...new Set([...options, k])] : options.filter((x) => x !== k));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">{g.title}</p>
          <ul className="space-y-1.5">
            {g.options.map((o) => {
              const theirs = locked.includes(o.key);
              const inPass = allowed.has(o.key);
              const off = theirs || (!inPass && !outside && !options.includes(o.key));
              return (
                <li key={o.key}>
                  <label className={`flex items-start gap-2 text-sm ${off && !theirs ? "cursor-not-allowed text-ttfc-dim" : ""}`}>
                    <input type="checkbox" className="mt-0.5 accent-ttfc-pink" disabled={off} checked={theirs || options.includes(o.key)}
                      onChange={(e) => toggle(o.key, e.target.checked)} />
                    <span>
                      {o.label}{o.time ? <span className="text-ttfc-dim"> · {o.time}</span> : null}
                      {theirs ? <span className="ml-1 text-[11px] text-emerald-200/80">their choice</span>
                        : !inPass && <span className="ml-1 text-[11px] text-amber-200/80">{o.day && !days.includes(o.day) ? "not coming that day" : "not in their pass"}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OutsideSwitch({ outside, setOutside, picked, catalog }) {
  return (
    <>
      <div className="mt-4 rounded-2xl border border-ttfc-line p-3">
        <Switch checked={outside} onChange={setOutside} label="Include options outside their pass"
          description="Staff override: give someone a luncheon, the Gala Dinner or a CxO Breakfast their pass doesn't include. It's saved with a warning." />
      </div>
      {outside && picked.length > 0 && (
        <Banner tone="warn" icon={AlertTriangle} className="mt-3" title="Outside their pass">
          {picked.map((k) => (catalog?.options || []).find((o) => o.key === k)?.label || k).join(", ")}
        </Banner>
      )}
    </>
  );
}

async function saveRsvp({ personId, body, toast, onSaved, setError, setSaving }) {
  setSaving(true); setError("");
  try {
    const r = await api.put(`/console/people/${encodeURIComponent(personId)}/rsvp`, body);
    toast.success(r.created ? "RSVP added. The attendee isn't emailed." : "RSVP saved. The attendee isn't emailed.");
    if (r.warning) toast.info(r.warning);
    onSaved();
  } catch (err) {
    setError(err?.message || "Couldn't save the RSVP");
  } finally { setSaving(false); }
}

/* Staff add special events to an RSVP the attendee sent. Their days, dietary needs and choices stay theirs. */
function AddToTheirs({ personId, rsvp, catalog, rules, onCancel, onSaved }) {
  const toast = useToast();
  const added = rsvp.staffAdded || [];
  const own = (rsvp.options || []).filter((k) => !added.includes(k));
  const [extra, setExtra] = useState(added);
  const [outside, setOutside] = useState(!!rsvp.passLimitOverride);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const days = rsvp.days || [];
  const allowed = useMemo(() => allowedFor(catalog, rsvp.tier, rsvp.days || [], rules), [catalog, rsvp.tier, rsvp.days, rules]);
  const pickedOutside = extra.filter((k) => !allowed.has(k));
  const save = () => saveRsvp({
    personId, toast, onSaved, setError, setSaving,
    body: { options: [...own, ...extra], allowOutsidePass: outside, basedOn: rsvp.updatedAt, rsvpId: rsvp.id },
  });
  return (
    <div className="space-y-5">
      <Banner tone="info" icon={Lock} title="Their RSVP stays as they sent it">
        You can add special events to it. What they chose themselves can't be changed or taken off, and their days and dietary needs stay theirs.
      </Banner>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Special events</legend>
        <EventPicker catalog={catalog} allowed={allowed} days={days} options={extra} setOptions={setExtra} outside={outside} locked={own} />
        <OutsideSwitch outside={outside} setOutside={setOutside} picked={pickedOutside} catalog={catalog} />
      </fieldset>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={saving} onClick={save}>Save</Button>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

function Editor({ personId, rsvp, catalog, defaultTier, tierLocked, rules, onCancel, onSaved }) {
  const toast = useToast();
  const [days, setDays] = useState(rsvp?.days?.length ? rsvp.days : ["day1", "day2"]);
  const [options, setOptions] = useState(rsvp?.options || []);
  const [dietary, setDietary] = useState(rsvp?.dietary || []);
  const [dietaryOther, setDietaryOther] = useState(rsvp?.dietaryOther || "");
  const [accessibility, setAccessibility] = useState(rsvp?.accessibility || "");
  const [tier, setTier] = useState(rsvp?.tier || defaultTier || "");
  const [outside, setOutside] = useState(!!rsvp?.passLimitOverride);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // The pass's switches apply to the pass on file; a pass staff pick here goes by its tier (what was switched on stays).
  const allowed = useMemo(() => allowedFor(catalog, tier, days, tierLocked ? rules : { keep: rules?.keep, cxo: rules?.cxo === true ? true : undefined, extras: onlyYes(rules?.extras) }),
    [catalog, tier, days, tierLocked, rules]);
  const tiers = (catalog?.tiers || []);
  const catDays = catalog?.days || [];

  const toggle = (list, setList, k, on) => setList(on ? [...new Set([...list, k])] : list.filter((x) => x !== k));
  const pickedOutside = options.filter((k) => !allowed.has(k));

  const save = () => {
    // Options on a day they no longer come to go with that day.
    const dayOk = (k) => { const o = (catalog?.options || []).find((x) => x.key === k); return !o?.day || days.includes(o.day); };
    return saveRsvp({
      personId, toast, onSaved, setError, setSaving,
      body: {
        days, options: options.filter(dayOk), dietary, dietaryOther: dietary.includes("other") ? dietaryOther : "", accessibility,
        ...(tierLocked ? {} : { tier }),
        allowOutsidePass: outside, ...(rsvp?.updatedAt ? { basedOn: rsvp.updatedAt, rsvpId: rsvp.id } : {}),
      },
    });
  };

  return (
    <div className="space-y-5">
      {!tierLocked && (
        <Field label="Pass" hint="They have no ticket on file, so choose the pass these answers are checked against." className="sm:max-w-xs">
          {(id) => (
            <Select id={id} value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="">Choose a pass</option>
              {tiers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
          )}
        </Field>
      )}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Days</legend>
        <div className="flex flex-wrap gap-3">
          {catDays.map((d) => (
            <label key={d.key} className="inline-flex items-center gap-2 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-sm">
              <input type="checkbox" className="accent-ttfc-pink" checked={days.includes(d.key)} onChange={(e) => toggle(days, setDays, d.key, e.target.checked)} />
              {d.label} <span className="text-ttfc-dim">{d.long}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">What they're coming to</legend>
        <EventPicker catalog={catalog} allowed={allowed} days={days} options={options} setOptions={setOptions} outside={outside} />
        <OutsideSwitch outside={outside} setOutside={setOutside} picked={pickedOutside} catalog={catalog} />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Dietary needs</legend>
        <div className="flex flex-wrap gap-2">
          {(catalog?.dietary || []).map((d) => (
            <label key={d.key} className="inline-flex items-center gap-2 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-1.5 text-sm">
              <input type="checkbox" className="accent-ttfc-pink" checked={dietary.includes(d.key)} onChange={(e) => toggle(dietary, setDietary, d.key, e.target.checked)} />
              {d.label}
            </label>
          ))}
        </div>
        {dietary.includes("other") && (
          <Field label="Dietary need" className="mt-3 sm:max-w-md">{(id) => <Input id={id} value={dietaryOther} maxLength={200} onChange={(e) => setDietaryOther(e.target.value)} />}</Field>
        )}
      </fieldset>
      <Field label="Accessibility">{(id) => <Textarea id={id} rows={2} maxLength={600} value={accessibility} onChange={(e) => setAccessibility(e.target.value)} />}</Field>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={saving} disabled={!days.length || (!tierLocked && !tier)} onClick={save}>Save RSVP</Button>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

/**
 * @param {object} p
 * @param {string} p.personId
 * @param {object|null} p.rsvp      rsvpDetail from GET /console/people/:id
 * @param {object} p.catalog        GET /api/rsvp/options shape
 * @param {object|null} p.pass      the person's main pass (its tier is what the RSVP is checked against)
 * @param {object} [p.rules]        { extras: { cxo, lunch, gala, awards } (true | false | null), cxo, keep: [keys] }:
 *                                   their pass's meals and events, and the ones they keep from their RSVP
 * @param {Array} [p.duplicates]    possible duplicates waiting in Leads › RSVPs
 */
export default function RsvpEditor({ personId, rsvp, catalog, pass, rules = null, duplicates = [], canEdit = true, onSaved }) {
  const [mode, setMode] = useState("view"); // view | edit | add
  const fromAttendee = rsvp && rsvp.source !== "staff";
  const tierLocked = !!(rsvp ? rsvp.tierVerified : pass?.ticketId);
  const defaultTier = rsvp?.tier || pass?.tier || "";
  const cxoRules = useMemo(() => ({
    cxo: typeof rules?.cxo === "boolean" ? rules.cxo : undefined,
    extras: rules?.extras ? Object.fromEntries(Object.entries(rules.extras).filter(([, v]) => typeof v === "boolean")) : undefined,
    keep: rules?.keep || [],
  }), [rules]);

  const done = () => { setMode("view"); onSaved(); };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle className="mb-0" hint="Staff changes never email the attendee. An RSVP they sent themselves is never changed: staff can only add to it.">RSVP</SectionTitle>
        {mode === "view" && canEdit && (
          !rsvp ? <Button size="sm" icon={Plus} onClick={() => setMode("edit")}>Add an RSVP</Button>
            : fromAttendee ? <Button size="sm" icon={Plus} onClick={() => setMode("add")}>Add to their RSVP</Button>
              : <Button size="sm" icon={Pencil} onClick={() => setMode("edit")}>Change</Button>
        )}
      </div>

      {rsvp && mode === "view" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          {fromAttendee ? (
            <>
              <Badge tone={RSVP_STATUS_TONE.attendee} icon={UserCheck}>{RSVP_STATUS_LABELS.attendee}</Badge>
              <span className="text-ttfc-muted">{when(rsvp.attendeeSubmittedAt || rsvp.updatedAt)}</span>
              <Lock className="h-3.5 w-3.5 text-ttfc-dim" aria-label="Their answers can't be changed" />
              {rsvp.staffAdded?.length > 0 && <span className="text-ttfc-muted">· {rsvp.staffUpdatedBy || "Staff"} added {rsvp.staffAdded.length}</span>}
            </>
          ) : (
            <>
              <Badge tone={RSVP_STATUS_TONE.staff}>{RSVP_STATUS_LABELS.staff}</Badge>
              <span className="text-ttfc-muted">{rsvp.staffUpdatedBy || "Staff"} · {when(rsvp.staffUpdatedAt || rsvp.updatedAt)}</span>
              {rsvp.staffOverride && <Badge tone="warn">Overrode the attendee's RSVP (before Oct 19)</Badge>}
            </>
          )}
          {rsvp.passLimitOverride && <Badge tone="warn" icon={AlertTriangle}>Includes options outside their pass</Badge>}
        </div>
      )}

      {duplicates.length > 0 && mode === "view" && (
        <Banner tone="warn" icon={AlertTriangle} className="mb-4" title={`${duplicates.length} possible duplicate${duplicates.length === 1 ? "" : "s"} waiting`}>
          Another RSVP was sent under this name without proof it's them. Merge it or keep it separate in Leads › RSVPs.
        </Banner>
      )}

      {mode === "view" ? (
        rsvp ? <Summary r={rsvp} catalog={catalog} /> : (
          <p className="flex items-center gap-2 text-sm text-ttfc-muted"><CalendarCheck className="h-4 w-4" aria-hidden="true" /> {RSVP_STATUS_LABELS.none}: no RSVP yet.</p>
        )
      ) : mode === "add" ? (
        <AddToTheirs personId={personId} rsvp={rsvp} catalog={catalog} rules={cxoRules} onCancel={() => setMode("view")} onSaved={done} />
      ) : (
        <Editor personId={personId} rsvp={rsvp} catalog={catalog} defaultTier={defaultTier} tierLocked={tierLocked} rules={cxoRules}
          onCancel={() => setMode("view")} onSaved={done} />
      )}
    </Card>
  );
}
