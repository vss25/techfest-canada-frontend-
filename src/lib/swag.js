/* =========================================================
   The TTFC 2026 leaderboard: appreciation, not a prize (Oct 27
   2026, the organiser: the top 3 do NOT get a swag kit; kits go
   to every attendee who tags TTFC on LinkedIn or Instagram. The
   leaderboard is "appreciation for starting conversations and
   meeting people"). Nothing for this feature says win, winners,
   prize or swag kit, or shows the kit's photo (the test in
   swag.test.mjs greps the web app for it).
   The settings (Admin › Website & app › Top networkers; GET
   /api/app/content, public): swag.celebrate (on: at swag.announce
   the app celebrates the top swag.kits networkers), swag.title,
   swag.rules (the appreciation text, {kits} {cutoff} {announce}
   filled in), swag.cutoff, and swag.enabled, which is now only the
   OLD apps' prize banner and stays OFF. The public GET
   /api/app/swag works them out (phase open | closed | announced,
   celebrate (missing = true), mode "appreciation", and the top
   networkers once announced): swagFromApi() reads it; swagFrom()
   works the same out from the raw settings (the fallback while it
   loads, and the admin page's preview); networkersView() says what
   the web app and the website show at a given time.
   Read by the website's /swag page ("How the leaderboard works"),
   the web app's Points banner, feed card and top networkers card.
   Same date words as the server ("5:00 PM on Tuesday, October 27").
   Pure, no imports: node --test src/lib/swag.test.mjs.
========================================================= */

export const SWAG_PAGE = "/swag";
export const SWAG_URL = "https://www.thetechfestival.com/swag";

export const NETWORKERS_TITLE = "Top networkers of TTFC 2026";
/** The card once they're announced (Points), and the Home feed's headline (everyone / the person themselves). */
export const NETWORKERS_CARD_TITLE = "TTFC 2026 top networkers";
export const NETWORKERS_HOME_TITLE = "Our top networkers are in";
export const NETWORKERS_HOME_TITLE_ME = "You're one of TTFC's top networkers!";
export const NETWORKERS_THANKS_ME = "You've been one of the best networkers at TTFC 2026! People like you make the TTFC experience great. Thank you for starting conversations and meeting people.";
export const NETWORKERS_THANKS_ALL = "Thank you to everyone who started conversations and met people at TTFC 2026.";
export const LEADERBOARD_PAGE_TITLE = "How the leaderboard works";

export const SWAG_DEFAULT_RULES =
  "The TTFC 2026 leaderboard is our appreciation for starting conversations and meeting people. You earn points in the " +
  "TTFC app by connecting with people, chatting, scanning badges, saving sessions, posting and taking part in polls and " +
  "Q&A. At {announce} we'll celebrate the top {kits} networkers in the app. To appear on the leaderboard, keep " +
  "\u201cShow me on the leaderboard\u201d on in the app.";

