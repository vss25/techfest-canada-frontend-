// Captures the backend's real volunteer answers (services/volunteerPanel.js + services/adminSearch.js, run on fake
// people, in routes/people.js's envelopes) into volunteerApi.fixture.json, which volunteerView.test.mjs feeds to the
// panel's projection: a field the backend renames or moves fails a test there. Run it again whenever the backend
// changes its volunteer answers, from a backend checkout with its node_modules:
//   TTFC_IMPORT_ONLY=1 node src/admin/people/volunteerApiFixture.capture.mjs <backend dir> src/admin/people/volunteerApi.fixture.json
// Fake people only (example.com / example.org / example.net); nothing is read from a database or the network.
import fs from "node:fs";
import path from "node:path";

const [beDir, out] = process.argv.slice(2);
const imp = (p) => import(path.join(beDir, p));
const { buildPeople } = await imp("services/people.js");
const V = await imp("services/volunteerPanel.js");
const { runSearch } = await imp("services/adminSearch.js");

const d = (s) => new Date(`2026-${s}T12:00:00Z`);
const users = [
  { _id: "64b000000000000000000005", name: "Mara Delegate", email: "mara.secret@example.com", role: "user", organization: "Example Bank", jobTitle: "Head of Digital",
    vip: true, tickets: [{ ticketId: "beefcafe0001", type: "power", purchaseDate: d("10-01"), stripeSessionId: "cs_test_secret", promoCode: "SECRETCODE20",
      checkedIn: true, checkedInAt: d("10-26") }] },
  { _id: "64b000000000000000000002", name: "Sam Staff", email: "sam.staff@example.com", role: "admin", staffRole: "staff", tickets: [] },
  { _id: "64b000000000000000000003", name: "Val Volunteer", email: "val.volunteer@example.com", role: "volunteer", tickets: [] },
  // A staff account added without a name: POST /console/staff names it after the email's local part.
  { _id: "64b000000000000000000004", name: "noname.staffer", email: "noname.staffer@example.org", role: "admin", staffRole: "staff", tickets: [] },
];
const attendees = [
  { _id: "64b000000000000000000011", name: "Omar Guest", email: "omar.guest@example.com", ticketId: "c0ffee000002", ticketType: "connect", purchaseDate: d("10-02"),
    details: { firstName: "Omar", lastName: "Guest", organisation: "Robotics Example" } },
  { _id: "64b000000000000000000012", name: "Kai Speaker", ticketId: "5pea4e000003", ticketType: "speaker", promoCode: "SPEAKER", speakerId: "spk-kai", purchaseDate: d("10-03"),
    issuedPass: { booth: { booth: "B7" } }, details: { jobTitle: "Chief Scientist", organisation: "Quantum Example" } },
  // A buyer who typed their email as their name, and a phone number into their company.
  { _id: "64b000000000000000000013", name: "yara.leak@example.com", email: "yara.leak@example.com", ticketId: "acac56565656", ticketType: "connect", purchaseDate: d("10-04"),
    details: { organisation: "Call me 416 555 0199", jobTitle: "Founder (zed.private@example.net)" } },
];
const rsvps = [
  { _id: "r1", key: "t:beefcafe0001", nameKey: "mara delegate", firstName: "Mara", lastName: "Delegate", email: "mara.secret@example.com", ticketId: "beefcafe0001",
    ticketVerified: true, tier: "power", days: ["day1", "day2"], options: ["sessions_d1", "cxo_d1", "lunch_d1", "awards", "gala"],
    dietary: ["vegan", "nut_allergy", "other"], dietaryOther: "No mushrooms", accessibility: "Wheelchair user, step-free route please",
    updatedAt: d("10-10"), createdAt: d("10-10"), attendeeSubmittedAt: d("10-10") },
];
const speakers = [{ _id: "spk-kai", name: "Kai Speaker", title: "Chief Scientist", company: "Quantum Example" }];
const stripe = { paid: new Map([["cs_test_secret", 849]]), free: new Set(), upgrades: new Map() };
const world = buildPeople({ users, attendees, rsvps, speakers, stripe, engagement: [], promos: [{ code: "SECRETCODE20", discount: 20 }] });
const agenda = [
  { day: 1, time: "10:00", endTime: "10:30", title: "Quantum Computing in Finance", format: "panel", speakers: [{ name: "Kai Speaker" }, { name: "Ann Other" }] },
  { day: 2, time: "14:00", endTime: "14:45", title: "Robots on the Factory Floor", format: "keynote", speakers: [{ name: "Kai Speaker" }] },
];

const byName = (n) => world.people.find((p) => p.name === n);
// The envelopes as routes/people.js sends them.
const listAnswer = () => {
  const { list, page } = V.volunteerList(world.people, {});
  return { volunteer: true, total: list.length, page, size: 50, rows: list.slice(0, 50).map(V.volunteerRow), counts: V.volunteerCounts(world.people), builtAt: "2026-10-26T12:00:00.000Z", ...V.volunteerMeta() };
};
const profileAnswer = (name) => {
  const p = byName(name);
  const sessions = (p.types || []).includes("speaker") ? agenda : null;
  return { volunteer: true, canonicalId: p.id, person: V.volunteerProfile(p, { sessions }), ...V.volunteerMeta() };
};
const search = (q) => runSearch({ q, viewer: { volunteer: true }, sources: { directory: async () => world }, log: { error() {} }, now: () => 0 });

const fixture = {
  _about: "Captured from the backend's own code (services/volunteerPanel.js volunteerList / volunteerRow / volunteerProfile and services/adminSearch.js runSearch "
    + "with the volunteer viewer), run on fake people, in routes/people.js's envelopes, by volunteerApiFixture.capture.mjs. Regenerate when the backend changes its volunteer answers.",
  list: listAnswer(),
  profiles: { mara: profileAnswer("Mara Delegate"), kai: profileAnswer("Kai Speaker"), omar: profileAnswer("Omar Guest"), yara: profileAnswer("yara.leak@example.com") },
  search: {
    words: await search("kai"), exactEmail: await search("mara.secret@example.com"), nameIsEmail: await search("yara.leak@example.com"),
    localPart: await search("noname"),
  },
};
fs.writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
console.log("wrote", out, Object.keys(fixture.profiles), fixture.list.rows.length, "rows");
