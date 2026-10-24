import { askConfirm, desk, myRecentTap, pending, tap, undoTap } from "./lib/desk.js";
import { statusOf } from "./lib/state.js";
import { tapRule } from "./lib/stationTime.js";
import { EXTRA_LABELS } from "./lib/constants.js";

/* The stations' big buttons, with the time rule (lib/stationTime.js tapRule): the lobby (Arrived) and the pass desk
   (Checked in) never ask, all day on an event day; a meal or evening station outside its hours asks first and is
   recorded as an override ("Admit anyway"); the media, AV and exhibitor desks record a tap outside their hours as such
   without asking; a day that isn't an event day only makes practice marks. The server checks the same and audits. */

const LABEL = {
  lobby: "The lobby", desk: "The pass desk", breakfast: "The CxO Breakfast", lunch: "Lunch", evening: "The evening entry",
  media: "The media desk", av: "The AV station", exhibitor: "The exhibitor desk",
};
const YES = { breakfast: "Admit anyway", lunch: "Admit anyway", evening: "Admit anyway" };

/** Record `point` for a guest (or a booth key) at the current station. `onDone`: once the tap is queued (the search clears). */
export function act({ point, key, guest = null, note, undoText, onDone = null }) {
  const station = desk.station;
  const st = desk.state?.stationStates?.[station];
  const go = (override) => {
    tap({ kind: "mark", point, key: key || guest?.key, override: !!override, ...(note ? { note } : {}) }, { undoText });
    try { onDone?.(); } catch { /* the screen's problem */ }
  };
  const rule = tapRule(station, st);
  if (rule === "override") { go(true); return; }
  if (rule === "ask") {
    askConfirm({
      title: `${LABEL[station] || "This station"} is closed right now`,
      text: st.text,
      detail: `${st.detail ? `${st.detail}. ` : ""}It will be recorded as an override.`,
      yes: YES[station] || "Record anyway",
      tone: "warn",
      onYes: () => go(true),
    });
    return;
  }
  go(false);
}

/** This device's tap on the guest at the point, still undoable → an Undo handler, else null. */
export function undoFor(guest, point) {
  const id = guest ? myRecentTap(guest.key, point) || (guest.keys || []).map((k) => myRecentTap(k, point)).find(Boolean) : "";
  return id ? () => undoTap(id) : null;
}

/** Staff: clear a mark for today (reset), after asking. */
export function resetMark(guest, point, what) {
  askConfirm({
    title: `Reset ${what}?`,
    text: `${guest.name}: ${what} today is cleared${point === "arrived" ? " (and their check-in at the pass desk)" : ""}. This is logged.`,
    yes: "Reset", tone: "bad",
    onYes: () => tap({ kind: "reset", point, key: guest.key }),
  });
}

/** The status of a guest right now (queue included). */
export const statusNow = (g) => statusOf(desk.state, g, pending());

export const extraLabel = (k) => EXTRA_LABELS[k] || k;
