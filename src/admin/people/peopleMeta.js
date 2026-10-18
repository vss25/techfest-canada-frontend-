/* =========================================================
   Admin → People: labels and colours shared by the directory,
   the profile and the RSVP editor. The server decides every
   status (backend services/people.js and services/rsvpStaff.js);
   this file only names them.
========================================================= */
import { PERSON_TYPES, TYPE_LABELS, TYPE_TONE } from "../app/personTypes";

export { PERSON_TYPES, TYPE_LABELS, TYPE_TONE };

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

export const PASS_TIERS = [
  { key: "connect", label: "Connect Pass" },
  { key: "influence", label: "Influence Pass" },
  { key: "power", label: "Power Pass" },
  { key: "apex", label: "Apex Pass" },
  { key: "speaker", label: "Speaker Pass" },
];

export const RSVP_STATUSES = ["none", "attendee", "staff"];
export const RSVP_STATUS_LABELS = { none: "Not yet", attendee: "RSVP'd by attendee", staff: "Set by staff" };
export const RSVP_STATUS_TONE = { none: "neutral", attendee: "good", staff: "purple" };

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
