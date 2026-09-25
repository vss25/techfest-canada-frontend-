import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API } from "../utils/api";

/* ============================================================
   MEDIA ACCREDITATION
   Route: /media
   Posts to: POST {API}/media/apply  →  emails the marcom inbox
   ============================================================ */

const COVERAGE_AREAS = [
  "Artificial Intelligence & Machine Learning",
  "Quantum Computing",
  "Cybersecurity & Digital Trust",
  "Climate Tech / CleanTech",
  "Robotics & Automation",
  "Enterprise Technology",
  "FinTech",
  "HealthTech / Life Sciences",
  "Defence & National Security",
  "Startups & Venture Capital",
  "Technology Policy & Regulation",
  "Digital Infrastructure",
  "Cloud & Data Centres",
  "Telecommunications",
  "Consumer Technology",
];

const EMPTY = {
  fullName: "",
  email: "",
  organization: "",
  coverage: [],
  coverageOther: "",
  website: "",
};

/* ---------- tiny icons ---------- */
function Tick() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function BigTick() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Media() {
  const [dark, setDark] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");
  const honeypot = useRef("");

  /* ---------- theme ---------- */
  useEffect(() => {
    setDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() => setDark(document.body.classList.contains("dark-mode")));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);

  /* ---------- palette ---------- */
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.66)" : "rgba(13,5,32,0.68)";
  const textDim = dark ? "rgba(255,255,255,0.42)" : "rgba(13,5,32,0.45)";
  const pageBg = dark ? "#06020f" : "#ffffff";
  const cardBg = dark ? "rgba(255,255,255,0.035)" : "rgba(122,63,209,0.025)";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(122,63,209,0.12)";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const inputBorder = dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(122,63,209,0.16)";
  const accent = dark ? "#c8a8ff" : "#7a3fd1";

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const toggleCoverage = (area) => {
    setForm((f) => ({
      ...f,
      coverage: f.coverage.includes(area)
        ? f.coverage.filter((a) => a !== area)
        : [...f.coverage, area],
    }));
    setErrors((e) => (e.coverage ? { ...e, coverage: undefined } : e));
  };

  const otherChecked = form.coverage.includes("Other");

  /* ---------- validation ---------- */
  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.organization.trim()) e.organization = "Required";
    if (form.coverage.length === 0) e.coverage = "Select at least one coverage area";
    if (otherChecked && !form.coverageOther.trim()) e.coverageOther = "Tell us your coverage area";
    if (!form.website.trim()) e.website = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------- submit ---------- */
  const submit = async () => {
    setServerError("");
    if (!validate()) {
      const firstBad = document.querySelector("[data-invalid='true']");
      if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/media/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          organization: form.organization.trim(),
          coverage: form.coverage,
          coverageOther: otherChecked ? form.coverageOther.trim() : "",
          website: form.website.trim(),
          _hp: honeypot.current, // bots fill this; humans never see it
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed. Please try again.");

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setServerError(err.message || "Something went wrong. Please email marcom@thetechfestival.com directly.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- shared field styles ---------- */
  const labelStyle = {
    display: "block",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.6rem",
    fontWeight: 800,
    letterSpacing: "1.6px",
    textTransform: "uppercase",
    color: textDim,
    marginBottom: 8,
  };

  const inputStyle = (bad) => ({
    width: "100%",
    padding: "13px 15px",
    borderRadius: 11,
    border: bad ? "1px solid #e05555" : inputBorder,
    background: inputBg,
    color: textMain,
    fontFamily: "'Archivo', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.18s, box-shadow 0.18s",
  });

  /* A plain function, NOT a nested component. Declaring a component inside
     the render body gives React a brand-new component type every keystroke,
     which remounts the input and drops focus mid-word. Called as
     {renderField({...})} it is just inline JSX. */
  const renderField = ({ id, label, placeholder, type = "text", hint }) => (
    <div key={id} style={{ marginBottom: 20 }} data-invalid={errors[id] ? "true" : "false"}>
      <label style={labelStyle} htmlFor={`media-${id}`}>{label}</label>
      <input
        id={`media-${id}`}
        type={type}
        value={form[id]}
        placeholder={placeholder}
        onChange={(e) => set(id, e.target.value)}
        style={inputStyle(!!errors[id])}
        onFocus={(e) => { if (!errors[id]) e.currentTarget.style.borderColor = dark ? "rgba(160,100,255,0.6)" : "#7a3fd1"; }}
        onBlur={(e) => { if (!errors[id]) e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.12)" : "rgba(122,63,209,0.16)"; }}
      />
      {errors[id] ? (
        <span style={{ display: "block", fontSize: "0.7rem", color: "#e05555", fontWeight: 700, marginTop: 6 }}>{errors[id]}</span>
      ) : hint ? (
        <span style={{ display: "block", fontSize: "0.68rem", color: textDim, marginTop: 6 }}>{hint}</span>
      ) : null}
    </div>
  );

  /* ================= SUCCESS ================= */
  if (done) {
    return (
      <div style={{ background: pageBg, minHeight: "100vh", fontFamily: "'Archivo', sans-serif" }}>
        <Navbar />
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "120px 22px 140px", textAlign: "center" }}>
          <div style={{ width: 74, height: 74, borderRadius: 999, margin: "0 auto 26px", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(122,63,209,0.35)" }}>
            <BigTick />
          </div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.5rem, 5vw, 2.2rem)", fontWeight: 900, color: textMain, letterSpacing: "-0.5px", margin: "0 0 14px" }}>
            Request Received
          </h1>
          <p style={{ fontSize: "0.95rem", color: textMuted, lineHeight: 1.7, margin: "0 0 10px" }}>
            Thanks, {form.fullName.split(" ")[0]}. Your media accreditation request for The Tech Festival Canada 2026 is with our team.
          </p>
          <p style={{ fontSize: "0.88rem", color: textDim, lineHeight: 1.7, margin: 0 }}>
            We review requests on a rolling basis and reply to <strong style={{ color: accent }}>{form.email}</strong>. For anything urgent, write to{" "}
            <a href="mailto:marcom@thetechfestival.com" style={{ color: accent, fontWeight: 700 }}>marcom@thetechfestival.com</a>.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  /* ================= FORM ================= */
  return (
    <div style={{ background: pageBg, minHeight: "100vh", fontFamily: "'Archivo', sans-serif" }}>
      <Navbar />

      {/* ---------- hero ---------- */}
      <div style={{ padding: "110px 22px 0", maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: dark ? "rgba(160,100,255,0.85)" : "#7a3fd1", marginBottom: 14 }}>
          Press &amp; Media
        </div>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.8rem, 6vw, 3rem)", fontWeight: 900, color: textMain, letterSpacing: "-1px", lineHeight: 1.1, margin: "0 0 16px" }}>
          Media Accreditation
        </h1>
        <p style={{ fontSize: "0.95rem", color: textMuted, lineHeight: 1.75, maxWidth: 560, margin: "0 auto" }}>
          Request press access to The Tech Festival Canada 2026 &mdash; 26&ndash;27 October, Westin Harbour Castle, Toronto. Tell us who you write for and what you cover, and our team will be in touch.
        </p>
      </div>

      {/* ---------- form card ---------- */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 22px 120px" }}>
        <div style={{ background: cardBg, border: cardBorder, borderRadius: 22, padding: "clamp(22px, 4vw, 38px)", backdropFilter: "blur(12px)" }}>

          {/* honeypot — hidden from humans, catches bots */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            onChange={(e) => { honeypot.current = e.target.value; }}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />

          {renderField({ id: "fullName", label: "Full Name", placeholder: "Jane Doe" })}
          {renderField({ id: "email", label: "Email Address", placeholder: "jane@publication.com", type: "email" })}
          {renderField({ id: "organization", label: "Organization", placeholder: "Publication, broadcaster, agency or independent" })}
          {renderField({
            id: "website",
            label: "Website / Media Link",
            placeholder: "https://publication.com/author/jane",
            hint: "A link to your outlet, portfolio, or recent work.",
          })}

          {/* ---------- coverage areas ---------- */}
          <div style={{ marginTop: 30 }} data-invalid={errors.coverage ? "true" : "false"}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Primary Coverage Area(s)</label>
              {form.coverage.length > 0 && (
                <span style={{ fontSize: "0.66rem", fontWeight: 700, color: accent, whiteSpace: "nowrap" }}>
                  {form.coverage.length} selected
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.72rem", color: textDim, margin: "0 0 14px" }}>Select all that apply.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
              {[...COVERAGE_AREAS, "Other"].map((area) => {
                const on = form.coverage.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleCoverage(area)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      padding: "11px 13px",
                      borderRadius: 11,
                      cursor: "pointer",
                      background: on ? (dark ? "rgba(122,63,209,0.18)" : "rgba(122,63,209,0.07)") : inputBg,
                      border: on
                        ? "1px solid " + (dark ? "rgba(160,100,255,0.55)" : "rgba(122,63,209,0.42)")
                        : inputBorder,
                      color: on ? textMain : textMuted,
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: "0.83rem",
                      fontWeight: on ? 700 : 500,
                      lineHeight: 1.35,
                      transition: "all 0.16s",
                    }}
                  >
                    <span style={{
                      width: 19, height: 19, flexShrink: 0, borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: on ? "linear-gradient(135deg, #7a3fd1, #f5a623)" : "transparent",
                      border: on ? "none" : "1.5px solid " + (dark ? "rgba(255,255,255,0.22)" : "rgba(13,5,32,0.2)"),
                    }}>
                      {on && <Tick />}
                    </span>
                    {area}
                  </button>
                );
              })}
            </div>

            {errors.coverage && (
              <span style={{ display: "block", fontSize: "0.7rem", color: "#e05555", fontWeight: 700, marginTop: 8 }}>{errors.coverage}</span>
            )}

            {otherChecked && (
              <div style={{ marginTop: 12 }} data-invalid={errors.coverageOther ? "true" : "false"}>
                <input
                  autoFocus
                  value={form.coverageOther}
                  placeholder="Please specify your coverage area"
                  onChange={(e) => set("coverageOther", e.target.value)}
                  style={inputStyle(!!errors.coverageOther)}
                />
                {errors.coverageOther && (
                  <span style={{ display: "block", fontSize: "0.7rem", color: "#e05555", fontWeight: 700, marginTop: 6 }}>{errors.coverageOther}</span>
                )}
              </div>
            )}
          </div>

          {serverError && (
            <div style={{ marginTop: 24, padding: "13px 16px", borderRadius: 11, background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.35)", color: "#e05555", fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.5 }}>
              {serverError}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 30,
              padding: "16px 0",
              borderRadius: 13,
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 800,
              fontSize: "0.78rem",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: "#fff",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              boxShadow: submitting ? "none" : "0 6px 24px rgba(122,63,209,0.35)",
              opacity: submitting ? 0.65 : 1,
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Sending…" : "Submit Request"}
          </button>

          <p style={{ fontSize: "0.7rem", color: textDim, lineHeight: 1.6, textAlign: "center", margin: "16px 0 0" }}>
            Goes straight to our press team at{" "}
            <a href="mailto:marcom@thetechfestival.com" style={{ color: accent, fontWeight: 700, textDecoration: "none" }}>marcom@thetechfestival.com</a>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
