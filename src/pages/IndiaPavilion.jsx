import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API = import.meta.env.VITE_API_URL || "https://techfest-canada-backend.onrender.com/api";

/* ═══════════════════════════════════════════════════════
   OPTIONS
   
   ═══════════════════════════════════════════════════════ */

const BUSINESS_STAGES = [
  "Idea / Concept",
  "Pre-Seed / MVP",
  "Seed",
  "Early Revenue",
  "Growth / Series A",
  "Scaling / Series B+",
  "Profitable / Established",
  "Other",
];

const TECH_DOMAINS = [
  "AI & Machine Learning",
  "Quantum Computing",
  "Cybersecurity & Digital Trust",
  "Robotics & Automation",
  "CleanTech & Sustainability",
  "Manufacturing / Advanced Mfg.",
  "HealthTech / Life Sciences",
  "Digital Public Infrastructure",
];

const SECTORS = [
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "Energy & Critical Infrastructure",
  "Manufacturing, Supply Chain & Mobility",
  "Public Sector, Defence & Security",
  "Other",
];

const BOOTH_TIERS = [
  { key: "single", label: "Single", size: "10' × 10'", standard: 2499, subsidy: 2000, pay: 499 },
  { key: "double", label: "Double", size: "10' × 20'", standard: 4499, subsidy: 3500, pay: 999 },
  { key: "triple", label: "Triple", size: "10' × 30'", standard: 5999, subsidy: 4500, pay: 1499 },
  { key: "quadruple", label: "Quadruple", size: "10' × 40'", standard: 7499, subsidy: 5500, pay: 1999 },
];

const PROGRAMME_INTERESTS = [
  { key: "speaking", label: "Speaking opportunity — main stage or track session" },
  { key: "mou", label: "MoU signing ceremony — launch of Canadian operations" },
  { key: "b2b", label: "Curated B2B meetings with Canadian enterprise buyers" },
  { key: "forum", label: "India Business Forum participation" },
  { key: "investor", label: "Investor / capital introductions" },
];

