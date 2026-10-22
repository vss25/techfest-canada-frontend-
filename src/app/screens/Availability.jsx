import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Circle, CircleCheck, MapPin } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, loadAccount } from "../lib/auth";
import { patch } from "../lib/api";
import { refreshPeople } from "../lib/social";
import { showAlert } from "../lib/ui";
import {
  AVAIL_DAYS, MAX_PLACE, SUGGESTED_PLACES, blockLabel, cleanSlots, cleanSpots, dayBlocks, dayRanges, isAllDay, setPlaces, toggleAllDay, toggleBlock,
} from "../lib/availability";
import { AvailabilityRows } from "../components/Availability";
import { Button, Sheet, Spinner, TopBar } from "../components/ui";

/* =========================================================
   Availability to meet (iOS AvailabilityView): per day an
   "All day" toggle and the six two-hour blocks; under them the
   day's merged ranges ("12–8 PM"), each with where you'll be.
   "Same place for everything" at the top is the default place
   (meetingSpot) for any time without its own. Saved together:
   availabilitySlots, availabilitySpots and meetingSpot
   (PATCH /api/profile). Formatting: lib/availability.js.
========================================================= */

export default function Availability() {
  const a = useStore(auth);
  if (!a.me) return <div className="page"><TopBar title="Availability to meet" /><Spinner label="Loading your profile" /></div>;
  return <AvailabilityForm key={a.me.id || "me"} />;
}

