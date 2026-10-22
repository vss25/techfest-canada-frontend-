import { availabilityDetail } from "../lib/availability";

/* Free to meet on a profile (yours or someone's): a row per day, a line per range with its place
   ("Mon, Oct 26" · "All day · Harbour Ballroom foyer"), lib/availability.js. */
export function AvailabilityRows({ slots, spots, meetingSpot }) {
  const days = availabilityDetail(slots, spots, meetingSpot);
  if (!days.length) return null;
  return (
    <div className="avail-rows">
      {days.map((d) => (
        <div key={d.day} className="avail-day">
          <span className="avail-day-label">{d.label}</span>
          <ul>
            {d.lines.map((l) => <li key={l.ids[0]}><b>{l.label}</b>{l.place && <span className="avail-place"> · {l.place}</span>}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
