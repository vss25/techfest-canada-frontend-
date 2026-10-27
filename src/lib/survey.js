/* =========================================================
   The TTFC 2026 attendee survey (Oct 26 2026). Shared by the
   public page (/survey, src/pages/Survey.jsx, the link the apps
   and the email send), its question renderer (components/
   SurveyQuestion.jsx), Admin › Website & app › Attendee survey
   (src/admin/app/Survey.jsx) and the web app's survey card.
   The organiser: the survey opens on Day 2 at 4:00 PM (Toronto)
   and nothing is sent to anyone until management has reviewed it.

   Server (backend claude/survey-winners):
     GET  /api/survey[?t=]  → { open, opensAt, closesAt, title, intro, thankYou, questions: [{ id, section, type, label,
          help?, options?, required, minLabel?, maxLabel? }], respondent: { name, email, title, company } | null, responded }
     POST /api/survey/responses { answers: { [id]: value }, name?, email?, title?, company?, t? }
          → 201 { ok } | 403 { code: "closed" } | 400 { error, field? }
     Admin: GET/PUT /api/console/survey (the config below), …/responses?page= (0-based), …/export (CSV),
          …/notify { confirm: "SEND" }, …/email?audience=day1|day2|both and POST …/email { audience, confirm: "SEND" }.
   `t` is a personal link token (the app's, or a pass holder's from the email): the page only passes it through.
   Invitation only (the organiser, Oct 26 2026: "This isn't a public survey. This would be sent out to attendees one
   on one"): without a valid link GET /api/survey sends { invitationOnly: true, questions: [] } and POST answers 403
   { code: "link_required" }. Only people who checked in can answer ("you can't survey if you haven't attended or
   checked in"): a link for someone who didn't gets { eligible: false, message, questions: [] }, POST 403
   { code: "not_checked_in" }. Staff hand out personal links from the admin page (GET /api/console/survey/link,
   POST /api/console/survey/links).
   An answer is: rating 1–5, nps 0–10 (integers), choice one of the options, multi a list of options, text / longtext
   a string, consent true; "na" (N/A) too for a rating, nps or choice with `allowNA`. Every question can be skipped
   unless it's `required`; the name and email are asked of everyone (prefilled from `respondent`).
   `showIf: { question, includes }`: the question is shown only when that choice / multi answer includes the option
   (e.g. the "Speaking at TTFC" questions when "Speaker" is ticked); hidden questions are neither checked nor sent.
   Pure, imports only the pure swag.js (Toronto time words): node --test src/lib/survey.test.mjs.
========================================================= */

import { parseToronto, swagWhen, torontoIso, torontoLocalInput } from "./swag.js";

export const SURVEY_PAGE = "/survey";
export const SURVEY_URL = "https://www.thetechfestival.com/survey";
/** The admin's "Preview" hands the draft (unsaved changes included) to /survey?preview=1 through this localStorage key. */
export const PREVIEW_KEY = "ttfc.survey.preview";
export const PREVIEW_MAX_AGE = 6 * 3600 * 1000;
/** The token from a personal link, kept for this tab once it's out of the address bar (index.html moves it). */
export const TOKEN_KEY = "ttfc.surveyToken";
/** Answers being typed, for this tab only (sessionStorage), so a reload doesn't lose them. Cleared on submit. */
export const DRAFT_KEY = "ttfc.survey.draft";

export const QUESTION_TYPES = Object.freeze(["rating", "nps", "choice", "multi", "text", "longtext", "consent"]);
export const TYPE_LABELS = Object.freeze({
  rating: "Stars (1 to 5)",
  nps: "0 to 10 (how likely)",
  choice: "Pick one",
  multi: "Pick any",
  text: "Short answer",
  longtext: "Long answer",
  consent: "Tick box",
});
/** Types with a list of options, and types with words under the two ends of the scale. */
export const HAS_OPTIONS = Object.freeze(["choice", "multi"]);
export const HAS_SCALE = Object.freeze(["rating", "nps"]);
/** Types that can offer "N/A" (`allowNA`), and the answer it stands for. */
export const HAS_NA = Object.freeze(["rating", "nps", "choice"]);
export const NA = "na";
/** Types another question can depend on (`showIf`). */
export const CAN_CONTROL = Object.freeze(["choice", "multi"]);

