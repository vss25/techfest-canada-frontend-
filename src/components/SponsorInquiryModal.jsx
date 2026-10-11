import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitForm, useFormGuard, FORMS_FALLBACK_EMAIL } from "../lib/forms";

var JOB_TITLES = [
  "Head of AI / ML",
  "Director of Data Science",
  "GenAI Program Lead",
  "AI Product Manager",
  "Enterprise Architecture Lead",
  "Platform Engineering Lead",
  "MLOps Lead",
  "Data Engineering Lead",
  "Contact Center Transformation Lead",
  "AI Governance and Responsible AI Lead",
  "Quantum Program Director",
  "Research Director",
  "CTO for Advanced R&D",
  "Cryptography Lead",
  "Post Quantum Migration Lead",
  "High Performance Computing Director",
  "Industry Innovation Lab Lead",
  "University Research Lead",
  "VP Manufacturing",
  "Plant Manager",
  "Automation Director",
  "Robotics Engineer",
  "Warehouse and Fulfillment Operations Director",
  "Safety Engineering Lead",
  "Quality Assurance Lead",
  "Field Operations Lead",
  "Energy and Utilities Director",
  "Grid Modernization Lead",
  "Facilities Director",
  "Building Decarbonization Lead",
  "EV Fleet Manager",
  "Mobility Lead",
  "Carbon Accounting and ESG Reporting Lead",
  "Circular Economy Packaging Sustainability Lead",
  "Climate Risk and Resilience Lead",
  "Other",
];

var INDUSTRIES = {
  "Artificial Intelligence": [
    "Infrastructure and Compute",
    "Models and Model Providers",
    "Platforms, MLOps, and Deployment",
    "Data and Synthetic Data",
    "Search, RAG, and Knowledge Systems",
    "Agents and Automation",
    "Security and Privacy",
    "Governance, Risk, and Compliance",
    "Enterprise Applications",
    "Industrial AI (Vision, Robotics, Autonomy)",
  ],
  "Quantum Computing": [
    "Hardware and Processors",
    "Enabling Tech and Cryo Systems",
    "Control, Test, and Instrumentation",
    "Cloud Access Platforms",
    "Software, SDKs, and Compilers",
    "Algorithms and Industry Apps",
    "Error Correction and Benchmarking",
    "Quantum Networking and QKD",
    "Post Quantum Security",
    "Quantum Sensing and Metrology",
  ],
  "Robotics": [
    "Industrial and Cobots",
    "Mobile Robots (AMRs/AGVs)",
    "Warehouse and Fulfillment",
    "Service Robotics",
    "Healthcare and Assistive",
    "Drones and Aerial",
    "Autonomous Vehicles and Field Robotics",
    "Humanoids",
    "Components, Sensors, and Perception",
    "Software, Simulation, Integration, and Safety",
  ],
  "Clean Technology": [
    "Clean Energy Generation",
    "Storage and Batteries",
    "Grid and Energy Software",
    "Buildings and Efficiency",
    "Electrification and EV Charging",
    "Carbon Accounting and ESG Tech",
    "Carbon Capture and Removal",
    "Hydrogen and Sustainable Fuels",
    "Circular Economy and Sustainable Materials",
    "Water, Air, and Climate Resilience",
  ],
};

