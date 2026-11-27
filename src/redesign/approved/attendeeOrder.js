// The same rule as liveShared.js EMAIL_RE (kept here so this file runs in plain Node for its test).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The ticket panel's attendee answers (AttendeeForm.jsx) → the checkout request. Pure. Nov 27 2026. */

const EMPTY = { first: "", last: "", email: "", company: "", title: "" };
const blank = () => ({ ...EMPTY });

export function emptyDraft(count) {
  return { forMe: true, buyer: { first: "", last: "", email: "" }, people: Array.from({ length: count }, blank) };
}

export function padded(draft, count) {
  const d = draft || emptyDraft(count);
  const people = d.people.slice(0, count);
  while (people.length < count) people.push(blank());
  return { ...d, people };
}

export const personMissing = (p) => !String(p.first || "").trim() || !String(p.last || "").trim() || !EMAIL_RE.test(String(p.email || "").trim());

/** draft + the order's ticket types (one per ticket) → { attendees, booker } for multiCheckout, or { error }. */
export function orderFrom(draft, types) {
  const d = padded(draft, types.length);
  const bad = d.people.findIndex(personMissing);
  if (bad >= 0) return { error: `Ticket ${bad + 1}: add a first name, last name and email`, at: bad };
  if (!d.forMe && personMissing(d.buyer)) return { error: "Add your own name and email for the receipt", at: "buyer" };
  const attendees = d.people.map((p, i) => ({
    firstName: p.first.trim(), lastName: p.last.trim(), email: p.email.trim(), ticketTypeId: types[i].id,
    ...(p.company.trim() ? { company: p.company.trim() } : {}), ...(p.title.trim() ? { title: p.title.trim() } : {}),
  }));
  const b = d.forMe ? d.people[0] : d.buyer;
  return { attendees, booker: { name: `${b.first.trim()} ${b.last.trim()}`, email: b.email.trim() } };
}

