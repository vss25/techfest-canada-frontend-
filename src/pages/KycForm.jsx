import React, { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
const API = "https://techfest-canada-backend.onrender.com/api";

const COUNTRY_CODES = [
  { code: "+1", flag: "🇨🇦/🇺🇸" }, { code: "+44", flag: "🇬🇧" }, { code: "+91", flag: "🇮🇳" },
  { code: "+61", flag: "🇦🇺" }, { code: "+81", flag: "🇯🇵" }, { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" }, { code: "+39", flag: "🇮🇹" }, { code: "+55", flag: "🇧🇷" },
  { code: "+52", flag: "🇲🇽" }, { code: "+34", flag: "🇪🇸" }, { code: "+86", flag: "🇨🇳" },
  { code: "+971", flag: "🇦🇪" }, { code: "+966", flag: "🇸🇦" }, { code: "+27", flag: "🇿🇦" },
  { code: "+65", flag: "🇸🇬" }, { code: "+41", flag: "🇨🇭" }, { code: "+46", flag: "🇸🇪" },
  { code: "+31", flag: "🇳🇱" }, { code: "+972", flag: "🇮🇱" }, { code: "+82", flag: "🇰🇷" },
  { code: "Other", flag: "🌐" }
];

var INDUSTRY_OPTIONS = [
  "Artificial Intelligence",
  "Quantum Computing",
  "Robotics",
  "CleanTech & Sustainability",
  "Cybersecurity",
  "Healthcare & Life Sciences",
  "Manufacturing, Supply Chain & Infrastructure",
  "Defence, National Security & Public Safety",
  "Energy & Utilities",
  "Banking, Financial Services & Insurance",
];

function QuestionLabel({ num, label, required, dark }) {
  var textMain = dark ? "#ffffff" : "#0d0520";
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: textMain, fontSize: "1.15rem", fontWeight: "700", marginBottom: "16px", lineHeight: "1.4" }}>
      <span style={{ color: dark ? "#f5a623" : "#d98a14", fontWeight: "900" }}>{num}.</span>
      <span>{label} {required && <span style={{ color: "#f5a623", marginLeft: "4px" }}>*</span>}</span>
    </label>
  );
}

