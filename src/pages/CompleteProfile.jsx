import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CustomDropdown, TickSmall } from "../components/FormDropdown";
import { PUBLIC_API } from "../hooks/useSiteSettings";
import {
  COUNTRIES, PRIORITY_COUNTRIES, COUNTRY_FLAGS, JOB_LEVELS, JOB_FUNCTIONS, TOPICS, OBJECTIVES,
} from "../data/attendeeOptions";

/* ============================================================
   /complete-profile?t=<ticketId>&s=<signature>
   The personal link staff email to ticket holders whose checkout
   answers were never saved (Admin → Tickets → Ask for missing
   details). No login: the backend checks the signature
   (GET/POST /api/complete-profile). Answers land on the ticket,
   where staff see them.
   ============================================================ */

const SUPPORT_EMAIL = "info@thetechfestival.com";
const ORBITRON = "'Orbitron', sans-serif";
const GRADIENT = "linear-gradient(135deg, #7a3fd1, #f5a623)";

const EMPTY = {
  firstName: "", lastName: "", jobTitle: "", organisation: "", phone: "", linkedin: "", country: "",
  jobLevel: "", jobLevelOther: "", jobFunction: "", topics: [], objectives: [], consentUpdates: false,
};

/** Stored answers → form state ("Other: Founder" → Other + "Founder"). */
function formFrom(view) {
  const d = view?.details || {};
  const f = { ...EMPTY, firstName: view?.firstName || "", lastName: view?.lastName || "" };
  for (const k of ["jobTitle", "organisation", "phone", "linkedin", "country", "jobFunction"]) f[k] = d[k] || "";
  const level = String(d.jobLevel || "");
  if (level.startsWith("Other:")) { f.jobLevel = "Other"; f.jobLevelOther = level.slice(6).trim(); }
  else if (level && !JOB_LEVELS.includes(level)) { f.jobLevel = "Other"; f.jobLevelOther = level; }
  else f.jobLevel = level;
  f.topics = Array.isArray(d.topics) ? d.topics : [];
  f.objectives = Array.isArray(d.objectives) ? d.objectives : [];
  f.consentUpdates = d.consentUpdates === true;
  return f;
}