function AvailabilityForm() {
  const a = useStore(auth);
  const navigate = useNavigate();
  const start = useMemo(() => {
    const me = a.me || {}, u = a.user || {};
    const slots = cleanSlots(me.availabilitySlots || u.availabilitySlots || []);
    return { slots, spots: cleanSpots(me.availabilitySpots || u.availabilitySpots || {}, slots), meetingSpot: String(me.meetingSpot ?? u.meetingSpot ?? "").trim() };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [slots, setSlots] = useState(start.slots);
  const [spots, setSpots] = useState(start.spots);
  const [spot, setSpot] = useState(start.meetingSpot);
  const [picker, setPicker] = useState(null); // { kind: "default" } | { kind: "range", label, ids }
  const [saving, setSaving] = useState(false);
  const saved = JSON.stringify([start.slots, start.spots, start.meetingSpot]);
  const dirty = JSON.stringify([slots, cleanSpots(spots, slots), spot.trim()]) !== saved;

  const save = async () => {
    setSaving(true);
    try {
      const availabilitySlots = cleanSlots(slots);
      await patch("profile", { availabilitySlots, availabilitySpots: cleanSpots(spots, availabilitySlots), meetingSpot: spot.trim() });
      await loadAccount();
      refreshPeople("");
      showAlert("Availability saved", "People on the TTFC app can now see when you're free to meet.");
      if (window.history.state && window.history.state.idx > 0) navigate(-1);
      else navigate("/profile", { replace: true });
    } catch (err) { showAlert("Couldn't save", err.message); } finally { setSaving(false); }
  };

  const pick = (place, ids) => {
    if (picker?.kind === "default") setSpot(place);
    else setSpots((x) => setPlaces(x, ids, place));
    setPicker(null);
  };

  return (
    <div className="page">
      <TopBar title="Availability to meet" />
      <main id="main" className="pad mt-16 stack-lg">
        <p className="muted small" style={{ margin: 0 }}>Pick when you're happy to meet, and where. Everyone on the TTFC app sees this on your profile, so they can suggest a time.</p>

        <button type="button" className="avail-default pressable" onClick={() => setPicker({ kind: "default" })}>
          <span className="lead-icon lead-icon--accent" aria-hidden="true"><MapPin /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>Same place for everything</b>
            <span className={spot ? "avail-default-value" : "avail-default-value muted"}>{spot || "No specific place"}</span>
          </span>
          <ChevronRight className="chev" aria-hidden="true" />
        </button>

        {AVAIL_DAYS.map((d) => {
          const all = isAllDay(slots, d.n);
          const ranges = dayRanges(d.n, slots, spots, spot);
          return (
            <section key={d.n} className="card avail-day-card" aria-labelledby={`avail-d${d.n}`}>
              <div className="row">
                <h2 id={`avail-d${d.n}`} className="avail-day-h">{d.label}</h2>
                <button type="button" className={"chip pressable" + (all ? " chip--on" : "")} aria-pressed={all} onClick={() => setSlots((x) => toggleAllDay(x, d.n))}>
                  All day
                </button>
              </div>
              <div className="avail-blocks" role="group" aria-label={`${d.label} times`}>
                {dayBlocks(d.n).map((id) => {
                  const on = slots.includes(id);
                  const Icon = on ? CircleCheck : Circle;
                  return (
                    <button key={id} type="button" className={"avail-block pressable" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => setSlots((x) => toggleBlock(x, id))}>
                      <Icon aria-hidden="true" />{blockLabel(id)}
                    </button>
                  );
                })}
              </div>
              {ranges.length > 0 && (
                <div className="avail-ranges">
                  {ranges.map((r) => (
                    <button key={r.ids[0]} type="button" className="avail-range pressable" onClick={() => setPicker({ kind: "range", label: r.label, ids: r.ids })}
                      aria-label={`${r.label}: ${r.place || "no specific place"}. Change where`}>
                      <b>{r.label}</b>
                      <span className={r.place ? "avail-range-place" : "avail-range-place muted"}>
                        <MapPin aria-hidden="true" />{r.place || "Add a place"}
                      </span>
                      <ChevronRight className="chev" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {slots.length > 0 && (
          <section className="card stack-sm" aria-labelledby="avail-preview">
            <h2 id="avail-preview" className="eyebrow">What people will see</h2>
            <AvailabilityRows slots={slots} spots={spots} meetingSpot={spot} />
          </section>
        )}

        {dirty && <div className="avail-save"><Button type="button" variant="primary" size="lg" block loading={saving} onClick={save}>Save availability<Check aria-hidden="true" /></Button></div>}
      </main>
      {picker && (
        <PlaceSheet
          title={picker.kind === "default" ? "Same place for everything" : `Where? · ${picker.label}`}
          ids={picker.kind === "range" ? picker.ids : null}
          value={picker.kind === "default" ? spot : String(spots[picker.ids[0]] || "").trim()}
          fallback={picker.kind === "range" ? spot : ""}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

/** Where: the suggested places, "Other…" (free text) and the way back to the default ("Same place for
    everything (Expo floor)", or "No specific place" when there's no default). For a range of several blocks,
    "Applies to" picks which of them (that's how a range splits into two places). */
function PlaceSheet({ title, ids, value, fallback, onPick, onClose }) {
  const custom = value && !SUGGESTED_PLACES.includes(value);
  const [other, setOther] = useState(custom ? value : "");
  const [typing, setTyping] = useState(!!custom);
  const [only, setOnly] = useState(ids || []);
  const toggle = (id) => setOnly((x) => (x.includes(id) ? (x.length > 1 ? x.filter((y) => y !== id) : x) : (ids || []).filter((y) => y === id || x.includes(y))));
  const choose = (place) => onPick(place, only);
  const row = (label, place) => (
    <button key={label} type="button" className="inset-row pressable" onClick={() => choose(place)} aria-pressed={!typing && value === place}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 15 }}>{label}</span>
      {!typing && value === place && <Check aria-hidden="true" className="place-check" />}
    </button>
  );
  return (
    <Sheet open onClose={onClose} title={title} medium>
      <div className="sheet-body stack" style={{ paddingBottom: 12 }}>
        {ids && ids.length > 1 && (
          <div className="stack-sm">
            <span className="eyebrow eyebrow--muted">Applies to</span>
            <div className="chips chips--wrap">
              {ids.map((id) => (
                <button key={id} type="button" className={"chip pressable" + (only.includes(id) ? " chip--on" : "")} aria-pressed={only.includes(id)} onClick={() => toggle(id)}>{blockLabel(id)}</button>
              ))}
            </div>
          </div>
        )}
        <div className="inset-list">
          {SUGGESTED_PLACES.map((p) => row(p, p))}
          <button type="button" className="inset-row pressable" onClick={() => setTyping(true)} aria-expanded={typing}>
            <span style={{ flex: 1, fontSize: 15 }}>Other…</span>
            {typing && <Check aria-hidden="true" className="place-check" />}
          </button>
          {/* Back to the default: named after it when there is one. */}
          {row(fallback ? `Same place for everything (${fallback})` : "No specific place", "")}
        </div>
        {typing && (
          <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); if (other.trim()) choose(other.trim()); }}>
            <input className="input" value={other} maxLength={MAX_PLACE} onChange={(e) => setOther(e.target.value)} placeholder='e.g. "Booth 14"' aria-label="Place" autoFocus enterKeyHint="done" />
            <Button type="submit" variant="primary" block disabled={!other.trim()}>Use this place</Button>
          </form>
        )}
      </div>
    </Sheet>
  );
}
