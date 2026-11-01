/* =========================================================
   Catalyst Awards winners (Oct 31 2026): the server calls and the
   words, in one place (backend routes/awards.js):
     GET  {API}/awards/winners      → { live, awardsNight, event, venue, page, winners: [{ id, award, company,
          presentedTo, showCompany, presentedOn, citation, pillar, sector, special, individual, website }] }
     GET  {API}/awards/winners/:id  → { winner, event, venue, page } | 404
     POST {API}/awards/post { id, image, text } → { id }   (the certificate + the post, 30 minutes)
     then the page goes to {API}/awards/linkedin/post?d=<draft id>&w=<winner id> (LinkedIn sign-in → Posts API with
     The Tech Festival Canada's page tagged → back to /awards/winners/<id>#posted=1&post=<URL>, or #post_error=<code>;
     `w` brings them back to this winner even when the draft is gone)
   Who and what shows: Admin › Catalyst Awards › Winners; the switch: site.award_winners.
========================================================= */

import { API } from "./forms";

export const EVENT = "The Tech Festival Canada 2026";
export const VENUE = "The Westin Harbour Castle, Toronto";
export const PAGE_NAME = "The Tech Festival Canada";
export const HASHTAGS = "#TTFC2026 #CatalystAwards";
export const POST_MAX = 3000;

export const isWinnerId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

async function json(res) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error || j.message || `Request failed (${res.status})`), { status: res.status, code: j.code || "" });
  return j;
}

let listPromise = null;
/** The public list (one request per page load). */
export function loadWinners({ fresh = false } = {}) {
  if (!listPromise || fresh) {
    listPromise = fetch(`${API}/awards/winners`, { credentials: "omit" }).then(json).catch((e) => { listPromise = null; throw e; });
  }
  return listPromise;
}

export async function loadWinner(id) {
  if (!isWinnerId(id)) throw Object.assign(new Error("We couldn't find that award."), { status: 404, code: "not_found" });
  return json(await fetch(`${API}/awards/winners/${id.toLowerCase()}`, { credentials: "omit" }));
}

/** Keeps the certificate and the text, then → the address that starts LinkedIn's sign-in. */
export async function startAwardPost(id, image, text) {
  const r = await json(await fetch(`${API}/awards/post`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify({ id, image, text }),
  }));
  return { redirect: `${API}/awards/linkedin/post?d=${encodeURIComponent(r.id)}&w=${encodeURIComponent(String(id).toLowerCase())}` };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-26" → "26 October 2026". */
export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : "";
}

/** "Riley Example, Example Robotics" or "Northwind Health AI". */
export const recipientLine = (w) => (w.showCompany ? `${w.presentedTo}, ${w.company}` : w.presentedTo);

/* The post, written for them and editable. "The Tech Festival Canada" in it becomes the tag of TTFC's LinkedIn page
   (the backend tags its first mention; without one the tag goes on its own line at the end). */
export const VOICES = [
  { key: "winner", label: "We won" },
  { key: "congrats", label: "Congratulate them" },
];

export function postText(w, voice = "winner") {
  if (!w) return "";
  const thanks = "Thank you to the jury, the TTFC team and everyone who made the two days at The Westin Harbour Castle so memorable.";
  if (voice === "congrats") {
    const who = w.showCompany ? `${w.presentedTo} (${w.company})` : w.presentedTo;
    return `Congratulations to ${who} on winning ${w.award} at The Tech Festival Canada 2026 in Toronto!\n\n${HASHTAGS}`;
  }
  const lead = w.individual
    ? `Honoured to receive ${w.award} at The Tech Festival Canada 2026 in Toronto.`
    : `Proud to share that ${w.company || w.presentedTo} received ${w.award} at The Tech Festival Canada 2026 in Toronto.`;
  return `${lead}\n\n${thanks}\n\n${HASHTAGS}`;
}

// Letters NFKD doesn't split into a plain letter and an accent (Łukasz would lose its Ł).
const PLAIN = { Ł: "L", ł: "l", Ø: "O", ø: "o", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ß: "ss", Æ: "AE", æ: "ae", Œ: "OE", œ: "oe", Þ: "Th", þ: "th", ı: "i" };

/** "TTFC-2026-Catalyst-Award-Riley-Example" (no extension), in plain letters: "Łukasz Żółkiewski" → "Lukasz-Zolkiewski". */
export function fileBase(w) {
  const name = String(w?.presentedTo || "Winner").replace(/[ŁłØøĐđĦħßÆæŒœÞþı]/g, (c) => PLAIN[c]).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `TTFC-2026-Catalyst-Award-${name || "Winner"}`;
}

/** A short reference printed on the certificate: "TTFC26-CA-E398". */
export const certificateRef = (w) => `TTFC26-CA-${String(w?.id || "").slice(-4).toUpperCase() || "0000"}`;

/** What an embedded winner page (/awards/winners/<id>?embed=1) sends the page around it on Escape: close me. */
export const AWARD_CLOSE_MESSAGE = "ttfc-award-close";

/** The winner's page on the website (what the apps open, and what's shared). */
export const winnerUrl = (id) => `https://www.thetechfestival.com/awards/winners/${String(id || "").toLowerCase()}`;
