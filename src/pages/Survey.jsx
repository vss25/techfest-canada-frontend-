import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Clock, Eye, Lock, Mail, Pencil, RefreshCw, Star, UserRoundX } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SurveyQuestion, { SURVEY_QUESTION_CSS } from "../components/SurveyQuestion";
import { surveyVars } from "../lib/surveyTheme";
import { RATE_PROMPT, rateLinks, showRatePrompt } from "../lib/rate";
import { detectOS } from "../lib/pwaPlatform";
import { isNativeVisit, nativeAppSource } from "../lib/nativeVisit";
import { PUBLIC_API } from "../hooks/useSiteSettings";
import {
  DEMO_SURVEY, DETAIL_FIELDS, DRAFT_KEY, INVITATION_TEXT, NOT_ELIGIBLE_TEXT, PREVIEW_KEY, PREVIEW_MAX_AGE, REQUIRED_DETAILS, SURVEY_ERRORS,
  TOKEN_KEY, answeredCount, answersFrom, checkAnswers, checkDetails, fetchSurvey, firstProblem, gateOf, groupSections, responseBody, submitSurvey,
  surveyFromApi, surveyPhase, surveyWhen, visibleQuestions,
} from "../lib/survey";

/* =========================================================
   /survey: the TTFC 2026 attendee survey (Oct 26 2026). By
   invitation only (the organiser: "This isn't a public survey.
   This would be sent out to attendees one on one"): the link the
   apps open and the survey email sends, each with the person's own
   token (?t=…). Without one, a calm "This survey is by invitation"
   and no questions; for someone who didn't check in, "This survey
   is for people who attended TTFC 2026" (the server decides both:
   invitationOnly, eligible; src/lib/survey.js gateOf). The
   token is only passed through: index.html moves it out of the
   address bar into this tab's sessionStorage before any analytics
   can read the URL (this page does the same as a fallback).
   The server (GET /api/survey, src/lib/survey.js) sends the
   questions, grouped here by section, and who's answering
   (prefilled, editable). States: loading · "opens at 4:00 PM on
   Tuesday, October 27" (the page reloads it by itself at that
   time) · the form · "you've already answered: update your
   answers" · thank you (the server's thankYou, with "Change my
   answers") · closed · couldn't load.
   Every question can be skipped unless it's required; some offer
   "N/A"; some show only for an answer (`showIf`, e.g. the speakers'
   questions when "Speaker" is ticked), and hidden ones aren't sent.
   The name and email are needed (prefilled for people with their
   own link). Problems are shown before sending (the cursor goes to
   the first one to fix). Answers being typed are kept for this tab
   (sessionStorage) until they're sent. Mobile first: most people
   open it from the app on a phone. noindex; no ticket bar or
   announcement (components/TicketBar.jsx, SiteNotices.jsx).
   Thank you (Oct 27 2026): people who came from the app (?from=
   ttfc-app, ?source=…) or are on a phone also get a neutral "Enjoying
   the TTFC app? Rate it" with their store (both on a computer), via
   /rate (src/lib/rate.js); never a request for a particular rating.
   ?preview=1 (Admin › Attendee survey › Preview): the admin's draft,
   unsaved changes included (localStorage, src/lib/survey.js
   PREVIEW_KEY), or else the saved survey; it's always open and never
   sends. ?t=demo (the web app's demo mode): a sample survey, never sent.
========================================================= */

function useDarkMode() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const read = () => setDark(document.body.classList.contains("dark-mode"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** The personal token (index.html already moved it to sessionStorage) and ?preview=1. Takes ?t= out of the address bar. */
function readLink() {
  let token = "";
  let preview = false;
  try {
    const q = new URLSearchParams(window.location.search);
    preview = q.get("preview") === "1";
    token = String(window.__ttfcSurveyToken || q.get("t") || "").trim();
    if (token) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked: kept in memory */ } }
    else { try { token = sessionStorage.getItem(TOKEN_KEY) || ""; } catch { token = ""; } }
    if (q.has("t")) {
      q.delete("t");
      const qs = q.toString();
      window.history.replaceState(window.history.state, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
    }
  } catch { /* no window */ }
  token = token.slice(0, 512);
  return { token, preview, demo: token === "demo" };
}

/** The admin's draft for ?preview=1 (Admin › Attendee survey › Preview), when it's recent. */
function readPreview() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREVIEW_KEY) || "null");
    if (!raw || !raw.config || Date.now() - Number(raw.at || 0) > PREVIEW_MAX_AGE) return null;
    return surveyFromApi({ ...raw.config, open: true, respondent: null, responded: false });
  } catch { return null; }
}