export const LIMITS = Object.freeze({
  text: 300, longtext: 2000, label: 200, help: 300, option: 80, options: 12, section: 60, questions: 40, scaleLabel: 40,
  title: 120, intro: 1000, thankYou: 1000, notifyTitle: 80, notifyBody: 240, name: 80, email: 254, jobTitle: 120, company: 120,
});

export const SURVEY_DEFAULTS = Object.freeze({
  title: "TTFC 2026 attendee survey",
  intro: "Tell us how TTFC 2026 went for you. It takes about two minutes.",
  thankYou: "Thank you! Your answers help us make TTFC 2027 even better.",
  notifyTitle: "How was TTFC 2026?",
  notifyBody: "Two minutes of your time helps us plan TTFC 2027. Tap to take the survey.",
});

const str = (v, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
const clip = (v, n) => String(v ?? "").slice(0, n);
// eslint-disable-next-line no-control-regex
const tidy = (v) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

/** "4:00 PM on Tuesday, October 27" (Toronto), or "" for a missing time. */
export const surveyWhen = (ms) => (Number.isFinite(ms) ? swagWhen(ms) : "");

/* ---------------- questions ---------------- */

/** A question from the server (or the admin's draft) with every field present and in range. */
export function normalizeQuestion(q, i = 0) {
  const x = q && typeof q === "object" ? q : {};
  const type = QUESTION_TYPES.includes(x.type) ? x.type : "text";
  const options = HAS_OPTIONS.includes(type) && Array.isArray(x.options)
    ? [...new Set(x.options.map((o) => tidy(typeof o === "string" ? o : o?.label ?? o?.value ?? "")).filter(Boolean))].slice(0, LIMITS.options)
    : [];
  return {
    id: str(x.id, `q${i + 1}`),
    section: tidy(x.section).slice(0, LIMITS.section),
    type,
    label: tidy(x.label).slice(0, LIMITS.label),
    help: tidy(x.help).slice(0, LIMITS.help),
    options,
    required: x.required === true,
    minLabel: HAS_SCALE.includes(type) ? tidy(x.minLabel).slice(0, LIMITS.scaleLabel) : "",
    maxLabel: HAS_SCALE.includes(type) ? tidy(x.maxLabel).slice(0, LIMITS.scaleLabel) : "",
    allowNA: HAS_NA.includes(type) && x.allowNA === true,
    showIf: showIfFrom(x.showIf),
  };
}

/** { question, includes } with both filled in, else null. */
export function showIfFrom(v) {
  if (!v || typeof v !== "object") return null;
  const question = str(v.question);
  const includes = tidy(v.includes);
  return question && includes ? { question, includes } : null;
}

/** Does `answer` (to a choice or multi question) include `option`? */
export const answerIncludes = (answer, option) => (Array.isArray(answer) ? answer.includes(option) : answer === option);

/**
 * The questions shown with these answers: those without `showIf`, and those whose question is shown and answered with
 * the option. A `showIf` on a question that isn't in the survey (deleted) is ignored; a loop hides the questions in it.
 */
export function visibleQuestions(questions, answers) {
  const list = questions || [];
  const byId = new Map(list.map((q) => [q.id, q]));
  const memo = new Map();
  const shown = (q, path) => {
    if (memo.has(q.id)) return memo.get(q.id);
    let v = true;
    const c = q.showIf;
    if (c && byId.has(c.question)) {
      if (path.has(q.id)) return false;
      path.add(q.id);
      v = shown(byId.get(c.question), path) && answerIncludes(answers?.[c.question], c.includes);
      path.delete(q.id);
    }
    memo.set(q.id, v);
    return v;
  };
  return list.filter((q) => shown(q, new Set()));
}

/** The questions people can answer: normalised, with a label, unique ids (the first of a repeated id wins). */
export function questionsFrom(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((q, i) => {
    const n = normalizeQuestion(q, i);
    if (!n.label || seen.has(n.id)) return;
    if (HAS_OPTIONS.includes(n.type) && n.options.length === 0) return;
    seen.add(n.id);
    out.push(n);
  });
  return out;
}

/** The questions grouped by section, sections in the order they first appear: [{ title, questions }]. */
export function groupSections(questions) {
  const groups = [];
  const at = new Map();
  for (const q of questions || []) {
    const title = q.section || "";
    if (!at.has(title)) { at.set(title, groups.length); groups.push({ title, questions: [] }); }
    groups[at.get(title)].questions.push(q);
  }
  return groups;
}

/** Is `v` a real answer to `q`? */
export function isAnswered(q, v) {
  if (v === NA) return !!q?.allowNA && HAS_NA.includes(q.type);
  switch (q?.type) {
    case "rating": return Number.isInteger(v) && v >= 1 && v <= 5;
    case "nps": return Number.isInteger(v) && v >= 0 && v <= 10;
    case "choice": return typeof v === "string" && q.options.includes(v);
    case "multi": return Array.isArray(v) && v.some((x) => q.options.includes(x));
    case "text": case "longtext": return typeof v === "string" && v.trim().length > 0;
    case "consent": return v === true;
    default: return false;
  }
}

const MISSING = {
  rating: "Choose a star rating.",
  nps: "Choose a number from 0 to 10.",
  choice: "Choose one.",
  multi: "Choose at least one.",
  text: "Write an answer.",
  longtext: "Write an answer.",
  consent: "Tick the box to continue.",
};

/** { [questionId]: problem in plain words } ({} = fine): required questions answered (of those shown), text within its length. */
export function checkAnswers(questions, answers) {
  const errors = {};
  for (const q of visibleQuestions(questions, answers)) {
    const v = answers?.[q.id];
    if ((q.type === "text" || q.type === "longtext") && typeof v === "string" && v.trim().length > LIMITS[q.type]) {
      errors[q.id] = `Keep it to ${LIMITS[q.type].toLocaleString("en-US")} characters.`;
    } else if (q.required && !isAnswered(q, v)) {
      errors[q.id] = MISSING[q.type] || "Answer this question.";
    }
  }
  return errors;
}

/** The first question with a problem, in page order ("" = none). */
export const firstProblem = (questions, errors) => (questions || []).find((q) => errors?.[q.id])?.id || "";

/** What's sent: only answered questions that are shown, text trimmed, picks in the options' order, "na" as it is. */
export function cleanAnswers(questions, answers) {
  const out = {};
  for (const q of visibleQuestions(questions, answers)) {
    const v = answers?.[q.id];
    if (!isAnswered(q, v)) continue;
    if (v === NA) out[q.id] = NA;
    else if (q.type === "multi") out[q.id] = q.options.filter((o) => v.includes(o));
    else if (q.type === "text" || q.type === "longtext") out[q.id] = v.trim().slice(0, LIMITS[q.type]);
    else out[q.id] = v;
  }
  return out;
}

/** Saved answers (a draft, or the server's earlier ones) that still fit today's questions. */
export function answersFrom(questions, raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const q of questions || []) {
    const v = raw[q.id];
    if (q.type === "multi" && Array.isArray(v)) {
      const picked = v.filter((x) => q.options.includes(x));
      if (picked.length) out[q.id] = picked;
    } else if ((q.type === "text" || q.type === "longtext") && typeof v === "string") {
      if (v) out[q.id] = v.slice(0, LIMITS[q.type]);
    } else if (isAnswered(q, v)) {
      out[q.id] = v;
    }
  }
  return out;
}

