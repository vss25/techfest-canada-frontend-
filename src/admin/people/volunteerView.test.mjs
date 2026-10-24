// People for volunteer accounts (volunteerView.js): only the allowed fields are ever read, whatever the server
// sends, emails and phone numbers typed into names are masked, and the list asks only for the allowed filters.
// The contract tests feed the projection the backend's real volunteer answers (volunteerApi.fixture.json, captured
// from services/volunteerPanel.js by volunteerApiFixture.capture.mjs), so a field the backend renames fails here.
// Run: node --test src/admin/people/volunteerView.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOLUNTEER_COLUMNS, VOLUNTEER_FILTER_KEYS, VOLUNTEER_SORTS, arrivalOf, clock, inclusionsOf, isListAnswer, isProfileAnswer, lookupAnswer, lookupResults,
  rsvpOf, sessionsOf, volunteerError, volunteerProfile, volunteerQuery, volunteerRequests, volunteerRow,
} from "./volunteerView.js";
import { maskName, maskText } from "./volunteerMask.js";
import { searchGroupsFor, volunteerRecents } from "../access.js";

const API = JSON.parse(fs.readFileSync(new URL("./volunteerApi.fixture.json", import.meta.url), "utf8"));

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
  assert.deepEqual([p.passes, p.sessions, p.rsvp.events, p.rsvp.dietary], [[], [], [], []]);
  assert.equal(p.rsvp.accessibility, false);
  assert.equal(volunteerProfile({}).name, "No name");
});

test("a staff-shaped answer: nothing private comes through, and only the backend's volunteer fields are read", () => {
  const p = volunteerProfile(staffProfile);
  noSecrets(p, "profile");
  assert.ok(!JSON.stringify(p).includes("Wheelchair user"), "accessibility details stay with staff: only the flag");
  assert.deepEqual(p.passes.map((t) => [t.label, t.pending, t.checkedIn]), [["Power Pass", false, true], ["Connect Pass", true, false]]);
  assert.equal(p.passes.some((t) => t.label === "Apex Pass"), false, "passes hidden by staff stay hidden");
  // The staff answer's top-level rsvp (email, ticket ID, code, the accessibility text) is never read.
  assert.deepEqual(p.rsvp, { status: "attendee", at: "2026-10-20T10:00:00Z", days: ["day1", "day2"], events: [], dietary: [], accessibility: false });
  assert.deepEqual(p.arrival, { known: true, checkedIn: true, at: "2026-10-26T12:05:00Z" });
  assert.equal(p.booth, "B12");
  assert.equal(p.speaker, true);
  for (const k of ["email", "phone", "linkedinUrl", "firstName", "lastName", "account", "edit", "companyRecord", "appHidden", "rsvpEmail", "attending", "engagement"]) {
    assert.ok(!(k in p), k);
  }
});

/* ---------- The contract: the backend's real volunteer answers (volunteerApi.fixture.json) ---------- */

const FIXTURE_SECRETS = ["mara.secret@example.com", "omar.guest@example.com", "yara.leak@example.com", "zed.private@example.net", "noname.staffer",
  "416 555 0199", "beefcafe0001", "c0ffee000002", "5pea4e000003", "acac56565656", "SECRETCODE20", "cs_test_secret", "849", "Wheelchair", "step-free"];
const noFixtureSecrets = (out, label) => {
  const text = JSON.stringify(out).toLowerCase();
  for (const s of FIXTURE_SECRETS) assert.ok(!text.includes(s.toLowerCase()), `${label} shows ${s}`);
};

