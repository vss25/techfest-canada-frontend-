/* Shared bits of Marketing › Social posts and the Social media calendar (Nov 18 2026). */

export const CHANNELS = [
  { key: "linkedin", label: "LinkedIn", short: "in", limit: 3000, size: "1200 × 627", ratio: "1200 / 627" },
  { key: "instagram", label: "Instagram", short: "IG", limit: 2200, size: "1080 × 1350", ratio: "1080 / 1350" },
  { key: "x", label: "X", short: "X", limit: 280, size: "1600 × 900", ratio: "1600 / 900" },
];

/* The approved design's status colours (line, fill). */
export const STATUS = {
  posted: ["#166534", "#F0FDF4", "Posted on time"],
  late: ["#B45309", "#FFFBEB", "Late"],
  missed: ["#B91C1C", "#FEF2F2", "Missed"],
  scheduled: ["#5B21B6", "#F5F3FF", "Scheduled"],
  approved: ["#5B21B6", "#F5F3FF", "Approved"],
  review: ["#D6308C", "#FDF2F8", "In review"],
  changes: ["#B45309", "#FFFBEB", "Changes requested"],
  draft: ["#8A86A0", "#F6F5FA", "Planned"],
  promised: ["#151035", "#FFFFFF", "Promised in a contract"],
};

/** X counts every link as 23 characters (the server checks the same). */
export function lengthFor(channel, text = "") {
  const t = String(text || "");
  if (channel === "x") return t.replace(/(https?:\/\/\S+|\b[\w-]+(\.[\w-]+)*\.(com|ca|org|net|io|co|ai|app|dev|gov|edu|info|biz|me|tv|ly|gl)\b(\/\S*)?)/gi, "x".repeat(23)).length;
  return t.length;
}

export function textFor(post, channel) {
  if (channel === "linkedin") return post.text || "";
  const v = post.versions?.[channel];
  if (v?.own && v.list?.length) return v.list[Math.min(v.chosen || 0, v.list.length - 1)]?.text || "";
  return post.text || "";
}

export const TIMEZONES = [
  ["America/Toronto", "Toronto (Eastern)"],
  ["America/Vancouver", "Vancouver (Pacific)"],
  ["America/Edmonton", "Calgary (Mountain)"],
];

function offsetMs(utcMs, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - utcMs;
}

/** "2026-11-20" + "10:00" in a time zone → ISO string (null when incomplete). */
export function zonedToIso(date, time, tz) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return new Date(guess - offsetMs(guess, tz)).toISOString();
}

/** ISO → { date, time } in a time zone. */
export function isoToZoned(iso, tz) {
  if (!iso) return { date: "", time: "" };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export const whenLabel = (iso, tz = "America/Toronto") => (iso ? new Date(iso).toLocaleString("en-CA", {
  timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}) : "Not scheduled");

/** Which channel a contract's promised post is for, from its label ("LinkedIn post 1 of 2"). */
export function channelOfPromise(label = "") {
  const l = label.toLowerCase();
  if (l.includes("instagram")) return "instagram";
  if (/\bx\b|twitter/.test(l)) return "x";
  if (l.includes("linkedin")) return "linkedin";
  return "";
}