/** How many of the questions shown have an answer (for the progress line). */
export const answeredCount = (questions, answers) => visibleQuestions(questions, answers).filter((q) => isAnswered(q, answers?.[q.id])).length;

/* ---------------- about you ---------------- */

const EMAIL = /^[^\s@<>"',;:()[\]]+@[^\s@<>"',;:()[\]]+\.[^\s@<>"',;:()[\].]{2,}$/;
export const DETAIL_FIELDS = Object.freeze(["name", "email", "title", "company"]);

/** The respondent from the server ({ name, email, title, company } | null), tidied; null when it has nothing. */
export function respondentFrom(r) {
  if (!r || typeof r !== "object") return null;
  const out = {
    name: tidy(r.name).slice(0, LIMITS.name),
    email: String(r.email ?? "").trim().slice(0, LIMITS.email),
    title: tidy(r.title ?? r.jobTitle).slice(0, LIMITS.jobTitle),
    company: tidy(r.company ?? r.organization).slice(0, LIMITS.company),
  };
  return DETAIL_FIELDS.some((k) => out[k]) ? out : null;
}

/** The name and email are needed (prefilled for people who came with their own link); the title and company are optional. */
export const REQUIRED_DETAILS = Object.freeze(["name", "email"]);

/** { field: problem } ({} = fine). */
export function checkDetails(d) {
  const errors = {};
  const e = String(d?.email ?? "").trim();
  const name = tidy(d?.name);
  if (!name) errors.name = "Enter your name.";
  else if (name.length > LIMITS.name) errors.name = `Keep your name to ${LIMITS.name} characters.`;
  if (!e) errors.email = "Enter your email address.";
  else if (e.length > LIMITS.email || !EMAIL.test(e)) errors.email = "That email address doesn't look right. Check it and try again.";
  if (tidy(d?.title).length > LIMITS.jobTitle) errors.title = `Keep your job title to ${LIMITS.jobTitle} characters.`;
  if (tidy(d?.company).length > LIMITS.company) errors.company = `Keep your company to ${LIMITS.company} characters.`;
  return errors;
}

