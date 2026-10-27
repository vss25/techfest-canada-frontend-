// The attendee survey's pure helpers (src/lib/survey.js): the server's answer as the page reads it, answer checks,
// what's sent, the admin's draft and the averages. Run: node --test src/lib/survey.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_SURVEY, LIMITS, NA, SURVEY_DEFAULTS, visibleQuestions, adminPhase, answerText, answeredCount, answersFrom, averageOf, blankQuestion, changeType, checkAnswers,
  checkConfig, checkDetails, cleanAnswers, configToForm, fetchSurvey, firstProblem, formToConfig, groupSections, isAnswered, moveItem,
  questionsFrom, renameSection, respondentFrom, responseBody, sectionNames, slug, submitSurvey, surveyFromApi, surveyPhase, surveyWhen, uniqueId,
} from "./survey.js";

const OPENS = Date.parse("2026-10-27T16:00:00-04:00");
const CLOSES = Date.parse("2026-11-03T23:59:00-05:00");
const API = {
  open: true, opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-11-03T23:59:00-05:00", title: "How was TTFC 2026?", intro: "", thankYou: "",
  questions: [
    { id: "overall", section: "The festival", type: "rating", label: "Overall?", required: true, minLabel: "Poor", maxLabel: "Great" },
    { id: "nps", section: "The festival", type: "nps", label: "Recommend?", required: true },
    { id: "best", section: "Next year", type: "multi", label: "Most useful?", options: ["Sessions", "Networking", "Sessions", ""] },
    { id: "return", section: "The festival", type: "choice", label: "Back in 2027?", options: ["Yes", "No"], required: true },
    { id: "why", section: "Next year", type: "longtext", label: "Anything else?" },
    { id: "ok", type: "consent", label: "Contact me", required: true },
    { id: "nolabel", type: "text", label: "  " },
    { id: "nooptions", type: "choice", label: "Pick", options: [] },
    { id: "overall", type: "text", label: "Duplicate id" },
    { id: "weird", type: "slider", label: "Unknown type" },
  ],
  respondent: { name: "  Priya   Raman ", email: "priya@dhl.com", title: "Director", company: "DHL" },
  responded: true,
};

test("the server's survey: defaults, Toronto times, usable questions only, the respondent tidied", () => {
  const s = surveyFromApi(API);
  assert.equal(s.open, true);
  assert.equal(s.opensAt, OPENS);
  assert.equal(s.closesAt, CLOSES);
  assert.equal(s.thankYou, SURVEY_DEFAULTS.thankYou);
  assert.deepEqual(s.questions.map((q) => q.id), ["overall", "nps", "best", "return", "why", "ok", "weird"]);
  assert.deepEqual(s.questions[2].options, ["Sessions", "Networking"]); // repeats and blanks out
  assert.equal(s.questions[6].type, "text"); // an unknown type is read as a short answer
  assert.equal(s.questions[1].minLabel, "");
  assert.deepEqual(s.respondent, { name: "Priya Raman", email: "priya@dhl.com", title: "Director", company: "DHL" });
  assert.equal(s.responded, true);
  assert.deepEqual(s.answers, {});
  assert.equal(surveyFromApi(null), null);
  assert.equal(surveyFromApi({ error: "x" }), null);
  assert.equal(surveyFromApi({ open: false }).title, SURVEY_DEFAULTS.title);
  assert.equal(respondentFrom({ name: "", email: "" }), null);
  // Earlier answers, when the server sends them, are kept only where they still fit.
  assert.deepEqual(surveyFromApi({ ...API, answers: { overall: 4, nps: 11, best: ["Networking", "Gala"], why: "More coffee" } }).answers,
    { overall: 4, best: ["Networking"], why: "More coffee" });
});

test("phases: before it opens, open, closed (the server's flag and the clock)", () => {
  const s = surveyFromApi(API);
  assert.equal(surveyPhase(s, OPENS + 1), "open");
  assert.equal(surveyPhase(s, CLOSES), "closed");
  const shut = { ...s, open: false };
  assert.equal(surveyPhase(shut, OPENS - 60000), "before");
  assert.equal(surveyPhase(shut, OPENS + 60000), "closed");
  assert.equal(surveyPhase({ ...shut, opensAt: NaN }, OPENS), "closed");
  assert.equal(surveyPhase(null), "closed");
  assert.equal(surveyWhen(OPENS), "4:00 PM on Tuesday, October 27");
  assert.equal(surveyWhen(NaN), "");
});

