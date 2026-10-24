import { useDesk, setStation, requestSignOut } from "../lib/desk.js";
import { dayHeading } from "../lib/timers.js";

/* Pick this device's station (remembered on the device; switch any time from the header). Both roles can use every
   station. The evening entry is optional: staff switch it off in Admin › Event day › Check-in › Desk settings. */
const ICONS = { lobby: "🚪", desk: "🎫", breakfast: "☕", lunch: "🍽", evening: "🌙", media: "🎙", av: "🎚", exhibitor: "🏷" };

export default function Stations({ onPicked }) {
  const d = useDesk();
  const s = d.state;
  const list = (s?.stations || []).filter((x) => x.enabled !== false);
  return (
    <main className="ci-stations">
      <header className="ci-stations-head">
        <h1>Pick this device's station</h1>
        <p className="ci-muted">{dayHeading(s?.today)} · Signed in as {d.session?.user?.name} ({d.session?.staff ? "staff" : "volunteer"})</p>
      </header>
      <div className="ci-station-grid">
        {list.map((st) => {
          const state = s.stationStates?.[st.key];
          return (
            <button key={st.key} type="button" className={`ci-station-tile${d.station === st.key ? " is-current" : ""}`} onClick={() => { setStation(st.key); onPicked?.(); }}>
              <span className="ci-station-icon" aria-hidden="true">{ICONS[st.key]}</span>
              <span className="ci-station-name">{st.label}</span>
              <span className="ci-station-sub">{st.sub}</span>
              {state && <span className={`ci-station-state is-${state.code}`}>{state.text}</span>}
              {st.removable && <span className="ci-station-note">Optional station (staff can switch it off)</span>}
            </button>
          );
        })}
      </div>
      <p className="ci-center"><button type="button" className="ci-btn ci-btn-ghost" onClick={requestSignOut} disabled={d.signingOut}>{d.signingOut ? "Sending taps…" : "Sign out"}</button></p>
    </main>
  );
}