/* ---------------- the survey as the page sees it ---------------- */

/**
 * GET /api/survey → { open, opensAt (ms or NaN), closesAt, title, intro, thankYou, questions, respondent, responded,
 * answers } with defaults for empty texts. null when the answer isn't a survey. `answers`: the earlier answers if the
 * server sends them (optional; not in the contract), so "update your answers" can start from them.
 */
export function surveyFromApi(r) {
  if (!r || typeof r !== "object" || (typeof r.open !== "boolean" && !Array.isArray(r.questions))) return null;
  const questions = questionsFrom(r.questions);
  const earlier = r.answers && typeof r.answers === "object" ? r.answers : r.response?.answers;
  return {
    open: r.open === true,
    opensAt: parseToronto(r.opensAt),
    closesAt: parseToronto(r.closesAt),
    title: str(r.title, SURVEY_DEFAULTS.title).slice(0, LIMITS.title),
    intro: str(r.intro, "").slice(0, LIMITS.intro),
    thankYou: str(r.thankYou, SURVEY_DEFAULTS.thankYou).slice(0, LIMITS.thankYou),
    questions,
    respondent: respondentFrom(r.respondent),
    responded: r.responded === true,
    answers: answersFrom(questions, earlier),
    invitationOnly: r.invitationOnly === true,
    eligible: r.eligible !== false,
    message: str(r.message, "").slice(0, 300),
  };
}

export const NOT_ELIGIBLE_TEXT = "This survey is for people who attended TTFC 2026.";
export const INVITATION_TEXT = "Please use the personal link we sent you by email or in the TTFC app.";

/**
 * What the page shows instead of the questions, if anything: "not_eligible" (a link for someone who didn't check in),
 * "invitation" (no valid personal link), or "" (the survey itself). The demo and the admin's preview never get these.
 */
export function gateOf(s, { preview = false, demo = false } = {}) {
  if (!s || preview || demo) return "";
  if (!s.eligible) return "not_eligible";
  if (s.invitationOnly && !s.questions.length) return "invitation";
  return "";
}

/** "before" (opens later) | "open" | "closed", from the server's `open` and the clock at `now` (ms). */
export function surveyPhase(s, now = Date.now()) {
  if (!s) return "closed";
  if (s.open) return Number.isFinite(s.closesAt) && now >= s.closesAt ? "closed" : "open";
  if (Number.isFinite(s.opensAt) && now < s.opensAt) return "before";
  return "closed";
}

/** The request body for POST /api/survey/responses. Details only when given; `t` only with a token. */
export function responseBody({ questions, answers, details, token }) {
  const body = { answers: cleanAnswers(questions, answers) };
  for (const k of DETAIL_FIELDS) {
    const v = k === "email" ? String(details?.[k] ?? "").trim() : tidy(details?.[k]);
    if (v) body[k] = v.slice(0, LIMITS[k === "title" ? "jobTitle" : k]);
  }
  if (token) body.t = String(token);
  return body;
}

export const SURVEY_ERRORS = Object.freeze({
  network: "We couldn't reach our server. Check your connection and try again.",
  failed: "Something went wrong. Please try again, or email enquire@thetechfestival.com.",
  closed: "The survey has closed. Thank you for your interest.",
  load: "We couldn't load the survey. Check your connection and try again.",
});

const base = (api) => String(api).replace(/\/+$/, "");

/** GET {api}/survey[?t=] → surveyFromApi(); throws an Error in plain words when it can't. */
export async function fetchSurvey(api, token, { fetchImpl = globalThis.fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(`${base(api)}/survey${token ? `?t=${encodeURIComponent(token)}` : ""}`, { credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } });
  } catch {
    throw Object.assign(new Error(SURVEY_ERRORS.load), { code: "network" });
  }
  const data = await res.json().catch(() => null);
  const s = res.ok ? surveyFromApi(data) : null;
  if (!s) throw Object.assign(new Error(SURVEY_ERRORS.load), { status: res.status });
  return s;
}