test("sections in the order they first appear, questions kept in order", () => {
  const s = surveyFromApi(API);
  const g = groupSections(s.questions);
  assert.deepEqual(g.map((x) => x.title), ["The festival", "Next year", ""]);
  assert.deepEqual(g[0].questions.map((q) => q.id), ["overall", "nps", "return"]);
  assert.deepEqual(sectionNames(s.questions), ["The festival", "Next year", ""]);
});

test("answers: what counts, required ones, text length, the first problem", () => {
  const [rating, nps, multi, choice, long, consent] = surveyFromApi(API).questions;
  assert.equal(isAnswered(rating, 5), true);
  assert.equal(isAnswered(rating, 0), false);
  assert.equal(isAnswered(rating, 3.5), false);
  assert.equal(isAnswered(nps, 0), true);
  assert.equal(isAnswered(nps, 11), false);
  assert.equal(isAnswered(choice, "Maybe"), false);
  assert.equal(isAnswered(multi, []), false);
  assert.equal(isAnswered(long, "   "), false);
  assert.equal(isAnswered(consent, "true"), false);
  const qs = surveyFromApi(API).questions;
  const errs = checkAnswers(qs, { nps: 9, why: "x".repeat(LIMITS.longtext + 1) });
  assert.deepEqual(Object.keys(errs), ["overall", "return", "why", "ok"]);
  assert.equal(errs.overall, "Choose a star rating.");
  assert.equal(errs.ok, "Tick the box to continue.");
  assert.match(errs.why, /2,000 characters/);
  assert.equal(firstProblem(qs, errs), "overall");
  assert.equal(firstProblem(qs, {}), "");
  assert.deepEqual(checkAnswers(qs, { overall: 4, nps: 0, return: "Yes", ok: true }), {});
  assert.equal(answeredCount(qs, { overall: 4, nps: 0, best: [] }), 2);
});

test("what's sent: answered questions only, trimmed, picks in the options' order; details only when given", () => {
  const qs = surveyFromApi(API).questions;
  const answers = { overall: 4, nps: 10, best: ["Networking", "Sessions", "Gala"], return: "Yes", why: "  More coffee  ", ok: true, stray: "x", weird: "" };
  assert.deepEqual(cleanAnswers(qs, answers), { overall: 4, nps: 10, best: ["Sessions", "Networking"], return: "Yes", why: "More coffee", ok: true });
  assert.deepEqual(responseBody({ questions: qs, answers: { overall: 5 }, details: { name: " Priya  Raman ", email: " p@x.co ", title: "", company: "DHL" }, token: "abc" }),
    { answers: { overall: 5 }, name: "Priya Raman", email: "p@x.co", company: "DHL", t: "abc" });
  assert.deepEqual(responseBody({ questions: qs, answers: {}, details: {}, token: "" }), { answers: {} });
  assert.deepEqual(answersFrom(qs, null), {});
});

test("about you: the name and email are needed, the title and company optional", () => {
  assert.deepEqual(Object.keys(checkDetails({})), ["name", "email"]);
  assert.deepEqual(checkDetails({ name: "Priya", email: "priya@dhl.com" }), {});
  assert.equal(checkDetails({ name: "Priya", email: "priya@" }).email, "That email address doesn't look right. Check it and try again.");
  assert.ok(checkDetails({ name: "x".repeat(81), email: "a@b.co" }).name);
  assert.ok(checkDetails({ name: "Priya", email: "a@b.co", company: "x".repeat(121) }).company);
});

test("N/A: allowed only where the question offers it; it's sent as \"na\" and satisfies a required question", () => {
  const [rating, nps, , choice] = surveyFromApi({ ...API, questions: [
    { id: "r", type: "rating", label: "R", allowNA: true, required: true },
    { id: "n", type: "nps", label: "N" },
    { id: "m", type: "multi", label: "M", options: ["A"], allowNA: true },
    { id: "c", type: "choice", label: "C", options: ["A", "B"], allowNA: true },
  ] }).questions;
  assert.equal(rating.allowNA, true);
  assert.equal(nps.allowNA, false);
  assert.equal(isAnswered(rating, NA), true);
  assert.equal(isAnswered(nps, NA), false);
  assert.equal(isAnswered(choice, NA), true);
  const multi = surveyFromApi({ questions: [{ id: "m", type: "multi", label: "M", options: ["A"], allowNA: true }] }).questions[0];
  assert.equal(multi.allowNA, false); // pick-any questions don't offer N/A
  assert.deepEqual(checkAnswers([rating], { r: NA }), {});
  assert.deepEqual(cleanAnswers([rating, nps, choice], { r: NA, n: NA, c: NA }), { r: NA, c: NA });
  assert.equal(answerText(rating, NA), "N/A");
});