const readDraft = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    return d && Date.now() - Number(d.at || 0) < 12 * 3600 * 1000 ? d : null;
  } catch { return null; }
};
const writeDraft = (d) => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, at: Date.now() })); } catch { /* full or blocked */ } };
const clearDraft = () => { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* blocked */ } };

const EMPTY_DETAILS = { name: "", email: "", title: "", company: "" };
const DETAIL_LABELS = { name: "Your name", email: "Email", title: "Job title", company: "Company or organisation" };
const DETAIL_INPUT = {
  name: { autoComplete: "name", autoCapitalize: "words", maxLength: 80 },
  email: { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, maxLength: 254 },
  title: { autoComplete: "organization-title", maxLength: 120 },
  company: { autoComplete: "organization", maxLength: 120 },
};

const PAGE_CSS = `
  .sv { background: var(--sv-bg); color: var(--sv-text); min-height: 100vh; overflow-x: hidden; overflow-x: clip; }
  .sv-wrap { max-width: 720px; margin: 0 auto; padding: clamp(92px, 12vw, 124px) 16px 72px; }
  .sv-chip-top { display: inline-flex; align-items: center; gap: 8px; margin: 0; padding: 6px 12px; border-radius: 999px; background: var(--sv-chip); color: var(--sv-accent);
    font-size: 13px; font-weight: 700; letter-spacing: 0.3px; }
  .sv-h1 { margin: 14px 0 0; font-size: clamp(28px, 6.4vw, 42px); line-height: 1.12; font-weight: 800; letter-spacing: -0.4px; }
  .sv-intro { margin: 12px 0 0; font-size: 17px; line-height: 1.6; color: var(--sv-mid); white-space: pre-line; }
  .sv-meta { margin: 10px 0 0; font-size: 14px; color: var(--sv-dim); }
  .sv-note { display: flex; gap: 12px; align-items: flex-start; margin: 18px 0 0; padding: 14px 16px; border-radius: 16px; background: var(--sv-chip); border: 1px solid var(--sv-line);
    font-size: 15px; line-height: 1.5; color: var(--sv-text); }
  .sv-note svg { flex: none; width: 20px; height: 20px; margin-top: 1px; color: var(--sv-accent); }
  .sv-note b { display: block; }
  .sv-card { margin-top: 18px; padding: 20px 18px; border-radius: 20px; background: var(--sv-card); border: 1px solid var(--sv-line); display: grid; gap: 26px; }
  .sv-sec-title { margin: 0 0 -8px; font-size: 13px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: var(--sv-accent); }
  .sv-who { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 18px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--sv-line); background: var(--sv-card); font-size: 15px; }
  .sv-who span { flex: 1 1 220px; min-width: 0; line-height: 1.45; color: var(--sv-mid); }
  .sv-who b { color: var(--sv-text); }
  .sv-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--sv-line);
    background: transparent; color: var(--sv-text); font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; font-family: inherit; }
  .sv-fields { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sv-field { display: grid; gap: 6px; min-width: 0; }
  .sv-field label { font-size: 14px; font-weight: 700; }
  .sv-opt { font-weight: 500; color: var(--sv-dim); }
  .sv-submit { display: grid; gap: 10px; margin-top: 22px; }
  .sv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 54px; padding: 0 26px; border: 0; border-radius: 999px; width: 100%;
    background: linear-gradient(135deg, #7a3fd1 0%, #f5a623 100%); color: #fff; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 800;
    letter-spacing: 1px; text-transform: uppercase; text-decoration: none; cursor: pointer; box-shadow: 0 6px 20px rgba(122,63,209,0.28); }
  .sv-btn:disabled { opacity: 0.65; cursor: progress; }
  .sv-btn:focus-visible, .sv-ghost:focus-visible { outline: 3px solid var(--sv-accent); outline-offset: 2px; }
  .sv-progress { margin: 0; text-align: center; font-size: 14px; color: var(--sv-dim); }
  .sv-form-err { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--sv-err); color: var(--sv-err); font-size: 15px; font-weight: 600; line-height: 1.45; }
  .sv-form-err svg { flex: none; width: 18px; height: 18px; margin-top: 2px; }
  .sv-state { margin-top: 18px; display: grid; justify-items: center; text-align: center; gap: 10px; padding: 32px 20px; border-radius: 22px; background: var(--sv-card); border: 1px solid var(--sv-line); }
  .sv-state-ico { width: 52px; height: 52px; color: var(--sv-accent); }
  .sv-state-ico.is-good { color: #2fa36b; }
  .sv-state h1, .sv-state h2 { margin: 4px 0 0; font-size: clamp(22px, 5vw, 30px); font-weight: 800; line-height: 1.2; outline: none; }
  .sv-state p { margin: 0; max-width: 520px; font-size: 17px; line-height: 1.6; color: var(--sv-mid); white-space: pre-line; }
  .sv-state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }
  .sv-rate { margin-top: 14px; display: grid; justify-items: center; gap: 10px; padding: 18px 16px; border-radius: 18px; border: 1px dashed var(--sv-line); text-align: center; }
  .sv-rate-q { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.4; }
  .sv-rate-q svg { display: inline-block; width: 18px; height: 18px; margin-right: 6px; vertical-align: -3px; color: var(--sv-star); }
  .sv-skel { margin-top: 18px; display: grid; gap: 12px; }
  .sv-skel i { display: block; height: 18px; border-radius: 8px; background: var(--sv-chip); }
  .sv-preview { display: flex; gap: 10px; align-items: center; margin: 0 0 16px; padding: 10px 14px; border-radius: 14px; background: #f5a623; color: #1a0f00; font-size: 14px; font-weight: 700; }
  .sv-preview svg { width: 18px; height: 18px; flex: none; }
  @media (max-width: 560px) { .sv-fields { grid-template-columns: 1fr; } .sv-card { padding: 18px 14px; } }
`;

