import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, CalendarPlus, Check, Loader2, Lock, Mic2, Pencil, RotateCcw,
} from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { API, useFormGuard } from "../lib/forms";

/* =========================================================
   /rsvp — TTFC 2026 RSVP (a "ghost" page)
   ---------------------------------------------------------
   Nothing links here: no navbar or footer entry, not in any sitemap,
   and the page sets <meta name="robots" content="noindex,nofollow">.
   People reach it by typing thetechfestival.com/rsvp.

   One question per screen. What each pass includes comes from the
   backend (GET /api/rsvp/options, services/rsvp.js), the same matrix as
   the Tickets page, so it is never copied here. As people type their
   name (and optionally a ticket ID) we ask POST /api/rsvp/lookup who
   they are: a verified ticket or a speaker locks the pass (only a fresh
   answer for exactly what's typed; a refused lookup never does). The
   backend checks everything again when the RSVP is saved (POST /api/rsvp)
   and, if it reads the pass differently, the page unlocks it and asks again.
   Experiences (sessions, expo floor and breaks for every pass, plus what
   the pass adds) are grouped by day and never ticked for them. Which ones
   they may pick comes from the lookup (`allowedOptions`, the server's own
   rule: the pass, the meals and events staff switched on or off for it
   (CxO Breakfasts, luncheons, Gala Dinner, Awards Night), the speaker type
   and any of those already on their RSVP); the options' `tiers` are the
   fallback. The verified pass's card lists the same.
   The save answers with an edit token, kept in localStorage
   ("ttfc.rsvp.edit"); sent back under the same name, it updates that
   RSVP instead of adding another. Staff see RSVPs in Admin → Leads → RSVPs.

   Personal links (the Speaker Pass email): /rsvp#t=<ticketId>&fn=<first>&ln=<last>.
   The fragment never reaches the server; index.html moves it out of the address
   bar before analytics loads (this page clears it too, as a fallback). The page
   opens on the name question already filled in and looks the ticket up at once.
   The values only ever fill the form; nothing else is kept.
========================================================= */

const ENQUIRE = "enquire@thetechfestival.com";
const STEPS = ["welcome", "name", "events", "dietary", "success"];
const FORM_STEPS = ["name", "events", "dietary"];
// Everyone with a ticket comes to the conference: only the special events are asked about.
const SPECIAL = (o) => !/^(sessions|expo|breaks)_/.test(o.key);
const PASS_ORDER = ["connect", "influence", "power", "apex"]; // the passes on sale; the Speaker Pass is shown only to speakers
const SPEAKER_LOUNGE = "VIP Lounge Access (both days)";
const PASS_ACCENT = { connect: "#9b6cff", influence: "#e8458b", power: "#f5a623", apex: "#ffd27a", speaker: "#e8458b" };
const LOCATION = "The Westin Harbour Castle, 1 Harbour Square, Toronto, ON M5J 1A6";
const DOORS = { day1: "Registration opens 8:00 AM.", day2: "Registration opens 8:30 AM." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NONE = { kind: "none", verified: false };
const article = (label) => (/^[aeiou]/i.test(label) ? "an" : "a");
// Ticket IDs are read the way the backend reads them (normalizeTicketId), so "APX 654321" and "apx654321" are one lookup.
const normTicket = (s) => String(s || "").trim().replace(/^TECHFEST:/i, "").replace(/\s+/g, "").toLowerCase();
const TICKET_MIN = 6; // shorter than any real ticket ID: a half-typed one is never looked up
/** What the lookup is asked about (and its answer kept under): only once a last name and a whole ticket ID are in. */
const lookupKeyOf = (firstName, lastName, ticketId) => {
  const last = lastName.trim();
  const ticket = normTicket(ticketId);
  return last.length >= 2 && ticket.length >= TICKET_MIN ? `${firstName.trim()}|${last}|${ticket}`.toLowerCase() : "";
};
const WAIT_NAME = 600; // ms after they stop typing a name
const WAIT_TICKET = 1200; // ticket IDs are often copied from another screen, a few characters at a time
const endStop = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);
// Which question a server error belongs to (POST /api/rsvp answers 400 with `field`).
const FIELD_STEP = {
  firstName: "name", lastName: "name", ticketId: "name", tier: "name", days: "events", options: "events",
  dietary: "dietary", dietaryOther: "dietary", email: "dietary", accessibility: "dietary",
};

/* A personal link's ticket ID and name: from index.html (which already took them out of the address bar),
   else from the fragment or query string. Read only; clearPrefill() takes them out of the URL. */