test("showIf: questions shown only when the answer includes the option; hidden ones aren't checked or sent", () => {
  const qs = surveyFromApi({ questions: [
    { id: "role", type: "multi", label: "You were at TTFC as…", options: ["Attendee", "Speaker"] },
    { id: "hosting", type: "rating", label: "Hosting", required: true, showIf: { question: "role", includes: "Speaker" } },
    { id: "deeper", type: "text", label: "More", showIf: { question: "hosting", includes: "5" } },
    { id: "kind", type: "choice", label: "Kind", options: ["Panel", "Talk"], showIf: { question: "role", includes: "Speaker" } },
    { id: "talk", type: "text", label: "Talk title", showIf: { question: "kind", includes: "Talk" } },
    { id: "orphan", type: "text", label: "Orphan", showIf: { question: "gone", includes: "x" } },
    { id: "loopA", type: "text", label: "A", showIf: { question: "loopB", includes: "x" } },
    { id: "loopB", type: "choice", label: "B", options: ["x"], showIf: { question: "loopA", includes: "x" } },
  ] }).questions;
  const ids = (answers) => visibleQuestions(qs, answers).map((q) => q.id);
  assert.deepEqual(ids({}), ["role", "orphan"]);
  assert.deepEqual(ids({ role: ["Attendee"] }), ["role", "orphan"]);
  assert.deepEqual(ids({ role: ["Speaker"] }), ["role", "hosting", "kind", "orphan"]);
  assert.deepEqual(ids({ role: ["Speaker"], kind: "Talk" }), ["role", "hosting", "kind", "talk", "orphan"]);
  // A chain stops where a question is hidden: "talk" needs "kind", which needs "Speaker".
  assert.deepEqual(ids({ role: ["Attendee"], kind: "Talk" }), ["role", "orphan"]);
  assert.deepEqual(checkAnswers(qs, { role: ["Attendee"] }), {});
  assert.deepEqual(Object.keys(checkAnswers(qs, { role: ["Speaker"] })), ["hosting"]);
  assert.deepEqual(cleanAnswers(qs, { role: ["Attendee"], hosting: 4, kind: "Talk", talk: "Hi" }), { role: ["Attendee"] });
  assert.equal(answeredCount(qs, { role: ["Attendee"], hosting: 4 }), 1);
});

test("loading and sending: the server's words, closed, network trouble", async () => {
  const ok = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });
  const seen = [];
  const s = await fetchSurvey("https://api.example/api/", "tok en", { fetchImpl: async (url, init) => { seen.push([url, init.credentials]); return ok(200, API)(); } });
  assert.deepEqual(seen, [["https://api.example/api/survey?t=tok%20en", "omit"]]);
  assert.equal(s.title, "How was TTFC 2026?");
  await assert.rejects(fetchSurvey("x", "", { fetchImpl: ok(500, {}) }), /couldn't load the survey/);
  await assert.rejects(fetchSurvey("x", "", { fetchImpl: async () => { throw new Error("offline"); } }), /couldn't load/);

  assert.deepEqual(await submitSurvey("x", { answers: {} }, { fetchImpl: ok(201, { ok: true }) }), { ok: true });
  await assert.rejects(submitSurvey("x", {}, { fetchImpl: ok(403, { code: "closed" }) }), (e) => e.code === "closed" && /closed/.test(e.message));
  await assert.rejects(submitSurvey("x", {}, { fetchImpl: ok(400, { error: "Answer question 2.", field: "nps" }) }), (e) => e.field === "nps" && e.message === "Answer question 2.");
  await assert.rejects(submitSurvey("x", {}, { fetchImpl: async () => { throw new Error("offline"); } }), (e) => e.code === "network");
});

