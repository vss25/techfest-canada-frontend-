/* =========================================================
   "Win the TTFC swag kit" (Oct 22 2026, the organiser: "download
   the app and get a chance to win the swag kit … they can win that
   through the gamified version in the app"). The settings staff edit
   in Admin › Website & app › Swag kit giveaway (GET /api/app/content,
   public: swag.enabled, swag.kits, swag.cutoff, swag.announce,
   swag.title, swag.rules), read the same way by the website's /swag
   page, the web app's Points banner and feed card, and the admin page.
   The public GET /api/app/swag (backend be-swag) sends them worked
   out (phase, labels, the rules filled in): swagFromApi() reads that;
   swagFrom() works the same out from the raw settings (the fallback
   while it loads, and the admin page's preview). Same date words as
   the server ("3:00 PM on Tuesday, October 27", "Oct 27, 3 PM").
   Pure, no imports: node --test src/lib/swag.test.mjs.
========================================================= */

export const SWAG_PAGE = "/swag";
export const SWAG_URL = "https://www.thetechfestival.com/swag";
/** The photo (copied as-is from the organiser's file): 1200 px for pages, 600 px for thumbnails. */
export const SWAG_PHOTO = "/swag/swag-kit-1200.jpg";
export const SWAG_THUMB = "/swag/swag-kit-600.jpg";
export const SWAG_ALT = "TTFC swag kit: backpack, bottle, mug, notebook, umbrella and more";

export const SWAG_DEFAULT_RULES =
  "Earn points in the TTFC app by connecting, saving sessions, posting and taking part. The top {kits} people on the " +
  "leaderboard at {cutoff} each win a TTFC swag kit. Open to registered TTFC 2026 attendees with 'Show me on the " +
  "leaderboard' on; TTFC staff, volunteers and their families can't win. Winners are told in the app at {announce} and " +
  "collect their kit at the registration desk, Harbour Ballroom foyer, after answering a skill-testing question. No " +
  "purchase necessary. Prizes have no cash value and can't be exchanged.";

export const SWAG_DEFAULTS = Object.freeze({
  "swag.enabled": false,
  "swag.kits": 3,
  "swag.cutoff": "2026-10-27T15:00:00-04:00",
  "swag.announce": "2026-10-27T16:00:00-04:00",
  "swag.title": "Win the TTFC swag kit",
  "swag.rules": SWAG_DEFAULT_RULES,
});

export const SWAG_KEYS = Object.keys(SWAG_DEFAULTS);

const TZ = "America/Toronto";

/** "2026-10-27T15:00:00-04:00", "2026-10-27 15:00" (Toronto) or a Date → ms, or NaN. */
export function parseToronto(v) {
  if (v instanceof Date) return v.getTime();
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  // A wall-clock time without a zone is Toronto time.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    return guess - torontoOffsetMinutes(guess) * 60000;
  }
  return Date.parse(s);
}

/** Toronto's offset from UTC in minutes at `ms` (−240 in EDT, −300 in EST). */
export function torontoOffsetMinutes(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** ms → "2026-10-27T15:00" in Toronto (an <input type="datetime-local"> value). */
export function torontoLocalInput(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms + torontoOffsetMinutes(ms) * 60000);
  return d.toISOString().slice(0, 16);
}

