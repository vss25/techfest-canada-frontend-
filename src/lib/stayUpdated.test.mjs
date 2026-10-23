/* node --test src/lib/stayUpdated.test.mjs: the waitlist page's wording, its parsing, the form's checks and the
   request (a fake fetch: nothing leaves the machine). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ERRORS, INTERESTS, STAY_DEFAULTS, STAY_KEYS, blocks, checkForm, heroParts, joinWaitlist, lines, phoneDigits, sourceFrom, stayFrom } from "./stayUpdated.js";

test("the defaults: the organiser's facts (Toronto, dates to be announced, the 5 × 5, 1000+ attendees across 2 days)", () => {
  assert.equal(STAY_KEYS.length, 31);
  assert.deepEqual(heroParts(STAY_DEFAULTS["stay.hero_title"]), { lead: "TTFC 2027", rest: ["Toronto", "Dates to be announced"] });
  assert.deepEqual(lines(STAY_DEFAULTS["stay.pillars"]), ["AI & Machine Learning", "Quantum Computing", "Cybersecurity & Digital Trust", "Robotics & Automation", "CleanTech & Sustainability"]);
  assert.deepEqual(lines(STAY_DEFAULTS["stay.sectors"]), ["Financial Services & Banking", "Healthcare & Life Sciences", "Energy & Critical Infrastructure", "Manufacturing, Supply Chain & Mobility", "Public Sector, National Defence & Security"]);
  assert.equal(STAY_DEFAULTS["stay.stat"], "1000+ attendees across 2 days");
  assert.deepEqual(blocks(STAY_DEFAULTS["stay.expect"]).map((b) => b.title), ["Keynotes and executive panels", "Catalyst Awards", "The Expo", "CxO Breakfast", "Gala Dinner and networking", "Business meetings"]);
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

test("lists and blocks: forgiving with spaces and Windows line ends", () => {
  assert.deepEqual(lines(" A \r\n\r\n B\n"), ["A", "B"]);
  assert.deepEqual(blocks("Title one\nFirst line\nsecond line\n \nTitle two\r\n\r\nTitle three\nBody"), [
    { title: "Title one", body: "First line second line" }, { title: "Title two", body: "" }, { title: "Title three", body: "Body" },
  ]);
  assert.deepEqual(heroParts("TTFC 2027"), { lead: "TTFC 2027", rest: [] });
});

test("the form's checks match the server: email, phone with 7–20 digits after + spaces dashes parens", () => {
  assert.deepEqual(checkForm({ email: "jane@acme.example", phone: "+1 (416) 555-0100" }), {});
  assert.deepEqual(checkForm({ email: "", phone: "" }), { email: ERRORS.emailMissing, phone: ERRORS.phoneMissing });
  assert.equal(checkForm({ email: "jane@acme", phone: "4165550100" }).email, ERRORS.emailBad);
  for (const phone of ["123456", "416.555.0100", "call me", "1".repeat(21)]) assert.equal(checkForm({ email: "a@b.example", phone }).phone, ERRORS.phoneBad, phone);
  assert.equal(phoneDigits("+44 (20) 7946-0958"), "442079460958");
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
  const r = await joinWaitlist("https://api.example.test/api/", { email: " jane@acme.example ", phone: "4165550100", interests: ["delegation", "golf", "sponsorship"], source: "ios" }, { fetchImpl });
  assert.deepEqual(r, { message: "Thanks, we'll reach out." });
  assert.equal(calls[0].url, "https://api.example.test/api/stay-updated");
  assert.equal(calls[0].opts.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].opts.body), { email: "jane@acme.example", phone: "4165550100", interests: ["sponsorship", "delegation"], source: "ios", consent: true, _hp: "" });
  assert.deepEqual(INTERESTS, ["sponsorship", "exhibitor", "delegation"]);
});

test("joinWaitlist: the server's words for a refusal (with the field); plain words when the network or server fails", async () => {
  const answer = (status, body) => async () => new Response(JSON.stringify(body), { status });
  await assert.rejects(joinWaitlist("https://x.test/api", { email: "a@b.example", phone: "1" }, { fetchImpl: answer(400, { ok: false, field: "phone", error: "That phone number doesn't look right." }) }),
    (e) => e.field === "phone" && e.message === "That phone number doesn't look right.");
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: async () => { throw new TypeError("offline"); } }), (e) => e.message === ERRORS.network);
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: async () => new Response("<html>", { status: 502 }) }), (e) => e.message === ERRORS.failed);
  await assert.rejects(joinWaitlist("https://x.test/api", {}, { fetchImpl: answer(503, { error: "maintenance", message: "Back soon." }) }), (e) => e.message === "Back soon.");
  // A 200 without a message still thanks them.
  assert.deepEqual(await joinWaitlist("https://x.test/api", {}, { fetchImpl: answer(200, { ok: true }) }), { message: STAY_DEFAULTS["stay.thanks"] });
});