test("the demo survey reads like a real one, with N/A and a speakers' section shown for speakers", () => {
  const s = surveyFromApi(DEMO_SURVEY);
  assert.equal(s.questions.length, DEMO_SURVEY.questions.length);
  assert.equal(surveyPhase(s, OPENS + 1), "open");
  assert.ok(s.questions.some((q) => q.allowNA));
  const speaking = groupSections(visibleQuestions(s.questions, { role: ["Speaker"] })).map((g) => g.title);
  assert.ok(speaking.includes("Speaking at TTFC"));
  assert.ok(!groupSections(visibleQuestions(s.questions, {})).map((g) => g.title).includes("Speaking at TTFC"));
});

test("admin: the saved config round-trips through the form (Toronto times, new ids from labels)", () => {
  const config = {
    enabled: true, opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-11-03T23:59:00-05:00", title: "T", intro: "I", thankYou: "Ty",
    notifyTitle: "N", notifyBody: "B", autoNotify: false, notifiedAt: null,
    questions: [{ id: "overall", section: "A", type: "rating", label: "Overall?", required: true, minLabel: "Poor", maxLabel: "Great" }],
  };
  const form = configToForm(config);
  assert.equal(form.opensAt, "2026-10-27T16:00");
  assert.equal(form.closesAt, "2026-11-03T23:59");
  assert.equal(form.autoNotify, false);
  assert.ok(form.questions[0].key);
  form.questions.push({ ...blankQuestion("choice", "B"), label: "Overall?", options: ["Yes", " No ", ""] });
  form.questions.push({ ...blankQuestion("text"), label: "" });
  // A new question shown only if the new choice question (still without an id) is answered "Yes": it points at its key.
  form.questions.push({ ...blankQuestion("rating", "B"), label: "Why yes?", allowNA: true, showIf: { question: form.questions[1].key, includes: "Yes" } });
  const out = formToConfig(form);
  assert.deepEqual(out.questions[3], { id: "why-yes", section: "B", type: "rating", label: "Why yes?", required: false, minLabel: "Poor", maxLabel: "Excellent", allowNA: true, showIf: { question: "overall-2", includes: "Yes" } });
  // Saved and loaded again, the draft points at keys once more.
  const again = configToForm({ ...config, questions: out.questions });
  assert.equal(again.questions[3].showIf.question, again.questions[1].key);
  assert.deepEqual(formToConfig(again).questions[3].showIf, { question: "overall-2", includes: "Yes" });
  assert.equal(out.opensAt, "2026-10-27T16:00:00-04:00");
  assert.equal(out.closesAt, "2026-11-03T23:59:00-05:00"); // after the clocks change
  assert.deepEqual(out.questions[0], { id: "overall", section: "A", type: "rating", label: "Overall?", required: true, minLabel: "Poor", maxLabel: "Great" });
  assert.deepEqual(out.questions[1], { id: "overall-2", section: "B", type: "choice", label: "Overall?", required: false, options: ["Yes", "No"] });
  assert.equal(out.questions[2].id, "question");
  assert.ok(!("key" in out.questions[0]));
});

