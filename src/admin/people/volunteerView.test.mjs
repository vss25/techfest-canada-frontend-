// People for volunteer accounts (volunteerView.js): only the allowed fields are ever read, whatever the server
// sends, and the list asks only for the allowed filters. Run: node --test src/admin/people/volunteerView.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  MEAL_KEYS, VOLUNTEER_COLUMNS, VOLUNTEER_FILTER_KEYS, VOLUNTEER_SORTS, arrivalOf, clock, inclusionsOf, volunteerProfile, volunteerQuery, volunteerRow,
} from "./volunteerView.js";

/* What a staff member's answer looks like (fake person): everything a volunteer must never see is in it. */
const SECRETS = ["jane.doe@example.com", "jane@private.example", "+1 416 555 0199", "linkedin.com/in/janedoe", "TTFC-AB12CD", "SPRING20", "cs_test_123",
  "349.00", "Invoice 1042", "staff note: difficult", "marked by staff", "opened the email", "nicole@thetechfestival.com"];
const pass = {
  ticketId: "TTFC-AB12CD", label: "Power Pass", tier: "power", tierLabel: "Power", status: "paid", statusLabel: "Paid", key: "u:1:TTFC-AB12CD",
  code: { kind: "code", code: "SPRING20", discount: "20% off", label: "SPRING20 · 20% off" }, valueBand: "above", valueSource: "stripe",
  value: 349.0, manualValue: 349.0, manualValueNote: "Invoice 1042", manualValueBy: "nicole@thetechfestival.com", stripeSessionId: "cs_test_123",
  promoCode: "SPRING20", purchaseDate: "2026-10-01T10:00:00Z", checkedIn: true, checkedInAt: "2026-10-26T12:05:00Z", booth: "B12",
  extras: { cxo: { override: true, auto: false, included: true }, lunch: { override: null, auto: true, included: true }, gala: { override: false, auto: true, included: false }, awards: { included: true } },
};
const staffRow = {
  id: "u-1", kind: "account", name: "Jane Doe", email: "jane.doe@example.com", types: ["speaker", "exhibitor"], company: "Acme Robotics", jobTitle: "CTO",
  logoUrl: "https://cdn.example.com/acme.png", logoFrom: "company", pass, passStatus: "paid", passStatusLabel: "Paid", passCount: 2,
  rsvp: { status: "attendee", at: "2026-10-20T10:00:00Z", days: ["day1", "day2"], id: "r1" }, rsvpDuplicates: 0,
  rsvpEmail: { sent: true, at: "2026-10-19T10:00:00Z", via: ["marked by staff"], mark: true, markedBy: "nicole@thetechfestival.com" },
  valueBand: "above", valueBandLabel: "Above 100 CAD", vip: true, media: false, band: { key: "vip", label: "VIP", passName: "Power Pass" },
  exhibitor: true, attending: { status: "sent", label: "Sent", sentAt: "2026-10-19T10:00:00Z", nudges: 2 },
  engagement: { attending: { stage: "opened", stageLabel: "opened the email" }, rsvp: { emailOpened: true } }, linkedinUrl: "https://linkedin.com/in/janedoe",
  hasAccount: true, userId: "1", photoUrl: "/api/files/avatar/1.jpg", suggestedDomain: "acme.example", appHidden: { at: "2026-10-21", byName: "staff note: difficult" },
};
const staffProfile = {
  canonicalId: "u-1",
  person: {
    ...staffRow, firstName: "Jane", lastName: "Doe", phone: "+1 416 555 0199",
    passes: [pass, { ...pass, ticketId: "TTFC-ZZ99", label: "Connect Pass", tier: "connect", status: "pending", checkedIn: false, checkedInAt: null, booth: "", hidden: false, extras: {} },
      { ...pass, ticketId: "TTFC-HIDDEN", hidden: true, label: "Apex Pass" }],
    account: { id: "1", role: "user", types: ["speaker"], typesOff: [] }, companyRecord: { updatedBy: "nicole@thetechfestival.com" },
    edit: { canEdit: true, reason: "staff note: difficult" }, appHidden: { reason: "staff note: difficult" }, speaker: { id: "s1", name: "Jane Doe" },
    specialEvents: [{ key: "gala", label: "Gala Dinner & Networking Reception", day: "Day 2", time: "5:30 PM" }],
    speakingSessions: [{ id: "x1", title: "Robots at work", day: 1, time: "14:05", stage: "Main Stage" }],
  },
  rsvp: {
    email: "jane@private.example", ticketId: "TTFC-AB12CD", code: "SPRING20", days: ["day1", "day2"], options: ["day1", "sessions_d1", "lunch_d1", "gala", "cxo_d2"],
    dietary: ["vegetarian", "nut_allergy", "other"], dietaryOther: "No sesame", hasAccessibility: true, accessibility: "Wheelchair user", userAgent: "x", page: "/rsvp",
    staffUpdatedBy: "nicole@thetechfestival.com",
  },
  outreach: { rsvpReminder: { canSend: true } }, contactCard: [{ kind: "email", value: "jane@private.example" }],
  appHide: { hidden: true, reason: "staff note: difficult" }, otherRsvps: [{ email: "jane@private.example" }],
};