const EMPTY_FORM = {
  legalName: "", tradingName: "", cin: "", incorporationDate: "",
  registeredOffice: "", website: "", linkedIn: "", yearFounded: "", employees: "",
  isIndian: "", isMcaRegistered: "", cinNumber: "", roc: "",
  isDpiitRecognised: "", dpiitNumber: "",
  isIncubatorEndorsed: "", incubator: "",
  hasCanadianOps: "", canadianPresence: "",
  businessStage: "", otherStage: "",
  latestFunding: "", annualRevenue: "",
  techDomain: "", sector: "", otherSector: "",
  companyDescription: "", traction: "", objective: "",
  boothTier: "",
  programmeInterests: [],
  repName: "", repTitle: "", repEmail: "", repMobile: "",
  secondaryContact: "",
  delegate1: "", delegate2: "",
  needsVisa: "", visaCount: "",
  declaration1: false, declaration2: false, declaration3: false,
  declaration4: false, declaration5: false, declaration6: false,
  signatureName: "", signatureTitle: "",
};

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function IndiaPavilion() {
  const [isDark, setIsDark] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reference, setReference] = useState("");
  const formRef = useRef(null);
  const honeypot = useRef("");
  const openedAt = useRef(Date.now()); // bots fill the form in well under a second
  const TOTAL_STEPS = 6;

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const bg        = isDark ? "#07030f"                : "#f4f0ff";
  const textMain  = isDark ? "#ffffff"                : "#0f0520";
  const textMuted = isDark ? "rgba(200,180,255,0.8)"  : "rgba(60,30,110,0.85)";
  const cardBg    = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const border    = isDark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.18)";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.03)";
  const inputBdr  = isDark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.16)";
  const textSoft  = isDark ? "rgba(200,180,255,0.5)"  : "rgba(60,30,110,0.5)";
  const accent    = isDark ? "#b99eff"                : "#7a3fd1";
  const errorColor = "#e05555";

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleInterest = (key) => {
    setForm((f) => ({
      ...f,
      programmeInterests: f.programmeInterests.includes(key)
        ? f.programmeInterests.filter((k) => k !== key)
        : [...f.programmeInterests, key],
    }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.legalName.trim()) e.legalName = "Required";
      if (!form.registeredOffice.trim()) e.registeredOffice = "Required";
      if (!form.yearFounded.trim()) e.yearFounded = "Required";
    }
    if (s === 2) {
      if (!form.isIndian) e.isIndian = "Please select";
      if (form.isIndian === "no") e.isIndian = "Sorry, this pavilion is only open to Indian-incorporated companies.";
      if (!form.isMcaRegistered) e.isMcaRegistered = "Please select";
      if (form.isMcaRegistered === "yes" && !form.cinNumber.trim()) e.cinNumber = "CIN required";
      if (!form.isDpiitRecognised) e.isDpiitRecognised = "Please select";
      if (form.isDpiitRecognised === "yes" && !form.dpiitNumber.trim()) e.dpiitNumber = "DPIIT number required";
      if (form.isDpiitRecognised === "no" && !form.isIncubatorEndorsed) e.isIncubatorEndorsed = "Please select";
      if (form.isIncubatorEndorsed === "yes" && !form.incubator.trim()) e.incubator = "Please name incubator";
      if (!form.hasCanadianOps) e.hasCanadianOps = "Please select";
      if (form.hasCanadianOps === "yes" && !form.canadianPresence.trim()) e.canadianPresence = "Please describe";
      if (!form.businessStage) e.businessStage = "Please select a stage";
      if (form.businessStage === "Other" && !form.otherStage.trim()) e.otherStage = "Please specify";
    }
    if (s === 3) {
      if (!form.techDomain) e.techDomain = "Select a domain";
      if (!form.sector) e.sector = "Select a sector";
      if (form.sector === "Other" && !form.otherSector.trim()) e.otherSector = "Please specify";
      if (!form.companyDescription.trim()) e.companyDescription = "Required";
      if (!form.traction.trim()) e.traction = "Required";
      if (!form.objective.trim()) e.objective = "Required";
    }
    if (s === 4) {
      if (!form.boothTier) e.boothTier = "Please select a booth tier";
    }
    if (s === 5) {
      if (!form.repName.trim()) e.repName = "Required";
      if (!form.repTitle.trim()) e.repTitle = "Required";
      if (!form.repEmail.trim()) e.repEmail = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.repEmail)) e.repEmail = "Invalid email";
      if (!form.repMobile.trim()) e.repMobile = "Required (with country code)";
    }
    if (s === 6) {
      if (!form.declaration1) e.declaration1 = "Required";
      if (!form.declaration2) e.declaration2 = "Required";
      if (!form.declaration3) e.declaration3 = "Required";
      if (!form.declaration4) e.declaration4 = "Required";
      if (!form.declaration5) e.declaration5 = "Required";
      if (!form.declaration6) e.declaration6 = "Required";
      if (!form.signatureName.trim()) e.signatureName = "Please type your full name";
      if (!form.signatureTitle.trim()) e.signatureTitle = "Please type your title";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    if (!validateStep(6)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        submittedAt: new Date().toISOString(),
        page: window.location.pathname,
        _hp: honeypot.current, // bots fill this; humans never see it
        elapsedMs: Date.now() - openedAt.current,
      };
      const res = await fetch(`${API}/pavilion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setReference(data.reference || "");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Pavilion submit error:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
    setSubmitError("");
    setReference("");
    setStep(1);
    openedAt.current = Date.now();
  };

  const labelStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
    color: textMuted, display: "block", marginBottom: 6,
  };
  const inputStyle = (err) => ({
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid " + (err ? errorColor : inputBdr),
    background: inputBg, color: textMain,
    fontFamily: "inherit", fontSize: "0.95rem", outline: "none",
    boxSizing: "border-box", transition: "border 0.2s",
  });
  const textareaStyle = (err) => ({
    ...inputStyle(err), minHeight: 120, resize: "vertical", lineHeight: 1.6,
    fontFamily: "'Montserrat', sans-serif",
  });
  const errStyle = { fontSize: "0.72rem", color: errorColor, marginTop: 6, fontFamily: "'Montserrat', sans-serif" };
  const fieldStyle = { marginBottom: 20 };
  const hintStyle = { fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", color: textSoft, margin: "-2px 0 6px", lineHeight: 1.5 };

  const stepTitles = [
    "Company Details",
    "Eligibility & Qualification",
    "Business Overview",
    "Booth Selection",
    "Contact & Delegates",
    "Declaration",
  ];
  const stepSubtitles = [
    "Basic details about your registered company",
    "Confirm eligibility for the India Pavilion",
    "Tell us what you do and what you want to achieve",
    "Choose your booth — subsidised pricing shown",
    "Who's leading this application?",
    "Confirm and submit your application",
  ];

  /* Reusable UI helpers */
  const YesNo = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 8 }}>
      {["yes", "no"].map((v) => {
        const active = value === v;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            style={{
              padding: "10px 24px", borderRadius: 10,
              border: "1px solid " + (active ? "#f5a623" : inputBdr),
              background: active ? "rgba(245,166,35,0.10)" : inputBg,
              color: active ? "#f5a623" : textMain,
              fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem",
              fontWeight: active ? 700 : 500, cursor: "pointer",
              textTransform: "capitalize", transition: "all 0.15s",
            }}>{v}</button>
        );
      })}
    </div>
  );

  const PillGrid = ({ options, value, onChange, columns = 2 }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 1 ? "100%" : "180px"}, 1fr))`, gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{
              padding: "12px 14px", borderRadius: 10,
              border: "1px solid " + (active ? "#f5a623" : inputBdr),
              background: active ? "rgba(245,166,35,0.10)" : inputBg,
              color: active ? "#f5a623" : textMain,
              fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem",
              fontWeight: active ? 700 : 500, textAlign: "left",
              cursor: "pointer", transition: "all 0.15s",
            }}>{opt}</button>
        );
      })}
    </div>
  );

  /* Visa assistance note — shown on every step */
  const VisaNote = () => (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "12px 16px", marginBottom: 24, borderRadius: 10,
      background: "rgba(63,209,156,0.06)",
      border: "1px solid rgba(63,209,156,0.22)",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fd19c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.8rem", color: textMuted, margin: 0, lineHeight: 1.5 }}>
        <strong style={{ color: textMain, fontWeight: 700 }}>Visa assistance: </strong>
        We will help you with visa assistance if your application is accepted.
      </p>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style>{`
        @media (max-width: 600px) {
          .pf-grid-2 { grid-template-columns: 1fr !important; }
        }
        .pf-grid-2 { min-width: 0; }
        .pf-grid-2 > * { min-width: 0; }
        .pf-grid-2 input[type="date"] { min-width: 0; max-width: 100%; box-sizing: border-box; }
      `}</style>

      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: bg,
        paddingTop: "clamp(120px, 15vh, 160px)",
        paddingBottom: "60px",
        borderBottom: "1px solid " + border,
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(${isDark ? "rgba(122,63,209,0.04)" : "rgba(122,63,209,0.05)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(122,63,209,0.04)" : "rgba(122,63,209,0.05)"} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ position: "relative", zIndex: 2, maxWidth: 900, margin: "0 auto", padding: "0 5%", textAlign: "center" }}
        >
          <span style={{
            display: "inline-block",
            background: "rgba(245,166,35,0.12)",
            border: "1px solid rgba(245,166,35,0.35)",
            color: "#f5a623",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase", padding: "8px 20px", borderRadius: 999,
            marginBottom: 24,
          }}>
            Endorsed by Consulate General of India, Toronto
          </span>

          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
            fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px",
            marginBottom: 16, color: textMain,
          }}>
            India Startup Pavilion{" "}
            <span style={{
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Application</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 1.6vw, 1.15rem)", color: textMuted,
            lineHeight: 1.7, maxWidth: 640, margin: "0 auto",
          }}>
            Subsidised booths for Indian-incorporated startups at The Tech Festival Canada 2026. Rolling approvals, limited spots. Deadline September 30, 2026.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: textMuted, fontSize: "0.85rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fd19c" }} />
              Free to apply
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: textMuted, fontSize: "0.85rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5a623" }} />
              ~15 min to complete
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: textMuted, fontSize: "0.85rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#b99eff" }} />
              Rolling approvals
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FORM ═══════════ */}
      <section ref={formRef} style={{ padding: "clamp(2rem, 5vw, 4rem) 5%" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {!submitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                background: cardBg, border: "1px solid " + border, borderRadius: 20,
                padding: "clamp(28px, 4vw, 44px)",
                boxShadow: isDark ? "0 8px 40px rgba(122,63,209,0.15)" : "0 8px 32px rgba(122,63,209,0.08)",
              }}
            >
              {/* Progress */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1.2px",
                    textTransform: "uppercase", color: textSoft,
                  }}>
                    Step {step} of {TOTAL_STEPS}
                  </span>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1px", color: "#f5a623",
                  }}>
                    {Math.round((step / TOTAL_STEPS) * 100)}%
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} style={{
                      flex: 1, height: 3, borderRadius: 999,
                      background: s <= step
                        ? "linear-gradient(90deg, #7a3fd1, #f5a623)"
                        : (isDark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)"),
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
              </div>

              {/* honeypot — hidden from humans, catches bots */}
              <input type="text" name="company_url_confirm" tabIndex={-1} autoComplete="off" aria-hidden="true"
                onChange={(e) => { honeypot.current = e.target.value; }}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />

              {/* Step title */}
              <div style={{ marginTop: 32, marginBottom: 24 }}>
                <h3 style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "1.15rem", fontWeight: 800, color: textMain,
                  margin: "0 0 6px", letterSpacing: "-0.3px",
                }}>
                  {stepTitles[step - 1]}
                </h3>
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.9rem", color: textMuted, margin: 0, lineHeight: 1.5,
                }}>
                  {stepSubtitles[step - 1]}
                </p>
              </div>

              {/* Visa assistance note — appears on every step */}
              <VisaNote />

              {/* ─────────── STEP 1: COMPANY DETAILS ─────────── */}
              {step === 1 && (
                <div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Legal / Registered Name *</label>
                    <p style={hintStyle}>As per Certificate of Incorporation</p>
                    <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} style={inputStyle(errors.legalName)} placeholder="Acme Technologies Private Limited" />
                    {errors.legalName && <div style={errStyle}>{errors.legalName}</div>}
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Trading / Brand Name</label>
                      <input value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} style={inputStyle(false)} placeholder="Acme" />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>CIN</label>
                      <p style={hintStyle}>21-digit MCA number</p>
                      <input value={form.cin} onChange={(e) => set("cin", e.target.value.toUpperCase())} style={inputStyle(false)} placeholder="U72900DL2020PTC012345" />
                    </div>
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Date of Incorporation</label>
                      <input type="date" value={form.incorporationDate} onChange={(e) => set("incorporationDate", e.target.value)} style={inputStyle(false)} />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Year Founded *</label>
                      <input value={form.yearFounded} onChange={(e) => set("yearFounded", e.target.value)} style={inputStyle(errors.yearFounded)} placeholder="2020" />
                      {errors.yearFounded && <div style={errStyle}>{errors.yearFounded}</div>}
                    </div>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Registered Office (India) *</label>
                    <p style={hintStyle}>Full address with State and PIN</p>
                    <textarea value={form.registeredOffice} onChange={(e) => set("registeredOffice", e.target.value)} style={{ ...textareaStyle(errors.registeredOffice), minHeight: 80 }} />
                    {errors.registeredOffice && <div style={errStyle}>{errors.registeredOffice}</div>}
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Website</label>
                      <input value={form.website} onChange={(e) => set("website", e.target.value)} style={inputStyle(false)} placeholder="https://..." />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>LinkedIn / Company Profile</label>
                      <input value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} style={inputStyle(false)} placeholder="linkedin.com/company/..." />
                    </div>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Number of Employees</label>
                    <input value={form.employees} onChange={(e) => set("employees", e.target.value)} style={inputStyle(false)} placeholder="e.g. 15" />
                  </div>
                </div>
              )}

              {/* ─────────── STEP 2: ELIGIBILITY ─────────── */}
              {step === 2 && (
                <div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Q1. Is the applicant an Indian company? *</label>
                    <YesNo value={form.isIndian} onChange={(v) => set("isIndian", v)} />
                    {errors.isIndian && <div style={errStyle}>{errors.isIndian}</div>}
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Q2. Registered with MCA? *</label>
                    <YesNo value={form.isMcaRegistered} onChange={(v) => set("isMcaRegistered", v)} />
                    {errors.isMcaRegistered && <div style={errStyle}>{errors.isMcaRegistered}</div>}

                    {form.isMcaRegistered === "yes" && (
                      <div className="pf-grid-2" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>CIN / MCA Reg. No. *</label>
                          <input value={form.cinNumber} onChange={(e) => set("cinNumber", e.target.value.toUpperCase())} style={inputStyle(errors.cinNumber)} placeholder="U72900DL2020PTC012345" />
                          {errors.cinNumber && <div style={errStyle}>{errors.cinNumber}</div>}
                        </div>
                        <div>
                          <label style={labelStyle}>Registrar of Companies (RoC)</label>
                          <input value={form.roc} onChange={(e) => set("roc", e.target.value)} style={inputStyle(false)} placeholder="e.g. RoC-Delhi" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Q3. DPIIT-recognised startup? *</label>
                    <YesNo value={form.isDpiitRecognised} onChange={(v) => set("isDpiitRecognised", v)} />
                    {errors.isDpiitRecognised && <div style={errStyle}>{errors.isDpiitRecognised}</div>}

                    {form.isDpiitRecognised === "yes" && (
                      <div style={{ marginTop: 16 }}>
                        <label style={labelStyle}>DPIIT Recognition Number *</label>
                        <p style={hintStyle}>Certificate can be provided later on request</p>
                        <input value={form.dpiitNumber} onChange={(e) => set("dpiitNumber", e.target.value)} style={inputStyle(errors.dpiitNumber)} placeholder="DIPPxxxxx" />
                        {errors.dpiitNumber && <div style={errStyle}>{errors.dpiitNumber}</div>}
                      </div>
                    )}

                    {form.isDpiitRecognised === "no" && (
                      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: inputBg, border: "1px solid " + inputBdr }}>
                        <label style={labelStyle}>Incubator-endorsed or Startup India registered? *</label>
                        <YesNo value={form.isIncubatorEndorsed} onChange={(v) => set("isIncubatorEndorsed", v)} />
                        {errors.isIncubatorEndorsed && <div style={errStyle}>{errors.isIncubatorEndorsed}</div>}

                        {form.isIncubatorEndorsed === "yes" && (
                          <div style={{ marginTop: 14 }}>
                            <label style={labelStyle}>Incubator / Accelerator *</label>
                            <input value={form.incubator} onChange={(e) => set("incubator", e.target.value)} style={inputStyle(errors.incubator)} placeholder="e.g. T-Hub, IIT Delhi" />
                            {errors.incubator && <div style={errStyle}>{errors.incubator}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Q4. Existing business or operations in Canada? *</label>
                    <YesNo value={form.hasCanadianOps} onChange={(v) => set("hasCanadianOps", v)} />
                    {errors.hasCanadianOps && <div style={errStyle}>{errors.hasCanadianOps}</div>}

                    {form.hasCanadianOps === "yes" && (
                      <div style={{ marginTop: 14 }}>
                        <label style={labelStyle}>Describe your Canadian presence *</label>
                        <p style={hintStyle}>Customers, subsidiary, partners, pilots, revenue, etc.</p>
                        <textarea value={form.canadianPresence} onChange={(e) => set("canadianPresence", e.target.value)} style={textareaStyle(errors.canadianPresence)} />
                        {errors.canadianPresence && <div style={errStyle}>{errors.canadianPresence}</div>}
                      </div>
                    )}
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Q5. Current business stage *</label>
                    <PillGrid options={BUSINESS_STAGES} value={form.businessStage} onChange={(v) => set("businessStage", v)} />
                    {errors.businessStage && <div style={errStyle}>{errors.businessStage}</div>}

                    {form.businessStage === "Other" && (
                      <div style={{ marginTop: 14 }}>
                        <label style={labelStyle}>Please specify *</label>
                        <input value={form.otherStage} onChange={(e) => set("otherStage", e.target.value)} style={inputStyle(errors.otherStage)} />
                        {errors.otherStage && <div style={errStyle}>{errors.otherStage}</div>}
                      </div>
                    )}
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Latest Funding <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                      <input value={form.latestFunding} onChange={(e) => set("latestFunding", e.target.value)} style={inputStyle(false)} placeholder="e.g. Seed, $2M" />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Annual Revenue <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                      <input value={form.annualRevenue} onChange={(e) => set("annualRevenue", e.target.value)} style={inputStyle(false)} placeholder="INR or USD" />
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────── STEP 3: BUSINESS OVERVIEW ─────────── */}
              {step === 3 && (
                <div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Primary Technology Domain *</label>
                    <PillGrid options={TECH_DOMAINS} value={form.techDomain} onChange={(v) => set("techDomain", v)} />
                    {errors.techDomain && <div style={errStyle}>{errors.techDomain}</div>}
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Primary Applied Sector *</label>
                    <PillGrid options={SECTORS} value={form.sector} onChange={(v) => set("sector", v)} />
                    {errors.sector && <div style={errStyle}>{errors.sector}</div>}

                    {form.sector === "Other" && (
                      <div style={{ marginTop: 14 }}>
                        <label style={labelStyle}>Please specify *</label>
                        <input value={form.otherSector} onChange={(e) => set("otherSector", e.target.value)} style={inputStyle(errors.otherSector)} />
                        {errors.otherSector && <div style={errStyle}>{errors.otherSector}</div>}
                      </div>
                    )}
                  </div>

                  {[
                    { key: "companyDescription", label: "Company Description *", hint: "In 60 words or fewer, describe your product / service and the problem it solves.", limit: 60 },
                    { key: "traction", label: "Traction & Key Milestones *", hint: "Customers, revenue, pilots, patents, awards, marquee partners." },
                    { key: "objective", label: "Objective at TTFC 2026 *", hint: "What do you want to achieve — Canadian buyers, distribution, investors, market entry?" },
                  ].map(({ key, label, hint, limit }) => {
                    const count = wordCount(form[key]);
                    const over = limit && count > limit;
                    return (
                      <div key={key} style={fieldStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
                          {limit && (
                            <span style={{
                              fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem", fontWeight: 700,
                              color: over ? errorColor : textSoft, letterSpacing: "0.5px",
                            }}>{count} / {limit} words</span>
                          )}
                        </div>
                        <p style={hintStyle}>{hint}</p>
                        <textarea value={form[key]} onChange={(e) => set(key, e.target.value)} style={textareaStyle(errors[key])} />
                        {errors[key] && <div style={errStyle}>{errors[key]}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─────────── STEP 4: BOOTH TIER ─────────── */}
              {step === 4 && (
                <div>
                  <div style={{
                    padding: "14px 16px", marginBottom: 20, borderRadius: 12,
                    background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)",
                  }}>
                    <p style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem",
                      fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
                      color: "#f5a623", marginBottom: 4,
                    }}>Subsidised by Consulate General of India, Toronto</p>
                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", color: textMuted, margin: 0, lineHeight: 1.5 }}>
                      Amounts shown under YOU PAY are net of subsidy. Booth confirmed upon countersignature and receipt.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {BOOTH_TIERS.map((tier) => {
                      const active = form.boothTier === tier.key;
                      return (
                        <button key={tier.key} type="button" onClick={() => set("boothTier", tier.key)}
                          className="pf-booth-row"
                          style={{
                            padding: "18px 20px", borderRadius: 14,
                            border: "2px solid " + (active ? "#f5a623" : inputBdr),
                            background: active ? "rgba(245,166,35,0.08)" : inputBg,
                            display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center",
                            cursor: "pointer", transition: "all 0.15s",
                            fontFamily: "'Montserrat', sans-serif", textAlign: "left",
                          }}>
                          <div>
                            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: active ? "#f5a623" : textMain, marginBottom: 2 }}>
                              {tier.label} Booth
                            </div>
                            <div style={{ fontSize: "0.78rem", color: textMuted }}>{tier.size}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.68rem", color: textSoft, textTransform: "uppercase", letterSpacing: "0.5px" }}>Standard</div>
                            <div style={{ fontSize: "0.85rem", color: textMuted, textDecoration: "line-through" }}>${tier.standard.toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.68rem", color: textSoft, textTransform: "uppercase", letterSpacing: "0.5px" }}>Subsidy</div>
                            <div style={{ fontSize: "0.85rem", color: "#3fd19c" }}>−${tier.subsidy.toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.68rem", color: "#f5a623", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>You Pay</div>
                            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.15rem", fontWeight: 900, color: active ? "#f5a623" : textMain }}>
                              ${tier.pay.toLocaleString()}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {errors.boothTier && <div style={{ ...errStyle, marginTop: 12 }}>{errors.boothTier}</div>}

                  <div style={{
                    marginTop: 24, padding: 18, borderRadius: 12,
                    background: inputBg, border: "1px solid " + inputBdr,
                  }}>
                    <p style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem",
                      fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
                      color: accent, marginBottom: 12,
                    }}>Every exhibitor receives</p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: textMuted, fontSize: "0.85rem", lineHeight: 1.7 }}>
                      <li>Exhibition space inside the India Country Pavilion</li>
                      <li>2 full-access exhibitor passes</li>
                      <li>Inclusion in the TTFC Startup Catalogue (1,000+ delegates)</li>
                      <li>Access to the India Business Forum & B2B matchmaking</li>
                      <li>Post-event lead report with Canadian buyer introductions</li>
                      <li>Consulate welcome lounge & networking reception access</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ─────────── STEP 5: CONTACT ─────────── */}
              {step === 5 && (
                <div>
                  <div style={{
                    padding: "12px 16px", marginBottom: 20, borderRadius: 10,
                    background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)",
                  }}>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#f5a623", margin: 0 }}>
                      Primary Contact — Authorised Representative
                    </p>
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Full Name *</label>
                      <input value={form.repName} onChange={(e) => set("repName", e.target.value)} style={inputStyle(errors.repName)} />
                      {errors.repName && <div style={errStyle}>{errors.repName}</div>}
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Designation / Title *</label>
                      <input value={form.repTitle} onChange={(e) => set("repTitle", e.target.value)} style={inputStyle(errors.repTitle)} placeholder="e.g. Founder & CEO" />
                      {errors.repTitle && <div style={errStyle}>{errors.repTitle}</div>}
                    </div>
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Email *</label>
                      <input type="email" value={form.repEmail} onChange={(e) => set("repEmail", e.target.value)} style={inputStyle(errors.repEmail)} placeholder="name@company.com" />
                      {errors.repEmail && <div style={errStyle}>{errors.repEmail}</div>}
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Mobile / WhatsApp *</label>
                      <p style={hintStyle}>Include country code</p>
                      <input type="tel" value={form.repMobile} onChange={(e) => set("repMobile", e.target.value)} style={inputStyle(errors.repMobile)} placeholder="+91 98765 43210" />
                      {errors.repMobile && <div style={errStyle}>{errors.repMobile}</div>}
                    </div>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Secondary Contact <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                    <p style={hintStyle}>Name & email</p>
                    <input value={form.secondaryContact} onChange={(e) => set("secondaryContact", e.target.value)} style={inputStyle(false)} placeholder="Jane Doe, jane@company.com" />
                  </div>

                  <div style={{
                    padding: "12px 16px", marginTop: 32, marginBottom: 20, borderRadius: 10,
                    background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)",
                  }}>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#f5a623", margin: 0 }}>
                      On-Site Delegates — 2 passes included
                    </p>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Delegate 1</label>
                    <p style={hintStyle}>Name, title, email</p>
                    <input value={form.delegate1} onChange={(e) => set("delegate1", e.target.value)} style={inputStyle(false)} placeholder="Priya Sharma, Head of Sales, priya@company.com" />
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Delegate 2</label>
                    <p style={hintStyle}>Name, title, email</p>
                    <input value={form.delegate2} onChange={(e) => set("delegate2", e.target.value)} style={inputStyle(false)} placeholder="Rahul Kumar, CTO, rahul@company.com" />
                  </div>

                  {/* ── Visa Assistance ── */}
                  <div style={{
                    padding: "12px 16px", marginTop: 32, marginBottom: 20, borderRadius: 10,
                    background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)",
                  }}>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#f5a623", margin: 0 }}>
                      Visa Assistance
                    </p>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Do you need visa assistance for delegates travelling to Canada?</label>
                    <p style={hintStyle}>Support is offered only after your application is accepted</p>
                    <YesNo value={form.needsVisa} onChange={(v) => set("needsVisa", v)} />
                  </div>

                  {form.needsVisa === "yes" && (
                    <div style={fieldStyle}>
                      <label style={labelStyle}>How many delegates require visa support?</label>
                      <p style={hintStyle}>An approximate number is fine</p>
                      <input value={form.visaCount} onChange={(e) => set("visaCount", e.target.value)} style={inputStyle(false)} placeholder="e.g. 2" />
                    </div>
                  )}

                  <div style={{ marginTop: 32 }}>
                    <label style={labelStyle}>Programme Interests <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                    <p style={hintStyle}>Selection is subject to curation and availability</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                      {PROGRAMME_INTERESTS.map((p) => {
                        const active = form.programmeInterests.includes(p.key);
                        return (
                          <label key={p.key} style={{
                            display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
                            padding: "12px 14px", borderRadius: 10,
                            border: "1px solid " + (active ? "#f5a623" : inputBdr),
                            background: active ? "rgba(245,166,35,0.08)" : inputBg,
                            transition: "all 0.15s",
                          }}>
                            <div style={{ position: "relative", flexShrink: 0, marginTop: 1 }}>
                              <input type="checkbox" checked={active} onChange={() => toggleInterest(p.key)}
                                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                              <div style={{
                                width: 18, height: 18, borderRadius: 5,
                                border: "2px solid " + (active ? "#f5a623" : inputBdr),
                                background: active ? "#f5a623" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                              }}>
                                {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                              </div>
                            </div>
                            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.87rem", color: textMain, lineHeight: 1.45 }}>
                              {p.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────── STEP 6: DECLARATION ─────────── */}
              {step === 6 && (
                <div>
                  <div style={{
                    padding: 24, borderRadius: 14,
                    background: isDark ? "rgba(122,63,209,0.06)" : "rgba(122,63,209,0.03)",
                    border: "1px solid " + border, marginBottom: 24,
                  }}>
                    <div style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem", fontWeight: 800,
                      letterSpacing: "1.5px", textTransform: "uppercase", color: accent, marginBottom: 16,
                    }}>I confirm, on behalf of the applicant company, that:</div>

                    {[
                      { key: "declaration1", text: "The company is incorporated in India and registered with the Ministry of Corporate Affairs." },
                      { key: "declaration2", text: "The information provided in this application is true, accurate and complete to the best of my knowledge." },
                      { key: "declaration3", text: "Supporting documents (Certificate of Incorporation, DPIIT / Startup India recognition or incubator endorsement) will be provided on request." },
                      { key: "declaration4", text: "I am authorised to submit this application and to enter into an exhibitor agreement on the company's behalf." },
                      { key: "declaration5", text: "The company agrees to the TTFC 2026 exhibitor terms and the India Startup Pavilion participation guidelines." },
                      { key: "declaration6", text: "Acceptance is at the discretion of the organiser and the Consulate General of India, Toronto, and a booth is confirmed only upon countersignature and receipt of the net amount payable." },
                    ].map(({ key, text }, i) => (
                      <label key={key} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", marginBottom: 14 }}>
                        <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                          <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)}
                            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                          <div style={{
                            width: 20, height: 20, borderRadius: 5,
                            border: "2px solid " + (errors[key] ? errorColor : (form[key] ? "#f5a623" : inputBdr)),
                            background: form[key] ? "#f5a623" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                          }}>
                            {form[key] && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                          </div>
                        </div>
                        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.87rem", color: textMuted, lineHeight: 1.55 }}>
                          <strong style={{ color: textMain, fontWeight: 700 }}>{i + 1}. </strong>{text}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Authorised Signatory Name *</label>
                      <input value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} style={inputStyle(errors.signatureName)} placeholder="Your full legal name" />
                      {errors.signatureName && <div style={errStyle}>{errors.signatureName}</div>}
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Designation *</label>
                      <input value={form.signatureTitle} onChange={(e) => set("signatureTitle", e.target.value)} style={inputStyle(errors.signatureTitle)} placeholder="e.g. Founder & CEO" />
                      {errors.signatureTitle && <div style={errStyle}>{errors.signatureTitle}</div>}
                    </div>
                  </div>

                  <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", color: textSoft, marginTop: -8, marginBottom: 20 }}>
                    Today's date will be recorded automatically upon submission.
                  </p>

                  {submitError && (
                    <div style={{
                      padding: "12px 16px", marginBottom: 16,
                      background: "rgba(224,85,85,0.10)",
                      border: "1px solid rgba(224,85,85,0.30)",
                      borderRadius: 10, color: errorColor,
                      fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem",
                    }}>
                      {submitError}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════ ACTIONS ═══════════ */}
              <div style={{
                marginTop: 36, paddingTop: 24,
                borderTop: "1px solid " + inputBdr,
                display: "flex", gap: 12, flexWrap: "wrap",
              }}>
                {step > 1 && (
                  <button type="button" onClick={back} disabled={submitting}
                    style={{
                      padding: "14px 24px", borderRadius: 12,
                      border: "1px solid " + inputBdr, background: "transparent", color: textMain,
                      fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.68rem",
                      letterSpacing: "1px", textTransform: "uppercase",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}>← Back</button>
                )}
                <button type="button" onClick={step === TOTAL_STEPS ? submit : next} disabled={submitting}
                  style={{
                    flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                    color: "#fff", fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 800, fontSize: "0.68rem", letterSpacing: "1px", textTransform: "uppercase",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: "0 4px 20px rgba(122,63,209,0.3)",
                  }}>
                  {submitting ? "Submitting…" : step === TOTAL_STEPS ? "Submit Application →" : "Continue →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════ SUCCESS STATE ═══════════ */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: cardBg, border: "1px solid " + border, borderRadius: 20,
                  padding: "clamp(40px, 6vw, 60px)",
                  textAlign: "center",
                  boxShadow: isDark ? "0 8px 40px rgba(122,63,209,0.15)" : "0 8px 32px rgba(122,63,209,0.08)",
                }}
              >
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 12px 32px rgba(122,63,209,0.35)",
                }}>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 900,
                  color: textMain, margin: "0 0 16px",
                }}>
                  <span style={{ background: "linear-gradient(135deg, #7a3fd1, #f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    Application Received
                  </span>
                </h3>
                <p style={{
                  fontFamily: "'Montserrat', sans-serif", fontSize: "1rem",
                  color: textMuted, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 32px",
                }}>
                  Thank you. We've sent a confirmation to <strong style={{ color: textMain }}>{form.repEmail}</strong>.
                  Applications are reviewed on a rolling basis with limited booths available.
                  Our team will be in touch shortly with next steps.
                  {reference && (
                    <>
                      <br /><br />
                      Your application reference is <strong style={{ color: textMain, fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px" }}>{reference}</strong>.
                      Please quote it when you pay your application deposit.
                    </>
                  )}
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={resetForm}
                    style={{
                      padding: "14px 28px", borderRadius: 12,
                      border: "1px solid " + inputBdr, background: "transparent", color: textMain,
                      fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.7rem",
                      letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer",
                    }}>Submit another application</button>
                  <a href="/exhibit"
                    style={{
                      padding: "14px 28px", borderRadius: 12, textDecoration: "none",
                      background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff",
                      fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.7rem",
                      letterSpacing: "1px", textTransform: "uppercase",
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}>Back to Exhibit</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
}