test("admin: checks before saving", () => {
  const form = configToForm({ opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-10-27T15:00:00-04:00", questions: [] });
  const where = checkConfig(form).map((p) => p.where);
  assert.deepEqual(where, ["closesAt", "questions"]);
  const q = { ...blankQuestion("multi", "", "k1"), label: "", options: ["Yes", "yes"] };
  const msgs = checkConfig({ ...form, closesAt: "2026-10-28T15:00", questions: [q] }).map((p) => [p.where, p.message]);
  assert.deepEqual(msgs, [["q:k1", "Question 1 needs its question text."], ["q:k1", "Question 1 has the same option twice."]]);
  assert.deepEqual(checkConfig({ ...form, opensAt: "", closesAt: "2026-10-28T15:00", questions: [{ ...q, label: "x", options: ["A"] }] }).map((p) => p.message),
    ["Pick when the survey opens.", "Question 1 needs at least two options."]);
  // showIf: the question must exist, be a pick-one / pick-any above it, and still have the option.
  const ctl = { ...blankQuestion("multi", "", "c1"), label: "Role", options: ["Attendee", "Speaker"] };
  const dep = (showIf) => ({ ...blankQuestion("rating", "", "d1"), label: "Hosting", showIf });
  const fine = { ...form, closesAt: "2026-10-28T15:00" };
  assert.deepEqual(checkConfig({ ...fine, questions: [ctl, dep({ question: "c1", includes: "Speaker" })] }), []);
  assert.match(checkConfig({ ...fine, questions: [ctl, dep({ question: "gone", includes: "Speaker" })] })[0].message, /no longer there/);
  assert.match(checkConfig({ ...fine, questions: [ctl, dep({ question: "c1", includes: "Sponsor" })] })[0].message, /isn't there any more/);
  assert.match(checkConfig({ ...fine, questions: [dep({ question: "c1", includes: "Speaker" }), ctl] })[0].message, /move it below/);
  const text = { ...blankQuestion("text", "", "t1"), label: "Free" };
  assert.match(checkConfig({ ...fine, questions: [text, dep({ question: "t1", includes: "x" })] })[0].message, /isn't a pick-one or pick-any/);
});

test("admin: editing helpers (type changes keep the label, moves, section renames, ids)", () => {
  const q = { ...blankQuestion("rating", "Day 2", "k1"), label: "How was it?", help: "Be honest", required: true };
  const asChoice = changeType(q, "choice");
  assert.equal(asChoice.label, "How was it?");
  assert.equal(asChoice.help, "Be honest");
  assert.equal(asChoice.required, true);
  assert.equal(asChoice.section, "Day 2");
  assert.deepEqual(asChoice.options, ["", ""]);
  assert.equal(asChoice.minLabel, "");
  assert.deepEqual(changeType({ ...asChoice, options: ["A", "B"] }, "multi").options, ["A", "B"]);
  assert.equal(changeType(q, "nps").minLabel, "Not likely"); // the rating's default words swap for the nps ones
  assert.equal(changeType({ ...q, minLabel: "Awful" }, "nps").minLabel, "Awful"); // words someone wrote stay
  assert.equal(changeType(q, "rating"), q);
  assert.equal(changeType({ ...q, allowNA: true }, "nps").allowNA, true);
  assert.equal(changeType({ ...q, allowNA: true }, "text").allowNA, false);
  assert.deepEqual(moveItem([1, 2, 3], 0, 2), [2, 3, 1]);
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(renameSection([{ section: "A" }, { section: "B" }, { section: "A" }], "A", " Day  one ").map((x) => x.section), ["Day one", "B", "Day one"]);
  assert.equal(slug("Überall, how was TTFC 2026?!"), "uberall-how-was-ttfc-2026");
  assert.equal(uniqueId("Overall", ["overall", "overall-2"]), "overall-3");
  assert.equal(uniqueId("", []), "question");
});

test("admin: the phase and the averages, whatever shape the server sends", () => {
  const c = { enabled: true, opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-11-03T23:59:00-05:00" };
  assert.equal(adminPhase({ ...c, enabled: false }, OPENS + 1), "off");
  assert.equal(adminPhase(c, OPENS - 1), "before");
  assert.equal(adminPhase(c, OPENS), "open");
  assert.equal(adminPhase(c, CLOSES), "closed");
  assert.deepEqual(averageOf({ overall: 4.25 }, "overall"), { avg: 4.25, count: null, nps: null, counts: null, na: null });
  assert.deepEqual(averageOf({ nps: { average: "8.1", n: 12, nps: 42, na: 3 } }, "nps"), { avg: 8.1, count: 12, nps: 42, counts: null, na: 3 });
  assert.deepEqual(averageOf([{ id: "best", count: 3, counts: { Sessions: 2 } }], "best"), { avg: null, count: 3, nps: null, counts: { Sessions: 2 }, na: null });
  // N/A counted apart, out of the option counts.
  assert.deepEqual(averageOf({ kind: { counts: { Panel: 2, na: 4 } } }, "kind"), { avg: null, count: null, nps: null, counts: { Panel: 2 }, na: 4 });
  assert.equal(averageOf({}, "x"), null);
  assert.equal(averageOf(null, "x"), null);
  assert.equal(averageOf({ x: {} }, "x"), null);
  assert.equal(answerText({ type: "rating" }, 4), "★ 4");
  assert.equal(answerText({ type: "consent" }, true), "Yes");
  assert.equal(answerText({ type: "multi" }, ["A", "B"]), "A, B");
  assert.equal(answerText({ type: "text" }, undefined), "");
  assert.equal(questionsFrom(undefined).length, 0);
});

test("invitation only and checked-in only: what the page shows instead of the questions", async () => {
  const { gateOf } = await import("./survey.js");
  const anon = surveyFromApi({ open: true, opensAt: API.opensAt, closesAt: API.closesAt, title: "T", invitationOnly: true, questions: [] });
  assert.equal(anon.invitationOnly, true);
  assert.equal(gateOf(anon), "invitation");
  assert.equal(gateOf(anon, { preview: true }), "");
  assert.equal(gateOf(anon, { demo: true }), "");
  const notIn = surveyFromApi({ open: true, eligible: false, message: "This survey is for people who attended TTFC 2026.", questions: [] });
  assert.equal(gateOf(notIn), "not_eligible");
  assert.equal(notIn.message, "This survey is for people who attended TTFC 2026.");
  assert.equal(gateOf(surveyFromApi({ ...API, invitationOnly: true })), ""); // a valid link: the questions
  assert.equal(gateOf(surveyFromApi(API)), "");
  const no = (status, body) => async () => ({ ok: false, status, json: async () => body });
  await assert.rejects(submitSurvey("x", {}, { fetchImpl: no(403, { code: "link_required", error: "x" }) }), (e) => e.code === "link_required" && /personal link/.test(e.message));
  await assert.rejects(submitSurvey("x", {}, { fetchImpl: no(403, { code: "not_checked_in" }) }), (e) => e.code === "not_checked_in" && /attended TTFC 2026/.test(e.message));
});

test("personal links: pasted emails, the server's rows, the CSV and Copy all", async () => {
  const { parseEmails, linkRowFrom, linksCsv, linksText } = await import("./survey.js");
  const pasted = "Priya Raman <Priya@DHL.com>, daniel@lakeshore.ca\n\tmaya@aurora.ca; priya@dhl.com\nnot-an-email, x@y\n=cmd@evil.com.";
  assert.deepEqual(parseEmails(pasted).emails, ["priya@dhl.com", "daniel@lakeshore.ca", "maya@aurora.ca", "=cmd@evil.com"]);
  assert.deepEqual(parseEmails("a@b.co b@b.co c@b.co", 2), { emails: ["a@b.co", "b@b.co"], extra: 1 });
  assert.deepEqual(parseEmails(""), { emails: [], extra: 0 });
  const rows = [
    linkRowFrom({ email: "priya@dhl.com", name: "Priya Raman", url: "https://www.thetechfestival.com/survey?t=abc", checkedIn: true }),
    linkRowFrom({ email: "=cmd@evil.com", name: "=HYPERLINK(1)", url: "javascript:alert(1)", checkedIn: false, warning: "Not checked in" }),
    linkRowFrom({ email: "nobody@x.co", error: "No pass with this email" }),
  ];
  assert.equal(rows[1].url, ""); // only https links are shown
  assert.equal(rows[2].checkedIn, null);
  const csv = linksCsv(rows);
  assert.equal(csv.split("\r\n")[0], "Name,Email,Checked in,Answered (Toronto),Emailed (Toronto),Personal link,Problem");
  assert.equal(csv.split("\r\n")[1], "Priya Raman,priya@dhl.com,Yes,,,https://www.thetechfestival.com/survey?t=abc,");
  assert.equal(csv.split("\r\n")[2], "'=HYPERLINK(1),'=cmd@evil.com,No,,,,Not checked in");
  assert.equal(csv.split("\r\n")[3], ",nobody@x.co,,,,,No pass with this email");
  const answered = linkRowFrom({ email: "a@b.co", url: "https://x.thetechfestival.com/s", answeredAt: "2026-10-27T16:40:00-04:00", emailedAt: "2026-10-27T16:05:00-04:00" });
  assert.equal(linksCsv([answered]).split("\r\n")[1], ",a@b.co,,\"Oct 27, 4:40 PM\",\"Oct 27, 4:05 PM\",https://x.thetechfestival.com/s,");
  assert.equal(linksText(rows), "Priya Raman <priya@dhl.com>\thttps://www.thetechfestival.com/survey?t=abc");
});

test("tracking: the wave plan, the progress line, Toronto times, the people rows", async () => {
  const { NOTIFY_LIMITS, PEOPLE_STATUSES, alreadyAnswered, daysFrom, intIn, notifyPlanText, peopleRowFrom, progressText, torontoClock, torontoShort } = await import("./survey.js");
  const opensAt = "2026-10-27T16:00:00-04:00";
  assert.equal(notifyPlanText({ autoNotify: true, opensAt }), "On — waves of 30 every 5 min from 4:15 PM on Tuesday, October 27");
  assert.equal(notifyPlanText({ autoNotify: true, opensAt, notifyStartDelayMin: "0", notifyBatchSize: "50", notifyIntervalMin: 10 }), "On — waves of 50 every 10 min from 4:00 PM on Tuesday, October 27");
  assert.equal(notifyPlanText({ autoNotify: false, opensAt }), "Off");
  assert.equal(notifyPlanText({ autoNotify: true }), "On — waves of 30 every 5 min");
  assert.equal(intIn("9999", NOTIFY_LIMITS.batch), 500);
  assert.equal(intIn("", NOTIFY_LIMITS.delay), 15);
  assert.equal(intIn("abc", NOTIFY_LIMITS.interval), 5);
  assert.equal(progressText({ sent: 120, remaining: 180, nextAt: "2026-10-27T16:35:00-04:00", done: false }), "Sent 120 · 180 left · next wave 4:35 PM");
  assert.equal(progressText({ sent: 1300, remaining: 0, done: true }), "All sent: 1,300 people");
  assert.equal(progressText({ sent: 0, remaining: 0, done: false }), "");
  assert.equal(progressText(null), "");
  assert.equal(torontoShort("2026-10-27T20:35:00Z"), "Oct 27, 4:35 PM");
  assert.equal(torontoClock(Date.parse("2026-10-27T16:05:00-04:00")), "4:05 PM");
  assert.equal(torontoShort(null), "");
  assert.deepEqual(daysFrom([2, 1, 1]), [1, 2]);
  assert.deepEqual(daysFrom(["day2"]), [2]);
  assert.deepEqual(daysFrom({ day1: true, day2: false }), [1]);
  assert.deepEqual(daysFrom("D1, D2"), [1, 2]);
  assert.deepEqual(daysFrom(null), []);
  const row = peopleRowFrom({ name: " Priya  Raman ", email: "p@dhl.com", company: "DHL", onApp: true, checkedInDays: [1], answeredAt: "2026-10-27T16:40:00-04:00", emailedAt: null, source: "app" });
  assert.equal(row.name, "Priya Raman");
  assert.deepEqual(row.days, [1]);
  assert.equal(row.answeredAt, Date.parse("2026-10-27T16:40:00-04:00"));
  assert.ok(Number.isNaN(row.emailedAt));
  const counts = { checkedIn: 600, answered: 120, notAnswered: 480, emailed: 400 };
  assert.deepEqual(PEOPLE_STATUSES.map((x) => [x.key, x.count(counts)]), [["all", 600], ["not_answered", 480], ["answered", 120], ["emailed", 400], ["not_emailed", 200]]);
  assert.equal(PEOPLE_STATUSES[4].count({ checkedIn: 3 }), undefined);
  assert.equal(alreadyAnswered({ count: 400, alreadyAnswered: 12 }), 12);
  assert.equal(alreadyAnswered({ counts: { answered: "7" } }), 7);
  assert.equal(alreadyAnswered({ count: 400 }), null);
});

test("admin: the wave settings round-trip and are checked", () => {
  const form = configToForm({ autoNotify: true, notifyStartDelayMin: 20, notifyBatchSize: 40, notifyIntervalMin: 3, opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-11-03T23:59:00-05:00", questions: [{ id: "a", type: "text", label: "A" }] });
  assert.deepEqual([form.notifyStartDelayMin, form.notifyBatchSize, form.notifyIntervalMin], ["20", "40", "3"]);
  const out = formToConfig(form);
  assert.deepEqual([out.autoNotify, out.notifyStartDelayMin, out.notifyBatchSize, out.notifyIntervalMin], [true, 20, 40, 3]);
  assert.deepEqual([configToForm({}).notifyStartDelayMin, configToForm({}).notifyBatchSize, configToForm({}).notifyIntervalMin], ["15", "30", "5"]);
  const bad = checkConfig({ ...form, notifyBatchSize: "0", notifyIntervalMin: "2.5" }).map((p) => p.where);
  assert.deepEqual(bad, ["notifyBatchSize", "notifyIntervalMin"]);
});