test("contract: a guest's RSVP from the backend: days, special events and meals, dietary needs, accessibility flag", () => {
  const v = volunteerProfile(API.profiles.mara);
  noFixtureSecrets(v, "Mara");
  assert.equal(v.name, "Mara Delegate");
  assert.equal(v.company, "Example Bank");
  assert.equal(v.jobTitle, "Head of Digital");
  assert.equal(v.vip, true);
  assert.equal(v.rsvp.status, "attendee");
  assert.deepEqual(v.rsvp.days, ["day1", "day2"]);
  assert.deepEqual(v.rsvp.events.map((e) => [e.label, e.day, e.time]), [
    ["CxO Breakfast", "Day 1", "7:55 AM"], ["Networking Luncheon", "Day 1", "12:35 PM"], ["Catalyst Awards Night", "Day 1", "5:30 PM"],
    ["Gala Dinner & Networking Reception", "Day 2", "5:30 PM"],
  ]);
  assert.deepEqual(v.rsvp.dietary, ["Vegan", "Nut allergy", "Other: No mushrooms"]);
  assert.equal(v.rsvp.accessibility, true);
  assert.deepEqual(v.passes.map((t) => [t.label, t.pending]), [["Power Pass", false]]);
  assert.deepEqual(v.pass.inclusions.map((x) => [x.key, x.included]), [["cxo", true], ["lunch", true], ["gala", true], ["awards", true]]);
  assert.deepEqual(v.arrival, { known: true, checkedIn: true, at: "2026-10-26T12:00:00.000Z" });
  assert.equal(v.band.key, "vip");
});

test("contract: a speaker's sessions from the backend: day, start and end, format and role; Pending; booth", () => {
  const v = volunteerProfile(API.profiles.kai);
  noFixtureSecrets(v, "Kai");
  assert.equal(v.speaker, true);
  assert.deepEqual(v.sessions.map(({ key: _k, ...s }) => s), [
    { title: "Quantum Computing in Finance", day: "Day 1", time: "10:00 AM – 10:30 AM", format: "Panel", role: "Panellist" },
    { title: "Robots on the Factory Floor", day: "Day 2", time: "2:00 PM – 2:45 PM", format: "Keynote", role: "Speaker" },
  ]);
  assert.equal(new Set(v.sessions.map((s) => s.key)).size, 2);
  assert.equal(v.pass.pending, true);
  assert.equal(v.booth, "B7");
  assert.deepEqual(v.arrival, { known: true, checkedIn: false, at: null });
  assert.deepEqual([v.rsvp.events, v.rsvp.dietary, v.rsvp.accessibility], [[], [], false]);
});

test("contract: whatever the backend sends that the profile shows comes through (a renamed field fails here)", () => {
  for (const [who, answer] of Object.entries(API.profiles)) {
    const p = answer.person;
    const v = volunteerProfile(answer);
    noFixtureSecrets(v, who);
    assert.equal(v.id, p.id, who);
    assert.equal(v.rsvp.status, p.rsvp.status, `${who} rsvp.status`);
    assert.deepEqual(v.rsvp.days, p.rsvp.days, `${who} rsvp.days`);
    assert.equal(v.rsvp.events.length, p.rsvp.events.length, `${who} rsvp.events`);
    assert.equal(v.rsvp.dietary.length, p.rsvp.dietary.length, `${who} rsvp.dietary`);
    assert.equal(v.rsvp.accessibility, p.rsvp.accessibility, `${who} rsvp.accessibility`);
    assert.equal(v.sessions.length, p.sessions.length, `${who} sessions`);
    assert.equal(v.passes.length, p.passes.length, `${who} passes`);
    assert.equal(v.arrival.checkedIn, p.checkedIn, `${who} checkedIn`);
    assert.equal(v.booth, p.booth, `${who} booth`);
    for (const [i, t] of p.passes.entries()) {
      assert.deepEqual(Object.fromEntries(v.passes[i].inclusions.map((x) => [x.key, x.included])), t.extras, `${who} pass ${i} extras`);
      assert.equal(v.passes[i].pending, t.pending, `${who} pass ${i} pending`);
    }
  }
  // The list's rows too.
  for (const r of API.list.rows) {
    const v = volunteerRow(r);
    noFixtureSecrets(v, `row ${r.id}`);
    assert.equal(v.id, r.id);
    assert.equal(v.rsvp.status, r.rsvp.status);
    assert.deepEqual(v.rsvp.days, r.rsvp.days);
    assert.equal(v.arrival.known, true, `${r.id}: the backend always says whether they checked in`);
    assert.equal(v.arrival.checkedIn, r.checkedIn);
    assert.equal(v.passCount, r.passCount);
    assert.equal(!!v.pass, !!r.pass);
    if (r.pass) assert.deepEqual(Object.fromEntries(v.pass.inclusions.map((x) => [x.key, x.included])), r.pass.extras);
  }
  const mara = volunteerRow(API.list.rows.find((r) => r.name === "Mara Delegate"));
  assert.deepEqual(mara.arrival, { known: true, checkedIn: true, at: "2026-10-26T12:00:00.000Z" });
  assert.deepEqual(mara.rsvp, { status: "attendee", days: ["day1", "day2"] });
});

