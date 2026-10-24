/* =========================================================
   Admin → People: labels and colours shared by the directory,
   the profile and the RSVP editor. The server decides every
   status (backend services/people.js and services/rsvpStaff.js);
   this file only names them.
========================================================= */
import { PERSON_TYPES, TYPE_FILTER_OPTIONS, TYPE_LABELS, TYPE_TONE, VIP_LABEL, VIP_TONE } from "../app/personTypes.js";

export { PERSON_TYPES, TYPE_FILTER_OPTIONS, TYPE_LABELS, TYPE_TONE, VIP_LABEL, VIP_TONE };

export const PASS_STATUSES = ["paid", "complimentary", "issued", "pending", "refunded", "none"];
export const PASS_STATUS_LABELS = {
  paid: "Paid",
  complimentary: "Complimentary",
  issued: "Issued, not claimed",
  pending: "Pending",
  refunded: "Refunded",
  none: "No pass",
};
export const PASS_STATUS_HINTS = {
  paid: "Bought through the website checkout (a promo code may have lowered the price)",
  complimentary: "A pass staff made (complimentary, speaker, issued or exhibitor) that's been claimed in the app or checked in",
  issued: "A pass staff made and sent, not claimed in the app yet",
  pending: "A pass staff made whose email hasn't been sent yet",
  refunded: "Stripe shows the payment refunded in full",
  none: "No ticket or pass on file",
};
export const PASS_STATUS_TONE = { paid: "good", complimentary: "purple", issued: "orange", pending: "warn", refunded: "bad", none: "neutral" };

/** The Pass Type filter and the pass change: the four passes on sale and the internal Speaker Pass
    (Oct 19 2026: never sold or listed; Power + both CxO Breakfasts + the VIP Lounge). Exhibitors hold
    Connect Passes; being an exhibitor is their type. */
export const PASS_TIERS = [
  { key: "connect", label: "Connect" },
  { key: "influence", label: "Influence" },
  { key: "power", label: "Power" },
  { key: "apex", label: "Apex" },
  { key: "speaker", label: "Speaker (internal)" },
];
/** "Connect Pass", "Speaker Pass": a tier's pass name. */
export const passName = (key) => (key === "speaker" ? "Speaker Pass" : `${PASS_TIERS.find((x) => x.key === key)?.label || "—"} Pass`);

/** The meals and events staff can add to (or take off) one pass, each Automatic / Yes / No (backend
    services/passExtras.js, same keys and order). `auto`: who gets it on Automatic (Media = Yes since Oct 23 2026:
    a Power Pass's extras plus the CxO Breakfasts, on any pass). */
export const EXTRAS = [
  { key: "cxo", label: "CxO Breakfasts", short: "CxO", auto: "Apex and Speaker Passes, and speakers, VIPs and Media on any pass" },
  { key: "lunch", label: "Networking Luncheons", short: "Lunch", auto: "Influence, Power, Apex and Speaker Passes, and Media on any pass" },
  { key: "gala", label: "Gala Dinner & Networking Reception", short: "Gala", auto: "Power, Apex and Speaker Passes, and Media on any pass" },
  { key: "awards", label: "Catalyst Awards Night", short: "Awards", auto: "Power, Apex and Speaker Passes, and Media on any pass" },
];
/** A pass's extras from the server ({ cxo: { override, auto, included }, … }), or only the CxO Breakfasts
    from an older server (cxoBreakfast / cxoOverride / cxoAuto). */
export const passExtras = (t) => t?.extras || (t ? { cxo: { override: t.cxoOverride ?? null, auto: !!t.cxoAuto, included: !!t.cxoBreakfast } } : {});
/** For the directory's badge: what the pass includes ("+" = added by staff) and what staff took off. */
export function extrasSummary(extras = {}) {
  const on = [];
  const off = [];
  const notes = [];
  for (const x of EXTRAS) {
    const e = extras[x.key];
    if (!e) continue;
    const set = typeof e.override === "boolean";
    if (e.included) on.push({ key: x.key, text: `${set && !e.auto ? "+" : ""}${x.short}` });
    else if (set && e.auto) off.push({ key: x.key, text: x.short });
    notes.push(`${x.label}: ${e.included ? "Yes" : "No"}${set ? " (set by staff)" : " (automatic)"}`);
  }
  return { on, off, edited: Object.values(extras).some((e) => typeof e?.override === "boolean"), title: notes.join("\n") };
}

/** Ticket Value After Payment: what they paid for the pass after promo codes, before HST (server: services/people.js). */
export const VALUE_BANDS = [
  { key: "below", label: "Below 100 CAD" },
  { key: "above", label: "Above 100 CAD" },
];
export const VALUE_BAND_LABELS = { below: "Below 100 CAD", above: "Above 100 CAD", unknown: "Not known", none: "No pass" };
export const VALUE_BAND_HINTS = {
  below: "Paid less than 100 CAD for the pass after promo codes, before HST. Complimentary, issued and Speaker Passes count as 0, unless management typed what was paid outside Stripe.",
  above: "Paid 100 CAD or more for the pass after promo codes, before HST.",
  unknown: "A bought pass we couldn't find in Stripe, so the amount isn't known. Management can type what was paid by invoice or bank transfer.",
  none: "No pass on file",
};
export const VALUE_BAND_TONE = { below: "orange", above: "good", unknown: "neutral", none: "neutral" };

