/* =========================================================
   TTFC Check-in: one word and one colour per state, everywhere
   (Oct 24 2026, the organiser: "Arrived and admitted colour and CTA
   text should be clear and not ambiguous").
   What a button DOES says so in the imperative; what has HAPPENED is a
   state chip (an icon + words + the time), in the state's own colour:
     state      button (CTA)                chip                                tone
     arrived    "Mark arrived"              "Arrived · 9:02 AM"                 arrived (sky blue, →)
     on the way                             "On the way up · 0:35"              arrived
     checked in "Check in & give pass"      "Checked in · pass given · 9:03 AM" done    (green, ✓)
     (ISSUE PASS "Issue pass & check in"    "Pass issued · checked in · 9:03")  done
     admitted   "Admit to Lunch"            "Admitted to Lunch · 12:31 PM"      done    (green, ✓)
     again      (a second tap / a search)   "Already admitted · 12:31 PM"       already (amber, !)
     on list    (meal search, before a tap) "On the list"                       done    (green, ✓)
     not on it                              "Not on the list" (a STOP sign)     stop    (red, octagon)
     sent       "Send to staff"             "Sent to staff · 12:33 PM"          already
   Undo says what it undoes: "Undo arrived", "Undo check-in", "Undo
   admit". The state colours are their own (lib/vocab.test.mjs checks
   contrast and that none is a pass colour): a state lives on the chip or
   the button, the pass colour stays on the band (VIP gold, Media dark
   blue…), and a state is never told by its colour alone (icon + words).
   Pure; node --test src/checkin/lib/vocab.test.mjs
========================================================= */

import { timeText } from "./timers.js";

/**
 * The state colours (dark and light themes). Arrived and done are SOLID pills (bg + ink), chosen away from every pass
 * colour (sky blue, not Media's dark blue or Connect's teal; a plain green, not Connect's). Already and stop are HOLLOW
 * pills (the colour on the outline, icon and words, on the page's own panel), since no amber or red can be far from
 * Power's orange, VIP's gold or Speaker's red: the shape, the icon and the words tell them apart from a pass band.
 */
export const STATE_COLORS = Object.freeze({
  dark: Object.freeze({
    panel: "#171036",
    arrived: Object.freeze({ bg: "#38BDF8", ink: "#02233A" }),
    done: Object.freeze({ bg: "#4ADE80", ink: "#04220F" }),
    already: Object.freeze({ line: "#FFB224" }),
    stop: Object.freeze({ line: "#FF5C63" }),
  }),
  light: Object.freeze({
    panel: "#FFFFFF",
    arrived: Object.freeze({ bg: "#38BDF8", ink: "#02233A" }),
    done: Object.freeze({ bg: "#15803D", ink: "#FFFFFF" }),
    already: Object.freeze({ line: "#9A5800" }),
    stop: Object.freeze({ line: "#C8232C" }),
  }),
});
export const TONES = Object.freeze(["arrived", "done", "already", "stop"]);
/** The icon each tone carries (never colour alone). The STOP sign is drawn (components.jsx StopSign). */
export const TONE_ICON = Object.freeze({ arrived: "→", done: "✓", already: "!", stop: "stop" });

const at = (m) => (m?.at ? timeText(m.at) : "");
const dot = (...parts) => parts.filter(Boolean).join(" · ");

/** The short name of what a meal / evening station admits to: "CxO Breakfast", "Lunch", "Awards Night", "Gala". */
export function mealName(item) {
  if (!item) return "";
  if (item.extra === "lunch") return "Lunch";
  if (item.extra === "awards") return "Awards Night";
  if (item.extra === "gala") return "Gala Dinner";
  if (item.extra === "cxo") return "CxO Breakfast";
  return item.label || "";
}

/** Each station's main button, the undo next to it and what the laptop's Enter does. `item`: a meal station's today. */
export function cta(station, { item = null, noPass = false } = {}) {
  switch (station) {
    case "lobby": return { label: "Mark arrived", undo: "Undo arrived" };
    case "desk": return noPass ? { label: "Issue pass & check in", undo: "Undo check-in" } : { label: "Check in & give pass", undo: "Undo check-in" };
    case "breakfast":
    case "lunch":
    case "evening": return { label: item ? `Admit to ${mealName(item)}` : "Admit (practice)", undo: "Undo admit" };
    case "media": return { label: "Check in at media desk", undo: "Undo check-in" };
    case "av": return { label: "Mark AV checked", undo: "Undo AV check" };
    case "exhibitor": return { label: "Check in exhibitor", undo: "Undo check-in" };
    default: return { label: "Record", undo: "Undo" };
  }
}

/**
 * The state chip for what happened ({ tone, text }), or null. `m`: the mark (statusOf's), `again`: shown to someone
 * about to tap it again (a search result, not their own tap a moment ago): "Already …" in amber.
 */
export function stateChip(kind, m, { item = null, noPass = false, again = false, by = false } = {}) {
  if (!m) return null;
  const when = at(m);
  const who = by && m.by?.name ? `by ${m.by.name}` : "";
  const tail = (s) => dot(s, when) + (who ? ` ${who}` : "") + (m.pending ? " · pending" : "") + (m.practice ? " · practice" : "");
  switch (kind) {
    case "arrived": return { tone: "arrived", text: tail("Arrived") };
    case "checked_in":
      if (again) return { tone: "already", text: tail(noPass ? "Already checked in · pass issued" : "Already checked in") };
      return { tone: "done", text: tail(noPass ? "Pass issued · checked in" : "Checked in · pass given") };
    case "admitted":
      if (again) return { tone: "already", text: tail("Already admitted") };
      return { tone: "done", text: tail(`Admitted${item ? ` to ${mealName(item)}` : ""}`) + (m.override ? " · override" : "") };
    case "flagged": return { tone: "already", text: tail("Sent to staff") };
    case "media": return { tone: "done", text: tail(again ? "Already checked in" : "Checked in · media desk") };
    case "av": return { tone: "done", text: tail(again ? "Already AV checked" : "AV checked") };
    case "exhibitor": return { tone: "done", text: tail(again ? "Already checked in" : "Checked in · exhibitor desk") };
    default: return null;
  }
}

/** "On the way up · 0:35" (arrived, not checked in yet): the arrived tone. */
export const onTheWayText = (clock) => `On the way up${clock ? ` · ${clock}` : ""}`;

/**
 * At a meal / evening station: is this guest on today's list? → { ok, tone, text, reason }. `included`: the server's
 * inclusions (guest.extras[item.extra]); never worked out here. The reason names the pass ("Connect Pass — lunch not
 * included"); no pass on file: "No pass on file — needs a pass for lunch".
 */
export function permit({ item, included, noPass = false, passName = "" } = {}) {
  if (!item) return null;
  const what = mealName(item).toLowerCase().replace(/^cxo/, "CxO");
  if (included) return { ok: true, tone: "done", text: "On the list", reason: `${mealName(item)} included` };
  if (noPass) return { ok: false, tone: "stop", text: "Not on the list", reason: `No pass on file — needs a pass for ${what}` };
  return { ok: false, tone: "stop", text: "Not on the list", reason: `${passName || "Their pass"} — ${what} not included` };
}