test("an email typed as a name, a staff account named after its email, a phone in the company: masked in rows, profiles and search", () => {
  const yaraRow = volunteerRow(API.list.rows.find((r) => r.id === API.profiles.yara.person.id));
  const yara = volunteerProfile(API.profiles.yara);
  for (const v of [yaraRow, yara]) {
    noFixtureSecrets(v, "Yara");
    assert.equal(v.name, "No name");
    assert.equal(v.company, "Call me (hidden)");
    assert.equal(v.jobTitle, "Founder (hidden)");
  }
  const staffer = volunteerRow(API.list.rows.find((r) => r.id === "u-64b000000000000000000004"));
  assert.equal(staffer.name, "No name");
  // The top bar's search and the list's exact look-up (POST /console/search, People results).
  for (const answer of Object.values(API.search)) {
    const groups = searchGroupsFor(answer.groups, { isVolunteer: true });
    noFixtureSecrets(groups, "search");
    noFixtureSecrets(lookupResults(answer), "look-up");
  }
  assert.deepEqual(lookupResults(API.search.nameIsEmail).map((r) => [r.name, r.link]), [["No name", "/admin/people/a-64b000000000000000000013"]]);
  assert.deepEqual(lookupResults(API.search.exactEmail).map((r) => [r.name, r.subtitle, r.badges]), [["Mara Delegate", "Head of Digital, Example Bank · Power Pass", ["VIP"]]]);
  assert.equal(searchGroupsFor(API.search.localPart.groups, { isVolunteer: true })[0].items[0].title, "No name");
  assert.deepEqual(volunteerRecents([{ link: "/admin/people/a-1", title: "yara.leak@example.com", subtitle: "Call 416 555 0199" }]),
    [{ link: "/admin/people/a-1", title: "No name", subtitle: "Call (hidden)" }]);
  // Only links into People, never a page or a ticket.
  assert.deepEqual(lookupResults({ groups: [{ key: "people", items: [{ type: "person", id: "x", title: "X Y", link: "/admin/inventory" }] },
    { key: "tickets", items: [{ type: "ticket", id: "t", title: "Power Pass", link: "/admin/people/u-1" }] }] }), []);
  assert.deepEqual(lookupResults(null), []);
});

