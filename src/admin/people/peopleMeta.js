/* =========================================================
   Admin → People: labels and colours shared by the directory,
   the profile and the RSVP editor. The server decides every
   status (backend services/people.js and services/rsvpStaff.js);
   this file only names them.
========================================================= */
import { PERSON_TYPES, TYPE_FILTER_OPTIONS, TYPE_LABELS, TYPE_TONE, VIP_LABEL, VIP_TONE } from "../app/personTypes";

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

/** The Pass Type filter: the four passes, the only ones there are (Speaker and Exhibitor are types). */
export const PASS_TIERS = [
  { key: "connect", label: "Connect" },
  { key: "influence", label: "Influence" },
  { key: "power", label: "Power" },
  { key: "apex", label: "Apex" },
];

/** Ticket Value After Payment: what they paid for the pass after promo codes, before HST (server: services/people.js). */
export const VALUE_BANDS = [
  { key: "below", label: "Below 100 CAD" },
  { key: "above", label: "Above 100 CAD" },
];
export const VALUE_BAND_LABELS = { below: "Below 100 CAD", above: "Above 100 CAD", unknown: "Not known", none: "No pass" };
export const VALUE_BAND_HINTS = {
  below: "Paid less than 100 CAD for the pass after promo codes, before HST. Complimentary, issued and speakers' passes count as 0, unless management typed what was paid outside Stripe.",
  above: "Paid 100 CAD or more for the pass after promo codes, before HST.",
  unknown: "A bought pass we couldn't find in Stripe, so the amount isn't known. Management can type what was paid by invoice or bank transfer.",
  none: "No pass on file",
};
export const VALUE_BAND_TONE = { below: "orange", above: "good", unknown: "neutral", none: "neutral" };

export const RSVP_STATUSES = ["attendee", "staff", "none"];
export const RSVP_STATUS_LABELS = { attendee: "Confirmed by Individual", staff: "Confirmed by Staff", none: "Unconfirmed" };
export const RSVP_STATUS_TONE = { none: "neutral", attendee: "good", staff: "purple" };

/** What "RSVP Email Sent" counts (the server works it out from these records). */
export const RSVP_EMAIL_HINT = "Yes when an email with their RSVP link went to them: their speaker's, issued or exhibitor's pass email with the RSVP button, a speaker reminder, or an RSVP reminder. Bulk campaigns aren't counted. Staff can mark it Yes or No by hand on the profile.";

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