function FormInput({ num, label, required, dark, error, ...props }) {
  var textMain = dark ? "#ffffff" : "#0d0520";
  var inputBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var inputBorder = error ? "#ff4d4d" : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)");
  var focusBorder = dark ? "rgba(255,255,255,0.3)" : "rgba(214,48,140,0.5)";
  return (
    <div style={{ marginBottom: "40px", background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", padding: "24px", borderRadius: "16px", border: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
      <QuestionLabel num={num} label={label} required={required} dark={dark} />
      <input
        style={{ width: "100%", background: inputBg, border: "2px solid " + inputBorder, color: textMain, padding: "18px 20px", borderRadius: "12px", fontSize: "1.05rem", outline: "none", transition: "all 0.2s", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}
        onFocus={function (e) { if (!error) e.target.style.border = "2px solid " + focusBorder; }}
        onBlur={function (e) { if (!error) e.target.style.border = "2px solid " + inputBorder; }}
        {...props}
      />
    </div>
  );
}

function FormRadio({ num, label, required, name, options, value, onChange, dark, error }) {
  var textMain = dark ? "#ffffff" : "#0d0520";
  var inputBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var activeBg = dark ? "rgba(214,48,140,0.2)" : "rgba(214,48,140,0.08)";
  var inputBorder = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  return (
    <div style={{ marginBottom: "40px", padding: "24px", background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", borderRadius: "16px", border: error ? "2px solid #ff4d4d" : "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
      <QuestionLabel num={num} label={label} required={required} dark={dark} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {options.map(function (opt) {
          return (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "12px", background: value === opt ? activeBg : inputBg, border: value === opt ? "2px solid #D6308C" : "2px solid " + inputBorder, padding: "16px 20px", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease" }}>
              <input type="radio" name={name} value={opt} checked={value === opt} onChange={onChange} style={{ transform: "scale(1.2)", accentColor: "#D6308C" }} />
              <span style={{ fontSize: "1.05rem", color: textMain }}>{opt}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CustomDropdown({ num, label, required, name, options, value, onChange, multi, dark, error }) {
  var s1 = useState(false); var isOpen = s1[0]; var setIsOpen = s1[1];
  var dropdownRef = useRef(null);
  var textMain = dark ? "#ffffff" : "#0d0520";
  var inputBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var menuBg = dark ? "#1a122e" : "#ffffff";
  var inputBorder = error ? "#ff4d4d" : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)");
  var hoverBg = dark ? "rgba(255,255,255,0.08)" : "rgba(214,48,140,0.08)";

  useEffect(function () {
    var handler = function (e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return function () { document.removeEventListener("mousedown", handler); };
  }, []);

  var handleSelect = function (opt) {
    if (multi) {
      var arr = [].concat(value || []);
      if (arr.includes(opt)) arr = arr.filter(function (i) { return i !== opt; });
      else arr.push(opt);
      onChange({ target: { name: name, value: arr } });
    } else {
      onChange({ target: { name: name, value: opt } });
      setIsOpen(false);
    }
  };

  var display = "Select an option...";
  if (multi && value && value.length > 0) display = value.length + " selected";
  else if (!multi && value) display = value;

  return (
    <div ref={dropdownRef} style={{ marginBottom: "40px", background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", padding: "24px", borderRadius: "16px", border: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
      <QuestionLabel num={num} label={label} required={required} dark={dark} />
      <div style={{ position: "relative" }}>
        <div onClick={function () { setIsOpen(!isOpen); }}
          style={{ width: "100%", background: inputBg, border: "2px solid " + (isOpen ? (dark ? "rgba(255,255,255,0.3)" : "rgba(214,48,140,0.5)") : inputBorder), color: (value && value.length > 0) ? textMain : (dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"), padding: "18px 20px", borderRadius: "12px", fontSize: "1.05rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
          <span>{display}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        {isOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: "100%", background: menuBg, border: "1px solid " + (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), borderRadius: "12px", maxHeight: "300px", overflowY: "auto", zIndex: 50, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            {options.map(function (opt) {
              var sel = multi ? (value || []).includes(opt) : value === opt;
              return (
                <div key={opt} onClick={function () { handleSelect(opt); }}
                  style={{ padding: "16px 20px", color: textMain, fontSize: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), background: sel ? hoverBg : "transparent", transition: "background 0.1s" }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = sel ? hoverBg : "transparent"; }}>
                  {multi && (
                    <div style={{ width: "20px", height: "20px", border: "2px solid " + (sel ? "#D6308C" : (dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)")), borderRadius: "4px", background: sel ? "#D6308C" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                  )}
                  {opt}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RichTextEditor({ num, label, required, value, onChange, dark, error }) {
  var editorRef = useRef(null);
  var textMain = dark ? "#ffffff" : "#0d0520";
  var inputBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var bgToolbar = dark ? "rgba(255,255,255,0.02)" : "#fafafa";
  var inputBorder = error ? "#ff4d4d" : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)");

  useEffect(function () { if (editorRef.current && value && !editorRef.current.innerHTML) editorRef.current.innerHTML = value; }, []);
  var handleInput = function () { if (editorRef.current) onChange(editorRef.current.innerHTML); };
  var exec = function (cmd, val) { document.execCommand(cmd, false, val || null); editorRef.current.focus(); handleInput(); };
  var btnStyle = { background: "transparent", border: "none", color: textMain, cursor: "pointer", padding: "6px 10px", borderRadius: "6px", fontSize: "0.9rem" };

  return (
    <div style={{ marginBottom: "40px", background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", padding: "24px", borderRadius: "16px", border: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
      <QuestionLabel num={num} label={label} required={required} dark={dark} />
      <div style={{ background: inputBg, border: "2px solid " + inputBorder, borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px", background: bgToolbar, borderBottom: "1px solid " + (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }}>
          <button type="button" onClick={function () { exec("bold"); }} style={Object.assign({}, btnStyle, { fontWeight: "bold" })}>B</button>
          <button type="button" onClick={function () { exec("italic"); }} style={Object.assign({}, btnStyle, { fontStyle: "italic" })}>I</button>
          <button type="button" onClick={function () { exec("underline"); }} style={Object.assign({}, btnStyle, { textDecoration: "underline" })}>U</button>
          <button type="button" onClick={function () { exec("insertUnorderedList"); }} style={btnStyle}>• List</button>
        </div>
        <div ref={editorRef} contentEditable onInput={handleInput}
          style={{ minHeight: "150px", padding: "20px", color: textMain, outline: "none", fontSize: "1.05rem", lineHeight: "1.6" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN FORM — SINGLE PAGE
   ═══════════════════════════════════════════════════════ */

export default function KYCForm() {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(false); var isSubmitted = s2[0]; var setIsSubmitted = s2[1];
  var s3 = useState([]); var missingFields = s3[0]; var setMissingFields = s3[1];
  var s4 = useState(function () {
    if (typeof window !== "undefined") { var saved = localStorage.getItem("kycFormDraft"); if (saved) return JSON.parse(saved); }
    return { primaryPhoneCode: "+1" };
  }); var formData = s4[0]; var setFormData = s4[1];

  useEffect(function () {
    if (typeof document !== "undefined" && document.body) {
      setDark(document.body.classList.contains("dark-mode"));
      var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      return function () { obs.disconnect(); };
    }
  }, []);

  useEffect(function () { if (typeof window !== "undefined") localStorage.setItem("kycFormDraft", JSON.stringify(formData)); }, [formData]);

  var handleChange = function (e) {
    var name = e.target.name; var value = e.target.value;
    setFormData(function (prev) { var n = Object.assign({}, prev); n[name] = value; return n; });
    if (missingFields.includes(name)) setMissingFields(function (prev) { return prev.filter(function (f) { return f !== name; }); });
  };

  var handlePhoneChange = function (e) {
    var val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData(function (prev) { return Object.assign({}, prev, { primaryPhone: val }); });
  };

  var handleSubmit = async function () {
    var required = ["primaryFirstName", "primaryLastName", "primaryEmail", "primaryTitle", "companyName", "countryHQ", "mainOfficeCity", "operationsCanada", "primaryIndustry", "companyDesc", "productDesc", "primaryReasons", "topOutcomes"];
    var missing = required.filter(function (field) { var val = formData[field]; return !val || (Array.isArray(val) && val.length === 0); });
    if (missing.length > 0) { setMissingFields(missing); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setMissingFields([]);
    try {
      var response = await fetch(API + "/kyc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!response.ok) throw new Error("Failed to save");
      localStorage.removeItem("kycFormDraft");
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Backend save error", err);
      alert("There was an issue saving your application. Please try again.");
    }
  };

  var bg = dark ? "#151035" : "#fdfbfa";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.6)" : "rgba(13,5,32,0.6)";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, position: "relative" }}>
      <Navbar />

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(100px,14vw,140px) 5% 80px" }}>

        {missingFields.length > 0 && (
          <div style={{ background: "rgba(255, 77, 77, 0.1)", color: "#ff4d4d", padding: "16px 20px", borderRadius: "12px", marginBottom: "40px", fontWeight: 600, display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Please complete all required fields before submitting.
          </div>
        )}

        {/* ═══ SECTION: PRIMARY DETAILS ═══ */}
        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.5rem", fontWeight: 900, marginBottom: "12px" }}>Primary Details</h2>
          <p style={{ color: textMuted, fontSize: "1.1rem", marginBottom: "40px" }}>Let's start with your contact information.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 24px" }}>
            <FormInput num="1" label="First Name" required name="primaryFirstName" placeholder="Jane" value={formData.primaryFirstName || ""} onChange={handleChange} dark={dark} error={missingFields.includes("primaryFirstName")} />
            <FormInput num="2" label="Last Name" required name="primaryLastName" placeholder="Smith" value={formData.primaryLastName || ""} onChange={handleChange} dark={dark} error={missingFields.includes("primaryLastName")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 24px" }}>
            <FormInput num="3" label="Primary Contact Email" required type="email" name="primaryEmail" placeholder="jane.smith@example.com" value={formData.primaryEmail || ""} onChange={handleChange} dark={dark} error={missingFields.includes("primaryEmail")} />
            <div style={{ marginBottom: "40px", background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", padding: "24px", borderRadius: "16px", border: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
              <QuestionLabel num="4" label="Primary Contact Phone" required={false} dark={dark} />
              <div style={{ display: "flex", gap: "12px" }}>
                <select style={{ width: "140px", background: dark ? "rgba(255,255,255,0.04)" : "#ffffff", border: "2px solid " + (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), color: textMain, padding: "18px", borderRadius: "12px", fontSize: "1.05rem", outline: "none", cursor: "pointer" }} name="primaryPhoneCode" value={formData.primaryPhoneCode || "+1"} onChange={handleChange}>
                  {COUNTRY_CODES.map(function (c) { return <option key={c.code} value={c.code} style={{ color: "#000" }}>{c.flag} {c.code}</option>; })}
                </select>
                <input style={{ flex: 1, background: dark ? "rgba(255,255,255,0.04)" : "#ffffff", border: "2px solid " + (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), color: textMain, padding: "18px 20px", borderRadius: "12px", fontSize: "1.05rem", outline: "none" }} type="tel" maxLength="10" placeholder="4165550100" value={formData.primaryPhone || ""} onChange={handlePhoneChange} />
              </div>
            </div>
          </div>

          <FormInput num="5" label="Job Title" required name="primaryTitle" value={formData.primaryTitle || ""} onChange={handleChange} dark={dark} error={missingFields.includes("primaryTitle")} />
        </div>

        {/* ═══ SECTION: COMPANY INFO ═══ */}
        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.5rem", fontWeight: 900, marginBottom: "12px" }}>Company Information</h2>
          <p style={{ color: textMuted, fontSize: "1.1rem", marginBottom: "40px" }}>Provide details about your organization.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 24px" }}>
            <FormInput num="6" label="Company Name" required name="companyName" value={formData.companyName || ""} onChange={handleChange} dark={dark} error={missingFields.includes("companyName")} />
            <FormInput num="7" label="Website" name="website" placeholder="https://" value={formData.website || ""} onChange={handleChange} dark={dark} />
          </div>

          <CustomDropdown num="8" label="Country of Headquarters" required name="countryHQ" options={["Canada", "USA", "UK", "Europe", "India", "Middle East", "APAC", "Other"]} value={formData.countryHQ || ""} onChange={handleChange} dark={dark} error={missingFields.includes("countryHQ")} />

          <FormInput num="9" label="City of Main Office" required name="mainOfficeCity" value={formData.mainOfficeCity || ""} onChange={handleChange} dark={dark} error={missingFields.includes("mainOfficeCity")} />

          <FormRadio num="10" label="Do you have operations in Canada?" required name="operationsCanada" options={["Yes", "No", "Planned market entry"]} value={formData.operationsCanada || ""} onChange={handleChange} dark={dark} error={missingFields.includes("operationsCanada")} />
        </div>

        {/* ═══ SECTION: BUSINESS PROFILE ═══ */}
        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.5rem", fontWeight: 900, marginBottom: "12px" }}>Business Profile</h2>
          <p style={{ color: textMuted, fontSize: "1.1rem", marginBottom: "40px" }}>Tell us about your industry and products.</p>

          <CustomDropdown num="11" label="Primary Industry" required name="primaryIndustry" options={INDUSTRY_OPTIONS} value={formData.primaryIndustry || ""} onChange={handleChange} dark={dark} error={missingFields.includes("primaryIndustry")} />

          <CustomDropdown num="12" label="Which best describes your company? (Select all that apply)" required name="companyDesc" multi={true} options={["Technology Product Company", "Platform / SaaS Company", "Enterprise Solution Provider", "Consulting / Services Firm", "System Integrator", "Hardware / Infrastructure Provider", "Research / Lab / Deep Tech Company", "Startup", "Government / Trade Body / Association", "Academic / Innovation Institution", "Investor / VC / PE / Family Office", "Recruitment / Talent / Training Company", "Media / Community / Ecosystem Builder", "Other"]} value={formData.companyDesc} onChange={handleChange} dark={dark} error={missingFields.includes("companyDesc")} />

          <FormRadio num="13" label="Company Stage (Optional)" name="companyStage" options={["Startup", "Growth Stage", "Scale Up", "Established Enterprise", "Global Corporation"]} value={formData.companyStage || ""} onChange={handleChange} dark={dark} />

          <RichTextEditor num="14" label="Describe your product, solution, or offering" required value={formData.productDesc} onChange={function (val) { setFormData(function (prev) { return Object.assign({}, prev, { productDesc: val }); }); if (missingFields.includes("productDesc")) setMissingFields(function (prev) { return prev.filter(function (f) { return f !== "productDesc"; }); }); }} dark={dark} error={missingFields.includes("productDesc")} />
        </div>

        {/* ═══ SECTION: OBJECTIVES ═══ */}
        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.5rem", fontWeight: 900, marginBottom: "12px" }}>Objectives</h2>
          <p style={{ color: textMuted, fontSize: "1.1rem", marginBottom: "40px" }}>Help us understand your goals for the event.</p>

          <CustomDropdown num="15" label="Primary reasons for participating" required name="primaryReasons" multi={true} options={["Brand visibility", "Lead generation", "Sales pipeline creation", "Customer acquisition", "Partnership development", "Investor outreach", "Channel / distributor search", "Market entry into Canada", "Thought leadership / speaking", "Product launch", "PR / media exposure", "Competitive intelligence", "Recruit talent", "Meet government / academia / ecosystem leaders", "Existing customer engagement", "Networking", "Other"]} value={formData.primaryReasons} onChange={handleChange} dark={dark} error={missingFields.includes("primaryReasons")} />

          <CustomDropdown num="16" label="Top success outcomes" required name="topOutcomes" multi={true} options={["Number of qualified meetings", "Number of enterprise buyer meetings", "Number of government / public sector meetings", "Number of investor meetings", "Number of channel / partner meetings", "Number of booth visits", "Number of leads captured", "Number of product demos conducted", "Number of speaking attendees reached", "Brand impressions", "Press / media exposure", "Social media reach", "Strategic partnerships initiated", "Sales opportunities generated", "Market insights gathered", "Hiring conversations initiated"]} value={formData.topOutcomes} onChange={handleChange} dark={dark} error={missingFields.includes("topOutcomes")} />
        </div>

        {/* ═══ SECTION: MARKET POSITIONING ═══ */}
        <div style={{ marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.5rem", fontWeight: 900, marginBottom: "12px" }}>Market Positioning</h2>
          <RichTextEditor num="17" label="Which competitors or comparable companies do you want to position against or alongside? (Optional)" value={formData.competitors} onChange={function (val) { setFormData(function (prev) { return Object.assign({}, prev, { competitors: val }); }); }} dark={dark} />
        </div>

        {/* ═══ SUBMIT ═══ */}
        <div style={{ paddingTop: "40px", borderTop: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") }}>
          <button onClick={handleSubmit}
            style={{ width: "100%", background: "#D6308C", color: "#fff", padding: "24px", borderRadius: "16px", border: "none", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", letterSpacing: "1px", textTransform: "uppercase", boxShadow: "0 10px 30px rgba(214,48,140,0.25)", transition: "transform 0.2s" }}
            onMouseEnter={function (e) { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "translateY(0)"; }}
          >Submit Application</button>
        </div>
      </div>

      {/* SUCCESS OVERLAY */}
      {isSubmitted && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "rgba(6,2,15,0.95)" : "rgba(253,251,250,0.95)", backdropFilter: "blur(20px)", padding: "20px" }}>
          <div style={{ textAlign: "center", maxWidth: "600px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", padding: "60px 40px", borderRadius: "30px", border: "1px solid " + (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#D6308C", width: "100px", height: "100px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 30px" }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "3rem", fontWeight: 900, marginBottom: "20px", color: textMain }}>Application Sent!</h2>
            <p style={{ color: textMuted, fontSize: "1.2rem", lineHeight: "1.6", marginBottom: "40px" }}>
              Thank you for providing your details. Our team will review your profile and be in touch shortly.
            </p>
            <button onClick={function () { localStorage.removeItem("kycFormDraft"); window.location.href = "/"; }}
              style={{ background: textMain, color: bg, padding: "20px 40px", borderRadius: "16px", border: "none", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", width: "100%" }}>
              Return to Homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