function useBodyDark() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const sync = () => setDark(document.body.classList.contains("dark-mode"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Tap-to-toggle chips for topics / objectives (easier than a dropdown on a phone). */
function Chips({ options, value, onChange, dark, label }) {
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div role="group" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {all.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "8px 14px", borderRadius: 999,
              border: "1px solid " + (on ? "#7a3fd1" : dark ? "rgba(255,255,255,0.16)" : "rgba(122,63,209,0.22)"),
              background: on ? (dark ? "rgba(122,63,209,0.32)" : "rgba(122,63,209,0.12)") : (dark ? "rgba(255,255,255,0.04)" : "#ffffff"),
              color: on ? (dark ? "#e2d2ff" : "#5a24a8") : (dark ? "rgba(255,255,255,0.82)" : "#2a1d45"),
              fontFamily: "inherit", fontSize: "14px", fontWeight: on ? 700 : 500, lineHeight: 1.3, textAlign: "left", cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {on && <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 999, background: "#7a3fd1", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><TickSmall /></span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function CompleteProfile() {
  const dark = useBodyDark();
  const { t, s } = useMemo(() => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return { t: p.get("t") || "", s: p.get("s") || "" };
  }, []);

  const [status, setStatus] = useState(t && s ? "loading" : "invalid"); // loading | ready | invalid | error | done
  const [view, setView] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nonce, setNonce] = useState(0);
  const topRef = useRef(null);

  useEffect(() => {
    const prev = document.title;
    document.title = "Complete your profile · TTFC 2026";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.title = prev; meta.remove(); };
  }, []);

  useEffect(() => {
    if (!t || !s) return undefined;
    let alive = true;
    fetch(`${PUBLIC_API}/complete-profile?${new URLSearchParams({ t, s })}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.status === 404 || res.status === 400) { setStatus("invalid"); return; }
        if (!res.ok) throw new Error(data.error || "Request failed");
        setView(data); setForm(formFrom(data)); setStatus("ready");
      })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [t, s, nonce]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.jobTitle.trim()) e.jobTitle = "Please add your job title";
    if (!form.organisation.trim()) e.organisation = "Please add your organisation";
    if (form.jobLevel === "Other" && !form.jobLevelOther.trim()) e.jobLevelOther = "Please describe your role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const submit = async (ev) => {
    ev?.preventDefault();
    setSaveError("");
    if (!validate()) {
      setSaveError("A couple of answers need a look (marked in red).");
      const firstBad = ["jobTitle", "organisation"].find((k) => !form[k].trim());
      if (firstBad) document.getElementById(`cp-${firstBad}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${PUBLIC_API}/complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t, s, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) { setStatus("invalid"); return; }
      if (!res.ok) throw new Error(data.error || "We couldn't save your answers. Please try again.");
      setView(data); setStatus("done");
      requestAnimationFrame(scrollTop);
    } catch (err) {
      setSaveError(err.message || "We couldn't save your answers. Please try again.");
    } finally { setSaving(false); }
  };

  const handleLinkedInBlur = () => {
    const v = form.linkedin.trim();
    if (v && !/^https?:\/\//i.test(v) && /^(www\.)?linkedin\.com\//i.test(v)) set("linkedin", "https://" + v);
  };

  /* ---------- theme ---------- */
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.68)" : "rgba(13,5,32,0.68)";
  const textDim = dark ? "rgba(255,255,255,0.45)" : "rgba(13,5,32,0.48)";
  const bg = dark ? "#06020f" : "#ffffff";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const inputBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.20)";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(122,63,209,0.12)";
  const accent = dark ? "#c8a8ff" : "#7a3fd1";
  const divider = dark ? "rgba(255,255,255,0.07)" : "rgba(122,63,209,0.10)";

  const inputStyle = (err) => ({ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (err ? "#e05555" : inputBorder), background: inputBg, color: textMain, fontFamily: "inherit", fontSize: "16px", outline: "none", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", minHeight: 46 });
  const labelStyle = { fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: textMuted, display: "block", marginBottom: 7 };
  const optional = <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", color: textDim }}>(optional)</span>;
  const errStyle = { fontSize: "0.75rem", color: "#e05555", marginTop: 5 };
  const sectionLabel = { fontFamily: ORBITRON, fontWeight: 800, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", color: accent };
  const card = { background: cardBg, border: cardBorder, borderRadius: 20, padding: "clamp(20px, 5vw, 36px)", backdropFilter: "blur(12px)" };
  const primaryBtn = (disabled) => ({ width: "100%", minHeight: 52, padding: "15px 18px", borderRadius: 12, border: "none", background: GRADIENT, color: "#fff", fontFamily: ORBITRON, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "1.2px", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, boxShadow: "0 4px 20px rgba(122,63,209,0.35)" });
  const field = (k, label, { required, placeholder, type = "text", autoComplete, inputMode, onBlur, maxLength = 150, hint } = {}) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label htmlFor={`cp-${k}`} style={labelStyle}>{label}{required ? " *" : <> {optional}</>}</label>
      <input
        id={`cp-${k}`} type={type} value={form[k]} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} maxLength={maxLength}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `cp-${k}-err` : undefined}
        onChange={(e) => set(k, k === "phone" ? e.target.value.replace(/[^\d\s()+.-]/g, "").slice(0, 25) : e.target.value)}
        onBlur={onBlur} style={inputStyle(errors[k])}
      />
      {hint && !errors[k] && <span style={{ fontSize: "0.72rem", color: textDim, marginTop: 5 }}>{hint}</span>}
      {errors[k] && <span id={`cp-${k}-err`} style={errStyle}>{errors[k]}</span>}
    </div>
  );

  const first = view?.firstName || "";
  const completedOn = view?.completedAt ? new Date(view.completedAt).toLocaleDateString("en-CA", { month: "long", day: "numeric" }) : "";

  /* ---------- states ---------- */
  let content;
  if (status === "loading") {
    content = (
      <div style={{ ...card, textAlign: "center", padding: "56px 24px" }} role="status" aria-live="polite">
        <div style={{ width: 34, height: 34, margin: "0 auto 16px", borderRadius: 999, border: `3px solid ${divider}`, borderTopColor: "#7a3fd1", animation: "cpSpin 0.8s linear infinite" }} />
        <p style={{ margin: 0, color: textMuted }}>Loading your profile…</p>
      </div>
    );
  } else if (status === "invalid" || status === "error") {
    const invalid = status === "invalid";
    content = (
      <div style={{ ...card, textAlign: "center", padding: "44px clamp(20px, 5vw, 40px)" }} role="alert">
        <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 10 }}>{invalid ? "🔗" : "⚠️"}</div>
        <h1 style={{ fontFamily: ORBITRON, fontWeight: 900, fontSize: "clamp(1.2rem, 5vw, 1.6rem)", margin: "0 0 12px", color: textMain }}>
          {invalid ? "This link isn't working" : "We couldn't load your profile"}
        </h1>
        <p style={{ margin: "0 auto 22px", maxWidth: 440, color: textMuted, lineHeight: 1.6, fontSize: "1rem" }}>
          {invalid
            ? "It may have expired or been copied incompletely. Try opening it again from the email we sent you, or write to us and we'll send you a fresh one."
            : "Something went wrong on our side. Please try again in a moment."}
        </p>
        {!invalid && <button type="button" onClick={() => { setStatus("loading"); setNonce((n) => n + 1); }} style={{ ...primaryBtn(false), width: "auto", padding: "14px 28px", marginBottom: 18 }}>Try again</button>}
        <p style={{ margin: 0, color: textMuted, fontSize: "0.95rem" }}>
          Need a hand? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: accent, fontWeight: 700 }}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    );
  } else if (status === "done") {
    content = (
      <div style={{ ...card, textAlign: "center", padding: "48px clamp(20px, 5vw, 40px)" }} role="status" aria-live="polite">
        <div aria-hidden="true" style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: 999, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(122,63,209,0.35)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h1 style={{ fontFamily: ORBITRON, fontWeight: 900, fontSize: "clamp(1.25rem, 5.5vw, 1.8rem)", margin: "0 0 12px", color: textMain, lineHeight: 1.3 }}>
          Thanks — you're all set.
        </h1>
        <p style={{ margin: "0 auto 6px", maxWidth: 440, color: textMuted, lineHeight: 1.6, fontSize: "1.05rem" }}>See you on Oct 26.</p>
        <p style={{ margin: "0 auto 26px", maxWidth: 440, color: textDim, lineHeight: 1.6, fontSize: "0.9rem" }}>
          {view?.pass ? `${view.pass} · ` : ""}The Westin Harbour Castle, Toronto · Registration opens 8:00 AM
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <button type="button" onClick={() => { setForm(formFrom(view)); setStatus("ready"); requestAnimationFrame(scrollTop); }}
            style={{ minHeight: 46, padding: "12px 22px", borderRadius: 12, border: "1px solid " + inputBorder, background: "transparent", color: textMain, fontFamily: ORBITRON, fontWeight: 800, fontSize: "0.62rem", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer" }}>
            Edit my answers
          </button>
          <Link to="/" style={{ minHeight: 46, display: "inline-flex", alignItems: "center", padding: "12px 22px", borderRadius: 12, background: GRADIENT, color: "#fff", textDecoration: "none", fontFamily: ORBITRON, fontWeight: 800, fontSize: "0.62rem", letterSpacing: "1px", textTransform: "uppercase" }}>
            Explore the festival
          </Link>
        </div>
      </div>
    );
  } else {
    content = (
      <form onSubmit={submit} noValidate style={card}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={sectionLabel}>About you</div>
          <div className="cp-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("firstName", "First name", { autoComplete: "given-name", maxLength: 80 })}
            {field("lastName", "Last name", { autoComplete: "family-name", maxLength: 80 })}
          </div>
          {field("jobTitle", "Job title", { required: true, placeholder: "e.g. Chief Technology Officer", autoComplete: "organization-title" })}
          {field("organisation", "Organisation", { required: true, placeholder: "e.g. Acme Corp", autoComplete: "organization" })}
          {field("phone", "Business phone", { type: "tel", inputMode: "tel", placeholder: "+1 (416) 000-0000", autoComplete: "tel", maxLength: 25, hint: "Include the country code (e.g. +1 for Canada/US)" })}
          {field("linkedin", "LinkedIn profile", { type: "url", inputMode: "url", placeholder: "linkedin.com/in/yourname", autoComplete: "url", maxLength: 300, onBlur: handleLinkedInBlur })}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={labelStyle}>Country {optional}</span>
            <CustomDropdown options={COUNTRIES.filter((c) => !PRIORITY_COUNTRIES.includes(c))} priorityOptions={PRIORITY_COUNTRIES} flagMap={COUNTRY_FLAGS} value={form.country} onChange={(v) => set("country", v)} placeholder="Select your country…" searchable dark={dark} maxHeight={220} />
          </div>

          <div style={{ height: 1, background: divider, margin: "6px 0 2px" }} />
          <div style={sectionLabel}>Your role</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={labelStyle}>Job level {optional}</span>
            <CustomDropdown options={JOB_LEVELS} value={form.jobLevel} onChange={(v) => { set("jobLevel", v); if (v !== "Other") set("jobLevelOther", ""); }} placeholder="Select your level…" dark={dark} maxHeight={240} />
            {form.jobLevel === "Other" && (
              <div style={{ marginTop: 10 }}>
                <input aria-label="Describe your role" value={form.jobLevelOther} maxLength={100} onChange={(e) => set("jobLevelOther", e.target.value)} placeholder="Please describe your role…" style={inputStyle(errors.jobLevelOther)} />
                {errors.jobLevelOther && <span style={errStyle}>{errors.jobLevelOther}</span>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={labelStyle}>Job function {optional}</span>
            <CustomDropdown options={JOB_FUNCTIONS} value={form.jobFunction} onChange={(v) => set("jobFunction", v)} placeholder="Select your function…" dark={dark} maxHeight={240} />
          </div>

          <div style={{ height: 1, background: divider, margin: "6px 0 2px" }} />
          <div style={sectionLabel}>What you're here for</div>
          <div>
            <span style={labelStyle}>Topics you care about <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", color: textDim }}>({form.topics.length} selected)</span></span>
            <Chips options={TOPICS} value={form.topics} onChange={(v) => set("topics", v)} dark={dark} label="Topics you care about" />
          </div>
          <div>
            <span style={labelStyle}>What you'd like to get out of TTFC <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", color: textDim }}>({form.objectives.length} selected)</span></span>
            <Chips options={OBJECTIVES} value={form.objectives} onChange={(v) => set("objectives", v)} dark={dark} label="Your objectives" />
          </div>

          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", padding: "16px 18px", background: dark ? "rgba(122,63,209,0.08)" : "rgba(122,63,209,0.04)", borderRadius: 14, border: dark ? "1px solid rgba(122,63,209,0.20)" : "1px solid rgba(122,63,209,0.12)" }}>
            <span style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
              <input type="checkbox" checked={form.consentUpdates} onChange={(e) => set("consentUpdates", e.target.checked)} style={{ position: "absolute", opacity: 0, width: 20, height: 20, margin: 0 }} />
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid " + (form.consentUpdates ? "#7a3fd1" : inputBorder), background: form.consentUpdates ? "#7a3fd1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{form.consentUpdates && <TickSmall />}</span>
            </span>
            <span style={{ fontSize: "14px", color: textMuted, lineHeight: 1.6 }}>
              Keep me posted about the agenda, activities and news from The Tech Festival Canada.
            </span>
          </label>

          <p style={{ margin: 0, fontSize: "0.82rem", color: textDim, lineHeight: 1.6 }}>
            🔒 Your answers are only shared with the TTFC organisers. We use them to match you with the right people, sessions and meetings.
          </p>

          {saveError && <p role="alert" style={{ margin: 0, padding: "12px 14px", borderRadius: 10, background: "rgba(224,85,85,0.10)", border: "1px solid rgba(224,85,85,0.35)", color: dark ? "#ffb4b4" : "#b03030", fontSize: "0.9rem" }}>{saveError}</p>}

          <button type="submit" disabled={saving} style={primaryBtn(saving)}>
            {saving ? "Saving…" : "Save my profile →"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <Navbar />
      <style>{`
        @keyframes cpSpin { to { transform: rotate(360deg); } }
        @media (max-width: 420px) { .cp-two { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ minHeight: "100vh", background: bg, color: textMain, position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: dark
            ? "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.05) 0%, transparent 70%)" }} />

        <main ref={topRef} style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "clamp(96px, 14vw, 128px) 16px 72px", scrollMarginTop: 80 }}>
          {status === "ready" && (
            <header style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontFamily: ORBITRON, fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "#f5a623", padding: "5px 12px", borderRadius: 999, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.30)" }}>{view?.pass || "TTFC 2026"}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: textDim }}>Oct 26–27 · Toronto</span>
              </div>
              <h1 style={{ fontFamily: ORBITRON, fontWeight: 900, fontSize: "clamp(1.45rem, 6vw, 2.2rem)", letterSpacing: "-0.5px", lineHeight: 1.2, margin: "0 0 10px", color: textMain }}>
                Hi{first ? ` ${first}` : ""}, let's complete your profile
              </h1>
              <p style={{ fontSize: "1rem", color: textMuted, margin: 0, lineHeight: 1.6 }}>
                Help us match you with the right people, sessions and meetings at TTFC 2026. It takes about a minute.
              </p>
              {view?.completed && (
                <p style={{ margin: "14px 0 0", padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(76,201,140,0.10)" : "rgba(30,150,90,0.07)", border: "1px solid rgba(60,180,120,0.30)", color: dark ? "#9fe6c2" : "#1d7a4c", fontSize: "0.88rem" }}>
                  You already completed this{completedOn ? ` on ${completedOn}` : ""}. Change anything below and save again.
                </p>
              )}
              {view?.email && <p style={{ margin: "12px 0 0", fontSize: "0.8rem", color: textDim }}>Ticket for {view.email}</p>}
            </header>
          )}
          {content}
        </main>
        <Footer />
      </div>
    </>
  );
}
