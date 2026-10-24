/* =========================================================
   TTFC Check-in: the two guests who aren't an ordinary pass holder
   ---------------------------------------------------------
   The organiser (Oct 23): "If their name isn't found, then mark as no
   details found. If their pass isn't found but name is there, mark it
   as issue pass. These should look and read different."
     ISSUE PASS (contract C7): the name is on the list, no pass on file
       (the snapshot's guests with `noPass: true`: a speaker with no
       Speaker Pass row, Media or an exhibitor with no pass). Marked
       Arrived in the lobby like anyone; the pass desk issues a pass.
     NO DETAILS FOUND (contract C8): the lobby couldn't find the person.
       The lobby records the arrival with the name as typed
       ({ kind: "unknown_arrival", name, company, note, station:
       "lobby" } through the offline queue); the pass desk gets a card
       ("check ID, send to help desk") with the same banner and chime,
       and closes it: Sent to help desk / Pass issued / Left
       ({ kind: "unknown_done", target: "u:<id>", outcome }), or staff
       find the guest ({ kind: "unknown_link", target, guestKey }: that
       guest is marked Arrived and the card goes).
   Each has its own icon, words and border / pattern, never a pass
   colour alone: ISSUE PASS = a ticket and a dashed outline on the
   page's own background; NO DETAILS FOUND = a question mark on a
   hatched (striped) panel with a solid outline. Neither counts in the
   pass-type totals: each has its own counter chip.
   Pure; node --test src/checkin/lib/special.test.mjs
========================================================= */

export const ISSUE_PASS = Object.freeze({
  key: "issue_pass",
  icon: "🎫",
  badge: "ISSUE PASS",
  reading: "On the list · no pass on file",
  card: "Issue pass: name is on the list, no pass on file",
  chip: "Issue pass",
  border: "dashed",
  pattern: "none",
});

export const NO_DETAILS = Object.freeze({
  key: "no_details",
  icon: "?",
  badge: "NO DETAILS FOUND",
  reading: "No details found: check ID, send to help desk",
  card: "No details found: check ID, send to help desk",
  chip: "No details found",
  button: "No details found: record arrival",
  border: "solid",
  pattern: "hatched",
});

/** The pass desk's three ways to close a NO DETAILS FOUND card (and staff's "Found them"). */
export const UNKNOWN_OUTCOMES = Object.freeze([
  { outcome: "sent_to_help", label: "Sent to help desk", done: "sent to the help desk" },
  { outcome: "pass_issued", label: "Pass issued", done: "pass issued" },
  { outcome: "left", label: "Left", done: "left" },
]);
export const outcomeText = (o) => UNKNOWN_OUTCOMES.find((x) => x.outcome === o)?.done || (o === "linked" ? "found on the list" : o || "");

export const UNKNOWN_LIMITS = Object.freeze({ name: 80, company: 80, note: 200 });
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * The lobby's "No details found" form → { ok, value: { name, company, note } } | { ok: false, field, error }.
 * Name as typed: 1–80 characters (required); company ≤ 80, note ≤ 200 (optional).
 */
export function cleanUnknown({ name, company, note } = {}) {
  const v = { name: clean(name), company: clean(company), note: clean(note) };
  if (!v.name) return { ok: false, field: "name", error: "Type their name as they said it." };
  for (const k of ["name", "company", "note"]) {
    if (v[k].length > UNKNOWN_LIMITS[k]) return { ok: false, field: k, error: `${k === "name" ? "The name" : k === "company" ? "The company" : "The note"} is ${UNKNOWN_LIMITS[k]} characters at most.` };
  }
  return { ok: true, value: v };
}

/** The queued action (contract C8). */
export const unknownArrivalAction = (value) => ({ kind: "unknown_arrival", name: value.name, company: value.company || "", note: value.note || "", station: "lobby" });
export const unknownDoneAction = (key, outcome) => ({ kind: "unknown_done", target: key, outcome });
export const unknownLinkAction = (key, guestKey) => ({ kind: "unknown_link", target: key, guestKey });

/** "u:<clientId>": the card's key, from the lobby tap that made it. */
export const unknownKey = (clientId) => `u:${clientId}`;
export const isUnknownKey = (k) => typeof k === "string" && k.startsWith("u:") && k.length > 2;
