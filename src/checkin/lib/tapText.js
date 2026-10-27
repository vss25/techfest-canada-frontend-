/* =========================================================
   TTFC Check-in: a tap in words (the Needs attention list, the
   sign-out question): who, what, where, by whom, and what can be done
   about a tap the server refused.
   Pure; node --test src/checkin/lib/tapText.test.mjs
========================================================= */

export const POINT_LABELS = Object.freeze({
  arrived: "Marked arrived", checked_in: "Checked in · pass given", cxo: "Admitted to the CxO Breakfast", lunch: "Admitted to lunch",
  evening: "Admitted (evening entry)", media: "Checked in at the media desk", av: "AV checked", exhibitor: "Checked in at the exhibitor desk",
  booth: "Booth set up", flag_cxo: "Sent to staff (breakfast)", flag_lunch: "Sent to staff (lunch)", flag_evening: "Sent to staff (evening)",
  drinks: "Drink coupons issued",
});
export const STATION_LABELS = Object.freeze({
  lobby: "Lobby", desk: "Floor 1", breakfast: "CxO Breakfast", lunch: "Lunch", evening: "Evening entry", media: "Media desk", av: "AV station", exhibitor: "Exhibitor desk",
  drinks: "Drinks",
});

/** "Drink coupons issued (2)", "Drink coupons issued again (+1)". */
const drinksWhat = (it) => (it.again ? `Drink coupons issued again${it.count ? ` (+${it.count})` : ""}` : `Drink coupons issued${it.count ? ` (${it.count})` : ""}`);

/**
 * → { who, what, where, by, tappedBy, at } for a queued tap (`state`: the device's, for the guest's name; `items`: the
 * queue). `by`: who it's recorded as (queuedBy); `tappedBy`: who first tapped it, when someone else retried it since.
 */
export function describeTap(it, { state = null, items = [] } = {}) {
  const g = it?.key ? state?.byKey?.get(it.key) : null;
  const booth = it?.key ? state?.boothByKey?.get(it.key) : null;
  const target = it?.kind === "undo" ? items.find((x) => x.clientId === (it.target || it.ref)) : null;
  const unknown = it?.kind === "unknown_arrival" ? it : it?.target?.startsWith?.("u:") ? state?.unknowns?.get(it.target) || items.find((x) => `u:${x.clientId}` === it.target) : null;
  const who = g?.name || (booth ? `Booth ${booth.booth}` : "") || it?.who || unknown?.name || (target && (state?.byKey?.get(target.key)?.name || target.name)) || "";
  let what = "Tap";
  if (it?.kind === "mark") what = it.point === "drinks" ? drinksWhat(it) : POINT_LABELS[it.point] || it.point;
  else if (it?.kind === "undo") what = "Undo";
  else if (it?.kind === "reset") what = `Reset: ${POINT_LABELS[it.point] || it.point}`;
  else if (it?.kind === "note") what = it.note ? "Desk note" : "Desk note cleared";
  else if (it?.kind === "query_add") what = "Media query added";
  else if (it?.kind === "query_update") what = "Media query changed";
  else if (it?.kind === "unknown_arrival") what = "No details found: arrival";
  else if (it?.kind === "unknown_done") what = `No details found: ${({ sent_to_help: "sent to help desk", pass_issued: "pass issued", left: "left" })[it.outcome] || "closed"}`;
  else if (it?.kind === "unknown_link") what = `No details found: found them${state?.byKey?.get(it.guestKey)?.name ? ` (${state.byKey.get(it.guestKey).name})` : ""}`;
  const by = it?.queuedBy?.name || "";
  const first = it?.tappedBy?.name || "";
  return { who, what, where: STATION_LABELS[it?.station] || "", by, tappedBy: first && first !== by ? first : "", at: it?.clientAt || "" };
}

/**
 * What a refused tap's row offers: "override" (Admit anyway: outside the station's hours), "admit_override" (staff:
 * Admit anyway (override) for a guest who isn't on the list, contract C11), "retry" (Try again: worth another go, e.g. a
 * stale list on the server), "dismiss" (always).
 */
export function trayActions(it, { staff = false } = {}) {
  const out = [];
  if (it?.code === "not_included" && staff && it?.kind === "mark" && !it?.notIncluded) out.push("admit_override");
  if (it?.code === "outside_window") out.push("override");
  else if (!["undo_refused", "staff_only", "bad_request"].includes(it?.code || "") && it?.kind !== "undo" && it?.status !== 400) out.push("retry");
  out.push("dismiss");
  return out;
}

/** The sign-out question's words about the taps still on this device ("" when there are none). */
export function signOutText(items = []) {
  const waiting = items.filter((x) => x.state !== "failed");
  const refused = items.filter((x) => x.state === "failed");
  const parts = [];
  if (waiting.length) {
    const names = [...new Set(waiting.map((x) => x.queuedBy?.name).filter(Boolean))];
    parts.push(`${waiting.length} tap${waiting.length === 1 ? " hasn't" : "s haven't"} reached the server yet (no connection). They stay on this device and are sent after the next sign-in here, still recorded as made by ${names.length ? names.join(", ") : "whoever made them"}.`);
  }
  if (refused.length) parts.push(`${refused.length} tap${refused.length === 1 ? " was" : "s were"} not recorded (refused): they stay in Needs attention on this device.`);
  return parts.join(" ");
}