const noSecrets = (out, label) => {
  const text = JSON.stringify(out);
  for (const s of SECRETS) assert.ok(!text.includes(s), `${label} leaks ${s}`);
};

test("a list row: name, marks, company, pass and Pending, inclusions, RSVP, arrival, exhibitor; nothing private", () => {
  const r = volunteerRow(staffRow);
  noSecrets(r, "row");
  assert.equal(r.name, "Jane Doe");
  assert.deepEqual(r.types, ["speaker", "exhibitor"]);
  assert.equal(r.vip, true);
  assert.equal(r.company, "Acme Robotics");
  assert.equal(r.jobTitle, "CTO");
  assert.equal(r.pass.label, "Power Pass");
  assert.equal(r.pass.pending, false);
  assert.deepEqual(r.pass.inclusions.map((x) => [x.key, x.included]), [["cxo", true], ["lunch", true], ["gala", false], ["awards", true]]);
  assert.deepEqual(r.rsvp, { status: "attendee", days: ["day1", "day2"] });
  assert.deepEqual(r.arrival, { known: true, checkedIn: true, at: "2026-10-26T12:05:00Z" });
  assert.equal(r.exhibitor, true);
  assert.equal(r.booth, "B12");
  for (const k of ["email", "linkedinUrl", "rsvpEmail", "attending", "engagement", "valueBand", "appHidden", "userId", "suggestedDomain"]) assert.ok(!(k in r), k);
  for (const k of ["ticketId", "code", "value", "valueBand", "valueSource", "status", "promoCode", "purchaseDate", "manualValue"]) assert.ok(!(k in r.pass), `pass.${k}`);
});

test("Pending is the only pass status a volunteer sees", () => {
  assert.equal(volunteerRow({ ...staffRow, passStatus: "pending", pass: { ...pass, status: "pending" } }).pass.pending, true);
  assert.equal(volunteerRow({ ...staffRow, passStatus: "pending", pass: { label: "Connect Pass" } }).pass.pending, true);
  for (const s of ["paid", "complimentary", "issued", "refunded"]) assert.equal(volunteerRow({ ...staffRow, passStatus: s, pass: { ...pass, status: s } }).pass.pending, false, s);
  assert.equal(volunteerRow({ id: "x", name: "No pass" }).pass, null);
});

test("a safe projection from the server (fields left out) still draws: unknown arrival, no RSVP, no inclusions", () => {
  const r = volunteerRow({ id: "a-2", name: "Sam", types: [], pass: { label: "Connect Pass", extras: { cxo: false, lunch: false, gala: false, awards: false } } });
  assert.equal(r.arrival.known, false);
  assert.equal(r.rsvp.status, "none");
  assert.deepEqual(r.pass.inclusions.map((x) => x.included), [false, false, false, false]);
  assert.equal(r.company, "");
  const p = volunteerProfile({ person: { id: "a-2", name: "Sam" } });
  assert.equal(p.name, "Sam");
  assert.deepEqual([p.passes, p.sessions, p.specialEvents, p.rsvp.meals, p.rsvp.dietary], [[], [], [], [], []]);
  assert.equal(p.rsvp.accessibility, false);
  assert.equal(volunteerProfile({}).name, "No name");
});