/** POST {api}/survey/responses → { ok: true }; throws an Error with `code` ("closed" | "network" | …), `field` and a message. */
export async function submitSurvey(api, body, { fetchImpl = globalThis.fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(`${base(api)}/survey/responses`, {
      method: "POST", credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error(SURVEY_ERRORS.network), { code: "network", field: "" });
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.ok !== false) return { ok: true };
  if (data?.code === "closed") throw Object.assign(new Error(str(data.message, SURVEY_ERRORS.closed)), { code: "closed", field: "", status: res.status });
  if (data?.code === "link_required") throw Object.assign(new Error(INVITATION_TEXT), { code: "link_required", field: "", status: res.status });
  if (data?.code === "not_checked_in") throw Object.assign(new Error(str(data.message, NOT_ELIGIBLE_TEXT)), { code: "not_checked_in", field: "", status: res.status });
  const msg = data?.error === "maintenance" ? data.message : data?.error || data?.message;
  throw Object.assign(new Error(typeof msg === "string" && msg.trim() ? msg.trim() : SURVEY_ERRORS.failed), { code: data?.code || "", field: data?.field || "", status: res.status });
}

/** A demo survey for the web app's demo mode (/survey?t=demo): nothing is fetched or sent. */
export const DEMO_SURVEY = Object.freeze({
  open: true, opensAt: "2026-10-27T16:00:00-04:00", closesAt: "2026-11-03T23:59:00-05:00",
  title: SURVEY_DEFAULTS.title, intro: SURVEY_DEFAULTS.intro, thankYou: SURVEY_DEFAULTS.thankYou,
  respondent: { name: "Alex Morgan", email: "alex@example.com", title: "Head of Innovation", company: "Northwind Labs" }, responded: false,
  questions: [
    { id: "role", section: "About your visit", type: "multi", label: "You were at TTFC as…", options: ["Attendee", "Speaker", "Exhibitor", "Sponsor", "Media"] },
    { id: "overall", section: "About your visit", type: "rating", label: "Overall, how was TTFC 2026?", minLabel: "Poor", maxLabel: "Excellent" },
    { id: "nps", section: "About your visit", type: "nps", label: "How likely are you to recommend TTFC to a colleague?", minLabel: "Not likely", maxLabel: "Very likely" },
    { id: "content", section: "Content and production", type: "rating", label: "The quality of the sessions and speakers", allowNA: true, minLabel: "Poor", maxLabel: "Excellent" },
    { id: "production", section: "Content and production", type: "rating", label: "Stage production: sound, screens, timing", allowNA: true },
    { id: "best", section: "Content and production", type: "multi", label: "What was most useful?", options: ["Sessions", "Networking", "Expo floor", "The app", "Meals and breaks"] },
    { id: "onboarding", section: "Speaking at TTFC", type: "rating", label: "Speaker onboarding: briefings and information before the event", allowNA: true, showIf: { question: "role", includes: "Speaker" } },
    { id: "hosting", section: "Speaking at TTFC", type: "rating", label: "Hosting on the day: green room, moderators, stage team", allowNA: true, showIf: { question: "role", includes: "Speaker" } },
    { id: "sessionSetup", section: "Speaking at TTFC", type: "choice", label: "Setting up your session (format, slides, polls) was…", options: ["Easy", "OK", "Hard"], allowNA: true, showIf: { question: "role", includes: "Speaker" } },
    { id: "return", section: "Next year", type: "choice", label: "Will you come to TTFC 2027?", options: ["Yes", "Maybe", "No"] },
    { id: "improve", section: "Next year", type: "longtext", label: "What should we change for 2027?", help: "Anything at all: sessions, venue, timing, the app." },
    { id: "contact", section: "Next year", type: "consent", label: "You can contact me about my answers." },
  ],
});

/* ---------------- the admin's draft ---------------- */

/** The admin form from GET /api/console/survey's `config` (times as Toronto datetime-local values). */
export function configToForm(config) {
  const c = config && typeof config === "object" ? config : {};
  const opens = parseToronto(c.opensAt);
  const closes = parseToronto(c.closesAt);
  return {
    enabled: c.enabled === true,
    opensAt: torontoLocalInput(opens),
    closesAt: torontoLocalInput(closes),
    title: String(c.title ?? ""),
    intro: String(c.intro ?? ""),
    thankYou: String(c.thankYou ?? ""),
    notifyTitle: String(c.notifyTitle ?? ""),
    notifyBody: String(c.notifyBody ?? ""),
    autoNotify: c.autoNotify === true,
    questions: keysForShowIf((Array.isArray(c.questions) ? c.questions : []).map((q, i) => ({ ...normalizeQuestion(q, i), key: `k${i}-${str(q?.id, "q")}` }))),
  };
}

/* In the admin's draft a `showIf` points at a question's `key` (new questions have no id until they're saved);
   saved, it points at the id. */
function keysForShowIf(list) {
  const keyOf = new Map(list.map((q) => [q.id, q.key]));
  return list.map((q) => (q.showIf && keyOf.has(q.showIf.question) ? { ...q, showIf: { ...q.showIf, question: keyOf.get(q.showIf.question) } } : q));
}

/** "Overall, how was it?" → "overall-how-was-it" (letters and digits, dashes, at most 40). */
export function slug(text) {
  return String(text ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

/** An id for a new question from its label, not in `taken` ("overall", "overall-2", …; "question" without a label). */
export function uniqueId(label, taken) {
  const used = new Set(taken || []);
  const root = slug(label) || "question";
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) if (!used.has(`${root}-${n}`)) return `${root}-${n}`;
}

/** The PUT body from the admin form: times with Toronto's offset; new questions get an id from their label. */
export function formToConfig(form) {
  const f = form || {};
  const taken = (f.questions || []).map((q) => q.id).filter(Boolean);
  const ids = (f.questions || []).map((q) => {
    if (q.id) return normalizeQuestion(q).id;
    const id = uniqueId(normalizeQuestion(q).label, taken);
    taken.push(id);
    return id;
  });
  // `showIf` in the draft names a question by its key (or, for older drafts, its id).
  const idOf = new Map();
  (f.questions || []).forEach((q, i) => { idOf.set(q.id || ids[i], ids[i]); if (q.key) idOf.set(q.key, ids[i]); });
  const questions = (f.questions || []).map((q, i) => {
    const n = normalizeQuestion(q);
    const id = ids[i];
    const cond = n.showIf && idOf.has(n.showIf.question) && idOf.get(n.showIf.question) !== id ? { question: idOf.get(n.showIf.question), includes: n.showIf.includes } : null;
    return {
      id, section: n.section, type: n.type, label: n.label, required: n.required,
      ...(n.help ? { help: n.help } : {}),
      ...(HAS_OPTIONS.includes(n.type) ? { options: n.options } : {}),
      ...(HAS_SCALE.includes(n.type) && n.minLabel ? { minLabel: n.minLabel } : {}),
      ...(HAS_SCALE.includes(n.type) && n.maxLabel ? { maxLabel: n.maxLabel } : {}),
      ...(n.allowNA ? { allowNA: true } : {}),
      ...(cond ? { showIf: cond } : {}),
    };
  });
  return {
    enabled: !!f.enabled,
    opensAt: torontoIso(f.opensAt),
    closesAt: torontoIso(f.closesAt),
    title: clip(tidy(f.title), LIMITS.title),
    intro: clip(String(f.intro ?? "").trim(), LIMITS.intro),
    thankYou: clip(String(f.thankYou ?? "").trim(), LIMITS.thankYou),
    notifyTitle: clip(tidy(f.notifyTitle), LIMITS.notifyTitle),
    notifyBody: clip(tidy(f.notifyBody), LIMITS.notifyBody),
    autoNotify: !!f.autoNotify,
    questions,
  };
}

/** Problems with the admin form before saving: [{ where, message }] ([] = fine). `where`: a field or "q:<key>". */
export function checkConfig(form) {
  const out = [];
  const f = form || {};
  const opens = parseToronto(f.opensAt);
  const closes = parseToronto(f.closesAt);
  if (!Number.isFinite(opens)) out.push({ where: "opensAt", message: "Pick when the survey opens." });
  if (!Number.isFinite(closes)) out.push({ where: "closesAt", message: "Pick when the survey closes." });
  if (Number.isFinite(opens) && Number.isFinite(closes) && closes <= opens) out.push({ where: "closesAt", message: "The survey must close after it opens." });
  const qs = f.questions || [];
  if (!qs.length) out.push({ where: "questions", message: "Add at least one question." });
  if (qs.length > LIMITS.questions) out.push({ where: "questions", message: `Keep it to ${LIMITS.questions} questions.` });
  const refOf = (q) => q.key || q.id;
  qs.forEach((q, i) => {
    const n = i + 1;
    const where = `q:${q.key || q.id || i}`;
    if (!tidy(q.label)) out.push({ where, message: `Question ${n} needs its question text.` });
    const cond = showIfFrom(q.showIf);
    if (cond) {
      const at = qs.findIndex((x) => refOf(x) === cond.question || (x.id && x.id === cond.question));
      const ctl = qs[at];
      if (!ctl || at === i) out.push({ where, message: `Question ${n} is shown only if a question that's no longer there is answered. Choose another question, or Always.` });
      else if (!CAN_CONTROL.includes(ctl.type)) out.push({ where, message: `Question ${n} is shown only if question ${at + 1} is answered, but that one isn't a pick-one or pick-any question.` });
      else if (!(ctl.options || []).map(tidy).includes(cond.includes)) out.push({ where, message: `Question ${n} is shown only if “${cond.includes}” is picked in question ${at + 1}, but that option isn't there any more.` });
      else if (at > i) out.push({ where, message: `Question ${n} is shown only if question ${at + 1} is answered: move it below that question.` });
    }
    if (HAS_OPTIONS.includes(q.type)) {
      const opts = (q.options || []).map(tidy).filter(Boolean);
      if (opts.length < 2) out.push({ where, message: `Question ${n} needs at least two options.` });
      if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) out.push({ where, message: `Question ${n} has the same option twice.` });
    }
  });
  return out;
}

/** A new question of `type` in `section` (its id is made from the label when saved). */
export function blankQuestion(type = "rating", section = "", key = "") {
  const t = QUESTION_TYPES.includes(type) ? type : "rating";
  return {
    key: key || `n${Math.random().toString(36).slice(2, 9)}`, id: "", section, type: t, label: "", help: "", required: false,
    options: HAS_OPTIONS.includes(t) ? ["", ""] : [],
    minLabel: t === "nps" ? "Not likely" : t === "rating" ? "Poor" : "",
    maxLabel: t === "nps" ? "Very likely" : t === "rating" ? "Excellent" : "",
    allowNA: false, showIf: null,
  };
}

/** The question with a new type: the label, help, section and required stay; options and scale words as the type needs. */
export function changeType(q, type) {
  if (!QUESTION_TYPES.includes(type) || q.type === type) return q;
  const fresh = blankQuestion(type, q.section, q.key);
  const keepOptions = HAS_OPTIONS.includes(type) && (q.options || []).some((o) => tidy(o));
  // Scale words someone wrote themselves stay (rating ↔ nps); the old type's default words are swapped for the new one's.
  const before = blankQuestion(q.type);
  const ownWords = (q.minLabel && q.minLabel !== before.minLabel) || (q.maxLabel && q.maxLabel !== before.maxLabel);
  const keepScale = HAS_SCALE.includes(type) && HAS_SCALE.includes(q.type) && !!ownWords;
  return {
    ...q, type,
    options: keepOptions ? q.options : fresh.options,
    minLabel: keepScale ? q.minLabel : fresh.minLabel,
    maxLabel: keepScale ? q.maxLabel : fresh.maxLabel,
    allowNA: HAS_NA.includes(type) ? !!q.allowNA : false,
  };
}

/** A copy of `list` with the item at `from` moved to `to` (out of range: unchanged). */
export function moveItem(list, from, to) {
  const a = [...(list || [])];
  if (from < 0 || from >= a.length || to < 0 || to >= a.length || from === to) return a;
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

/** Every question in section `from` moved to section `to` (a rename; "" = no section). */
export const renameSection = (questions, from, to) => (questions || []).map((q) => ((q.section || "") === from ? { ...q, section: tidy(to).slice(0, LIMITS.section) } : q));

/** The section names in order of first appearance ("" included when some questions have none). */
export const sectionNames = (questions) => groupSections(questions).map((g) => g.title);

/** "off" | "before" | "open" | "closed" for the admin, from the saved config at `now`. */
export function adminPhase(config, now = Date.now()) {
  if (!config || config.enabled !== true) return "off";
  const opens = parseToronto(config.opensAt);
  const closes = parseToronto(config.closesAt);
  if (Number.isFinite(opens) && now < opens) return "before";
  if (Number.isFinite(closes) && now >= closes) return "closed";
  return "open";
}

/**
 * One question's average from GET /api/console/survey `averages`, whatever its shape: { [id]: 4.2 },
 * { [id]: { avg|average|mean, count|n|responses, nps?, counts?, na? } } or [{ id, … }]. → { avg, count, nps, counts, na } or
 * null. N/A answers are counted apart (`na`, or "na" in `counts`, taken out of the counts) and never in the average.
 */
export function averageOf(averages, id) {
  if (!averages) return null;
  const raw = Array.isArray(averages) ? averages.find((a) => a && (a.id === id || a.questionId === id)) : averages[id];
  if (raw === undefined || raw === null) return null;
  const numOr = (...vals) => { for (const v of vals) { const n = Number(v); if (v !== null && v !== undefined && v !== "" && Number.isFinite(n)) return n; } return null; };
  if (typeof raw === "number" || typeof raw === "string") { const avg = numOr(raw); return avg === null ? null : { avg, count: null, nps: null, counts: null, na: null }; }
  if (typeof raw !== "object") return null;
  const counts = raw.counts && typeof raw.counts === "object" && !Array.isArray(raw.counts) ? raw.counts : null;
  const na = numOr(raw.na, raw.naCount, raw.notApplicable, counts?.[NA], counts?.["N/A"]);
  const shownCounts = counts ? Object.fromEntries(Object.entries(counts).filter(([k]) => k !== NA && k !== "N/A")) : null;
  const out = { avg: numOr(raw.avg, raw.average, raw.mean), count: numOr(raw.count, raw.n, raw.responses, raw.answers), nps: numOr(raw.nps, raw.score), counts: shownCounts, na };
  return out.avg === null && out.count === null && out.nps === null && !counts && na === null ? null : out;
}

/** An answer as one short line for the responses table ("★ 4", "9", "Yes", "Sessions, Networking", the text). */
export function answerText(q, v) {
  if (v === undefined || v === null || v === "") return "";
  if (v === NA) return "N/A";
  if (q?.type === "rating" && Number.isFinite(Number(v))) return `★ ${Number(v)}`;
  if (q?.type === "consent") return v === true || v === "true" ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

/* ---------------- personal links (admin) ---------------- */

const EMAIL_IN_TEXT = /[^\s<>(),;:"'[\]]+@[^\s<>(),;:"'[\]]+\.[^\s<>(),;:"'[\].]{2,}/g;
export const MAX_LINK_EMAILS = 500;

/** Pasted text (one per line, commas, "Name <email>", a spreadsheet column) → { emails (unique, lower case, in order), extra }. */
export function parseEmails(text, max = MAX_LINK_EMAILS) {
  const found = String(text ?? "").match(EMAIL_IN_TEXT) || [];
  const seen = new Set();
  const all = [];
  for (const e of found) {
    const v = e.replace(/[.]+$/, "").toLowerCase();
    if (!EMAIL.test(v) || seen.has(v)) continue;
    seen.add(v);
    all.push(v);
  }
  return { emails: all.slice(0, max), extra: Math.max(0, all.length - max) };
}

/** One answer from the link endpoints → { email, name, url, checkedIn (true | false | null), warning, error }. */
export function linkRowFrom(r) {
  const x = r && typeof r === "object" ? r : {};
  return {
    email: String(x.email ?? "").trim(),
    name: tidy(x.name),
    url: /^https:\/\//i.test(String(x.url ?? "")) ? String(x.url) : "",
    checkedIn: typeof x.checkedIn === "boolean" ? x.checkedIn : null,
    warning: str(x.warning, ""),
    error: str(x.error, ""),
  };
}

const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** The links as a CSV (Name, Email, Checked in, Personal link, Problem), CRLF lines; spreadsheet formulas neutralised. */
export function linksCsv(rows) {
  const lines = [["Name", "Email", "Checked in", "Personal link", "Problem"]];
  for (const r of rows || []) lines.push([r.name, r.email, r.checkedIn === true ? "Yes" : r.checkedIn === false ? "No" : "", r.url, r.error || r.warning]);
  return `${lines.map((l) => l.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** "Copy all": one line per person with a link, "Name <email>\tlink" (pastes into a sheet as two columns). */
export const linksText = (rows) => (rows || []).filter((r) => r.url).map((r) => `${r.name ? `${r.name} <${r.email}>` : r.email}\t${r.url}`).join("\n");
