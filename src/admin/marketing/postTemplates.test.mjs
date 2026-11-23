/* Templated social posts (Nov 23 2026): what each template says, built from website records. Pure, no network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, buildPost, clock, eventWhen, noDashes, panelPeople, sessionsFor, shortWhen, splitTitle, venueOf } from "./postTemplates.js";

const event = { _id: "ev", name: "Vancouver Briefing", city: "Vancouver", startDate: "2027-02-03", venueName: "Example Hall", theme: "AI — at work" };
const ada = { _id: "s1", name: " Ada Lovelace ", title: "Chief Scientist", company: "Example Labs", imageUrl: "https://cdn.sanity.io/images/x/production/ada-400x500.png" };
const ben = { _id: "s2", name: "Ben Okafor", title: "CTO", company: "Northwind" };
const session = { _id: "x1", title: "The AI agenda — what's next", day: 1, time: "10:00", stage: "Main stage", type: "Panel session",
  speakers: [{ name: "Ada Lovelace" }, { name: "Ben Okafor", org: "Northwind" }, { name: "Tent Ative", tentative: true }], moderator: { name: "Cara Diaz", org: "TTFC" } };

test("six templates, each built from one kind of website record", () => {
  assert.deepEqual(TEMPLATES.map((t) => t.key), ["speaker", "panel", "partner", "callSpeakers", "callSponsors", "tickets"]);
});

test("dates, times and no em-dashes", () => {
  assert.equal(eventWhen(event), "Wednesday, February 3, 2027");
  assert.equal(eventWhen(event, 2), "Thursday, February 4, 2027");
  assert.equal(eventWhen({ statusNote: "February 2027 · One day" }), "February 2027 · One day");
  assert.equal(eventWhen({ startDate: "2026-10-26", endDate: "2026-10-27" }), "October 26-27, 2026");
  assert.equal(eventWhen({ startDate: "2027-01-31", endDate: "2027-02-01" }), "January 31-February 1, 2027");
  assert.equal(shortWhen(event), "3 Feb 2027");
  assert.equal(shortWhen({ startDate: "2026-10-26", endDate: "2026-10-27" }), "26-27 Oct 2026");
  assert.equal(shortWhen({ startDate: "2027-01-31", endDate: "2027-02-01" }), "31 Jan-1 Feb 2027");
  assert.equal(shortWhen({ statusNote: "February 2027" }), "February 2027");
  assert.equal(venueOf(event), "Example Hall, Vancouver");
  assert.equal(venueOf({ city: "Toronto" }), "Toronto");
  assert.deepEqual(splitTitle("The Quantum Advantage: Separating Signal from Hype"), { accent: "The Quantum Advantage:", rest: "Separating Signal from Hype" });
  assert.deepEqual(splitTitle("Who Owns AI Governance?"), { accent: "Who Owns", rest: "AI Governance?" });
  assert.equal(clock("14:30"), "2:30 PM");
  assert.equal(clock("09:05"), "9:05 AM");
  assert.equal(noDashes("AI — at work – today"), "AI, at work, today");
});

test("a speaker's sessions and a panel's people come from the agenda by name", () => {
  assert.deepEqual(sessionsFor(ada, [session, { title: "Lunch", isBreak: true, speakers: [{ name: "Ada Lovelace" }] }]).map((s) => s._id), ["x1"]);
  const people = panelPeople(session, [ada, ben]);
  assert.deepEqual(people.map((p) => [p.name, !!p.record, !!p.moderator]), [["Ada Lovelace", true, false], ["Ben Okafor", true, false], ["Cara Diaz", false, true]]);
});

test("speaker announcement: the image's words, the facts for Claude, a finished fallback, no dashes", () => {
  const b = buildPost({ template: "speaker", item: ada, event, speakers: [ada, ben], sessions: [session] });
  assert.deepEqual(b.problems, []);
  assert.equal(b.title, "Speaker: Ada Lovelace");
  assert.equal(b.spec.kind, "keynote");
  assert.equal(b.spec.tag, "Featured Speaker");
  assert.deepEqual(b.spec.title, { accent: "The AI", rest: "agenda, what's next" });
  assert.deepEqual(b.spec.header, { when: "3 Feb 2027", venue: "Example Hall, Vancouver" });
  assert.deepEqual(b.people, [{ name: "Ada Lovelace", title: "Chief Scientist", org: "Example Labs", role: "Speaker", url: ada.imageUrl }]);
  assert.equal(b.link, "https://www.thetechfestival.com/tickets");
  assert.match(b.source, /Session: The AI agenda — what's next: Wednesday, February 3, 2027, 10:00 AM, Main stage/);
  for (const c of ["linkedin", "x", "instagram"]) assert.doesNotMatch(b.fallback[c], /[—–]/, c);
  assert.match(b.fallback.linkedin, /#TTFCVancouver/);
  assert.match(b.fallback.instagram, /link in bio/);
});

test("panel announcement: everyone on it, the moderator last and tagged; none on the agenda = a problem", () => {
  const b = buildPost({ template: "panel", item: session, event, speakers: [ada, ben] });
  assert.equal(b.spec.kind, "session");
  assert.equal(b.spec.tag, "Featured Session");
  assert.deepEqual(b.people.map((p) => [p.role, p.name, p.title, p.org]), [["Moderator", "Cara Diaz", "", "TTFC"], ["Speaker", "Ada Lovelace", "Chief Scientist", "Example Labs"], ["Speaker", "Ben Okafor", "CTO", "Northwind"]]);
  assert.match(b.fallback.linkedin, /Cara Diaz, TTFC \(moderator\)/);
  assert.deepEqual(buildPost({ template: "panel", item: { title: "Empty", speakers: [] }, event }).problems, ["This session has no speakers on the agenda yet."]);
});

test("partner and calls to action; nothing picked = a plain problem", () => {
  const p = buildPost({ template: "partner", item: { _id: "p1", name: "Northwind", logoUrl: "https://cdn.sanity.io/images/x/production/nw-800x400.png" }, event });
  assert.equal(p.spec.headline, "Welcome, Northwind");
  assert.equal(p.spec.kind, "partner");
  assert.match(p.logoUrl, /nw-800x400/);
  const c = buildPost({ template: "callSponsors", item: event, event });
  assert.equal(c.spec.headline, "Partner with Vancouver Briefing");
  assert.equal(c.link, "https://www.thetechfestival.com/sponsor");
  assert.equal(c.spec.kind, "event");
  assert.equal(c.spec.footer, "thetechfestival.com/sponsor");
  assert.deepEqual(buildPost({ template: "speaker", item: null, event }).problems, ["Pick a speaker."]);
});