test("masking: emails, an email's local part and long numbers go; real names, hyphens, accents and short numbers stay", () => {
  for (const s of ["yara.leak@example.com", "YARA.LEAK@EXAMPLE.COM", "noname.staffer", "mara_d", "jane+ttfc", "4165550199", "+1 (416) 555-0199", "someone@localhost", "", null, 42]) {
    assert.equal(maskName(s), "", String(s));
  }
  for (const s of ["Jane Doe", "Jean-Luc Picard", "José Núñez", "Mary O'Neil", "Madonna", "R2 Team", "Studio 54", "Dr. Ann Lee"]) assert.equal(maskName(s), s, s);
  assert.equal(maskName("Yara Leak yara.leak@example.com"), "Yara Leak (hidden)");
  assert.equal(maskText("Call 416-555-0199 or 416.555.0100"), "Call (hidden) or (hidden)");
  assert.equal(maskText("Reach me at a.b@c.co.uk, thanks"), "Reach me at (hidden), thanks");
  assert.equal(maskText("Acme 2026, Room 101"), "Acme 2026, Room 101");
  assert.equal(maskText("No mushrooms"), "No mushrooms");
  // The RSVP's free text and dietary labels are masked too.
  assert.deepEqual(rsvpOf({ rsvp: { status: "attendee", dietary: [{ key: "other", label: "Other" }, { key: "vegan", label: "Vegan" }], dietaryOther: "Call 416 555 0199" } }).dietary,
    ["Other: Call (hidden)", "Vegan"]);
  assert.equal(volunteerRow({ id: "a", name: "A B", pass: { label: "Pass for x@y.com" }, band: { key: "pass", label: "Connect Pass", passName: "z@y.com", bg: "#000000", text: "#FFFFFF" } }).pass.label, "Pass for (hidden)");
  assert.equal(volunteerRow({ id: "a", name: "A B", band: { key: "pass", label: "Connect Pass", passName: "z@y.com", bg: "#000000", text: "#FFFFFF" } }).band.passName, "(hidden)");
});