export const SWAG_DEFAULTS = Object.freeze({
  "swag.enabled": false,
  "swag.celebrate": true,
  "swag.kits": 3,
  "swag.cutoff": "2026-10-27T17:00:00-04:00",
  "swag.announce": "2026-10-27T17:00:00-04:00",
  "swag.title": NETWORKERS_TITLE,
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
 * { enabled, celebrate, kits, cutoff (ms), announce (ms), title, rules (filled in), rulesRaw, stage, phase }
 * stage (the old prize banner's, off while swag.enabled is off): "off" | "open" | "closed" | "announced";
 * phase (the celebration's, by the clock): "open" | "closed" | "announced".
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
  const celebrate = bool(v["swag.celebrate"], SWAG_DEFAULTS["swag.celebrate"]);
  const s = { enabled, celebrate, kits, cutoff, announce, title: str(v["swag.title"], SWAG_DEFAULTS["swag.title"]) };
  const rulesRaw = str(v["swag.rules"], SWAG_DEFAULT_RULES);
  const phase = now >= announce ? "announced" : now >= cutoff ? "closed" : "open";
  return { ...s, rulesRaw, rules: fillSwagText(rulesRaw, s), stage: enabled ? phase : "off", phase, mode: "appreciation", ...labels(s), winners: [], announcedAt: announce };
}

const labels = (s) => ({ cutoffLabel: swagWhen(s.cutoff), cutoffShort: swagShort(s.cutoff), announceLabel: swagWhen(s.announce) });

/**
 * The winners GET /api/app/swag sends once they're announced (Oct 26 2026): [{ rank, name, organization, avatarUrl,
 * points, userId }], in rank order, without nameless or repeated people. Anything else → [].
 */
export function swagWinnersFrom(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  list.forEach((w, i) => {
    if (!w || typeof w !== "object") return;
    const name = str(w.name, "");
    const userId = str(String(w.userId ?? w.id ?? w.user?.id ?? ""), "");
    if (!name || (userId && seen.has(userId))) return;
    if (userId) seen.add(userId);
    const rank = Math.round(Number(w.rank));
    out.push({
      rank: Number.isFinite(rank) && rank > 0 ? rank : i + 1,
      name,
      organization: str(w.organization ?? w.organisation ?? w.company, ""),
      avatarUrl: str(w.avatarUrl ?? w.user?.avatarUrl, ""),
      points: Number.isFinite(Number(w.points)) ? Math.round(Number(w.points)) : 0,
      userId,
    });
  });
  return out.sort((a, b) => a.rank - b.rank);
}

/**
 * GET /api/app/swag → the same shape as swagFrom(): { enabled, celebrate, kits, cutoff, announce, title, rules, stage,
 * phase, mode, cutoffLabel, cutoffShort, announceLabel, announced, winners, announcedAt }. phase: the server's (open |
 * closed | announced); stage: "off" while the old prize banner (enabled) is off, else the phase. celebrate: missing =
 * true. `winners` (the top networkers, once announced) see swagWinnersFrom(); `announcedAt` (ms) is when they were
 * shown (`announcedAt`, or `announced.at`), else the announce time. null when the answer isn't usable.
 */
export function swagFromApi(r) {
  if (!r || typeof r !== "object" || (typeof r.enabled !== "boolean" && typeof r.celebrate !== "boolean" && !r.phase)) return null;
  const fallback = swagFrom({});
  const cutoff = parseToronto(r.cutoff);
  const announce = parseToronto(r.announce);
  const s = {
    enabled: r.enabled === true,
    celebrate: r.celebrate !== false,
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
    stage: r.enabled === true ? phase : "off",
    phase,
    mode: str(r.mode, "appreciation"),
    announced: !!r.announced,
    winners: phase === "announced" ? swagWinnersFrom(r.winners) : [],
    announcedAt: (() => { const t = parseToronto(r.announcedAt ?? r.announced?.at); return Number.isFinite(t) ? t : s.announce; })(),
  };
}

/** The public settings, worked out by the server: GET {api}/app/swag (no auth). Resolves to swagFromApi() or null. */
export async function fetchSwag(api) {
  try {
    const res = await fetch(`${api}/app/swag`, { credentials: "omit" });
    return res.ok ? swagFromApi(await res.json()) : null;
  } catch { return null; }
}

/**
 * What to show at `now` (ms) for the top networkers: { on (celebrate), before (the celebration is still to come),
 * announced (it's time, or the server says so), winners (the top networkers, once the server sends them), title, kits,
 * announceLabel, line ("Start conversations and meet people. At 5:00 PM on Tuesday, October 27 we'll celebrate the
 * top 3 networkers.") }. `s`: swagFromApi() or swagFrom().
 */
export function networkersView(s, now = Date.now()) {
  const x = s || swagFrom({}, now);
  const announced = x.phase === "announced" || (Number.isFinite(x.announce) && now >= x.announce);
  const on = x.celebrate !== false;
  const announceLabel = x.announceLabel || swagWhen(x.announce);
  return {
    on, before: on && !announced, announced: on && announced,
    winners: on && x.phase === "announced" && Array.isArray(x.winners) ? x.winners : [],
    title: x.title || NETWORKERS_TITLE, kits: x.kits, announceLabel, announcedAt: x.announcedAt,
    line: `Start conversations and meet people. At ${announceLabel} we'll celebrate the top ${x.kits} networkers.`,
  };
}

/** The three "how the leaderboard works" lines (the website's /swag page). */
export function leaderboardHowTo(s) {
  return [
    "Start conversations and meet people in the TTFC app: connect, chat, scan badges and join polls and Q&A.",
    "Each conversation and connection earns points. You appear on the leaderboard while \u201cShow me on the leaderboard\u201d is on.",
    `The top ${s.kits} networkers are celebrated in the app as our thank-you, and every conversation helps make TTFC better.`,
  ];
}