export default function SponsorInquiryModal(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;

  var s1 = useState(""); var firstName = s1[0]; var setFirstName = s1[1];
  var s2 = useState(""); var lastName = s2[0]; var setLastName = s2[1];
  var s3 = useState(""); var email = s3[0]; var setEmail = s3[1];
  var s4 = useState(""); var phone = s4[0]; var setPhone = s4[1];
  var s5 = useState(""); var company = s5[0]; var setCompany = s5[1];
  var s6 = useState(""); var jobTitle = s6[0]; var setJobTitle = s6[1];
  var s7 = useState(""); var industry = s7[0]; var setIndustry = s7[1];
  var s8 = useState(false); var sending = s8[0]; var setSending = s8[1];
  var s9 = useState("idle"); var status = s9[0]; var setStatus = s9[1];
  var s10 = useState(false); var dark = s10[0]; var setDark = s10[1];
  var guard = useFormGuard(isOpen);

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return function () { document.body.style.overflow = ""; };
  }, [isOpen]);

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setSending(true);
    setStatus("idle");

    submitForm("sponsor", {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      company: company,
      jobTitle: jobTitle,
      fields: { industry: industry },
    }, guard.meta())
      .then(function () {
        setSending(false);
        setStatus("success");
        setTimeout(function () {
          setStatus("idle");
          setFirstName(""); setLastName(""); setEmail("");
          setPhone(""); setCompany(""); setJobTitle(""); setIndustry("");
          onClose();
        }, 2200);
      })
      .catch(function () {
        setSending(false);
        setStatus("error");
      });
  }

  var bgCard = dark ? "#0d0620" : "#ffffff";
  var borderCol = dark ? "rgba(122,63,209,0.22)" : "rgba(122,63,209,0.12)";
  var inputBg = dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.04)";
  var inputBdr = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.12)";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";
  var accent = dark ? "#b99eff" : "#7a3fd1";

  var inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid " + inputBdr,
    background: inputBg,
    color: textMain,
    fontSize: "0.9rem",
    fontWeight: 500,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  var selectStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid " + inputBdr,
    background: inputBg,
    color: textMain,
    fontSize: "0.88rem",
    fontWeight: 500,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='" + (dark ? "%23b99eff" : "%237a3fd1") + "' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  var labelStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.62rem",
    fontWeight: 800,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: textMid,
    marginBottom: 8,
    display: "block",
  };

  var industryKeys = Object.keys(INDUSTRIES);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sponsor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 10000,
              background: "rgba(0,0,0,0.70)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal wrapper — flex centered */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
          <motion.div
            key="sponsor-modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            style={{
              width: "min(520px, 92vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: bgCard,
              border: "1px solid " + borderCol,
              borderRadius: 24,
              padding: "36px 32px",
              boxShadow: dark
                ? "0 24px 80px rgba(0,0,0,0.7)"
                : "0 24px 80px rgba(122,63,209,0.12)",
              pointerEvents: "auto",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 18, right: 18,
                width: 34, height: 34, borderRadius: "50%",
                border: "1px solid " + borderCol,
                background: "transparent",
                color: textMid, fontSize: "1rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>

            {/* Header */}
            <h2 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "1.4rem", fontWeight: 900,
              color: textMain, marginBottom: 4,
            }}>
              Get in <span style={{ color: "var(--brand-orange, #f5a623)" }}>Touch</span>
            </h2>
            <p style={{
              fontSize: "0.85rem", color: textMid,
              marginBottom: 28, lineHeight: 1.5,
            }}>
              Interested in sponsoring or exhibiting? Fill in your details and our partnerships team will be in touch.
            </p>

            {status === "success" ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
              }}>
                <div style={{ fontSize: "2.4rem", marginBottom: 14 }}>✓</div>
                <p style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "1rem", fontWeight: 800,
                  color: textMain, marginBottom: 6,
                }}>Enquiry Sent</p>
                <p style={{ fontSize: "0.85rem", color: textMid }}>
                  We'll get back to you shortly.
                </p>
              </div>
            ) : (
              <>
                {/* honeypot — hidden from people, catches bots */}
                <input {...guard.honeypotProps} />
                {/* Row: First + Last Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>First Name <span style={{ color: "var(--brand-orange)" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={function (e) { setFirstName(e.target.value); }}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <span style={{ color: "var(--brand-orange)" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={function (e) { setLastName(e.target.value); }}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Row: Email + Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>Professional Email</label>
                    <input
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={function (e) { setEmail(e.target.value); }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Business Phone</label>
                    <input
                      type="tel"
                      placeholder="+1 (416) 000-0000"
                      value={phone}
                      onChange={function (e) { setPhone(e.target.value); }}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Company */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Company</label>
                  <input
                    type="text"
                    placeholder="Your organization"
                    value={company}
                    onChange={function (e) { setCompany(e.target.value); }}
                    style={inputStyle}
                  />
                </div>

                {/* Row: Job Title + Industry */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                  <div>
                    <label style={labelStyle}>Job Title</label>
                    <select
                      value={jobTitle}
                      onChange={function (e) { setJobTitle(e.target.value); }}
                      style={selectStyle}
                    >
                      <option value="" disabled>Select title</option>
                      {JOB_TITLES.map(function (t) {
                        return <option key={t} value={t}>{t}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Industry</label>
                    <select
                      value={industry}
                      onChange={function (e) { setIndustry(e.target.value); }}
                      style={selectStyle}
                    >
                      <option value="" disabled>Select industry</option>
                      {industryKeys.map(function (group) {
                        return (
                          <optgroup key={group} label={group}>
                            {INDUSTRIES[group].map(function (ind) {
                              return <option key={ind} value={ind}>{ind}</option>;
                            })}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Error message */}
                {status === "error" && (
                  <div style={{
                    textAlign: "center", padding: "10px 14px", marginBottom: 14,
                    background: "rgba(255,107,107,0.10)", border: "1px solid rgba(255,107,107,0.25)",
                    borderRadius: 8, fontSize: "0.78rem", color: "#ff6b6b",
                  }}>Something went wrong. Please try again, or email <a href={"mailto:" + FORMS_FALLBACK_EMAIL} style={{ color: "inherit", textDecoration: "underline" }}>{FORMS_FALLBACK_EMAIL}</a>.</div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || !firstName.trim() || !lastName.trim()}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: 14,
                    border: "none",
                    cursor: (!firstName.trim() || !lastName.trim()) ? "not-allowed" : "pointer",
                    background: (!firstName.trim() || !lastName.trim())
                      ? (dark ? "rgba(155,135,245,0.15)" : "rgba(122,63,209,0.10)")
                      : "linear-gradient(135deg, #7a3fd1, #f5a623)",
                    color: (!firstName.trim() || !lastName.trim())
                      ? textMid
                      : "#ffffff",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    transition: "all 0.25s ease",
                    opacity: sending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {sending ? "Sending..." : "Send Enquiry →"}
                </button>
              </>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
