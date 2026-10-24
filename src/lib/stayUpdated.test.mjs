/* node --test src/lib/stayUpdated.test.mjs: the waitlist page's wording, its parsing, the form's checks and the
   request (a fake fetch: nothing leaves the machine). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ERRORS, FIELDS, INTERESTS, OPTIONAL, STAY_DEFAULTS, STAY_KEYS, checkForm, fillEmpty, firstProblem, heroParts, joinWaitlist, phoneDigits, prefillFrom, sourceFrom,
  stayFrom, tidy,
} from "./stayUpdated.js";
import { DEFAULT_JOURNEY_JSON } from "./stayJourney.js";

test("the defaults: the organiser's facts (the journey, Toronto in November 2027, no attendee count; the backend's words)", () => {
  assert.equal(STAY_KEYS.length, 27);
  // Name and company (Oct 24 2026): their labels are staff-edited like the rest.
  assert.equal(STAY_DEFAULTS["stay.field_name"], "Your name");
  assert.equal(STAY_DEFAULTS["stay.field_company"], "Company or organisation");
  // Only the email is required (the organiser, Oct 24 2026): nothing says the phone is.
  assert.equal(STAY_DEFAULTS["stay.form_intro"], "Only your email is needed; your name, company and phone number help our team reach out. Tick anything else you'd like to talk to us about.");
  assert.doesNotMatch(Object.values(STAY_DEFAULTS).join(" "), /email and phone|phone (number )?(is )?required/i);
  assert.ok(STAY_KEYS.indexOf("stay.field_name") < STAY_KEYS.indexOf("stay.field_company") && STAY_KEYS.indexOf("stay.field_company") < STAY_KEYS.indexOf("stay.field_email"));
  assert.deepEqual(heroParts(STAY_DEFAULTS["stay.hero_title"]), { lead: "TTFC 2027", rest: ["Toronto", "November 2027"] });
  assert.equal(STAY_DEFAULTS["stay.journey_title"], "TTFC 2027 across Canada");
  assert.equal(STAY_DEFAULTS["stay.journey_intro"], "Five focused one-day briefings, each on one technology pillar and one sector, lead to two days in Toronto in November 2027. Dates to be announced for every event.");
  assert.equal(STAY_DEFAULTS["stay.journey"], DEFAULT_JOURNEY_JSON);
  assert.match(STAY_DEFAULTS["stay.hero_intro"], /five focused one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then The Tech Festival Canada, two days in Toronto in November 2027\. Dates to be announced for every event\./);
  assert.match(STAY_DEFAULTS["stay.email_intro"], /one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then The Tech Festival Canada, two days in Toronto in November 2027/);
  assert.ok(STAY_DEFAULTS["stay.seo_description"].length <= 160);
  // The 5 × 5 programme, "What to expect", the old events list and the attendee line are gone (the organiser, Oct 23 2026).
  for (const k of ["stay.program_title", "stay.program_intro", "stay.pillars_title", "stay.pillars", "stay.sectors_title", "stay.sectors",
    "stay.expect_title", "stay.expect", "stay.briefings_title", "stay.briefings_intro", "stay.briefings", "stay.stat"]) assert.equal(k in STAY_DEFAULTS, false, k);
  assert.doesNotMatch(Object.values(STAY_DEFAULTS).join(" "), /attendees|delegates|\b\d{3,}\+/i, "no attendee count on 2027 material");
  assert.equal(STAY_DEFAULTS["stay.thanks"], "Thank you for your interest. Someone from our team will reach out.");
  assert.doesNotMatch(Object.values(STAY_DEFAULTS).join(" "), /App Store|Google Play|download/i, "no store mentions on this page");
});

test("stayFrom: staff's text over the defaults; empty or missing = the default", () => {
  const c = stayFrom({ "stay.button": "  Count me in  ", "stay.thanks": "", "stay.form_title": 3, other: "x" });
  assert.equal(c["stay.button"], "Count me in");
  assert.equal(c["stay.thanks"], STAY_DEFAULTS["stay.thanks"]);
  assert.equal(c["stay.form_title"], STAY_DEFAULTS["stay.form_title"]);
  assert.equal("other" in c, false);
  assert.deepEqual(stayFrom(null), { ...STAY_DEFAULTS });
});

test("heroParts: the headline's parts", () => {
  assert.deepEqual(heroParts("TTFC 2027"), { lead: "TTFC 2027", rest: [] });
  assert.deepEqual(heroParts("TTFC 2027 | Toronto • November 2027"), { lead: "TTFC 2027", rest: ["Toronto", "November 2027"] });
});

const OK = { name: "Jane Doe", company: "Acme Inc.", email: "jane@acme.example", phone: "+1 (416) 555-0100" };

test("the form's checks match the server: only the email is required; a phone that is given has 7–20 digits after + spaces dashes parens", () => {
  assert.deepEqual(checkForm(OK), {});
  assert.deepEqual(checkForm({}), { email: ERRORS.emailMissing }, "only the email");
  assert.deepEqual(checkForm({ email: "jane@acme.example" }), {}, "the email alone is enough");
  assert.deepEqual(checkForm({ name: "", company: "  ", email: "jane@acme.example", phone: " " }), {});
  assert.equal(checkForm({ ...OK, email: "jane@acme" }).email, ERRORS.emailBad);
  for (const phone of ["123456", "416.555.0100", "call me", "1".repeat(21)]) assert.equal(checkForm({ ...OK, phone }).phone, ERRORS.phoneBad, phone);
  assert.equal(phoneDigits("+44 (20) 7946-0958"), "442079460958");
  assert.deepEqual(OPTIONAL, ["name", "company", "phone"]);
  assert.equal("phoneMissing" in ERRORS || "nameMissing" in ERRORS || "companyMissing" in ERRORS, false);
});

test("the name, when given: 2–80 characters, letters in any language with spaces - ' ’ and dots; the company up to 120 (the server's words)", () => {
  for (const name of ["Priya Raman", "Zoë Saldaña-O'Neil", "Dr. Maya Singh", "D’Arcy", "Nguyễn Văn An", "李 小龍", "अनन्या शर्मा", "Jo", "  Jane   Doe  "]) {
    assert.equal(checkForm({ ...OK, name }).name, undefined, name);
  }
  assert.equal(checkForm({ ...OK, name: "   " }).name, undefined, "empty is fine");
  assert.equal(checkForm({ ...OK, name: "J" }).name, ERRORS.nameLength);
  assert.equal(checkForm({ ...OK, name: "a".repeat(81) }).name, ERRORS.nameLength);
  for (const name of ["Jane2", "<b>Jane</b>", "jane@acme.example", "Jane, Doe", "..", "Jane_Doe", "😀 Jane"]) assert.equal(checkForm({ ...OK, name }).name, ERRORS.nameBad, name);
  for (const company of ["AT&T", "3M", "Self-employed", "École Polytechnique", "a".repeat(120)]) assert.equal(checkForm({ ...OK, company }).company, undefined, company);
  assert.equal(checkForm({ ...OK, company: "" }).company, undefined, "empty is fine");
  assert.equal(checkForm({ ...OK, company: "a".repeat(121) }).company, ERRORS.companyLong);
  assert.equal(ERRORS.nameLength, "Enter your name in 2 to 80 characters, or leave it empty.");
  assert.equal(ERRORS.nameBad, "Use letters for your name, with spaces, hyphens, apostrophes or dots if you like.");
  assert.equal(ERRORS.companyLong, "Keep your company or organisation to 120 characters.");
  // The cursor goes to the first problem, in the form's order.
  assert.deepEqual(FIELDS, ["name", "company", "email", "phone"]);
  assert.equal(firstProblem(checkForm({ ...OK, company: "x".repeat(121), email: "" })), "company");
  assert.equal(firstProblem(checkForm({ ...OK, name: "J", email: "" })), "name");
  assert.equal(firstProblem({}), "");
  assert.equal(tidy("  Jane \n  Doe "), "Jane Doe");
});

test("prefillFrom: a signed-in account's name, organisation, email and phone (contact card, else the newest pass)", () => {
  const user = {
    name: " Priya Raman ", organization: "Lakeshore Insurance", email: "priya@lakeshore.example",
    contactItems: [{ kind: "email", account: true, value: "" }, { kind: "phone", value: "+1 416 555 0142" }],
    tickets: [{ details: { phone: "647 555 0100" }, purchaseDate: "2026-09-01" }],
  };
  assert.deepEqual(prefillFrom(user), { name: "Priya Raman", company: "Lakeshore Insurance", email: "priya@lakeshore.example", phone: "+1 416 555 0142" });
  // No card phone: the newest pass's checkout answer.
  const passes = { ...user, contactItems: [], tickets: [
    { details: { phone: "647 555 0100" }, purchaseDate: "2026-09-01" }, { details: { phone: "905 555 0199" }, purchaseDate: "2026-10-01" }, { details: {} },
  ] };
  assert.equal(prefillFrom(passes).phone, "905 555 0199");
  // The /social/me card where /auth/me has nothing (and { user } wrappers).
  assert.deepEqual(prefillFrom(null, { name: "Sam Lee", organization: "Globex", email: "sam@globex.example" }), { name: "Sam Lee", company: "Globex", email: "sam@globex.example", phone: "" });
  assert.equal(prefillFrom({ user: { name: "Ann Wu" } }).name, "Ann Wu");
  assert.equal(prefillFrom({ name: "Ann Wu", organisation: "Initech" }).company, "Initech");
  // Nothing known (a guest): all empty; odd values are ignored.
  assert.deepEqual(prefillFrom(undefined), { name: "", company: "", email: "", phone: "" });
  assert.deepEqual(prefillFrom({ name: 42, organization: ["x"], tickets: "no", contactItems: {} }), { name: "", company: "", email: "", phone: "" });
  assert.equal(prefillFrom({ name: "a".repeat(200) }).name.length, 80, "never more than the form takes");
});

test("fillEmpty: only empty fields are filled; what someone typed stays", () => {
  const pre = { name: "Priya Raman", company: "Lakeshore", email: "priya@lakeshore.example", phone: "" };
  assert.deepEqual(fillEmpty({ name: "", company: "Typed Co", email: "  ", phone: "416" }, pre), { name: "Priya Raman", company: "Typed Co", email: "priya@lakeshore.example", phone: "416" });
  assert.deepEqual(fillEmpty({ name: "x" }, null), { name: "x" });
});

test("?source=: the apps say ios / android / webapp; anything else is the website", () => {
  assert.equal(sourceFrom("?source=ios"), "ios");
  assert.equal(sourceFrom("?source=ANDROID&x=1"), "android");
  assert.equal(sourceFrom("?source=webapp"), "webapp");
  assert.equal(sourceFrom("?source=email"), "website");
  assert.equal(sourceFrom(""), "website");
  assert.equal(sourceFrom("", "webapp"), "webapp");
});

test("joinWaitlist: posts the form (consent, honeypot, known ticks in order) and returns the server's message", async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return new Response(JSON.stringify({ ok: true, message: "Thanks, we'll reach out." }), { status: 200 }); };
  const r = await joinWaitlist("https://api.example.test/api/", { name: "  Jane   Doe ", company: " Acme ", email: " jane@acme.example ", phone: "4165550100", interests: ["delegation", "golf", "sponsorship"], source: "ios" }, { fetchImpl });
  assert.deepEqual(r, { message: "Thanks, we'll reach out." });
  assert.equal(calls[0].url, "https://api.example.test/api/stay-updated");
  assert.equal(calls[0].opts.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].opts.body), { name: "Jane Doe", company: "Acme", email: "jane@acme.example", phone: "4165550100", interests: ["sponsorship", "delegation"], source: "ios", consent: true, _hp: "" });
  assert.deepEqual(INTERESTS, ["sponsorship", "exhibitor", "delegation"]);
  // Just the email: the rest goes as "".
  await joinWaitlist("https://api.example.test/api", { email: "solo@acme.example", source: "website" }, { fetchImpl });
  assert.deepEqual(JSON.parse(calls[1].opts.body), { name: "", company: "", email: "solo@acme.example", phone: "", interests: [], source: "website", consent: true, _hp: "" });
});

test("joinWaitlist: the server's words for a refusal (with the field); plain words when the network or server fails", async () => {
  const answer = (status, body) => async () => new Response(JSON.stringify(body), { status });
  await assert.rejects(joinWaitlist("https://x.test/api", { email: "a@b.example", phone: "1" }, { fetchImpl: answer(400, { ok: false, field: "phone", error: "That phone number doesn't look right." }) }),
    (e) => e.field === "phone" && e.message === "That phone number doesn't look right.");
  await assert.rejects(joinWaitlist("https://x.test/api", OK, { fetchImpl: answer(400, { ok: false, field: "name", error: ERRORS.nameBad }) }),
    (e) => e.field === "name" && e.message === ERRORS.nameBad);
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: async () => { throw new TypeError("offline"); } }), (e) => e.message === ERRORS.network);
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: async () => new Response("<html>", { status: 502 }) }), (e) => e.message === ERRORS.failed);
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: answer(503, { error: "maintenance", message: "Back soon." }) }), (e) => e.message === "Back soon.");
  // A 200 without a message still thanks them.
  assert.deepEqual(await joinWaitlist("https://x.test/api", {}, { fetchImpl: answer(200, { ok: true }) }), { message: STAY_DEFAULTS["stay.thanks"] });
});
