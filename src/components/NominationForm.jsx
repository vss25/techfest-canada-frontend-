import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = "https://techfest-canada-backend.onrender.com/api";

/* ═══════════════════════════════════════════════════════
   OPTIONS (from the PDF)
   ═══════════════════════════════════════════════════════ */

const PILLARS = [
  "AI & Machine Learning",
  "Quantum Computing",
  "Cybersecurity & Digital Trust",
  "Robotics & Automation",
  "CleanTech & Sustainability",
];

const SECTORS = [
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "Energy & Critical Infrastructure",
  "Manufacturing, Supply Chain & Mobility",
  "Public Sector, Defence & Security",
];

const SPECIAL_AWARDS = [
  {
    key: "lifetime",
    label: "Lifetime Achievement Award",
    desc: "Sustained leadership shaping Canada's technology landscape",
  },
  {
    key: "rising",
    label: "Rising Innovator Award",
    desc: "An emerging founder, researcher or team (early-stage / under 35 / <5 yrs)",
  },
  {
    key: "crossborder",
    label: "Cross-Border Impact Award",
    desc: "Outstanding Canada–international collaboration or market expansion",
  },
];

const NOMINEE_TYPES = ["Individual", "Organisation", "Team / Project"];

const EMPTY_FORM = {
  categoryType: "",
  pillar: "",
  sector: "",
  specialAward: "",
  nomineeType: "",
  nomineeName: "",
  nomineeTitle: "",
  nomineeOrganisation: "",
  nomineeSector: "",
  nomineeLocation: "",
  nomineeWebsite: "",
  nomineeLinkedIn: "",
  nomineeEmail: "",
  nomineePhone: "",
  selfNomination: false,
  nominatorName: "",
  nominatorTitle: "",
  nominatorOrganisation: "",
  nominatorRelationship: "",
  nominatorEmail: "",
  nominatorPhone: "",
  statementOverview: "",
  statementImpact: "",
  statementAchievements: "",
  statementEvidence: "",
  declaration1: false,
  declaration2: false,
  declaration3: false,
  declaration4: false,
  signatureName: "",
};

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function NominationForm({ dark, textMain, textMid, textSoft, accent, cardBg, cardBdr, deadlineLabel }) {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef(null);
  const TOTAL_STEPS = 5;

  // Auto-expand & scroll when URL hits /awards/nominations or #nominations
  useEffect(() => {
    const shouldOpen =
      window.location.pathname.toLowerCase().includes("/awards/nominations") ||
      window.location.hash === "#nominations";

    if (shouldOpen) {
      setExpanded(true);
      // Give the section a moment to render before scrolling
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, []);

  const bg = dark ? "#06020f" : "#ffffff";
  const inputBg = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.03)";
  const inputBdr = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.16)";
  const inputFocus = dark ? "rgba(245,166,35,0.5)" : "rgba(245,166,35,0.6)";
  const errorColor = "#e05555";

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSelfNominationToggle = (checked) => {
    setForm((f) => {
      const next = { ...f, selfNomination: checked };
      if (checked) {
        if (f.nomineeName && !f.nominatorName) next.nominatorName = f.nomineeName;
        if (f.nomineeEmail && !f.nominatorEmail) next.nominatorEmail = f.nomineeEmail;
        if (f.nomineeOrganisation && !f.nominatorOrganisation) next.nominatorOrganisation = f.nomineeOrganisation;
        if (!f.nominatorRelationship) next.nominatorRelationship = "Self";
      }
      return next;
    });
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.categoryType) {
        e.categoryType = "Please choose either a Pillar × Sector category or a Special Recognition award";
      }
      if (form.categoryType === "matrix") {
        if (!form.pillar) e.pillar = "Select a technology pillar";
        if (!form.sector) e.sector = "Select an applied sector";
      }
      if (form.categoryType === "special" && !form.specialAward) {
        e.specialAward = "Select a Special Recognition award";
      }
    }
    if (s === 2) {
      if (!form.nomineeType) e.nomineeType = "Required";
      if (!form.nomineeName.trim()) e.nomineeName = "Required";
      if (!form.nomineeOrganisation.trim()) e.nomineeOrganisation = "Required";
      if (!form.nomineeLocation.trim()) e.nomineeLocation = "Required";
      if (!form.nomineeEmail.trim()) e.nomineeEmail = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.nomineeEmail)) e.nomineeEmail = "Invalid email";
    }
    if (s === 3) {
      if (!form.nominatorName.trim()) e.nominatorName = "Required";
      if (!form.nominatorOrganisation.trim()) e.nominatorOrganisation = "Required";
      if (!form.nominatorRelationship.trim()) e.nominatorRelationship = "Required";
      if (!form.nominatorEmail.trim()) e.nominatorEmail = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.nominatorEmail)) e.nominatorEmail = "Invalid email";
    }
    if (s === 4) {
      if (!form.statementOverview.trim()) e.statementOverview = "Please provide a brief overview";
      if (!form.statementImpact.trim()) e.statementImpact = "Please describe the impact";
      if (!form.statementAchievements.trim()) e.statementAchievements = "Please list key achievements";
    }
    if (s === 5) {
      if (!form.declaration1) e.declaration1 = "Required";
      if (!form.declaration2) e.declaration2 = "Required";
      if (!form.declaration3) e.declaration3 = "Required";
      if (!form.declaration4) e.declaration4 = "Required";
      if (!form.signatureName.trim()) e.signatureName = "Please type your full name";
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
    if (!validateStep(5)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        submittedAt: new Date().toISOString(),
      };
      const res = await fetch(`${API}/nominations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      console.error("Nomination submit error:", err);
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
    setStep(1);
  };

  const labelStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: textMid,
    display: "block",
    marginBottom: 6,
  };
  const inputStyle = (err) => ({
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid " + (err ? errorColor : inputBdr),
    background: inputBg,
    color: textMain,
    fontFamily: "inherit",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.2s, box-shadow 0.2s",
  });
  const textareaStyle = (err) => ({
    ...inputStyle(err),
    minHeight: 140,
    resize: "vertical",
    lineHeight: 1.6,
    fontFamily: "'Montserrat', sans-serif",
  });
  const errStyle = { fontSize: "0.72rem", color: errorColor, marginTop: 6, fontFamily: "'Montserrat', sans-serif" };
  const fieldStyle = { marginBottom: 20 };

  const stepTitles = [
    "Award Category",
    "Nominee Details",
    "Nominator Details",
    "Nomination Statement",
    "Declaration & Consent",
  ];
  const stepSubtitles = [
    "Choose either a Pillar × Sector category or a Special Recognition award",
    "Tell us who you're nominating",
    "Tell us about yourself",
    "Make the case — this is what the jury reviews",
    "Confirm and submit your nomination",
  ];

  return (
    <section id="nominations" ref={formRef} style={{ padding: "clamp(3rem, 6vw, 5rem) 5%", background: dark ? "#0a0618" : "#f4f0ff", borderTop: "1px solid " + cardBdr, scrollMarginTop: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ═══════════ COLLAPSED HEADER ═══════════ */}
        <motion.div
          layout
          onClick={() => !expanded && setExpanded(true)}
          style={{
            background: cardBg,
            border: "1px solid " + cardBdr,
            borderRadius: 20,
            padding: "clamp(28px, 4vw, 44px)",
            cursor: expanded ? "default" : "pointer",
            transition: "border-color 0.3s, box-shadow 0.3s",
            boxShadow: expanded
              ? (dark ? "0 8px 40px rgba(122,63,209,0.15)" : "0 8px 32px rgba(122,63,209,0.08)")
              : "none",
          }}
          onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.borderColor = "rgba(245,166,35,0.4)"; }}
          onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.borderColor = cardBdr; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              {deadlineLabel && (
                <p style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: textMain,
                  margin: "0 0 12px",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  Nominations end {deadlineLabel}
                </p>
              )}
              <h2 style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 900,
                color: textMain,
                lineHeight: 1.1,
                margin: 0,
              }}>
                Submit Your Nomination
              </h2>
              {!expanded && (
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.95rem",
                  color: textMid,
                  marginTop: 12,
                  marginBottom: 0,
                  lineHeight: 1.6,
                }}>
                  One nomination per form. Self-nominations welcome. Takes about 10 minutes.
                </p>
              )}
            </div>
            {!expanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                style={{
                  padding: "14px 28px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                  color: "#fff",
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "0 4px 20px rgba(122,63,209,0.3)",
                }}>
                Start Nomination →
              </button>
            )}
          </div>

          {/* ═══════════ EXPANDED FORM ═══════════ */}
          <AnimatePresence>
            {expanded && !submitted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                {/* Progress */}
                <div style={{ marginTop: 32, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                      color: textSoft,
                    }}>
                      Step {step} of {TOTAL_STEPS}
                    </span>
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "#f5a623",
                    }}>
                      {Math.round((step / TOTAL_STEPS) * 100)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 999,
                        background: s <= step
                          ? "linear-gradient(90deg, #7a3fd1, #f5a623)"
                          : (dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)"),
                        transition: "background 0.3s",
                      }} />
                    ))}
                  </div>
                </div>

                {/* Step title */}
                <div style={{ marginTop: 32, marginBottom: 24 }}>
                  <h3 style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: textMain,
                    margin: "0 0 6px",
                    letterSpacing: "-0.3px",
                  }}>
                    {stepTitles[step - 1]}
                  </h3>
                  <p style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: "0.9rem",
                    color: textMid,
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {stepSubtitles[step - 1]}
                  </p>
                </div>

                {/* ─────────── STEP 1: CATEGORY ─────────── */}
                {step === 1 && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                      {[
                        { key: "matrix", title: "Pillar × Sector", desc: "25 categories combining a technology pillar with an applied sector" },
                        { key: "special", title: "Special Recognition", desc: "3 unique awards for lifetime, emerging, or cross-border impact" },
                      ].map((opt) => {
                        const active = form.categoryType === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => set("categoryType", opt.key)}
                            style={{
                              textAlign: "left",
                              padding: "18px 20px",
                              borderRadius: 14,
                              border: "2px solid " + (active ? "#f5a623" : inputBdr),
                              background: active ? "rgba(245,166,35,0.08)" : inputBg,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              fontFamily: "'Montserrat', sans-serif",
                            }}
                          >
                            <div style={{
                              fontFamily: "'Orbitron', sans-serif",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              color: active ? "#f5a623" : textMain,
                              marginBottom: 6,
                              letterSpacing: "0.3px",
                            }}>{opt.title}</div>
                            <div style={{ fontSize: "0.78rem", color: textMid, lineHeight: 1.5 }}>{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.categoryType && <div style={errStyle}>{errors.categoryType}</div>}

                    {form.categoryType === "matrix" && (
                      <>
                        <div style={fieldStyle}>
                          <label style={labelStyle}>Technology Pillar *</label>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                            {PILLARS.map((p) => {
                              const active = form.pillar === p;
                              return (
                                <button key={p} onClick={() => set("pillar", p)}
                                  style={{
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    border: "1px solid " + (active ? "#f5a623" : inputBdr),
                                    background: active ? "rgba(245,166,35,0.10)" : inputBg,
                                    color: active ? "#f5a623" : textMain,
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: "0.85rem",
                                    fontWeight: active ? 700 : 500,
                                    textAlign: "left",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}>{p}</button>
                              );
                            })}
                          </div>
                          {errors.pillar && <div style={errStyle}>{errors.pillar}</div>}
                        </div>

                        <div style={fieldStyle}>
                          <label style={labelStyle}>Applied Sector *</label>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                            {SECTORS.map((s) => {
                              const active = form.sector === s;
                              return (
                                <button key={s} onClick={() => set("sector", s)}
                                  style={{
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    border: "1px solid " + (active ? "#f5a623" : inputBdr),
                                    background: active ? "rgba(245,166,35,0.10)" : inputBg,
                                    color: active ? "#f5a623" : textMain,
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: "0.85rem",
                                    fontWeight: active ? 700 : 500,
                                    textAlign: "left",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}>{s}</button>
                              );
                            })}
                          </div>
                          {errors.sector && <div style={errStyle}>{errors.sector}</div>}
                        </div>

                        {form.pillar && form.sector && (
                          <div style={{
                            padding: "16px 18px",
                            borderRadius: 12,
                            background: "rgba(245,166,35,0.08)",
                            border: "1px solid rgba(245,166,35,0.25)",
                            marginTop: 8,
                          }}>
                            <div style={{
                              fontFamily: "'Orbitron', sans-serif",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              letterSpacing: "1.5px",
                              textTransform: "uppercase",
                              color: "#f5a623",
                              marginBottom: 6,
                            }}>You're nominating for</div>
                            <div style={{
                              fontFamily: "'Orbitron', sans-serif",
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: textMain,
                              lineHeight: 1.3,
                            }}>
                              The Catalyst Award for {form.pillar} in {form.sector}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {form.categoryType === "special" && (
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Special Recognition Award *</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {SPECIAL_AWARDS.map((a) => {
                            const active = form.specialAward === a.key;
                            return (
                              <button key={a.key} onClick={() => set("specialAward", a.key)}
                                style={{
                                  padding: "16px 18px",
                                  borderRadius: 12,
                                  border: "1px solid " + (active ? "#f5a623" : inputBdr),
                                  background: active ? "rgba(245,166,35,0.08)" : inputBg,
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  fontFamily: "'Montserrat', sans-serif",
                                }}>
                                <div style={{
                                  fontFamily: "'Orbitron', sans-serif",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  color: active ? "#f5a623" : textMain,
                                  marginBottom: 4,
                                }}>{a.label}</div>
                                <div style={{ fontSize: "0.8rem", color: textMid, lineHeight: 1.5 }}>{a.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                        {errors.specialAward && <div style={errStyle}>{errors.specialAward}</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* ─────────── STEP 2: NOMINEE ─────────── */}
                {step === 2 && (
                  <div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>This nomination is for an *</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {NOMINEE_TYPES.map((t) => {
                          const active = form.nomineeType === t;
                          return (
                            <button key={t} onClick={() => set("nomineeType", t)}
                              style={{
                                padding: "10px 20px",
                                borderRadius: 10,
                                border: "1px solid " + (active ? "#f5a623" : inputBdr),
                                background: active ? "rgba(245,166,35,0.10)" : inputBg,
                                color: active ? "#f5a623" : textMain,
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: "0.85rem",
                                fontWeight: active ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}>{t}</button>
                          );
                        })}
                      </div>
                      {errors.nomineeType && <div style={errStyle}>{errors.nomineeType}</div>}
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Nominee full name / Organisation name *</label>
                      <input value={form.nomineeName} onChange={(e) => set("nomineeName", e.target.value)} style={inputStyle(errors.nomineeName)} placeholder="Jane Smith or Acme Inc." />
                      {errors.nomineeName && <div style={errStyle}>{errors.nomineeName}</div>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Job title / role (if individual)</label>
                        <input value={form.nomineeTitle} onChange={(e) => set("nomineeTitle", e.target.value)} style={inputStyle(false)} placeholder="Chief Technology Officer" />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Company / Organisation *</label>
                        <input value={form.nomineeOrganisation} onChange={(e) => set("nomineeOrganisation", e.target.value)} style={inputStyle(errors.nomineeOrganisation)} placeholder="Acme Inc." />
                        {errors.nomineeOrganisation && <div style={errStyle}>{errors.nomineeOrganisation}</div>}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Sector / industry</label>
                        <input value={form.nomineeSector} onChange={(e) => set("nomineeSector", e.target.value)} style={inputStyle(false)} placeholder="FinTech" />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>City & country *</label>
                        <input value={form.nomineeLocation} onChange={(e) => set("nomineeLocation", e.target.value)} style={inputStyle(errors.nomineeLocation)} placeholder="Toronto, Canada" />
                        {errors.nomineeLocation && <div style={errStyle}>{errors.nomineeLocation}</div>}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Website</label>
                        <input value={form.nomineeWebsite} onChange={(e) => set("nomineeWebsite", e.target.value)} style={inputStyle(false)} placeholder="https://..." />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>LinkedIn / social profile</label>
                        <input value={form.nomineeLinkedIn} onChange={(e) => set("nomineeLinkedIn", e.target.value)} style={inputStyle(false)} placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Contact email *</label>
                        <input type="email" value={form.nomineeEmail} onChange={(e) => set("nomineeEmail", e.target.value)} style={inputStyle(errors.nomineeEmail)} placeholder="jane@company.com" />
                        {errors.nomineeEmail && <div style={errStyle}>{errors.nomineeEmail}</div>}
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Contact phone <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                        <input type="tel" value={form.nomineePhone} onChange={(e) => set("nomineePhone", e.target.value)} style={inputStyle(false)} placeholder="+1 (416) 000-0000" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────── STEP 3: NOMINATOR ─────────── */}
                {step === 3 && (
                  <div>
                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 24, padding: "14px 16px", background: dark ? "rgba(245,166,35,0.06)" : "rgba(245,166,35,0.05)", borderRadius: 12, border: "1px solid rgba(245,166,35,0.20)" }}>
                      <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                        <input type="checkbox" checked={form.selfNomination} onChange={(e) => handleSelfNominationToggle(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, border: "2px solid " + (form.selfNomination ? "#f5a623" : inputBdr),
                          background: form.selfNomination ? "#f5a623" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                        }}>
                          {form.selfNomination && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", fontWeight: 700, color: textMain, marginBottom: 2 }}>
                          This is a self-nomination
                        </div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.8rem", color: textMid, lineHeight: 1.4 }}>
                          I'm nominating myself or my own organisation. We'll prefill some fields for you.
                        </div>
                      </div>
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Your full name *</label>
                        <input value={form.nominatorName} onChange={(e) => set("nominatorName", e.target.value)} style={inputStyle(errors.nominatorName)} placeholder="John Doe" />
                        {errors.nominatorName && <div style={errStyle}>{errors.nominatorName}</div>}
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Your job title</label>
                        <input value={form.nominatorTitle} onChange={(e) => set("nominatorTitle", e.target.value)} style={inputStyle(false)} placeholder="VP Operations" />
                      </div>
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Your organisation *</label>
                      <input value={form.nominatorOrganisation} onChange={(e) => set("nominatorOrganisation", e.target.value)} style={inputStyle(errors.nominatorOrganisation)} placeholder="Your company" />
                      {errors.nominatorOrganisation && <div style={errStyle}>{errors.nominatorOrganisation}</div>}
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Relationship to nominee *</label>
                      <input value={form.nominatorRelationship} onChange={(e) => set("nominatorRelationship", e.target.value)} style={inputStyle(errors.nominatorRelationship)} placeholder="e.g. colleague, partner, customer, self" />
                      {errors.nominatorRelationship && <div style={errStyle}>{errors.nominatorRelationship}</div>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Your email *</label>
                        <input type="email" value={form.nominatorEmail} onChange={(e) => set("nominatorEmail", e.target.value)} style={inputStyle(errors.nominatorEmail)} placeholder="you@company.com" />
                        {errors.nominatorEmail && <div style={errStyle}>{errors.nominatorEmail}</div>}
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Your phone <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                        <input type="tel" value={form.nominatorPhone} onChange={(e) => set("nominatorPhone", e.target.value)} style={inputStyle(false)} placeholder="+1 (416) 000-0000" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────── STEP 4: STATEMENT ─────────── */}
                {step === 4 && (
                  <div>
                    {[
                      { key: "statementOverview", label: "Nominee Overview *", hint: "Briefly introduce the nominee and what they do.", limit: 100 },
                      { key: "statementImpact", label: "Innovation & Impact *", hint: "What makes this nominee exceptional? Describe the innovation, its significance, and impact delivered.", limit: 300 },
                      { key: "statementAchievements", label: "Key Achievements & Measurable Results *", hint: "List concrete achievements from the past 12–24 months — metrics, milestones, adoption, funding, recognition, jobs created, etc.", limit: 200 },
                    ].map(({ key, label, hint, limit }) => {
                      const count = wordCount(form[key]);
                      const over = count > limit;
                      return (
                        <div key={key} style={fieldStyle}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
                            <span style={{
                              fontFamily: "'Orbitron', sans-serif",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: over ? errorColor : textSoft,
                              letterSpacing: "0.5px",
                            }}>
                              {count} / {limit} words
                            </span>
                          </div>
                          <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.78rem", color: textMid, margin: "0 0 8px", lineHeight: 1.5 }}>{hint}</p>
                          <textarea value={form[key]} onChange={(e) => set(key, e.target.value)} style={textareaStyle(errors[key])} />
                          {errors[key] && <div style={errStyle}>{errors[key]}</div>}
                        </div>
                      );
                    })}

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Supporting evidence & links</label>
                      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.78rem", color: textMid, margin: "0 0 8px", lineHeight: 1.5 }}>
                        Links to articles, reports, case studies, product pages, videos or references. One per line.
                      </p>
                      <textarea value={form.statementEvidence} onChange={(e) => set("statementEvidence", e.target.value)} style={{ ...textareaStyle(false), minHeight: 100 }} placeholder="https://..." />
                    </div>
                  </div>
                )}

                {/* ─────────── STEP 5: DECLARATION ─────────── */}
                {step === 5 && (
                  <div>
                    <div style={{
                      padding: "24px",
                      borderRadius: 14,
                      background: dark ? "rgba(122,63,209,0.06)" : "rgba(122,63,209,0.03)",
                      border: "1px solid " + cardBdr,
                      marginBottom: 24,
                    }}>
                      <div style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        color: accent,
                        marginBottom: 16,
                      }}>Please confirm each of the following</div>

                      {[
                        { key: "declaration1", text: "I confirm that the information provided in this nomination is accurate to the best of my knowledge." },
                        { key: "declaration2", text: "I consent to being contacted by the TTFC Catalyst Awards team regarding this nomination." },
                        { key: "declaration3", text: "I understand that, if shortlisted or selected, the nominee's name and organisation may be used in TTFC event and marketing materials." },
                        { key: "declaration4", text: "I have obtained the nominee's awareness/consent for this nomination (where the nominee is a third party)." },
                      ].map(({ key, text }, i) => (
                        <label key={key} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", marginBottom: 14 }}>
                          <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                            <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                            <div style={{
                              width: 20, height: 20, borderRadius: 5,
                              border: "2px solid " + (errors[key] ? errorColor : (form[key] ? "#f5a623" : inputBdr)),
                              background: form[key] ? "#f5a623" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                            }}>
                              {form[key] && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                            </div>
                          </div>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.88rem", color: textMid, lineHeight: 1.55 }}>
                            <strong style={{ color: textMain, fontWeight: 700 }}>{i + 1}. </strong>{text}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Type your full name to sign *</label>
                      <input value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} style={inputStyle(errors.signatureName)} placeholder="Your full legal name" />
                      {errors.signatureName && <div style={errStyle}>{errors.signatureName}</div>}
                      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.72rem", color: textSoft, margin: "6px 0 0" }}>
                        Today's date will be recorded automatically upon submission.
                      </p>
                    </div>

                    {submitError && (
                      <div style={{
                        padding: "12px 16px",
                        background: "rgba(224,85,85,0.10)",
                        border: "1px solid rgba(224,85,85,0.30)",
                        borderRadius: 10,
                        color: errorColor,
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: "0.85rem",
                        marginBottom: 16,
                      }}>
                        {submitError}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════ ACTIONS ═══════════ */}
                <div style={{
                  marginTop: 36,
                  paddingTop: 24,
                  borderTop: "1px solid " + inputBdr,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  {step > 1 && (
                    <button onClick={back} disabled={submitting}
                      style={{
                        padding: "14px 24px",
                        borderRadius: 12,
                        border: "1px solid " + inputBdr,
                        background: "transparent",
                        color: textMain,
                        fontFamily: "'Orbitron', sans-serif",
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}>← Back</button>
                  )}
                  <button
                    onClick={step === TOTAL_STEPS ? submit : next}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                      color: "#fff",
                      fontFamily: "'Orbitron', sans-serif",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: "0 4px 20px rgba(122,63,209,0.3)",
                    }}>
                    {submitting ? "Submitting…" : step === TOTAL_STEPS ? "Submit Nomination →" : "Continue →"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════ SUCCESS STATE ═══════════ */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ marginTop: 24, textAlign: "center" }}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: "0 12px 32px rgba(122,63,209,0.35)",
                }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "1.6rem",
                  fontWeight: 900,
                  color: textMain,
                  margin: "0 0 12px",
                }}>
                  <span style={{ background: "linear-gradient(135deg, #7a3fd1, #f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    Nomination Received
                  </span>
                </h3>
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.98rem", color: textMid, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px" }}>
                  Thank you for your nomination. We've sent a confirmation to <strong style={{ color: textMain }}>{form.nominatorEmail}</strong>. Our jury will review submissions after nominations close{deadlineLabel ? " on " + deadlineLabel : ""}. Shortlisted nominees will be contacted directly.
                </p>
                <button onClick={resetForm}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 10,
                    border: "1px solid " + inputBdr,
                    background: "transparent",
                    color: textMain,
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}>Submit another nomination</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