test("a profile: pass(es) and inclusions, RSVP days, meals, dietary, accessibility flag, arrival, booth, speaking", () => {
  const p = volunteerProfile(staffProfile);
  noSecrets(p, "profile");
  assert.ok(!JSON.stringify(p).includes("Wheelchair user"), "accessibility details stay with staff: only the flag");
  assert.deepEqual(p.passes.map((t) => [t.label, t.pending, t.checkedIn]), [["Power Pass", false, true], ["Connect Pass", true, false]]);
  assert.equal(p.passes.some((t) => t.label === "Apex Pass"), false, "passes hidden by staff stay hidden");
  assert.deepEqual(p.rsvp.days, ["day1", "day2"]);
  assert.deepEqual(p.rsvp.meals, ["Networking Luncheon (Day 1)", "Gala Dinner & Networking Reception (Day 2)", "CxO Breakfast (Day 2)"]);
  assert.deepEqual(p.rsvp.dietary, ["Vegetarian", "Nut allergy", "Other: No sesame"]);
  assert.equal(p.rsvp.accessibility, true);
  assert.equal(p.rsvp.status, "attendee");
  assert.deepEqual(p.arrival, { known: true, checkedIn: true, at: "2026-10-26T12:05:00Z" });
  assert.equal(p.booth, "B12");
  assert.equal(p.speaker, true);
  assert.deepEqual(p.sessions, [{ key: "x1", title: "Robots at work", day: "Day 1", time: "2:05 PM", stage: "Main Stage" }]);
  assert.deepEqual(p.specialEvents.map((e) => e.label), ["Gala Dinner & Networking Reception"]);
  for (const k of ["email", "phone", "linkedinUrl", "firstName", "lastName", "account", "edit", "companyRecord", "appHidden", "rsvpEmail", "attending", "engagement"]) {
    assert.ok(!(k in p), k);
  }
});

test("arrival: the first check-in of their passes; a person-level time counts too", () => {
  assert.deepEqual(arrivalOf({}, [{ checkedIn: true, checkedInAt: "2026-10-27T09:00:00Z" }, { checkedIn: true, checkedInAt: "2026-10-26T09:00:00Z" }]),
    { known: true, checkedIn: true, at: "2026-10-26T09:00:00Z" });
  assert.deepEqual(arrivalOf({ checkedIn: false }, []), { known: true, checkedIn: false, at: null });
  assert.deepEqual(arrivalOf({ arrival: { checkedIn: true, at: "2026-10-26T08:00:00Z" } }, []), { known: true, checkedIn: true, at: "2026-10-26T08:00:00Z" });
  assert.deepEqual(arrivalOf({}, []), { known: false, checkedIn: false, at: null });
});

test("the list asks only for the allowed filters and sorts, with normal paging (no page size = all)", () => {
  const q = volunteerQuery(new URLSearchParams("q=Jane&type=speaker&pass=power&rsvp=attendee&exhibitor=yes&vip=no&media=yes&value=above&code=SPRING20"
    + "&rsvpEmail=yes&attending=posted&appHidden=yes&size=all&limit=100000&export=1&sort=value&page=2"));
  assert.equal(q.toString(), "q=Jane&type=speaker&pass=power&rsvp=attendee&exhibitor=yes&vip=no&media=yes&page=2");
  assert.equal(volunteerQuery(new URLSearchParams("sort=company&dir=desc")).toString(), "sort=company&dir=desc&page=0");
  assert.equal(volunteerQuery(new URLSearchParams("rsvp=form&pass=gold&page=-3")).toString(), "page=0");
  assert.equal(volunteerQuery({ q: "  ", page: "abc" }).toString(), "page=0");
  assert.deepEqual(VOLUNTEER_FILTER_KEYS, ["type", "pass", "rsvp", "exhibitor", "vip", "media"]);
  assert.deepEqual(VOLUNTEER_SORTS, ["name", "type", "company", "pass", "rsvp", "exhibitor"]);
});

test("no financial or marketing columns for volunteers", () => {
  const keys = VOLUNTEER_COLUMNS.map((c) => c.key);
  assert.deepEqual(keys, ["name", "types", "company", "pass", "rsvp", "arrival", "exhibitor"]);
  for (const k of ["code", "value", "rsvpEmail", "attending", "email"]) assert.ok(!keys.includes(k), k);
});

test("inclusions: effective Yes / No from either shape; the meal keys; clock", () => {
  assert.deepEqual(inclusionsOf({ cxoBreakfast: true }).map((x) => x.included), [true, false, false, false]);
  assert.deepEqual(inclusionsOf({ inclusions: { cxo: true, gala: true } }).map((x) => x.included), [true, false, true, false]);
  assert.deepEqual(inclusionsOf(null), []);
  assert.ok(!MEAL_KEYS.includes("sessions_d1") && MEAL_KEYS.includes("lunch_d2"));
  assert.equal(clock("09:30"), "9:30 AM");
  assert.equal(clock("17:00"), "5:00 PM");
});
