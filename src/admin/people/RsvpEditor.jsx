import { useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, Lock, Pencil, Plus, ShieldAlert, UserCheck } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ConfirmDialog, Field, Input, SectionTitle, Select, Switch, Textarea } from "../ui";
import { when } from "../format";
import { RSVP_STATUS_TONE } from "./peopleMeta";

/* =========================================================
   A person's RSVP, entered or changed by staff
   (PUT /console/people/:id/rsvp, backend services/rsvpStaff.js).
     - An RSVP the attendee sent is read-only ("Entered by the
       attendee") until staff choose "Override the attendee's
       RSVP" and confirm (sent as override: true).
     - Whatever staff save, the attendee's next RSVP from /rsvp
       replaces it.
     - Only what their pass includes on the chosen days, unless
       staff switch on "Include options outside their pass".
     - Nothing here emails the attendee.
========================================================= */

const GENERIC = /^(sessions|expo|breaks)_d\d$/;

/** Options someone on `tier` coming on `days` can choose (same rule as the server's checkOptions). */
const allowedFor = (catalog, tier, days) => new Set((catalog?.options || [])
  .filter((o) => o.kind === "experience" && (o.tiers || []).includes(tier) && (!o.day || days.includes(o.day)))
  .map((o) => o.key));

function Summary({ r, catalog }) {
  const days = catalog?.days || [];
  const opt = Object.fromEntries((catalog?.options || []).map((o) => [o.key, o]));
  const diet = Object.fromEntries((catalog?.dietary || []).map((d) => [d.key, d.label]));
  const events = (r.options || []).filter((k) => !GENERIC.test(k));
  const dayName = (k) => days.find((d) => d.key === k)?.label || k;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[150px_1fr]">
      <dt className="text-ttfc-muted">Days</dt>
      <dd>{r.days?.length ? r.days.map(dayName).join(" & ") : <span className="text-ttfc-dim">None</span>}</dd>
      <dt className="text-ttfc-muted">Special events</dt>
      <dd>{events.length ? (
        <ul className="space-y-1">
          {events.map((k) => <li key={k}>{opt[k]?.label || k}{opt[k]?.day ? <span className="text-ttfc-dim"> · {dayName(opt[k].day)}{opt[k].time ? `, ${opt[k].time}` : ""}</span> : null}</li>)}
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

function Editor({ personId, rsvp, catalog, defaultTier, tierLocked, override, onCancel, onSaved }) {
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
  const allowed = useMemo(() => allowedFor(catalog, tier, days), [catalog, tier, days]);
  const tiers = (catalog?.tiers || []);
  const catDays = catalog?.days || [];
  const groups = [
    ...catDays.map((d) => ({ key: d.key, title: d.label, options: (catalog?.options || []).filter((o) => o.kind === "experience" && o.day === d.key) })),
    { key: "any", title: "Either day", options: (catalog?.options || []).filter((o) => o.kind === "experience" && !o.day) },
  ].filter((g) => g.options.length);

  const toggle = (list, setList, k, on) => setList(on ? [...new Set([...list, k])] : list.filter((x) => x !== k));
  const pickedOutside = options.filter((k) => !allowed.has(k));

  const save = async () => {
    setSaving(true); setError("");
    // Options on a day they no longer come to go with that day.
    const dayOk = (k) => { const o = (catalog?.options || []).find((x) => x.key === k); return !o?.day || days.includes(o.day); };
    const body = {
      days, options: options.filter(dayOk), dietary, dietaryOther: dietary.includes("other") ? dietaryOther : "", accessibility,
      ...(tierLocked ? {} : { tier }),
      override: !!override, allowOutsidePass: outside, ...(rsvp?.updatedAt ? { basedOn: rsvp.updatedAt, rsvpId: rsvp.id } : {}),
    };
    try {
      const r = await api.put(`/console/people/${encodeURIComponent(personId)}/rsvp`, body);
      toast.success(r.created ? "RSVP added. The attendee isn't emailed." : "RSVP saved. The attendee isn't emailed.");
      if (r.warning) toast.info(r.warning);
      onSaved();
    } catch (err) {
      setError(err?.message || "Couldn't save the RSVP");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {override && (
        <Banner tone="warn" icon={ShieldAlert} title="Overriding the attendee's RSVP">
          You're changing answers the attendee sent themselves. If they send their RSVP again, theirs replaces yours.
        </Banner>
      )}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">{g.title}</p>
              <ul className="space-y-1.5">
                {g.options.map((o) => {
                  const inPass = allowed.has(o.key);
                  const off = !inPass && !outside && !options.includes(o.key);
                  return (
                    <li key={o.key}>
                      <label className={`flex items-start gap-2 text-sm ${off ? "cursor-not-allowed text-ttfc-dim" : ""}`}>
                        <input type="checkbox" className="mt-0.5 accent-ttfc-pink" disabled={off} checked={options.includes(o.key)}
                          onChange={(e) => toggle(options, setOptions, o.key, e.target.checked)} />
                        <span>
                          {o.label}{o.time ? <span className="text-ttfc-dim"> · {o.time}</span> : null}
                          {!inPass && <span className="ml-1 text-[11px] text-amber-200/80">{o.day && !days.includes(o.day) ? "not coming that day" : "not in their pass"}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-ttfc-line p-3">
          <Switch checked={outside} onChange={setOutside} label="Include options outside their pass"
            description="Only when someone is invited to something their pass doesn't include. It's saved with a warning." />
        </div>
        {outside && pickedOutside.length > 0 && (
          <Banner tone="warn" icon={AlertTriangle} className="mt-3" title="Outside their pass">
            {pickedOutside.map((k) => (catalog?.options || []).find((o) => o.key === k)?.label || k).join(", ")}
          </Banner>
        )}
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
 * @param {Array} [p.duplicates]    possible duplicates waiting in Leads › RSVPs
 */
export default function RsvpEditor({ personId, rsvp, catalog, pass, duplicates = [], canEdit = true, onSaved }) {
  const [mode, setMode] = useState("view"); // view | edit | override
  const [confirm, setConfirm] = useState(false);
  const fromAttendee = rsvp && rsvp.source !== "staff";
  const tierLocked = !!(rsvp ? rsvp.tierVerified : pass?.ticketId);
  const defaultTier = rsvp?.tier || pass?.tier || "";

  const done = () => { setMode("view"); onSaved(); };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle className="mb-0" hint="Staff changes never email the attendee. If they send their own RSVP, it replaces what staff entered.">RSVP</SectionTitle>
        {mode === "view" && canEdit && (
          !rsvp ? <Button size="sm" icon={Plus} onClick={() => setMode("edit")}>Add an RSVP</Button>
            : fromAttendee ? <Button size="sm" variant="dangerOutline" icon={ShieldAlert} onClick={() => setConfirm(true)}>Override the attendee's RSVP</Button>
              : <Button size="sm" icon={Pencil} onClick={() => setMode("edit")}>Change</Button>
        )}
      </div>

      {rsvp && mode === "view" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          {fromAttendee ? (
            <>
              <Badge tone={RSVP_STATUS_TONE.attendee} icon={UserCheck}>Entered by the attendee</Badge>
              <span className="text-ttfc-muted">{when(rsvp.attendeeSubmittedAt || rsvp.updatedAt)}</span>
              <Lock className="h-3.5 w-3.5 text-ttfc-dim" aria-label="Read-only" />
            </>
          ) : (
            <>
              <Badge tone={RSVP_STATUS_TONE.staff}>Set by staff</Badge>
              <span className="text-ttfc-muted">{rsvp.staffUpdatedBy || "Staff"} · {when(rsvp.staffUpdatedAt || rsvp.updatedAt)}</span>
              {rsvp.staffOverride && <Badge tone="warn">Overrode the attendee's RSVP</Badge>}
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
          <p className="flex items-center gap-2 text-sm text-ttfc-muted"><CalendarCheck className="h-4 w-4" aria-hidden="true" /> No RSVP yet.</p>
        )
      ) : (
        <Editor personId={personId} rsvp={rsvp} catalog={catalog} defaultTier={defaultTier} tierLocked={tierLocked}
          override={mode === "override"} onCancel={() => setMode("view")} onSaved={done} />
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => setMode("override")}
        title="Override the attendee's RSVP?"
        body="They sent this RSVP themselves. Change it only when they've asked you to or you've agreed it with them. If they send their RSVP again, theirs replaces yours. They aren't emailed."
        confirmLabel="Override"
        tone="danger"
      />
    </Card>
  );
}