test("RSVP and sessions read the backend's shape, and stay safe with odd input", () => {
  assert.deepEqual(rsvpOf({}), { status: "none", at: null, days: [], events: [], dietary: [], accessibility: false });
  assert.deepEqual(rsvpOf({ rsvp: { status: "weird", dietary: ["vegan", "none", 3, null, { key: "other" }], accessibility: "Wheelchair user" } }),
    { status: "none", at: null, days: [], events: [], dietary: ["Vegan", "Other"], accessibility: false });
  assert.deepEqual(sessionsOf({ sessions: [{ day: 2, start: "09:00", end: "", title: "Opening", format: "", role: "Moderator" }, { title: "" }, null] }).map(({ key: _k, ...s }) => s),
    [{ title: "Opening", day: "Day 2", time: "9:00 AM", format: "", role: "Moderator" }]);
  assert.deepEqual(sessionsOf({}), []);
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
  // No search in the list's address, ever (a volunteer's search is a POST: volunteerSearch).
  assert.equal(q.toString(), "type=speaker&pass=power&rsvp=attendee&exhibitor=yes&vip=no&media=yes&page=2");
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

test("inclusions: effective Yes / No from either shape; clock", () => {
  assert.deepEqual(inclusionsOf({ cxoBreakfast: true }).map((x) => x.included), [true, false, false, false]);
  assert.deepEqual(inclusionsOf({ inclusions: { cxo: true, gala: true } }).map((x) => x.included), [true, false, true, false]);
  assert.deepEqual(inclusionsOf(null), []);
  assert.equal(clock("09:30"), "9:30 AM");
  assert.equal(clock("17:00"), "5:00 PM");
});

/* Third round (Oct 23 2026): a volunteer's search never goes in an address, even half-typed. The list's box is
   searched as they type (300 ms after a pause), so every prefix of what they type is a request that may go out. */
test("every volunteer search goes in a POST body: no prefix of an email or ticket ID is ever in a GET address", () => {
  const typed = ["mara.secret@example.com", "beefcafe0001", "TECHFEST:beefcafe0001", "omar.guest@example.com", "Mara Delegate", "Example Bank",
    "jean-luc.x@example.com", "o'neil+ttfc@example.com", "BOOTH-GOLD", "José Núñez", "a.b_c+d"];
  const view = { type: "speaker", sort: "company", page: "2" };
  for (const full of typed) {
    for (let i = 1; i <= full.length; i += 1) {
      const prefix = full.slice(0, i);
      const r = volunteerRequests(prefix, view);
      assert.equal(r.get, null, `${prefix}: the list isn't asked while there is a search`);
      if (r.post) assert.deepEqual(r.post, { q: prefix.trim() }, prefix);
      else assert.equal(r.search.tooShort, true, `${prefix}: nothing sent only while it's too short`);
    }
  }
  // The retest's own pauses: each went out as GET /console/people?q=… before; now each is a POST body.
  for (const q of ["mara.secret", "beefcafe", "omar.guest"]) {
    assert.deepEqual(volunteerRequests(q, {}), { search: { text: q, send: q, tooShort: false }, get: null, post: { q } });
  }
  // A search in the address (an old "See all in People" link) still never reaches the GET.
  assert.equal(volunteerRequests("", { q: "mara.secret", type: "speaker" }).get, "/console/people?type=speaker&page=0");
  // Nothing typed: the list, with the filters, sort and page only.
  assert.deepEqual(volunteerRequests("", view), { search: { text: "", send: "", tooShort: false }, get: "/console/people?type=speaker&sort=company&page=2", post: null });
  assert.equal(volunteerRequests("   ", {}).get, "/console/people?page=0");
  // Under 2 characters (or nothing searchable): nothing goes out yet, and the list isn't shown under a half search.
  for (const q of ["a", " M ", "@", "!!", ".."]) {
    const r = volunteerRequests(q, {});
    assert.equal(r.get, null, q);
    assert.equal(r.post, null, q);
    assert.equal(r.search.tooShort, true, q);
  }
  // Spaces are tidied the way the server reads them (no second request for a trailing space); 100 characters at most.
  assert.deepEqual(volunteerRequests("  Mara   Delegate ", {}).post, { q: "Mara Delegate" });
  assert.equal(volunteerRequests("x".repeat(300), {}).post.q.length, 100);
});

test("the list's search answer: the closest few and how many match; a failed or odd answer is an error, not 'No one found'", () => {
  const words = lookupAnswer(API.search.words);
  assert.equal(words.ok, true);
  assert.equal(words.failed, false);
  assert.ok(words.items.length > 0);
  assert.equal(words.total >= words.items.length, true);
  const exact = lookupAnswer(API.search.exactEmail);
  assert.deepEqual([exact.exact, exact.total, exact.more, exact.items.map((r) => r.name)], [true, 1, false, ["Mara Delegate"]]);
  // At most 5 per group from the server: the total says how many match.
  const items = Array.from({ length: 5 }, (_, i) => ({ type: "person", id: `u-${i}`, title: `Alex ${i}`, link: `/admin/people/u-${i}` }));
  const capped = lookupAnswer({ groups: [{ key: "people", total: 23, more: true, items }], failed: [] });
  assert.deepEqual([capped.ok, capped.total, capped.more, capped.items.length], [true, 23, true, 5]);
  // The server couldn't search People (services/adminSearch.js `failed`): an error.
  const failed = lookupAnswer({ query: { text: "omar", exact: "" }, groups: [], failed: [{ key: "people", label: "People", reason: "error" }] });
  assert.deepEqual([failed.ok, failed.failed, failed.items.length], [true, true, 0]);
  // No one matches: fine, not an error.
  assert.deepEqual(lookupAnswer({ groups: [], failed: [] }), { ok: true, failed: false, tooShort: false, items: [], total: 0, more: false, exact: false });
  // Not a search answer at all (a Wi-Fi sign-in page answered 200 with HTML, so the panel got {}; null; a list).
  for (const odd of [{}, null, undefined, "nope", [], { groups: "x" }, { rows: [] }]) {
    const a = lookupAnswer(odd);
    assert.equal(a.ok, false, JSON.stringify(odd));
    assert.deepEqual(a.items, []);
  }
  assert.equal(lookupAnswer({ tooShort: true, groups: [] }).tooShort, true);
  // Junk items never break it, and only People profile links come through.
  assert.deepEqual(lookupAnswer({ groups: [{ key: "people", total: "3", items: [null, 4, { type: "person", id: 7, title: { a: 1 }, link: "/admin/people/u-7", badges: "VIP" }] }] }).items,
    [{ id: "7", name: "No name", subtitle: "", badges: [], exact: false, link: "/admin/people/u-7" }]);
});

test("when the People endpoint errors, a volunteer gets plain words, never a status code or a technical message", () => {
  const TRY = "This isn't working right now. Try again in a moment, and if it keeps happening, ask a staff member.";
  // A server error (the V1 regex crash answered 500 "Something went wrong. Try again."), a gateway page, anything unexpected.
  assert.equal(volunteerError({ status: 500, message: "Something went wrong. Try again." }), TRY);
  assert.equal(volunteerError({ status: 502, message: "Request failed (502)" }), TRY);
  assert.equal(volunteerError({ status: 503, message: "Invalid regular expression: /(?:mary\\-jane)/giu: Invalid escape" }), TRY);
  assert.equal(volunteerError({ status: 400, message: "Request failed (400)" }), TRY);
  assert.equal(volunteerError(new TypeError("Cannot read properties of undefined (reading 'map')")), TRY);
  assert.equal(volunteerError(null), TRY);
  assert.equal(volunteerError({ status: -1 }), TRY);
  // Words meant for the volunteer stay.
  assert.equal(volunteerError({ status: 0, message: "Can't reach the server. Check your connection and try again." }), "Can't reach the server. Check your connection and try again.");
  assert.equal(volunteerError({ status: 429, code: "rate_limited", message: "That's a lot of look-ups. Wait a minute and try again." }), "That's a lot of look-ups. Wait a minute and try again.");
  assert.equal(volunteerError({ status: 429 }), "That's a lot of look-ups. Wait a minute and try again.");
  assert.equal(volunteerError({ status: 403, code: "suspended", message: "This account is suspended." }), "This account is suspended.");
  assert.match(volunteerError({ status: 404, message: "Person not found" }), /search for them again/);
});

test("an answer that isn't a list or a person is an error; odd rows still draw", () => {
  assert.equal(isListAnswer(API.list), true);
  assert.equal(isListAnswer({ rows: [] }), true);
  for (const odd of [undefined, null, {}, "x", { rows: {} }, { error: "Something went wrong. Try again." }]) assert.equal(isListAnswer(odd), false, JSON.stringify(odd));
  assert.equal(isProfileAnswer(API.profiles.yara), true);
  for (const odd of [undefined, null, {}, { person: null }, { person: "x" }, { canonicalId: "u-1" }]) assert.equal(isProfileAnswer(odd), false, JSON.stringify(odd));
  for (const odd of [null, undefined, "x", 3, [], { pass: "x", rsvp: 4, types: "speaker", band: 1, passCount: "2" }]) {
    const r = volunteerRow(odd);
    assert.equal(r.name, "No name");
    assert.deepEqual(r.types, []);
  }
  assert.equal(volunteerProfile({ person: { passes: [null, "x", { label: 3 }], sessions: [1], rsvp: [] } }).name, "No name");
});

test("the volunteer pages ask only through volunteerRequests and a POST search, and never draw a blank page", () => {
  const page = fs.readFileSync(new URL("./VolunteerPeople.jsx", import.meta.url), "utf8");
  // The list's GET is volunteerRequests' (filters, sort and page only); no address is built from the search box.
  assert.deepEqual(page.match(/useApi\(.*?\);/g), ["useApi(req.get);", "useApi(`/console/people/${encodeURIComponent(id)}`);"]);
  assert.doesNotMatch(page, /\/console\/people\?/);
  assert.deepEqual(page.match(/adminFetch\([^)]*\)/g), ['adminFetch("/console/search", { method: "POST", body: { q: send }, signal: ctrl.signal })']);
  // The list and the profile each sit in the guard, so a drawing error shows a card instead of a blank page.
  const body = (name) => (page.match(new RegExp(`export function ${name}\\(\\) \\{[\\s\\S]*?\\n\\}`)) || [""])[0];
  assert.match(body("VolunteerDirectory"), /<VolunteerGuard resetKey=\{pathname\}><Directory \/><\/VolunteerGuard>/);
  assert.match(body("VolunteerProfile"), /<VolunteerGuard resetKey=\{pathname\}><ProfileView key=\{id\} id=\{id\} \/><\/VolunteerGuard>/);
  assert.match(page, /static getDerivedStateFromError\(\)/);
});