export const RSVP_STATUSES = ["attendee", "staff", "none"];
export const RSVP_STATUS_LABELS = { attendee: "Confirmed by Individual", staff: "Confirmed by Staff", none: "Unconfirmed" };
export const RSVP_STATUS_TONE = { none: "neutral", attendee: "good", staff: "purple" };

/** What "RSVP Email Sent" counts (the server works it out from these records). */
export const RSVP_EMAIL_HINT = "Yes when an email with their RSVP link went to them: their Speaker Pass, issued or exhibitor pass email with the RSVP button, a speaker reminder, or an RSVP reminder. Bulk campaigns aren't counted. Staff can mark it Yes or No by hand on the profile. Opened / not opened: RSVP reminders sent from Oct 19, and pass emails sent then without a cc (a cc'd copy would count as theirs).";

export const DAY_SHORT = { day1: "Day 1", day2: "Day 2" };

/** Where a person's profile lives. Ids look like "u-<id>", "a-<id>", "s-<id>", "r-<id>". */
export const personPath = (id) => `/admin/people/${encodeURIComponent(id)}`;

/** Initials for a company with no logo. */
export const companyInitials = (name = "") => {
  const w = String(name).replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase() || "?";
};

/** "Oct 18" */
export const shortDate = (d) => (d ? new Date(d).toLocaleDateString([], { month: "short", day: "numeric" }) : "");

/** The "I'm attending" email per person (backend services/attendingNudge.js): status → label and colour. */
export const ATTENDING_LABELS = { none: "Not sent", sent: "Sent", failed: "Failed", sending: "Unconfirmed" };
export const ATTENDING_TONE = { none: "neutral", sent: "good", failed: "bad", sending: "warn" };
export const ATTENDING_HINT = "The \"I'm attending\" email (Marketing's LinkedIn campaign) or a LinkedIn nudge from here went to one of their addresses. For emails sent from Oct 19 we also see whether they opened it, opened their page and posted on LinkedIn.";
export const nudgeCount = (n) => (n > 0 ? `${n} ${n === 1 ? "nudge" : "nudges"}` : "");

/* What they did with it (backend services/engagement.js): the furthest step, best first. Only a post made
   with "Post to LinkedIn" is confirmed; a phone's share sheet can't say which app it went to. */
export const ATTENDING_STAGE_LABELS = {
  posted: "Posted on LinkedIn",
  shared: "Shared from phone",
  manual: "Opened LinkedIn",
  visited: "Opened the page",
  opened: "Opened the email",
};
export const ATTENDING_STAGE_TONE = { posted: "good", shared: "purple", manual: "purple", visited: "orange", opened: "neutral" };
export const ATTENDING_STAGE_HINTS = {
  posted: "Posted with “Post to LinkedIn”. LinkedIn confirmed it.",
  shared: "Their phone's share sheet finished. It can't tell us the app was LinkedIn, so the post isn't confirmed.",
  manual: "They downloaded the image and opened LinkedIn. We can't see whether they posted.",
  visited: "They opened their page from the email, and haven't posted yet.",
  opened: "Their mail app loaded the email's images.",
};

/** The I'm Attending filter: the email's status, then what they did with it. */
export const ATTENDING_FILTER_OPTIONS = [
  { key: "yes", label: "Email sent" },
  { key: "no", label: "Email not sent" },
  { key: "opened", label: "Opened the email" },
  { key: "noPost", label: "Opened, didn't post" },
  { key: "visited", label: "Opened the page" },
  { key: "maybe", label: "Shared or opened LinkedIn (not confirmed)" },
  { key: "posted", label: "Posted on LinkedIn" },
];
/** RSVP Email Sent?: yes / no as before, and whether one with the open pixel was opened. */
export const RSVP_EMAIL_FILTER_OPTIONS = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "opened", label: "Yes, opened" },
  { key: "unopened", label: "Yes, not opened" },
];
/** RSVP Status: the three statuses, and people who opened the form but haven't sent their RSVP. */
export const RSVP_FORM_FILTER = { key: "form", label: "Opened the form, didn't submit" };

export const OPENS_NOTE = "Opens are estimates: some mail apps (e.g. Apple Mail) load images automatically, others block them.";
export const TRACKED_FROM = "Opens, clicks and posts count for emails sent from Oct 19. RSVP form opens count for every RSVP link.";
/** "3 times" ("" for none or once). */
export const times = (n) => (n > 1 ? `${n.toLocaleString()} times` : "");

/* Hide from app (shadow mode, Oct 21 2026; HideFromApp.jsx). */
export const HIDDEN_LABEL = "Hidden from app";
export const HIDDEN_HINT = "Hidden from the app by staff: nobody else in the app sees them or anything they do. They haven't been told.";
export const HIDDEN_CONTENT_HINT = "Written by someone hidden from the app: nobody else in the app sees it.";

/** "Feed posts 3 · Chat messages 1" from the server's while-hidden counts and labels (GET …/app-hidden, appHide). */
export function whileHiddenText(counts, labels = {}) {
  if (!counts) return "";
  return Object.entries(labels).filter(([k]) => counts[k] > 0).map(([k, label]) => `${label} ${counts[k]}`).join(" · ");
}