/** "2026-10-27T15:00" (Toronto, from a datetime-local input) → "2026-10-27T15:00:00-04:00". */
export function torontoIso(local) {
  const ms = parseToronto(local);
  if (!Number.isFinite(ms)) return "";
  const off = torontoOffsetMinutes(ms);
  const sign = off <= 0 ? "-" : "+";
  const a = Math.abs(off);
  return `${torontoLocalInput(ms)}:00${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** "3:00 PM on Tuesday, October 27" (Toronto time; the server's cutoffLabel). */
export function swagWhen(ms) {
  if (!Number.isFinite(ms)) return "";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(new Date(ms));
  return `${swagTime(ms)} on ${day}`;
}

/** "Oct 27, 3 PM" (the banner's short form; minutes only when they aren't :00). */
export function swagShort(ms) {
  if (!Number.isFinite(ms)) return "";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(new Date(ms));
  return `${day}, ${swagTime(ms, true)}`;
}

function swagTime(ms, short = false) {
  const t = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
  return short ? t.replace(":00", "") : t;
}

const bool = (v, d) => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : d);
const str = (v, d) => (typeof v === "string" && v.trim() ? v.trim() : d);

/** Fills {kits}, {cutoff} and {announce} in the rules text. */
export function fillSwagText(text, s) {
  return String(text || "")
    .replace(/\{kits\}/g, String(s.kits))
    .replace(/\{cutoff\}/g, swagWhen(s.cutoff))
    .replace(/\{announce\}/g, swagWhen(s.announce));
}

/**
 * The settings from GET /api/app/content (missing or empty → the defaults) →
 * { enabled, kits, cutoff (ms), announce (ms), title, rules (filled in), rulesRaw, stage }
 * stage at `now`: "off" | "open" (points still count) | "closed" (after the cutoff, winners not out) | "announced".
 */
export function swagFrom(values, now = Date.now()) {
  const v = values || {};
  const kitsN = Math.round(Number(v["swag.kits"]));
  const kits = Number.isFinite(kitsN) && kitsN > 0 ? Math.min(kitsN, 50) : SWAG_DEFAULTS["swag.kits"];
  let cutoff = parseToronto(str(v["swag.cutoff"], SWAG_DEFAULTS["swag.cutoff"]));
  if (!Number.isFinite(cutoff)) cutoff = parseToronto(SWAG_DEFAULTS["swag.cutoff"]);
  let announce = parseToronto(str(v["swag.announce"], SWAG_DEFAULTS["swag.announce"]));
  if (!Number.isFinite(announce)) announce = parseToronto(SWAG_DEFAULTS["swag.announce"]);
  const enabled = bool(v["swag.enabled"], SWAG_DEFAULTS["swag.enabled"]);
  const s = { enabled, kits, cutoff, announce, title: str(v["swag.title"], SWAG_DEFAULTS["swag.title"]) };
  const rulesRaw = str(v["swag.rules"], SWAG_DEFAULT_RULES);
  const stage = !enabled ? "off" : now >= announce ? "announced" : now >= cutoff ? "closed" : "open";
  return { ...s, rulesRaw, rules: fillSwagText(rulesRaw, s), stage, ...labels(s) };
}

const labels = (s) => ({ cutoffLabel: swagWhen(s.cutoff), cutoffShort: swagShort(s.cutoff), announceLabel: swagWhen(s.announce) });

/**
 * GET /api/app/swag → the same shape as swagFrom(): { enabled, kits, cutoff, announce, title, rules, stage, cutoffLabel,
 * cutoffShort, announceLabel, announced }. stage: "off" when it's switched off, else the server's phase
 * (open | closed | announced). null when the answer isn't usable.
 */
export function swagFromApi(r) {
  if (!r || typeof r !== "object" || typeof r.enabled !== "boolean") return null;
  const fallback = swagFrom({});
  const cutoff = parseToronto(r.cutoff);
  const announce = parseToronto(r.announce);
  const s = {
    enabled: r.enabled,
    kits: Number(r.kits) > 0 ? Math.round(Number(r.kits)) : fallback.kits,
    cutoff: Number.isFinite(cutoff) ? cutoff : fallback.cutoff,
    announce: Number.isFinite(announce) ? announce : fallback.announce,
    title: str(r.title, fallback.title),
  };
  const phase = ["open", "closed", "announced"].includes(r.phase) ? r.phase : "open";
  return {
    ...s, ...labels(s),
    ...(str(r.cutoffLabel, "") ? { cutoffLabel: r.cutoffLabel.trim() } : {}),
    ...(str(r.cutoffShort, "") ? { cutoffShort: r.cutoffShort.trim() } : {}),
    ...(str(r.announceLabel, "") ? { announceLabel: r.announceLabel.trim() } : {}),
    rules: str(r.rules, fillSwagText(SWAG_DEFAULT_RULES, s)),
    stage: r.enabled ? phase : "off",
    announced: !!r.announced,
  };
}

/** The public settings, worked out by the server: GET {api}/app/swag (no auth). Resolves to swagFromApi() or null. */
export async function fetchSwag(api) {
  try {
    const res = await fetch(`${api}/app/swag`, { credentials: "omit" });
    return res.ok ? swagFromApi(await res.json()) : null;
  } catch { return null; }
}

/** The three "how to win" lines (the /swag page and the app invite email use the same words). */
export function swagHowTo(s) {
  return [
    "Get the TTFC app on your phone and sign in with your pass.",
    "Earn points by connecting, saving sessions, posting and taking part in polls and Q&A.",
    `The top ${s.kits} on the leaderboard at ${s.cutoffLabel || swagWhen(s.cutoff)} each win a kit.`,
  ];
}

/** The Points banner's line: "Top 3 at Oct 27, 3 PM win" / "Winners announced — check your notifications". */
export function swagBannerLine(s) {
  if (s.stage === "announced") return "Winners announced — check your notifications";
  if (s.stage === "closed") return `Points are in. Winners at ${swagShort(s.announce)}`;
  return `Top ${s.kits} at ${s.cutoffShort || swagShort(s.cutoff)} win`;
}
