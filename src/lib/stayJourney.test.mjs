/* node --test src/lib/stayJourney.test.mjs: the TTFC 2027 journey's lists, the check the admin editor runs before
   saving (the backend's services/stayJourney.js, word for word) and the words each stop shows. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CITIES, DEFAULT_JOURNEY, DEFAULT_JOURNEY_JSON, JOURNEY_KEY, KIND_LABEL, MAX_STOPS, PILLARS, SECTORS,
  blankStop, checkJourney, cityNamed, focusText, journeyFrom, kindLabel, mapMonth, stopSentence,
} from "./stayJourney.js";

test("the organiser's journey: five one-day briefings, then the festival in Toronto; focus, dates and venues to be announced", () => {
  assert.equal(JOURNEY_KEY, "stay.journey");
  assert.deepEqual(DEFAULT_JOURNEY.map((s) => `${s.month} ${s.city} ${s.kind}`), [
    "February 2027 Vancouver briefing", "April 2027 Montreal briefing", "June 2027 Calgary briefing",
    "June 2027 Toronto briefing", "September 2027 Ottawa briefing", "November 2027 Toronto festival",
  ]);
  assert.ok(DEFAULT_JOURNEY.every((s) => !s.pillar && !s.sector && !s.date && !s.venue && !s.note));
  assert.equal(DEFAULT_JOURNEY_JSON, JSON.stringify(DEFAULT_JOURNEY));
  assert.deepEqual(Object.keys(blankStop()), ["city", "month", "kind", "pillar", "sector", "date", "venue", "note"]);
});

test("the lists: five pillars, five sectors, the cities (with where their labels go)", () => {
  assert.equal(PILLARS.length, 5);
  assert.equal(SECTORS.length, 5);
  assert.ok(PILLARS.includes("CleanTech & Sustainability") && SECTORS.includes("Public Sector, National Defence & Security"));
  for (const n of ["Vancouver", "Calgary", "Edmonton", "Winnipeg", "Toronto", "Waterloo", "Ottawa", "Montreal", "Quebec City", "Halifax"]) {
    assert.ok(cityNamed(n), n);
  }
  for (const c of CITIES) assert.ok(c.label.length && c.label.every((d) => ["n", "s", "e", "w", "ne", "nw", "se", "sw"].includes(d)), c.name);
  assert.equal(cityNamed("montréal").name, "Montreal");
  assert.equal(cityNamed("St Johns").name, "St. John's");
  assert.equal(cityNamed("Paris"), null);
});

test("checkJourney: the server's rules and words", () => {
  const ok = checkJourney([{ city: "vancouver", month: " February  2027 ", pillar: "ai & machine learning", sector: "", kind: "", note: "One\nline" }]);
  assert.deepEqual(ok.stops, [{ city: "Vancouver", month: "February 2027", kind: "briefing", pillar: "AI & Machine Learning", sector: "", date: "", venue: "", note: "One line" }]);
  assert.equal(checkJourney([]).error, "Add at least one stop.");
  assert.equal(checkJourney("nope").error, "The journey couldn't be read. Reload the page and try again.");
  assert.equal(checkJourney(Array.from({ length: MAX_STOPS + 1 }, () => blankStop())).error, "The journey can have 12 stops at most.");
  assert.deepEqual(checkJourney([blankStop(), { ...blankStop(), city: "Boston" }]), { ok: false, index: 1, field: "city", error: "Stop 2: pick a city from the list." });
  assert.equal(checkJourney([{ ...blankStop(), sector: "Retail" }]).field, "sector");
  assert.equal(checkJourney([{ ...blankStop(), kind: "gala" }]).field, "kind");
  assert.equal(checkJourney([{ ...blankStop(), date: "d".repeat(61) }]).error, "Stop 1: the date is too long (60 characters at most).");
});

test("journeyFrom: the saved value, or the organiser's journey when it's empty or unreadable", () => {
  assert.deepEqual(journeyFrom(""), DEFAULT_JOURNEY.map((s) => ({ ...s })));
  assert.deepEqual(journeyFrom("{bad"), DEFAULT_JOURNEY.map((s) => ({ ...s })));
  assert.deepEqual(journeyFrom(undefined), DEFAULT_JOURNEY.map((s) => ({ ...s })));
  assert.equal(journeyFrom(JSON.stringify([blankStop("Halifax", "May 2027")]))[0].city, "Halifax");
});

test("the words for a stop: type, focus, the map's month, the map's text description", () => {
  assert.equal(kindLabel({ kind: "briefing" }), "One-day briefing");
  assert.equal(kindLabel({ kind: "festival" }), "The Tech Festival Canada · Two days");
  assert.equal(KIND_LABEL.festival, "The Tech Festival Canada · Two days");
  assert.equal(focusText(blankStop()), "Focus to be announced");
  assert.equal(focusText({ ...blankStop(), pillar: "Quantum Computing", sector: "Healthcare & Life Sciences" }), "Quantum Computing × Healthcare & Life Sciences");
  assert.equal(focusText({ ...blankStop(), pillar: "Quantum Computing" }), "Quantum Computing × sector to be announced");
  assert.equal(focusText({ ...blankStop(), sector: "Energy & Critical Infrastructure" }), "Pillar to be announced × Energy & Critical Infrastructure");
  assert.equal(focusText(blankStop("Toronto", "November 2027", "festival")), "", "the festival has no focus line unless staff set one");
  assert.equal(mapMonth("February 2027"), "February");
  assert.equal(mapMonth("February 2027", { short: true }), "Feb");
  assert.equal(mapMonth("Sept 2027", { short: true }), "Sep");
  assert.equal(mapMonth(""), "TBA");
  assert.equal(mapMonth("Spring 2027"), "Spring");
  assert.equal(mapMonth("Late summer, after the long weekend"), "Late summer, …");
  assert.equal(stopSentence(DEFAULT_JOURNEY[0], 0), "1. February 2027, Vancouver: one-day briefing.");
  assert.equal(stopSentence(DEFAULT_JOURNEY[5], 5), "6. November 2027, Toronto: The Tech Festival Canada, two days.");
  assert.equal(stopSentence({ ...blankStop("Ottawa", ""), pillar: "Cybersecurity & Digital Trust", sector: "Public Sector, National Defence & Security" }, 4),
    "5. To be announced, Ottawa: one-day briefing, focus Cybersecurity & Digital Trust × Public Sector, National Defence & Security.");
});