export default function Survey() {
  const dark = useDarkMode();
  const uid = useId();
  const [link] = useState(readLink);
  // "Rate it" on the thank-you: from the app, or on a phone (worked out once, before anything tidies the address).
  const [rate] = useState(() => {
    let fromApp = false;
    try { fromApp = !!nativeAppSource(window.location.search) || isNativeVisit(); } catch { fromApp = false; }
    const os = detectOS();
    return showRatePrompt({ os, fromApp }) ? rateLinks(os) : [];
  });
  const [load, setLoad] = useState({ status: "loading", survey: null, error: "", at: 0 });
  const [answers, setAnswers] = useState({});
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [editDetails, setEditDetails] = useState(false);
  const [errors, setErrors] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [closedNow, setClosedNow] = useState("");
  const [gateNow, setGateNow] = useState({ gate: "", message: "" }); // the server refused the answers: no link, or not checked in
  const doneRef = useRef(null);
  const started = useRef(false);
  const touched = useRef(false);

  const fetchIt = useCallback(async () => {
    if (link.demo) return surveyFromApi(DEMO_SURVEY);
    if (link.preview) { const p = readPreview(); if (p) return p; }
    return fetchSurvey(PUBLIC_API, link.token);
  }, [link]);

  const reload = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoad((l) => ({ ...l, status: "loading", error: "" }));
    try {
      const survey = await fetchIt();
      setLoad({ status: "ready", survey, error: "", at: Date.now() });
      // First load: start from the server's earlier answers (if any), this tab's draft over them, and who they are.
      if (!started.current) {
        started.current = true;
        // This tab's draft, only for the same link (another person's link in this tab starts clean).
        const saved = readDraft();
        const draft = saved && (saved.token || "") === link.token ? saved : null;
        setAnswers({ ...survey.answers, ...answersFrom(survey.questions, draft?.answers) });
        const who = { ...EMPTY_DETAILS, ...(survey.respondent || {}) };
        for (const k of DETAIL_FIELDS) if (typeof draft?.details?.[k] === "string" && draft.details[k].trim()) who[k] = draft.details[k];
        setDetails(who);
      }
    } catch (e) {
      setLoad((l) => (quiet && l.survey ? l : { status: "error", survey: null, error: e.message || SURVEY_ERRORS.load, at: Date.now() }));
    }
  }, [fetchIt, link.token]);

  useEffect(() => { reload(); }, [reload]);

  // No search engines; the tab says what it is.
  useEffect(() => {
    const prev = document.title;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    return () => { document.title = prev; robots.remove(); };
  }, []);
  const s = load.survey;
  useEffect(() => { document.title = `${s?.title || "Survey"} | The Tech Festival Canada`; }, [s?.title]);

  const phase = closedNow ? "closed" : (link.preview || link.demo) && s?.questions.length ? "open" : surveyPhase(s, load.at);

  // Waiting for it to open: load it again at the opening time (within a day), so an open page just starts.
  useEffect(() => {
    if (load.status !== "ready" || phase !== "before" || !Number.isFinite(s?.opensAt)) return undefined;
    const wait = s.opensAt - Date.now() + 1500;
    if (wait > 24 * 3600 * 1000) return undefined;
    const t = setTimeout(() => reload({ quiet: true }), Math.max(1000, wait));
    return () => clearTimeout(t);
  }, [load.status, phase, s?.opensAt, reload]);

  // Keep what's being typed for this tab (once they've changed something).
  useEffect(() => {
    if (!started.current || !touched.current || done || link.preview) return;
    writeDraft({ answers, details, token: link.token });
  }, [answers, details, done, link.preview, link.token]);

  useEffect(() => { if (done) { window.scrollTo({ top: 0 }); doneRef.current?.focus({ preventScroll: true }); } }, [done]);

  const setAnswer = (id) => (v) => {
    touched.current = true;
    setAnswers((a) => { const next = { ...a }; if (v === undefined) delete next[id]; else next[id] = v; return next; });
    if (errors[id]) setErrors((e) => { const next = { ...e }; delete next[id]; return next; });
  };
  const setDetail = (k) => (e) => {
    touched.current = true;
    const v = e.target.value;
    setDetails((d) => ({ ...d, [k]: v }));
    if (detailErrors[k]) setDetailErrors((x) => ({ ...x, [k]: "" }));
  };

  const focusQuestion = (id) => {
    const el = document.getElementById(`${uid}-q-${id}`);
    el?.scrollIntoView({ block: "center" });
    el?.querySelector("input, textarea")?.focus({ preventScroll: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending || !s) return;
    const found = checkAnswers(s.questions, answers);
    const foundDetails = checkDetails(details);
    setErrors(found);
    setDetailErrors(foundDetails);
    const n = Object.keys(found).length + Object.values(foundDetails).filter(Boolean).length;
    if (n) {
      setFormError(n === 1 ? "One answer needs a look before sending." : `${n} answers need a look before sending.`);
      const first = firstProblem(s.questions, found);
      if (first) focusQuestion(first);
      else {
        setEditDetails(true);
        const k = DETAIL_FIELDS.find((f) => foundDetails[f]);
        setTimeout(() => document.getElementById(`${uid}-d-${k}`)?.focus(), 0);
      }
      return;
    }
    setFormError("");
    if (link.preview || link.demo) { setUpdated(s.responded); setDone(true); return; }
    setSending(true);
    try {
      await submitSurvey(PUBLIC_API, responseBody({ questions: s.questions, answers, details, token: link.token }));
      clearDraft();
      touched.current = false;
      setUpdated(s.responded);
      setLoad((l) => ({ ...l, survey: { ...l.survey, responded: true } }));
      setDone(true);
    } catch (err) {
      if (err.code === "closed") { setClosedNow(err.message); return; }
      if (err.code === "link_required") { setGateNow({ gate: "invitation", message: "" }); return; }
      if (err.code === "not_checked_in") { setGateNow({ gate: "not_eligible", message: err.message }); return; }
      if (err.field && s.questions.some((q) => q.id === err.field)) { setErrors({ [err.field]: err.message }); focusQuestion(err.field); }
      else if (DETAIL_FIELDS.includes(err.field)) { setEditDetails(true); setDetailErrors({ [err.field]: err.message }); }
      else setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  const preview = (link.preview || link.demo) && (
    <p className="sv-preview" role="note"><Eye aria-hidden="true" />{link.demo ? "Demo: nothing you enter here is sent." : "Preview: this is how the survey looks. Nothing is sent."}</p>
  );

  let content;
  if (load.status === "loading" && !s) {
    content = (
      <div aria-busy="true" aria-label="Loading the survey">
        <p className="sv-chip-top"><ClipboardList size={15} aria-hidden="true" /> TTFC 2026</p>
        <div className="sv-skel" aria-hidden="true"><i style={{ width: "70%", height: 34 }} /><i style={{ width: "92%" }} /><i style={{ width: "60%" }} /><i style={{ height: 180, borderRadius: 20 }} /></div>
      </div>
    );
  } else if (load.status === "error" || !s) {
    content = (
      <div className="sv-state" role="alert">
        <AlertCircle className="sv-state-ico" aria-hidden="true" />
        <h1>We couldn't load the survey</h1>
        <p>{load.error || SURVEY_ERRORS.load}</p>
        <div className="sv-state-actions">
          <button type="button" className="sv-ghost" onClick={() => reload()}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
        </div>
        <p style={{ fontSize: 14 }}>Still stuck? Email <a href="mailto:enquire@thetechfestival.com" style={{ color: "var(--sv-accent)", fontWeight: 700 }}>enquire@thetechfestival.com</a>.</p>
      </div>
    );
  } else if ((gateNow.gate || gateOf(s, link)) === "not_eligible") {
    content = (
      <div className="sv-state" role="status">
        <UserRoundX className="sv-state-ico" aria-hidden="true" />
        <h1>{s.title}</h1>
        <p>{gateNow.message || s.message || NOT_ELIGIBLE_TEXT}</p>
        <p style={{ fontSize: 15 }}>If you were there and think this is a mistake, email <a href="mailto:enquire@thetechfestival.com" style={{ color: "var(--sv-accent)", fontWeight: 700 }}>enquire@thetechfestival.com</a>.</p>
      </div>
    );
  } else if (phase === "closed") {
    content = (
      <div className="sv-state" role="status">
        <Lock className="sv-state-ico" aria-hidden="true" />
        <h1>The survey has closed</h1>
        <p>{closedNow && closedNow !== SURVEY_ERRORS.closed ? closedNow : "Thank you for being part of TTFC 2026."}</p>
        <div className="sv-state-actions">
          <Link to="/stay-updated" className="sv-ghost">Join the TTFC 2027 waitlist <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    );
  } else if ((gateNow.gate || gateOf(s, link)) === "invitation") {
    content = (
      <div className="sv-state" role="status">
        <Mail className="sv-state-ico" aria-hidden="true" />
        <h1>This survey is by invitation</h1>
        <p>{INVITATION_TEXT}</p>
        {link.token && <p style={{ fontSize: 15 }}>The link you used doesn't work any more. Open the survey again from the TTFC app or your email.</p>}
      </div>
    );
  } else if (phase === "before") {
    content = (
      <div className="sv-state" role="status">
        <Clock className="sv-state-ico" aria-hidden="true" />
        <h1>{s.title}</h1>
        <p>The survey opens at <b style={{ color: "var(--sv-text)" }}>{surveyWhen(s.opensAt)}</b>.</p>
        <p style={{ fontSize: 15 }}>Come back then. If you leave this page open, the survey appears here by itself.</p>
      </div>
    );
  } else if (done) {
    content = (
      <>
        {preview}
        <div className="sv-state" role="status" aria-live="polite">
          <CheckCircle2 className="sv-state-ico is-good" aria-hidden="true" />
          <h1 ref={doneRef} tabIndex={-1}>{updated ? "Your answers are updated" : "Thank you"}</h1>
          <p>{s.thankYou}</p>
          <div className="sv-state-actions">
            <button type="button" className="sv-ghost" onClick={() => setDone(false)}><Pencil size={16} aria-hidden="true" /> Change my answers</button>
            <Link to="/" className="sv-ghost">Back to the homepage <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        {rate.length > 0 && (
          <div className="sv-rate">
            <p className="sv-rate-q"><Star aria-hidden="true" />{RATE_PROMPT}</p>
            <div className="sv-state-actions" style={{ marginTop: 0 }}>
              {rate.map((r) => <a key={r.store} href={r.href} className="sv-ghost">{r.label}</a>)}
            </div>
          </div>
        )}
      </>
    );
  } else {
    const shown = visibleQuestions(s.questions, answers);
    const groups = groupSections(shown);
    const total = shown.length;
    const answered = answeredCount(s.questions, answers);
    const anyRequired = shown.some((q) => q.required);
    const known = s.respondent && !checkDetails(s.respondent).name && !checkDetails(s.respondent).email;
    const who = known && !editDetails ? s.respondent : null;
    const numberOf = new Map(groups.flatMap((g) => g.questions).map((q, i) => [q.id, i + 1]));
    content = (
      <>
        {preview}
        <p className="sv-chip-top"><ClipboardList size={15} aria-hidden="true" /> TTFC 2026</p>
        <h1 className="sv-h1">{s.title}</h1>
        {s.intro && <p className="sv-intro">{s.intro}</p>}
        <p className="sv-meta">
          {total} {total === 1 ? "question" : "questions"}{Number.isFinite(s.closesAt) ? ` · open until ${surveyWhen(s.closesAt)}` : ""}
        </p>
        <p className="sv-meta" style={{ marginTop: 4 }}>{anyRequired ? "Skip any question you like, except those marked *." : "Skip any question you like."}</p>
        {s.responded && (
          <p className="sv-note" role="note"><CheckCircle2 aria-hidden="true" /><span><b>You've already answered.</b>You can update your answers below; we keep your newest ones.</span></p>
        )}
        {who && (
          <div className="sv-who">
            <span>Answering as <b>{who.name || who.email}</b>{[who.title, who.company].filter(Boolean).length ? `, ${[who.title, who.company].filter(Boolean).join(" at ")}` : ""}{who.name && who.email ? ` · ${who.email}` : ""}</span>
            <button type="button" className="sv-ghost" onClick={() => setEditDetails(true)}><Pencil size={15} aria-hidden="true" /> Change</button>
          </div>
        )}

        <form onSubmit={submit} noValidate aria-busy={sending || undefined}>
          {groups.map((g, gi) => (
            <section key={`${g.title}-${gi}`} className="sv-card" aria-labelledby={g.title ? `${uid}-sec-${gi}` : undefined}>
              {g.title && <h2 id={`${uid}-sec-${gi}`} className="sv-sec-title">{g.title}</h2>}
              {g.questions.map((q) => {
                const n = numberOf.get(q.id);
                return <SurveyQuestion key={q.id} q={q} number={n} idBase={uid} value={answers[q.id]} onChange={setAnswer(q.id)} error={errors[q.id]} disabled={sending} />;
              })}
            </section>
          ))}

          {!who && (
            <section className="sv-card" aria-labelledby={`${uid}-about`}>
              <h2 id={`${uid}-about`} className="sv-sec-title">About you</h2>
              <div className="sv-fields">
                {DETAIL_FIELDS.map((k) => (
                  <div key={k} className="sv-field">
                    <label htmlFor={`${uid}-d-${k}`}>{DETAIL_LABELS[k]}{REQUIRED_DETAILS.includes(k)
                      ? <><span className="sv-req" aria-hidden="true">*</span><span className="sv-sr"> (required)</span></>
                      : <span className="sv-opt"> (optional)</span>}</label>
                    <input id={`${uid}-d-${k}`} className="sv-input" type="text" {...DETAIL_INPUT[k]} value={details[k]} onChange={setDetail(k)} disabled={sending}
                      required={REQUIRED_DETAILS.includes(k) || undefined}
                      aria-invalid={detailErrors[k] ? true : undefined} aria-describedby={detailErrors[k] ? `${uid}-d-${k}-err` : undefined} />
                    {detailErrors[k] && <p id={`${uid}-d-${k}-err`} className="sv-err">{detailErrors[k]}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="sv-submit">
            {formError && <p className="sv-form-err" role="alert"><AlertCircle aria-hidden="true" />{formError}</p>}
            <button type="submit" className="sv-btn" disabled={sending}>
              {sending ? "Sending…" : s.responded ? "Update my answers" : "Send my answers"}
            </button>
            <p className="sv-progress" aria-live="polite">{answered} of {total} answered</p>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="sv" style={surveyVars(dark)}>
        <style>{SURVEY_QUESTION_CSS + PAGE_CSS}</style>
        <div className="sv-wrap">{content}</div>
      </main>
      <Footer />
    </>
  );
}