const PREFILL_KEYS = ["t", "fn", "ln"];
function readPrefill() {
  try {
    const held = window.__ttfcRsvpPrefill;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const value = (k, max) => String((held ? held[k] : hash.get(k) ?? query.get(k)) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    const p = { ticketId: value("t", 64), firstName: value("fn", 80), lastName: value("ln", 80) };
    return p.ticketId || p.firstName || p.lastName ? p : null;
  } catch { return null; }
}
function clearPrefill() {
  try {
    delete window.__ttfcRsvpPrefill;
    const { pathname, search, hash } = window.location;
    const h = new URLSearchParams(hash.replace(/^#/, ""));
    const q = new URLSearchParams(search);
    if (!PREFILL_KEYS.some((k) => h.has(k) || q.has(k))) return;
    PREFILL_KEYS.forEach((k) => { h.delete(k); q.delete(k); });
    const qs = q.toString();
    const hs = h.toString();
    window.history.replaceState(window.history.state, "", `${pathname}${qs ? `?${qs}` : ""}${hs ? `#${hs}` : ""}`);
  } catch { /* nothing to clear */ }
}

/* The edit token POST /api/rsvp hands back: sent with a later RSVP from this browser under the same name,
   it changes that RSVP instead of adding a second one. { nameKey, ticketId?, token } */
const EDIT_KEY = "ttfc.rsvp.edit";
/** "José  Núñez-Díaz" → "jose nunezdiaz": the same name, whatever the case, accents or spacing. */
const nameKeyOf = (firstName, lastName) => `${firstName} ${lastName}`.split(/\s+/)
  .map((w) => w.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""))
  .filter(Boolean).join(" ");
function readEditToken(nameKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(EDIT_KEY) || "null");
    return saved && typeof saved.token === "string" && saved.nameKey === nameKey ? saved.token : "";
  } catch { return ""; }
}
function saveEditToken(entry) {
  try { localStorage.setItem(EDIT_KEY, JSON.stringify(entry)); } catch { /* storage blocked: a later change just can't be matched */ }
}

const shortDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/** "2026-10-26" → "October 26th". */
function monthDay(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const n = d.getUTCDate();
  const th = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
  return `${d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${n}${th}`;
}

// Sessions, the expo floor and breaks come with every pass; the rest are what a pass adds.
const isBase = (o) => o.tiers.includes("connect");
/** Under a day's heading the day is already said: "Gala Dinner & Networking Reception (Day 2 evening)" → "… (evening)". */
const inDay = (label) => label.replace(/\s*\(Day \d+\)$/i, "").replace(/\(Day \d+\s+/i, "(");
/** Experiences by the day they happen on (in catalog order), then the ones not tied to a day. */
function byDay(list, days) {
  const groups = days.map((d) => ({ key: d.key, day: d, items: list.filter((o) => o.day === d.key) }));
  groups.push({ key: "any", day: null, items: list.filter((o) => !days.some((d) => d.key === o.day)) });
  return groups.filter((g) => g.items.length);
}

/** "2× Networking Luncheon · CxO Breakfast …" for a pass, from the shared option list (what it adds to the base).
    `allowedKeys`: the server's list for this person's verified pass (its meals and events as staff set them). */
function includesFor(tier, options, allowedKeys = null) {
  const counts = new Map();
  for (const o of options) {
    if (o.kind !== "experience" || !(allowedKeys ? allowedKeys.includes(o.key) : o.tiers.includes(tier)) || isBase(o)) continue;
    const label = o.label.replace(/\s*\(.*\)$/, "");
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].map(([label, n]) => (n > 1 ? `${n}× ${label}` : label));
}

/* ---------- Add to calendar (.ics, made in the browser) ---------- */
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
function foldIcs(line) {
  // Lines longer than 75 octets continue on the next line after a space (RFC 5545).
  const enc = new TextEncoder();
  const out = [];
  let cur = "";
  let limit = 75;
  for (const ch of line) {
    if (enc.encode(cur + ch).length > limit) { out.push(cur); cur = ""; limit = 74; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}
function buildIcs({ days, options, catalog }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Tech Festival Canada//RSVP//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const chosen = catalog.days.filter((d) => days.includes(d.key));
  const picked = catalog.options.filter((o) => options.includes(o.key));
  chosen.forEach((d, i) => {
    const start = d.date.replace(/-/g, "");
    const next = new Date(`${d.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString().slice(0, 10).replace(/-/g, "");
    const mine = picked.filter((o) => o.day === d.key).map((o) => o.label);
    const anyDay = i === 0 ? picked.filter((o) => !o.day).map((o) => o.label) : [];
    const desc = [
      `The Tech Festival Canada 2026 · ${d.label}.`, DOORS[d.key] || "",
      mine.length ? `Your RSVP: ${mine.join(", ")}.` : "",
      anyDay.length ? `Also on your RSVP: ${anyDay.join(", ")}.` : "",
      "https://www.thetechfestival.com",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:ttfc-2026-${d.key}@thetechfestival.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsText(`TTFC 2026 · ${d.label}`)}`,
      `LOCATION:${icsText(LOCATION)}`,
      `DESCRIPTION:${icsText(desc)}`,
      "URL:https://www.thetechfestival.com",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(foldIcs).join("\r\n") + "\r\n";
}

/* ---------- Small pieces ---------- */
function Field({ id, label, hint, error, optional, children }) {
  return (
    <div className="rsvp-field">
      <label htmlFor={id} className="rsvp-label">
        {label}{optional && <span className="rsvp-optional"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="rsvp-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="rsvp-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>}
    </div>
  );
}

function CheckMark({ on, round }) {
  return (
    <span className={`rsvp-check${round ? " rsvp-check-round" : ""}`} data-on={on || undefined} aria-hidden="true">
      <AnimatePresence initial={false}>
        {on && (
          <motion.span key="c" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
            <Check size={14} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function StepHeader({ eyebrow, title, sub, id }) {
  return (
    <header className="rsvp-head">
      {eyebrow && <p className="rsvp-eyebrow">{eyebrow}</p>}
      <h1 id={id} className="rsvp-title">{title}</h1>
      {sub && <p className="rsvp-sub">{sub}</p>}
    </header>
  );
}

/** Confetti made of brand-coloured bits, placed deterministically (no randomness during render). */
function Celebration() {
  const reduce = useReducedMotion();
  const bits = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const a = i * 2.39996; // golden angle
    const r = 120 + ((i * 53) % 110);
    return {
      x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8 - 40,
      rot: (i * 97) % 360, size: 6 + (i % 4) * 2,
      color: ["#7a3fd1", "#e8458b", "#f5a623", "#ffffff"][i % 4], round: i % 3 === 0, delay: (i % 6) * 0.03,
    };
  }), []);
  return (
    <div className="rsvp-celebrate" aria-hidden="true">
      {!reduce && bits.map((b, i) => (
        <motion.span key={i} className="rsvp-confetti"
          style={{ width: b.size, height: b.round ? b.size : b.size * 0.45, background: b.color, borderRadius: b.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 140], opacity: [0, 1, 0], scale: 1, rotate: b.rot + 360 }}
          transition={{ duration: 2.2, delay: 0.15 + b.delay, ease: "easeOut", times: [0, 0.4, 1] }} />
      ))}
      <motion.div className="rsvp-success-badge"
        initial={reduce ? false : { scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        {!reduce && [0, 1].map((k) => (
          <motion.span key={k} className="rsvp-ring" initial={{ scale: 0.8, opacity: 0.7 }} animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 1.8, delay: 0.3 + k * 0.5, repeat: Infinity, repeatDelay: 1.2 }} />
        ))}
        <Check size={38} strokeWidth={3} />
      </motion.div>
    </div>
  );
}

/* ---------- The page ---------- */
export default function Rsvp() {
  const reduce = useReducedMotion();
  const guard = useFormGuard(true);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogNonce, setCatalogNonce] = useState(0);
  const [prefill] = useState(readPrefill); // a personal link: straight to the name question, filled in
  const [step, setStep] = useState(prefill ? 1 : 0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({
    firstName: prefill?.firstName || "", lastName: prefill?.lastName || "", ticketId: prefill?.ticketId || "",
    email: "", tier: "", days: [], options: [], dietary: [], dietaryOther: "", accessibility: "",
  });
  const [errors, setErrors] = useState({});
  const [answers, setAnswers] = useState({}); // lookup key → what the server said, so nothing is asked twice
  const [failures, setFailures] = useState({}); // lookup key → "limited" (429) or "failed"
  const [overruled, setOverruled] = useState({}); // lookup key → true when sending showed the server sees their pass differently
  // A lookup key to ask about now, without waiting for a typing pause (a personal link's, straight away).
  const [rush, setRush] = useState(() => (prefill ? lookupKeyOf(prefill.firstName, prefill.lastName, prefill.ticketId) : ""));
  const [queued, setQueued] = useState(false); // Continue pressed while we were still looking them up
  const [answer, setAnswer] = useState({ key: "", choice: "" }); // "Is this right?" for an unverified match
  const [returnToReview, setReturnToReview] = useState(false);
  const [editBase, setEditBase] = useState([]); // experiences on offer when they went back from Review to edit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(null);
  const stepRef = useRef(null);
  const primaryRef = useRef(null);
  const inflightRef = useRef(new Set());
  const lastTicketRef = useRef("");

  /* Hidden page: keep it out of search engines, and give it a quiet title. */
  useEffect(() => {
    const prev = document.title;
    document.title = "RSVP · TTFC 2026";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    document.body.classList.add("rsvp-open");
    return () => { document.title = prev; robots.remove(); document.body.classList.remove("rsvp-open"); };
  }, []);

  /* A personal link's ticket ID and name leave the address bar at once (index.html usually has already). */
  useEffect(() => { clearPrefill(); }, []);

  /* What each pass includes, from the backend. */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/rsvp/options`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { setCatalog(data); setCatalogError(false); })
      .catch((err) => { if (err?.name !== "AbortError") setCatalogError(true); });
    return () => ctrl.abort();
  }, [catalogNonce]);

  /* Who is this? Ask once both names (or a whole ticket ID + last name) are in and they pause typing
     (longer for the ticket ID), or straight away when they leave the ticket field or press Continue.
     The backend limits lookups per name and per network, so each answer is kept and a ticket ID
     is only sent once it's long enough to be a whole one. */
  const first = form.firstName.trim();
  const last = form.lastName.trim();
  const tid = form.ticketId.trim();
  const ticketKey = normTicket(tid);
  const ticketReady = ticketKey.length >= TICKET_MIN;
  const lookupKey = lookupKeyOf(form.firstName, form.lastName, form.ticketId);
  useEffect(() => {
    if (!lookupKey || answers[lookupKey] || failures[lookupKey] === "limited" || inflightRef.current.has(lookupKey)) return undefined;
    const key = lookupKey;
    const body = { firstName: first, lastName: last, ticketId: ticketReady ? tid : "" };
    const ticketPart = ticketReady ? ticketKey : "";
    // Longer while the ticket ID is what's changing (since the last lookup we actually sent).
    const wait = rush === key ? 0 : ticketPart !== lastTicketRef.current ? WAIT_TICKET : WAIT_NAME;
    const timer = setTimeout(async () => {
      lastTicketRef.current = ticketPart;
      inflightRef.current.add(key);
      setFailures((f) => (f[key] ? { ...f, [key]: "" } : f));
      let result = null;
      let failed = "failed";
      try {
        const res = await fetch(`${API}/rsvp/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, _hp: guard.meta()._hp }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && typeof data.kind === "string") result = data;
        else if (res.status === 429) failed = "limited";
      } catch { /* offline: handled below like any other failure */ }
      inflightRef.current.delete(key);
      // Kept under its own key, so a late answer can never land on what they've typed since.
      if (result) setAnswers((a) => ({ ...a, [key]: result }));
      else setFailures((f) => ({ ...f, [key]: failed }));
    }, wait);
    return () => clearTimeout(timer);
    // guard.meta reads a ref; first/last/tid are inside lookupKey; answers/failures are read when the key changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey, rush]);

  const answered = lookupKey ? answers[lookupKey] : undefined;
  const failure = lookupKey && !answered ? failures[lookupKey] || "" : "";
  // Only a fresh answer for exactly what's typed can lock the pass, and not once sending showed the server disagrees.
  const found = answered && !overruled[lookupKey] ? answered : NONE;
  // A lookup refused (too many) or failed: an earlier answer for the same first AND last name (and the same
  // ticket ID, when one is typed) can still suggest their pass. Only a suggestion: it never locks anything.
  const kept = useMemo(() => {
    if (!failure) return NONE;
    const [f, l, t] = lookupKey.split("|");
    const prev = Object.entries(answers).reverse().find(([k]) => {
      const [kf, kl, kt] = k.split("|");
      return kf === f && kl === l && (!tid || kt === t);
    });
    return prev ? prev[1] : NONE;
  }, [failure, answers, lookupKey, tid]);
  const checking = !!lookupKey && !answered && !failure;
  const lockedTier = found.verified && (found.kind === "ticket" || found.kind === "speaker") ? found.tier : "";
  // A speaker on the list, or a verified Speaker Pass ticket ID (tier "speaker").
  const isSpeaker = found.kind === "speaker" || (found.verified && found.tier === "speaker");
  const foundKey = `${found.kind}:${found.tier || ""}:${found.verified}`;
  const choice = answer.key === foundKey ? answer.choice : "";
  const keptTier = ""; // never guess a pass: only a verified ticket sets it
  const suggested = "";
  const tier = lockedTier || form.tier || suggested;

  const options = useMemo(() => catalog?.options || [], [catalog]);
  const days = catalog?.days || [];
  const tierLabel = (k) => catalog?.tiers?.find((t) => t.key === k)?.label || "";
  // What this person may pick, worked out by the server with the same rule the save checks (POST /rsvp/lookup
  // `allowedOptions`: their pass, its CxO Breakfast switch, the speaker type, a breakfast already on their RSVP).
  // The pass's own list from /rsvp/options only when the answer has none.
  const serverAllowed = found.verified && Array.isArray(found.allowedOptions) ? found.allowedOptions : null;
  const allowed = useMemo(() => options.filter((o) => o.kind === "experience" && SPECIAL(o)
    && (serverAllowed ? serverAllowed.includes(o.key) : o.tiers.includes(tier)) && (!o.day || form.days.includes(o.day))), [options, tier, form.days, serverAllowed]);
  const chosenOptions = allowed.filter((o) => form.options.includes(o.key)).map((o) => o.key);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
    if (k === "firstName" || k === "lastName" || k === "ticketId") setQueued(false); // still typing: don't move on by itself
  };
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const pickOptions = (keys, on) => {
    setForm((f) => ({ ...f, options: on ? [...new Set([...f.options, ...keys])] : f.options.filter((k) => !keys.includes(k)) }));
    setErrors((e) => (e.options ? { ...e, options: "" } : e));
  };
  const toggleDiet = (v) => setForm((f) => {
    let next = f.dietary.includes(v) ? f.dietary.filter((x) => x !== v) : [...f.dietary, v];
    if (v === "none" && next.includes("none")) next = ["none"]; // "None" clears the rest
    else if (v !== "none") next = next.filter((x) => x !== "none");
    return { ...f, dietary: next };
  });

  const name = STEPS[step];
  const go = useCallback((to) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    setSubmitError("");
    setQueued(false);
  }, [step]);
  const goName = (n) => go(STEPS.indexOf(n));

  /* What's missing or wrong on one question ({} when it's fine). */
  const problems = (n) => {
    const e = {};
    if (n === "name") {
      if (!first) e.firstName = "Please enter your first name";
      if (!last) e.lastName = "Please enter your last name";
      if (!tid) e.ticketId = "Please enter your ticket ID";
      else if (!ticketReady) e.ticketId = "That ticket ID looks too short";
      else if (found && found.ticketMatched === false) e.ticketId = "We couldn't find that ticket. Check your ticket email, or get your pass at thetechfestival.com/tickets";
      else if (!checking && !lockedTier) e.ticketId = "We couldn't confirm your pass from that ticket ID. Check your ticket email, or get your pass at thetechfestival.com/tickets";
    }
    if (n === "events" && !form.days.length) e.days = "Choose at least one day";
    if (n === "dietary") {
      if (form.dietary.includes("other") && !form.dietaryOther.trim()) e.dietaryOther = "Tell us what you need";
    }
    return e;
  };
  const hasProblems = (n) => Object.values(problems(n)).some(Boolean);
  const focusInvalid = () => requestAnimationFrame(() => stepRef.current?.querySelector("[aria-invalid='true'], [data-invalid='true'] input")?.focus());
  /* Check the current question; returns true when they can move on. */
  const check = () => {
    const e = problems(name);
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };
  /* Review only ever shows (and sends) a complete RSVP: anything missing sends them to that question first. */
  const firstBad = () => FORM_STEPS.find((n) => hasProblems(n));
  const fix = (bad) => {
    setErrors(problems(bad));
    setReturnToReview(true);
    if (bad === name) focusInvalid(); else goName(bad);
  };
  const toReview = () => {
    const bad = firstBad();
    if (bad) fix(bad); else goName("dietary");
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    const nameKey = nameKeyOf(first, last);
    // This browser's earlier RSVP under the same name: the token lets the server update it in place.
    const editToken = readEditToken(nameKey);
    try {
      const res = await fetch(`${API}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first, lastName: last, ticketId: tid, tier,
          days: form.days, options: chosenOptions, dietary: form.dietary,
          dietaryOther: form.dietary.includes("other") ? form.dietaryOther.trim() : "",
          accessibility: form.accessibility.trim(), page: window.location.pathname,
          ...(editToken ? { editToken } : {}), ...guard.meta(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.message || data?.error || "We couldn't save your RSVP.";
        const at = res.status === 400 ? FIELD_STEP[data?.field] : "";
        if (at) {
          // The server read their pass (or an answer) differently from this page: never leave them on a
          // locked pass they can't send. Unlock it and take them to that question with the server's words.
          if (data.field === "tier" || data.field === "ticketId") setOverruled((o) => ({ ...o, [lookupKey]: true }));
          setEditBase(allowed.map((o) => o.key));
          setReturnToReview(true);
          go(STEPS.indexOf(at));
          setErrors({ [data.field]: endStop(message) });
          return;
        }
        throw new Error(message);
      }
      if (data.editToken) saveEditToken({ nameKey, ...(ticketKey ? { ticketId: ticketKey.toUpperCase() } : {}), token: data.editToken });
      // What was sent, so the thank-you screen and calendar file show exactly what was saved.
      setSaved({ ...data, sent: { days: form.days, options: chosenOptions } });
      setReturnToReview(false);
      go(STEPS.indexOf("success"));
    } catch (err) {
      setSubmitError(err?.message && !/fetch|network/i.test(err.message) ? err.message : "We couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!catalog) return; // a personal link can land on the name question before the options are in
    if (name === "welcome") { go(1); return; }
    // Their pass may still be on its way back from the lookup: wait for it (asking now) rather than move on or send without it.
    if (checking && (name === "name" || name === "dietary")) {
      if (name === "name" && !check()) { focusInvalid(); return; }
      setRush(lookupKey);
      setQueued(true);
      return;
    }
    if (name === "dietary") {
      if (submitting) return;
      const bad = firstBad();
      if (bad) fix(bad); else submit();
      return;
    }
    if (!check()) { focusInvalid(); return; }
    // Keep the pass they confirmed, so a later lookup (or a refused one) can't leave the RSVP without one.
    if (returnToReview) {
      // New days, a new pass or a newly verified ticket can open experiences they haven't been asked about.
      if (name !== "events" && allowed.some((o) => !editBase.includes(o.key))) { goName("events"); return; }
      toReview();
      return;
    }
    go(step + 1);
  };
  // While editing from Review the arrow means "back to review", with the same checks as the main button.
  const back = () => {
    if (returnToReview && name !== "dietary") { next(); return; }
    go(Math.max(0, step - 1));
  };
  const edit = (n) => { setEditBase(allowed.map((o) => o.key)); setReturnToReview(true); goName(n); };

  /* Continue was pressed mid-lookup: carry on as soon as the answer (or a refusal) is in. */
  useEffect(() => {
    if (!queued || checking) return;
    setQueued(false);
    next();
    // next is rebuilt every render; this only needs to run when the lookup settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, checking]);

  /* Enter moves on (except in text areas and on buttons, which act themselves). */
  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const tag = e.target.tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
    e.preventDefault();
    if (name !== "success") next();
  };

  const focusPrimary = () => requestAnimationFrame(() => primaryRef.current?.focus());

  /* When a question arrives, put the cursor in its first field. */
  const focusFirst = () => {
    const root = stepRef.current;
    if (!root) return;
    // Review has only Edit buttons: land on "Send my RSVP" instead, so Enter sends.
    // A question they were sent back to fix: straight to what needs fixing.
    const el = root.querySelector("input[aria-invalid='true']") || root.querySelector("[data-autofocus]")
      || root.querySelector("input:not([disabled]):not([tabindex='-1']), textarea") || primaryRef.current;
    el?.focus({ preventScroll: true });
  };

  const progressIndex = FORM_STEPS.indexOf(name);
  const progress = name === "success" ? 1 : progressIndex < 0 ? 0 : (progressIndex + 1) / FORM_STEPS.length;

  const variants = {
    enter: (d) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 48, filter: "blur(10px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -48, filter: "blur(10px)" }),
  };

  const sentDays = saved?.sent?.days || form.days;
  const sentOptions = saved?.sent?.options || chosenOptions;
  const downloadIcs = () => {
    const blob = new Blob([buildIcs({ days: sentDays, options: sentOptions, catalog })], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ttfc-2026.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const dayLabel = (k) => days.find((d) => d.key === k)?.label || k;
  const firstDay = days.find((d) => sentDays.includes(d.key));
  const titleId = `rsvp-${name}-title`;

  const catalogProblem = catalogError && (
    <p className="rsvp-error rsvp-error-block" role="alert">
      <AlertCircle size={16} aria-hidden="true" /> We couldn't load the RSVP form.{" "}
      <button type="button" className="rsvp-link" onClick={() => { setCatalogError(false); setCatalogNonce((n) => n + 1); }}>Try again</button>{" "}
      or email <a className="rsvp-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a>.
    </p>
  );

  /* ---------- One screen per question ---------- */
  let body = null;
  if (name === "welcome") {
    body = (
      <>
        <StepHeader id={titleId} title="You're invited" sub="The Tech Festival Canada · 26–27 October 2026 · The Westin Harbour Castle, Toronto. Tell us which days you're coming and what you'll join, so we can save you a seat." />
        <ul className="rsvp-facts" aria-label="Event details">
          <li><span>Dates</span>Mon 26 &amp; Tue 27 Oct</li>
          <li><span>Venue</span>Westin Harbour Castle</li>
          <li><span>Takes</span>About a minute</li>
        </ul>
        {catalogProblem}
      </>
    );
  } else if (name === "name") {
    body = (
      <>
        <StepHeader id={titleId} eyebrow="Step 1 · You" title="What's your name?" sub="As it appears on your ticket." />
        <div className="rsvp-grid2">
          <Field id="rsvp-first" label="First Name" error={errors.firstName}>
            <input id="rsvp-first" className="rsvp-input" data-autofocus autoComplete="given-name" value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)} maxLength={80} aria-invalid={!!errors.firstName || undefined}
              aria-describedby={errors.firstName ? "rsvp-first-error" : undefined} />
          </Field>
          <Field id="rsvp-last" label="Last Name" error={errors.lastName}>
            <input id="rsvp-last" className="rsvp-input" autoComplete="family-name" value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)} maxLength={80} aria-invalid={!!errors.lastName || undefined}
              aria-describedby={errors.lastName ? "rsvp-last-error" : undefined} />
          </Field>
        </div>
        <Field id="rsvp-ticket" label="Ticket ID" hint="Find it on your ticket email or pass QR code." error={errors.ticketId}>
          <input id="rsvp-ticket" className="rsvp-input rsvp-mono" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            value={form.ticketId} onChange={(e) => set("ticketId", e.target.value)} onBlur={() => { if (checking) setRush(lookupKey); }}
            maxLength={64} aria-invalid={!!errors.ticketId || undefined} aria-describedby={errors.ticketId ? "rsvp-ticket-error" : "rsvp-ticket-hint"}
            placeholder="e.g. A1B2C3D4E5F6" />
        </Field>
        <div className="rsvp-lookup" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait" initial={false}>
            {checking ? (
              null
            ) : isSpeaker ? (
              <motion.div key="speaker" className="rsvp-chip rsvp-chip-magic" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                <Mic2 size={18} aria-hidden="true" />
                <span className="rsvp-chip-text">
                  {found.ticketMatched ? <>We found your <strong>Speaker Pass</strong>. Welcome, speaker</> : "Welcome, speaker"}
                </span>
              </motion.div>
            ) : found.kind === "ticket" && found.verified ? (
              <motion.div key={`v-${found.tier}`} className="rsvp-chip rsvp-chip-magic" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                <BadgeCheck size={18} aria-hidden="true" />
                <span className="rsvp-chip-text">We found your <strong>{found.tierLabel || tierLabel(found.tier)}</strong></span>
              </motion.div>
            ) : failure ? (
              <motion.p key="failed" className="rsvp-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {failure === "limited" ? "We can't check your pass right now (too many tries)." : "We couldn't check your pass just now."}{" "}
                You can still continue and choose it on the next step; we'll confirm it when you send.
                {keptTier && !form.tier && <> Earlier it looked like you have {article(tierLabel(keptTier))} {tierLabel(keptTier)}, so that's picked to start with.</>}
              </motion.p>
            ) : tid && found.ticketMatched === false ? (
              <motion.p key="nomatch" className="rsvp-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                We couldn't find a ticket with that ID and last name. Check your ticket email, or{" "}
                <a href="/tickets" style={{ color: "#f5a623", fontWeight: 700 }}>get your pass here</a>.
              </motion.p>
            ) : !ticketReady && first && last ? (
              <motion.p key="needid" className="rsvp-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Enter your ticket ID to confirm your pass.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        {catalogProblem}
      </>
    );
  } else if (name === "pass") {
    const cards = isSpeaker ? ["speaker"] : PASS_ORDER;
    body = (
      <>
        <StepHeader id={titleId} eyebrow="Step 2 · Your pass" title={lockedTier ? "Your pass" : "Which pass do you have?"}
          sub={lockedTier ? (isSpeaker ? "Your Speaker Pass: the Power Pass privileges, both CxO Breakfasts and the VIP Lounge." : "Confirmed from your ticket.") : "It decides which experiences you can RSVP for."} />
        <div className="rsvp-stack" role="radiogroup" aria-labelledby={titleId} aria-describedby={errors.tier ? "rsvp-tier-error" : undefined}>
          {cards.map((k, i) => {
            const on = tier === k;
            const disabled = !!lockedTier && !on;
            // The internal Speaker Pass (never sold): Power's events and both CxO Breakfasts, from the server's list, and the VIP Lounge.
            // Their own verified pass: what the server allows them (a Connect Pass with the Gala added lists the Gala).
            const own = on && lockedTier && serverAllowed ? serverAllowed : null;
            const inc = k === "speaker" ? [...includesFor(k, options, own), SPEAKER_LOUNGE] : includesFor(k, options, own);
            return (
              <motion.label key={k} className="rsvp-choice rsvp-pass" data-checked={on || undefined} data-disabled={disabled || undefined}
                style={{ "--accent": PASS_ACCENT[k] }}
                initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: disabled ? 0.42 : 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <input type="radio" name="rsvp-tier" className="rsvp-sr" value={k} checked={on} disabled={disabled}
                  onChange={() => { set("tier", k); if (found.kind === "ticket" && !found.verified && k !== found.tier) setAnswer({ key: foundKey, choice: "no" }); }}
                  data-autofocus={on || (!tier && i === 0) || undefined} />
                <CheckMark on={on} round />
                <span className="rsvp-choice-body">
                  <span className="rsvp-choice-title">
                    {k === "speaker" ? "Speaker Pass" : tierLabel(k)}
                    {on && lockedTier && <span className="rsvp-lock"><Lock size={12} aria-hidden="true" /> {isSpeaker ? "Speaker" : "Verified"}</span>}
                  </span>
                  <span className="rsvp-choice-desc">{inc.length ? inc.join(" · ") : "Both conference days, the expo floor and networking breaks"}</span>
                </span>
              </motion.label>
            );
          })}
        </div>
        {lockedTier && !isSpeaker && (
          <p className="rsvp-hint">Not right? Go back and check the ticket ID, or email <a className="rsvp-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a>.</p>
        )}
        {errors.tier && <p id="rsvp-tier-error" className="rsvp-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errors.tier}</p>}
      </>
    );
  } else if (name === "events") {
    body = (
      <>
        <StepHeader id={titleId} eyebrow="Step 2 · Days & Events" title="Which days are you coming?" sub="Pick one or both." />
        <div className="rsvp-grid2" role="group" aria-labelledby={titleId} data-invalid={!!errors.days || undefined}>
          {days.map((d, i) => {
            const on = form.days.includes(d.key);
            return (
              <label key={d.key} className="rsvp-choice rsvp-day" data-checked={on || undefined}>
                <input type="checkbox" className="rsvp-sr" checked={on} onChange={() => { toggle("days", d.key); setErrors({}); }}
                  data-autofocus={i === 0 || undefined} aria-invalid={!!errors.days || undefined} />
                <CheckMark on={on} />
                <span className="rsvp-choice-body">
                  <span className="rsvp-day-label">{d.label}</span>
                  <span className="rsvp-day-date">{shortDate(d.date)}</span>
                  <span className="rsvp-choice-desc">{d.long}</span>
                </span>
              </label>
            );
          })}
        </div>
        <button type="button" className="rsvp-text-btn" onClick={() => { set("days", days.map((d) => d.key)); setErrors({}); }}>Both Days</button>
        {errors.days && <p className="rsvp-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errors.days}</p>}
      </>
    );
  }
  if (name === "events" && form.days.length) {
    // Nothing is ticked for anyone: every pass is asked, and they tick what they'll actually join.
    const all = allowed.length > 0 && chosenOptions.length === allowed.length;
    const groups = byDay(allowed, days.filter((d) => form.days.includes(d.key)));
    let n = 0; // card order across the groups, for the stagger and the first field's focus
    body = (
      <>
        {body}
        <div className="rsvp-events-head">
          <h3 className="rsvp-events-title">Special Events</h3>
          <p className="rsvp-events-sub">{allowed.length ? `Included with your ${isSpeaker ? "Speaker Pass" : tierLabel(tier) || "pass"}. Select the ones you'll attend, so we can plan seating and catering.` : ""}</p>
        </div>
        {allowed.length > 0 && (
          <div className="rsvp-exp-bar">
            <span className="rsvp-exp-count" aria-live="polite">{chosenOptions.length ? `${chosenOptions.length} of ${allowed.length} selected` : "Nothing selected yet"}</span>
            <button type="button" className="rsvp-text-btn" onClick={() => pickOptions(allowed.map((o) => o.key), !all)}>
              {all ? "Clear All" : "Select All"}
            </button>
          </div>
        )}
        <div className="rsvp-groups" role="group" aria-labelledby={titleId}>
          {groups.map((g) => {
            const keys = g.items.map((o) => o.key);
            const picked = keys.filter((k) => chosenOptions.includes(k)).length;
            const whole = picked === keys.length;
            const groupName = g.day ? `${g.day.label}, ${g.day.long || shortDate(g.day.date)}` : "Anytime";
            return (
              <section key={g.key} className="rsvp-group" aria-label={groupName}>
                <div className="rsvp-group-head">
                  <span className="rsvp-group-day">{g.day ? g.day.label : "Anytime"}</span>
                  {g.day && <span className="rsvp-group-date">{shortDate(g.day.date)}</span>}
                  <span className="rsvp-group-line" aria-hidden="true" />
                  <span className="rsvp-group-count" aria-hidden="true">{picked}/{keys.length}</span>
                  {keys.length > 1 && (
                    <button type="button" className="rsvp-group-all" onClick={() => pickOptions(keys, !whole)}
                      aria-label={whole ? `Clear ${g.day ? g.day.label : "anytime experiences"}` : `Select everything ${g.day ? `on ${g.day.label}` : "anytime"}`}>
                      {whole ? "None" : "All"}
                    </button>
                  )}
                </div>
                <div className="rsvp-stack">
                  {g.items.map((o) => {
                    const i = n++;
                    const on = chosenOptions.includes(o.key);
                    return (
                      <motion.label key={o.key} className="rsvp-choice rsvp-exp" data-checked={on || undefined}
                        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32, delay: reduce ? 0 : Math.min(i, 14) * 0.025 }}>
                        <input type="checkbox" className="rsvp-sr" checked={on} onChange={() => pickOptions([o.key], !on)} data-autofocus={i === 0 || undefined} />
                        <CheckMark on={on} />
                        <span className="rsvp-choice-body">
                          <span className="rsvp-choice-title">
                            {g.day ? inDay(o.label) : o.label}
                            {returnToReview && !editBase.includes(o.key) && <span className="rsvp-tag rsvp-tag-new">New</span>}
                          </span>
                          {o.description && <span className="rsvp-choice-desc">{o.description}</span>}
                          {o.note && <span className="rsvp-note">{o.note}</span>}
                        </span>
                        {o.time && <span className="rsvp-time">{o.time}</span>}
                      </motion.label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        {errors.options && <p className="rsvp-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errors.options}</p>}
        {allowed.length > 0 && !chosenOptions.length && !errors.options && (
          <p className="rsvp-hint">Only coming for the conference? Leave these unselected and just send your days.</p>
        )}
        {!allowed.length && (
          <div className="rsvp-empty">
            <p>Your {tierLabel(tier) || "pass"} doesn't include special events on the {form.days.length > 1 ? "days" : "day"} you picked. Carry on to the last step.</p>
          </div>
        )}
      </>
    );
  } else if (name === "dietary") {
    const diets = catalog?.dietary || [];
    body = (
      <>
        <StepHeader id={titleId} eyebrow="Step 3 · Dietary" title="Any dietary needs?" sub="Pick all that apply, then send your RSVP." />
        <div className="rsvp-pills" role="group" aria-labelledby={titleId}>
          {diets.map((d, i) => {
            const on = form.dietary.includes(d.key);
            return (
              <label key={d.key} className="rsvp-pill" data-checked={on || undefined}>
                <input type="checkbox" className="rsvp-sr" checked={on} onChange={() => toggleDiet(d.key)} data-autofocus={i === 0 || undefined} />
                {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                {d.label}
              </label>
            );
          })}
        </div>
        <AnimatePresence initial={false}>
          {form.dietary.includes("other") && (
            <motion.div key="other" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <Field id="rsvp-diet-other" label="Tell Us More" error={errors.dietaryOther}>
                <input id="rsvp-diet-other" className="rsvp-input" value={form.dietaryOther} maxLength={200}
                  onChange={(e) => set("dietaryOther", e.target.value)} placeholder="e.g. low FODMAP, no pork" aria-invalid={!!errors.dietaryOther || undefined} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <Field id="rsvp-access" label="Accessibility Needs" optional hint="Anything that helps us make the day work for you.">
          <textarea id="rsvp-access" className="rsvp-input rsvp-textarea" rows={3} maxLength={600} value={form.accessibility}
            onChange={(e) => set("accessibility", e.target.value)} aria-describedby="rsvp-access-hint" />
        </Field>
      </>
    );
  } else if (name === "review") {
    const dietLabels = (catalog?.dietary || []).filter((d) => form.dietary.includes(d.key)).map((d) => (d.key === "other" && form.dietaryOther.trim() ? `Other: ${form.dietaryOther.trim()}` : d.label));
    const chosenGroups = byDay(allowed.filter((o) => chosenOptions.includes(o.key)), days.filter((d) => form.days.includes(d.key)));
    const experiences = chosenGroups.length ? (
      <span className="rsvp-summary-groups">
        {chosenGroups.map((g) => (
          <span key={g.key} className="rsvp-summary-group">
            <span className="rsvp-summary-day">{g.day ? g.day.label : "Anytime"}</span>
            {g.items.map((o) => (g.day ? inDay(o.label) : o.label)).join(", ")}
          </span>
        ))}
      </span>
    ) : "None ticked, just the days";
    const rows = [
      { step: "name", label: "Name", value: `${first} ${last}`, extra: tid ? `Ticket ${tid.toUpperCase()}` : "" },
      { step: "pass", label: "Pass", value: isSpeaker ? "Speaker Pass" : tierLabel(tier), badge: lockedTier ? (isSpeaker ? "Speaker" : "Verified") : "" },
      { step: "days", label: "Days", value: days.filter((d) => form.days.includes(d.key)).map((d) => `${d.label} (${shortDate(d.date)})`).join(" & ") },
      { step: "experiences", label: "Experiences", value: experiences },
      { step: "dietary", label: "Dietary", value: dietLabels.length ? dietLabels.join(", ") : "Not specified", extra: [form.accessibility.trim() && "Accessibility note added", form.email.trim()].filter(Boolean).join(" · ") },
    ];
    body = (
      <>
        <StepHeader id={titleId} eyebrow="Step 6 · Review" title="All good?" sub="Check your answers, then send your RSVP." />
        <dl className="rsvp-summary">
          {rows.map((r) => (
            <div key={r.step} className="rsvp-summary-row">
              <dt>{r.label}</dt>
              <dd>
                <span className="rsvp-summary-value">{r.value}{r.badge && <span className="rsvp-lock"><Lock size={11} aria-hidden="true" /> {r.badge}</span>}</span>
                {r.extra && <span className="rsvp-summary-extra">{r.extra}</span>}
              </dd>
              <button type="button" className="rsvp-edit" onClick={() => edit(r.step)} aria-label={`Edit ${r.label.toLowerCase()}`}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
            </div>
          ))}
        </dl>
        {submitError && (
          <p className="rsvp-error rsvp-error-block" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>
              {submitError.includes(ENQUIRE)
                ? submitError.split(ENQUIRE).map((part, i) => (i ? [<a key={i} className="rsvp-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a>, part] : part))
                : <>{endStop(submitError)} Please try again, or email <a className="rsvp-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a>.</>}
            </span>
          </p>
        )}
      </>
    );
  } else if (name === "success") {
    const when = firstDay ? monthDay(firstDay.date) : "October 26th";
    body = (
      <div className="rsvp-success">
        <Celebration />
        <StepHeader id={titleId} eyebrow={saved?.updated ? "RSVP Updated" : "RSVP Received"} title={`See you on ${when}`}
          sub={`Thanks, ${first}. ${saved?.updated ? "We've updated your RSVP." : "Your RSVP is in."} ${sentDays.length > 1 ? "Both days are" : `${dayLabel(sentDays[0])} is`} on your list.`} />
        <div className="rsvp-success-chips">
          <span className="rsvp-tag rsvp-tag-lg">{saved?.tierLabel || tierLabel(tier) || "Speaker Pass"}</span>
        </div>
        <button type="button" className="rsvp-btn" onClick={downloadIcs} data-autofocus>
          <CalendarPlus size={18} aria-hidden="true" /> Add to Calendar
        </button>
        <button type="button" className="rsvp-text-btn" onClick={() => { setReturnToReview(false); goName("review"); }}>
          <RotateCcw size={13} aria-hidden="true" /> Change My RSVP
        </button>
      </div>
    );
  }

  const showNav = name !== "success";
  const nextLabel = name === "welcome" ? "RSVP Now" : name === "dietary" ? (submitting ? "Sending…" : "Send My RSVP") : returnToReview ? "Back to Review" : "Continue";
  const busy = submitting || queued || (!catalog && !catalogError);

  return (
    <div className="rsvp-root">
      <style>{CSS}</style>
      <AuroraBackground />

      <div className="rsvp-brand">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="The Tech Festival Canada" width="288" height="180" />
      </div>

      <main className="rsvp-card" aria-labelledby={titleId}>
        {name !== "welcome" && name !== "success" && (
          <div className="rsvp-progress-wrap">
            <div className="rsvp-progress" role="progressbar" aria-label="RSVP progress" aria-valuemin={1} aria-valuemax={FORM_STEPS.length} aria-valuenow={progressIndex + 1}
              aria-valuetext={`Step ${progressIndex + 1} of ${FORM_STEPS.length}`}>
              <motion.div className="rsvp-progress-bar" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
            </div>
            <span className="rsvp-progress-text">{progressIndex + 1}/{FORM_STEPS.length}</span>
          </div>
        )}

        {/* Bots fill this; people never see it. */}
        <input {...guard.honeypotProps} aria-label="Leave this empty" />

        <div onKeyDown={onKeyDown}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section key={name} ref={stepRef} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={(def) => { if (def === "center") focusFirst(); }}
              aria-labelledby={titleId} className="rsvp-step">
              {body}
            </motion.section>
          </AnimatePresence>

          {showNav && (
            <div className="rsvp-nav">
              {name !== "welcome" && (
                <button type="button" className="rsvp-btn-ghost" onClick={back} aria-label={returnToReview && name !== "review" ? "Back to Review" : "Back"}>
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
              )}
              <button type="button" ref={primaryRef} className="rsvp-btn" onClick={next}
                disabled={!catalog || submitting} aria-busy={busy || undefined}>
                {busy && <Loader2 size={18} className="rsvp-spin" aria-hidden="true" />}
                {nextLabel}
                {!busy && name !== "review" && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </main>

      <p className="rsvp-foot">Questions? <a className="rsvp-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
    </div>
  );
}

const CSS = `
body.rsvp-open { background: #06020f !important; padding-bottom: 0 !important; }
.rsvp-root {
  position: relative; min-height: 100vh; min-height: 100dvh; color: #fff; overflow-x: hidden;
  font-family: 'Orbitron', 'DM Sans', system-ui, sans-serif; letter-spacing: 0.2px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 28px 16px 32px; box-sizing: border-box;
}
.rsvp-root *, .rsvp-root *::before, .rsvp-root *::after { box-sizing: border-box; }
.rsvp-brand { position: relative; z-index: 1; margin-bottom: 18px; }
.rsvp-brand img { height: 180px; max-width: 80vw; width: auto; display: block; }

.rsvp-card {
  position: relative; z-index: 1; width: 100%; max-width: 560px;
  border-radius: 28px; padding: 26px 26px 24px;
  /* A dark glass base: the aurora's brightest magenta drifts behind the text, and small text has to stay readable over it. */
  background: linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%), rgba(10,4,24,0.5);
  -webkit-backdrop-filter: blur(24px) saturate(130%); backdrop-filter: blur(24px) saturate(130%);
  border: 1px solid rgba(255,255,255,0.13);
  box-shadow: 0 30px 90px rgba(3,0,12,0.55), inset 0 1px 0 rgba(255,255,255,0.14);
  transition: box-shadow .35s ease;
}
.rsvp-card::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(130deg, #7a3fd1, #e8458b 45%, #f5a623 90%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; opacity: .3; transition: opacity .35s ease;
}
.rsvp-card:hover::before, .rsvp-card:focus-within::before { opacity: .85; }
.rsvp-card:hover, .rsvp-card:focus-within { box-shadow: 0 30px 90px rgba(3,0,12,0.55), 0 0 60px rgba(232,69,139,0.16), inset 0 1px 0 rgba(255,255,255,0.14); }

.rsvp-progress-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.rsvp-progress { flex: 1; height: 5px; border-radius: 99px; background: rgba(255,255,255,0.09); overflow: hidden; }
.rsvp-progress-bar { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #7a3fd1, #e8458b, #f5a623); box-shadow: 0 0 14px rgba(232,69,139,0.6); }
.rsvp-progress-text { font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 1px; color: rgba(255,255,255,0.8); font-variant-numeric: tabular-nums; }

.rsvp-step { outline: none; }
.rsvp-head { margin-bottom: 20px; }
.rsvp-eyebrow { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase; color: #ffc56b; margin: 0 0 10px; }
.rsvp-title { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: clamp(1.45rem, 5.4vw, 2rem); line-height: 1.15; letter-spacing: -0.3px; margin: 0;
  background: linear-gradient(100deg, #fff 30%, #f6d0ff 70%, #ffd9a0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.rsvp-sub { margin: 10px 0 0; color: rgba(255,255,255,0.82); font-size: 13.5px; line-height: 1.7; }

.rsvp-spark { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 18px;
  background: linear-gradient(135deg, rgba(122,63,209,0.5), rgba(232,69,139,0.45)); border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 10px 30px rgba(232,69,139,0.35); color: #fff; }
.rsvp-facts { list-style: none; padding: 0; margin: 4px 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.rsvp-facts li { border-radius: 14px; padding: 12px; background: rgba(6,2,15,0.35); border: 1px solid rgba(255,255,255,0.09); font-size: 13px; font-weight: 600; line-height: 1.35; }
.rsvp-facts span { display: block; font-family: 'Orbitron', sans-serif; font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 6px; font-weight: 700; }

.rsvp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rsvp-stack { display: flex; flex-direction: column; gap: 10px; }
.rsvp-field { margin-bottom: 14px; }
.rsvp-label { display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; margin-bottom: 7px; color: rgba(255,255,255,0.9); }
.rsvp-time { margin-left: auto; align-self: center; padding-left: 12px; font-size: 18px; font-weight: 800; letter-spacing: 0.4px; color: #f5a623; white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
.rsvp-events-head { margin: 26px 0 12px; }
.rsvp-events-title { font-family: Orbitron, sans-serif; font-size: 1.05rem; font-weight: 800; margin: 0 0 4px; color: #fff; }
.rsvp-events-sub { margin: 0; font-size: 0.92rem; color: rgba(255,255,255,0.78); }
.rsvp-optional { color: rgba(255,255,255,0.7); font-weight: 500; }
.rsvp-input { width: 100%; height: 52px; border-radius: 14px; padding: 0 16px; font: inherit; font-size: 16px; color: #fff;
  background: rgba(6,2,15,0.5); border: 1px solid rgba(255,255,255,0.15); outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.rsvp-input::placeholder { color: rgba(255,255,255,0.32); }
.rsvp-input:hover { border-color: rgba(255,255,255,0.28); }
.rsvp-input:focus { border-color: #e8458b; box-shadow: 0 0 0 4px rgba(232,69,139,0.2), 0 0 24px rgba(232,69,139,0.18); background: rgba(6,2,15,0.65); }
.rsvp-input[aria-invalid="true"] { border-color: #ff7a8a; }
.rsvp-textarea { height: auto; min-height: 88px; padding: 13px 16px; resize: vertical; line-height: 1.5; }
.rsvp-mono { font-family: 'Orbitron', sans-serif; letter-spacing: 1px; }
.rsvp-hint { margin: 7px 0 0; font-size: 11.5px; color: rgba(255,255,255,0.76); line-height: 1.5; }
.rsvp-error { display: flex; gap: 6px; align-items: center; margin: 7px 0 0; font-size: 13px; color: #ff9aa8; }
.rsvp-error-block { align-items: flex-start; padding: 12px 14px; border-radius: 14px; background: rgba(255,90,110,0.1); border: 1px solid rgba(255,120,140,0.3); margin-top: 16px; line-height: 1.5; }
.rsvp-error-block svg { flex: none; margin-top: 2px; }
.rsvp-link { color: #ffb3d1; text-decoration: underline; text-underline-offset: 2px; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; }
.rsvp-link:hover { color: #fff; }
.rsvp-sr { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; pointer-events: none; }

.rsvp-lookup { min-height: 48px; }
.rsvp-checking { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.78); margin: 4px 0 0; }
.rsvp-chip { position: relative; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5;
  background: linear-gradient(120deg, rgba(122,63,209,0.32), rgba(232,69,139,0.26)); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(122,63,209,0.25); }
.rsvp-chip strong { font-weight: 700; color: #ffd9a0; }
.rsvp-chip svg { flex: none; color: #ffd9a0; }
.rsvp-chip-text { flex: 1 1 200px; min-width: 0; }
.rsvp-chip-magic::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%); transform: translateX(-100%); animation: rsvpSheen 2.6s ease .2s infinite; }
@keyframes rsvpSheen { 0% { transform: translateX(-100%); } 45%, 100% { transform: translateX(100%); } }
.rsvp-chip-ask { background: rgba(245,166,35,0.12); border-color: rgba(245,166,35,0.35); box-shadow: none; justify-content: space-between; }
.rsvp-chip-actions { display: inline-flex; gap: 8px; }
.rsvp-mini { height: 32px; padding: 0 14px; border-radius: 99px; border: 0; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; color: #1a0b2e; background: #ffd27a; }
.rsvp-mini-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
.rsvp-mini:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.rsvp-choice { position: relative; display: flex; align-items: flex-start; gap: 14px; padding: 15px 16px; border-radius: 18px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); transition: border-color .2s, background .2s, box-shadow .25s, transform .2s; }
.rsvp-choice:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 1px rgba(232,69,139,0.25), 0 10px 30px rgba(122,63,209,0.22); }
.rsvp-choice:focus-within { border-color: #e8458b; box-shadow: 0 0 0 3px rgba(232,69,139,0.35), 0 0 28px rgba(232,69,139,0.25); }
.rsvp-choice[data-checked] { border-color: rgba(232,69,139,0.75); background: linear-gradient(120deg, rgba(122,63,209,0.24), rgba(232,69,139,0.16)); box-shadow: 0 10px 34px rgba(232,69,139,0.2); }
.rsvp-choice[data-disabled] { cursor: not-allowed; filter: saturate(0.4); }
.rsvp-choice[data-disabled]:hover { box-shadow: none; border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); }
.rsvp-pass[data-checked] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 12px 36px rgba(232,69,139,0.22); }
.rsvp-choice-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rsvp-choice-title { font-weight: 700; font-size: 14.5px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.rsvp-choice-desc { font-size: 11.5px; color: rgba(255,255,255,0.78); line-height: 1.6; }
.rsvp-note { font-size: 12px; font-weight: 700; color: #ffd27a; }
.rsvp-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; padding: 3px 9px; border-radius: 99px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.14); }
.rsvp-tag-lg { font-size: 13px; padding: 6px 12px; }
.rsvp-tag-new { color: #ffd27a; background: rgba(255,210,122,0.14); border-color: rgba(255,210,122,0.45); }
.rsvp-lock { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; color: #1a0b2e; background: linear-gradient(90deg, #ffd27a, #f5a623); margin-left: 8px; }
.rsvp-choice-title .rsvp-lock { margin-left: 0; }

.rsvp-check { flex: none; width: 24px; height: 24px; margin-top: 1px; border-radius: 8px; display: grid; place-items: center; color: #fff;
  border: 1.5px solid rgba(255,255,255,0.35); background: rgba(6,2,15,0.4); transition: background .2s, border-color .2s; }
.rsvp-check-round { border-radius: 99px; }
.rsvp-check[data-on] { border-color: transparent; background: linear-gradient(135deg, #7a3fd1, #e8458b); box-shadow: 0 0 14px rgba(232,69,139,0.55); }
.rsvp-check > span { display: grid; place-items: center; }

.rsvp-day { flex-direction: column; gap: 12px; padding: 18px; }
.rsvp-day .rsvp-check { position: absolute; top: 16px; right: 16px; }
.rsvp-day-label { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 18px; }
.rsvp-day-date { font-size: 22px; font-weight: 700; color: #ffd9a0; }

.rsvp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.rsvp-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 0 15px; border-radius: 99px; cursor: pointer; font-size: 14px; font-weight: 600;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); transition: background .2s, border-color .2s, box-shadow .2s; }
.rsvp-pill:hover { border-color: rgba(255,255,255,0.35); box-shadow: 0 0 18px rgba(122,63,209,0.3); }
.rsvp-pill:focus-within { box-shadow: 0 0 0 3px rgba(232,69,139,0.4); border-color: #e8458b; }
.rsvp-pill[data-checked] { background: linear-gradient(120deg, rgba(122,63,209,0.55), rgba(232,69,139,0.45)); border-color: rgba(255,255,255,0.35); }

.rsvp-text-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; background: none; border: 0; padding: 4px 0; color: #ffb3d1; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.rsvp-text-btn:hover { color: #fff; }
.rsvp-text-btn:focus-visible { outline: 2px solid #e8458b; outline-offset: 3px; border-radius: 6px; }

/* Experiences: one group per day, so a long list stays easy to scan. */
.rsvp-exp-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -6px 0 14px; }
.rsvp-exp-bar .rsvp-text-btn { margin: 0; }
.rsvp-exp-count { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); font-variant-numeric: tabular-nums; }
.rsvp-group + .rsvp-group { margin-top: 20px; }
.rsvp-group-head { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; min-height: 28px; }
.rsvp-group-day { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 12px; letter-spacing: 1.6px; text-transform: uppercase; color: #fff; white-space: nowrap; }
.rsvp-group-date { font-size: 13px; font-weight: 700; color: #ffd9a0; white-space: nowrap; }
.rsvp-group-line { flex: 1; min-width: 12px; height: 1px; background: linear-gradient(90deg, rgba(232,69,139,0.7), rgba(122,63,209,0.35) 60%, rgba(255,255,255,0)); }
.rsvp-group-count { font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.82); font-variant-numeric: tabular-nums; }
.rsvp-group-all { height: 26px; padding: 0 11px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: #ffb3d1;
  font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: border-color .2s, background .2s, color .2s; }
.rsvp-group-all:hover { color: #fff; border-color: #e8458b; background: rgba(232,69,139,0.16); }
.rsvp-group-all:focus-visible { outline: 2px solid #e8458b; outline-offset: 2px; }
.rsvp-exp { padding: 13px 15px; gap: 12px; border-radius: 16px; }
.rsvp-exp .rsvp-choice-title { font-size: 15px; }
.rsvp-exp .rsvp-choice-desc { font-size: 12.5px; }
.rsvp-stack + .rsvp-error, .rsvp-groups + .rsvp-error, .rsvp-groups + .rsvp-hint { margin-top: 14px; }
.rsvp-empty { padding: 18px; border-radius: 18px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); line-height: 1.6; font-size: 14.5px; }
.rsvp-empty p { margin: 0; }

.rsvp-summary { margin: 0; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); background: rgba(6,2,15,0.35); }
.rsvp-summary-row { display: grid; grid-template-columns: 96px 1fr auto; gap: 12px; align-items: start; padding: 14px 16px; }
.rsvp-summary-row + .rsvp-summary-row { border-top: 1px solid rgba(255,255,255,0.08); }
.rsvp-summary dt { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; color: rgba(255,255,255,0.7); padding-top: 2px; font-family: 'Orbitron', sans-serif; font-size: 10px; }
.rsvp-summary dd { margin: 0; min-width: 0; }
.rsvp-summary-value { display: block; font-weight: 600; font-size: 14.5px; line-height: 1.5; overflow-wrap: anywhere; }
.rsvp-summary-group { display: grid; grid-template-columns: 64px 1fr; align-items: baseline; }
.rsvp-summary-group + .rsvp-summary-group { margin-top: 6px; }
.rsvp-summary-day { font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #ffd9a0; }
.rsvp-summary-extra { display: block; font-size: 12.5px; color: rgba(255,255,255,0.74); margin-top: 3px; overflow-wrap: anywhere; }
.rsvp-edit { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.05);
  color: #fff; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .2s, background .2s; }
.rsvp-edit:hover { border-color: #e8458b; background: rgba(232,69,139,0.14); }
.rsvp-edit:focus-visible { outline: 2px solid #e8458b; outline-offset: 2px; }

.rsvp-nav { display: flex; gap: 12px; margin-top: 24px; }
.rsvp-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 54px; padding: 0 22px; border-radius: 99px; border: 0; cursor: pointer;
  font: inherit; font-size: 16px; font-weight: 700; color: #fff; letter-spacing: 0.2px;
  background: linear-gradient(90deg, #7a3fd1, #e8458b, #f5a623, #e8458b, #7a3fd1); background-size: 300% 100%; background-position: 0% 0;
  box-shadow: 0 12px 34px rgba(232,69,139,0.38), inset 0 1px 0 rgba(255,255,255,0.3); transition: background-position .6s ease, transform .15s ease, box-shadow .25s; }
.rsvp-btn:hover:not(:disabled) { background-position: 60% 0; box-shadow: 0 14px 44px rgba(232,69,139,0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
.rsvp-btn:active:not(:disabled) { transform: scale(0.98); }
.rsvp-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.rsvp-btn:disabled { cursor: progress; opacity: 0.75; }
.rsvp-btn-ghost { flex: none; width: 54px; height: 54px; border-radius: 99px; display: grid; place-items: center; cursor: pointer; color: #fff;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); transition: border-color .2s, background .2s; }
.rsvp-btn-ghost:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.rsvp-btn-ghost:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.rsvp-spin { animation: rsvpSpin 0.9s linear infinite; }
@keyframes rsvpSpin { to { transform: rotate(360deg); } }

.rsvp-success { display: flex; flex-direction: column; align-items: center; text-align: center; }
.rsvp-success .rsvp-btn { width: 100%; margin-top: 22px; flex: none; }
.rsvp-celebrate { position: relative; width: 100%; height: 120px; display: grid; place-items: center; margin-bottom: 6px; }
.rsvp-confetti { position: absolute; left: 50%; top: 50%; margin: -4px 0 0 -4px; }
.rsvp-success-badge { position: relative; width: 88px; height: 88px; border-radius: 99px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #7a3fd1, #e8458b 60%, #f5a623); box-shadow: 0 0 50px rgba(232,69,139,0.6); }
.rsvp-ring { position: absolute; inset: 0; border-radius: 99px; border: 2px solid rgba(255,210,122,0.8); }
.rsvp-success-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 4px; }

.rsvp-foot { position: relative; z-index: 1; margin: 20px 0 0; font-size: 13px; color: rgba(255,255,255,0.75); text-align: center; }

@media (max-width: 480px) {
  .rsvp-time { font-size: 15px; padding-left: 8px; }
  .rsvp-root { justify-content: flex-start; padding: 18px 16px 28px; }
  .rsvp-brand { margin-bottom: 14px; }
  .rsvp-brand img { height: 120px; }
  .rsvp-card { border-radius: 24px; padding: 22px 18px 18px; }
  .rsvp-grid2 { grid-template-columns: 1fr; gap: 0; }
  .rsvp-grid2 .rsvp-day { margin-bottom: 10px; flex-direction: row; align-items: center; }
  .rsvp-day .rsvp-check { position: static; }
  .rsvp-day .rsvp-choice-body { flex-direction: row; flex-wrap: wrap; align-items: baseline; column-gap: 10px; }
  .rsvp-day .rsvp-choice-desc { flex-basis: 100%; }
  .rsvp-day-date { font-size: 18px; }
  .rsvp-facts { grid-template-columns: 1fr; gap: 8px; }
  .rsvp-facts li { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; }
  .rsvp-facts span { margin: 0; }
  .rsvp-summary-row { grid-template-columns: 1fr auto; row-gap: 2px; align-items: center; padding: 12px 14px; }
  .rsvp-summary-row dd { grid-column: 1 / -1; grid-row: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .rsvp-chip-magic::after { animation: none; display: none; }
  .rsvp-spin { animation-duration: 2s; }
  .rsvp-btn, .rsvp-choice { transition: none; }
}
`;
