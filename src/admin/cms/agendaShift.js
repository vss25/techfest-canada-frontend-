/* "Running late" preview rules. A copy of techfest-canada-backend
   services/agendaShift.js (keep the two in step); the server is
   authoritative and re-checks everything when staff confirm.

   The session running long keeps its start and its end moves by `minutes`.
   Every session after it in scope (starting at or after its ORIGINAL end)
   moves both times. Scope "stage": same day and stage (empty stage = the
   apps' default stage). Scope "day": every stage that day. */

export const DEFAULT_STAGE = "Centre Stage · Harbour Ballroom";
export const LATEST_MINUTE = 23 * 60 + 55;
export const LATER_STEPS = [5, 10, 15, 20, 30];
export const EARLIER_STEPS = [-10, -5];

export const stageOf = (stage) => String(stage ?? "").replace(/\s+/g, " ").trim() || DEFAULT_STAGE;
const sameStage = (a, b) => stageOf(a).toLowerCase() === stageOf(b).toLowerCase();

export function toMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}
export const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

const quoted = (s) => `“${String(s?.title || "Untitled session").trim()}”`;

/** → { changes: [{ _id, title, from: { time, endTime }, time, endTime, anchor? }] } or { error }. changes[0] is the session itself. */
export function planShift(sessions, id, minutes, scope = "stage", { only } = {}) {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m === 0 || Math.abs(m) > 60 || m % 5 !== 0) return { error: "Pick how many minutes to shift by." };
  const list = (sessions || []).filter(Boolean);
  const a = list.find((s) => s._id === id);
  if (!a) return { error: "That session isn't in the agenda any more. Refresh and try again." };
  const start = toMinutes(a.time);
  const end = toMinutes(a.endTime);
  if (start === null) return { error: `${quoted(a)} has no start time, so there's nothing to shift from.` };
  if (end === null) return { error: `${quoted(a)} has no end time. Add one first.` };
  const newEnd = end + m;
  if (newEnd <= start) return { error: `${quoted(a)} would end at or before its start. Pick a smaller shift.` };
  if (newEnd > LATEST_MINUTE) return { error: `${quoted(a)} would run past 23:55. Pick a smaller shift.` };

  const keep = Array.isArray(only) ? new Set(only) : null;
  const followers = list
    .filter((s) => s._id !== a._id
      && Number(s.day) === Number(a.day)
      && (scope === "day" || sameStage(s.stage, a.stage))
      && toMinutes(s.time) !== null && toMinutes(s.time) >= end
      && (!keep || keep.has(s._id)))
    .sort((x, y) => (toMinutes(x.time) - toMinutes(y.time)) || String(x.title || "").localeCompare(String(y.title || "")));

  const changes = [{
    _id: a._id, title: a.title || "", anchor: true,
    from: { time: a.time, endTime: a.endTime }, time: fromMinutes(start), endTime: fromMinutes(newEnd),
  }];
  for (const s of followers) {
    const s1 = toMinutes(s.time) + m;
    const e0 = toMinutes(s.endTime);
    const e1 = e0 === null ? null : e0 + m;
    if (s1 < 0) return { error: `${quoted(s)} would start before 00:00. Pick a smaller shift.` };
    if (s1 > LATEST_MINUTE || (e1 !== null && e1 > LATEST_MINUTE)) return { error: `${quoted(s)} would run past 23:55. Pick a smaller shift.` };
    changes.push({
      _id: s._id, title: s.title || "", isBreak: !!s.isBreak, stage: s.stage,
      from: { time: s.time, endTime: s.endTime }, time: fromMinutes(s1), endTime: e1 === null ? s.endTime : fromMinutes(e1),
    });
  }
  return { changes };
}
