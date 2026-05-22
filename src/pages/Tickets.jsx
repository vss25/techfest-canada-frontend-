import { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API } from "../utils/api";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "#f5a623", flexShrink: 0, marginTop: 2 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDown({ color, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || "currentColor"} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: "transform 0.2s ease" }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TickSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PriceWithAsterisk({ price, color, fontSize, fontWeight, style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "baseline", gap: 2, ...(style || {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: fontSize || "2.6rem", fontWeight: fontWeight || 900, color: color || "inherit", lineHeight: 1, letterSpacing: "-1px" }}>
        ${typeof price === "number" ? price.toLocaleString() : price}
      </span>
      <span style={{ color: "#f5a623", fontSize: "0.6em", fontWeight: 900, cursor: "help", lineHeight: 1 }}>*</span>
      {hovered && (
        <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.88)", color: "#fff", fontSize: "0.68rem", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "0.5px", padding: "8px 14px", borderRadius: 10, whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          Price subject to change
        </span>
      )}
    </span>
  );
}

const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const PRIORITY_COUNTRIES = ["Canada", "United States", "United Kingdom", "Australia"];
const COUNTRY_FLAGS = { Canada: "\u{1F1E8}\u{1F1E6}", "United States": "\u{1F1FA}\u{1F1F8}", "United Kingdom": "\u{1F1EC}\u{1F1E7}", Australia: "\u{1F1E6}\u{1F1FA}" };

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "H.E.", "Hon.", "Prof."];
const JOB_LEVELS = ["Student","Entry Level","Mid Level Professional","Manager","Senior Manager","Director","Vice President","C-Level / Executive","Founder / Owner / Partner","Government / Public Sector","Investor","Academic / Research","Other"];
const JOB_FUNCTIONS = ["Compliance & Risk Management","Consulting & Advisory","Cybersecurity","Data, Analytics & Insights","Environmental, Social & Corporate Governance (ESG)","Executive Leadership & Board of Directors","Finance & Accounting","HR & Recruiting","Investing","Legal","Marketing & Communications","Operations & Project Management","Partnerships","Policy","Procurement & Vendor Management","Product","Research, Content & Journalism","Sales, BD & Account Management","Strategy, Innovation, R&D","Technology & IT","Not Applicable"];
const TOPICS = ["Artificial Intelligence","Quantum Computing","Cybersecurity","Robotics & Automation","Sustainability & CleanTech","Healthcare & Lifesciences","Banking, Financial Services & Insurance","Supply Chain, Manufacturing & Infrastructure","Defence & Public Safety","Energy & Utilities"];
const OBJECTIVES = ["Education","Investments","Jobs","Market Entry","Networking","Partnerships","Regulatory and Policy Dialogue","Solutions","Talent","Trends and Insights"];

const EMPTY_FORM = { salutation:"",firstName:"",lastName:"",jobTitle:"",organisation:"",businessNumber:"",email:"",country:"",linkedin:"",jobLevel:"",jobLevelOther:"",jobFunction:"",topics:[],objectives:[],consent1:false,consent2:false };

function CustomDropdown({ options, value, onChange, placeholder="Select\u2026", multi=false, searchable=false, dark, error, maxHeight=220, priorityOptions=[], flagMap={} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const borderColor = error ? "#e05555" : open ? "#7a3fd1" : dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.22)";
  const dropBg = dark ? "#16092e" : "#ffffff";
  const hoverBg = dark ? "rgba(122,63,209,0.18)" : "rgba(122,63,209,0.07)";
  const selectedBg = dark ? "rgba(122,63,209,0.28)" : "rgba(122,63,209,0.12)";
  const dividerColor = dark ? "rgba(255,255,255,0.07)" : "rgba(122,63,209,0.10)";

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearch(""); } };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  useEffect(() => { if (open && searchable && searchRef.current) setTimeout(() => searchRef.current?.focus(), 60); }, [open, searchable]);

  const isSelected = (opt) => multi ? Array.isArray(value) && value.includes(opt) : value === opt;
  const handleSelect = (opt) => {
    if (multi) { const arr = Array.isArray(value) ? value : []; onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]); }
    else { onChange(opt); setOpen(false); setSearch(""); }
  };
  const removeTag = (e, opt) => { e.stopPropagation(); if (multi && Array.isArray(value)) onChange(value.filter(x => x !== opt)); };
  const filteredOptions = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));
  const filteredPriority = priorityOptions.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));
  const filteredRest = filteredOptions.filter(o => !priorityOptions.includes(o));
  const singleLabel = !multi && value ? (flagMap[value] ? flagMap[value]+" "+value : value) : null;
  const tags = multi && Array.isArray(value) ? value : [];

  return (
    <div ref={containerRef} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: multi && tags.length > 0 ? "8px 12px" : "11px 14px", borderRadius:10, border:"1px solid "+borderColor, background:inputBg, cursor:"pointer", gap:8, transition:"border-color 0.2s, box-shadow 0.2s", boxShadow: open ? "0 0 0 3px "+(dark?"rgba(122,63,209,0.20)":"rgba(122,63,209,0.12)") : "none", minHeight:44 }}>
        <div style={{ flex:1, display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", minWidth:0 }}>
          {multi && tags.length > 0 ? tags.map(tag => (
            <span key={tag} style={{ display:"inline-flex", alignItems:"center", gap:5, background: dark?"rgba(122,63,209,0.30)":"rgba(122,63,209,0.12)", color: dark?"#c8a8ff":"#6a30c0", border:"1px solid "+(dark?"rgba(122,63,209,0.45)":"rgba(122,63,209,0.28)"), borderRadius:6, padding:"3px 8px", fontSize:"0.70rem", fontWeight:700, letterSpacing:"0.3px", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{tag}</span>
              <span onClick={(e) => removeTag(e, tag)} style={{ cursor:"pointer", opacity:0.7, lineHeight:1, flexShrink:0, fontSize:"0.9rem" }}>&times;</span>
            </span>
          )) : (
            <span style={{ fontSize:"16px", color:(multi?tags.length===0:!value)?textMuted:textMain, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{multi ? placeholder : (singleLabel || placeholder)}</span>
          )}
        </div>
        <span style={{ transform: open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s ease", flexShrink:0 }}><ChevronDown color={textMuted} /></span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:dropBg, border:"1px solid "+(dark?"rgba(122,63,209,0.35)":"rgba(122,63,209,0.18)"), borderRadius:12, zIndex:9999, boxShadow: dark?"0 12px 48px rgba(0,0,0,0.55)":"0 12px 40px rgba(122,63,209,0.14)", overflow:"hidden" }}>
          {searchable && (
            <div style={{ padding:"10px 10px 6px", borderBottom:"1px solid "+dividerColor }}>
              <div style={{ position:"relative" }}>
                <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search\u2026" style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:8, border:"1px solid "+dividerColor, background: dark?"rgba(255,255,255,0.05)":"rgba(122,63,209,0.04)", color:textMain, fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
            </div>
          )}
          {multi && (
            <div style={{ padding:"8px 12px", fontSize:"0.60rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color: dark?"rgba(245,166,35,0.8)":"#d98a14", borderBottom:"1px solid "+dividerColor, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{Array.isArray(value)?value.length:0} selected</span>
              {Array.isArray(value) && value.length > 0 && <span onClick={(e)=>{e.stopPropagation();onChange([]);}} style={{ cursor:"pointer", opacity:0.7, fontSize:"0.60rem", color:"#e05555" }}>Clear all</span>}
            </div>
          )}
          <div style={{ overflowY:"auto", maxHeight, WebkitOverflowScrolling:"touch" }}>
            {filteredPriority.length > 0 && (<>
              {filteredPriority.map(opt => <DropOption key={opt} opt={opt} label={flagMap[opt]?flagMap[opt]+" "+opt:opt} selected={isSelected(opt)} multi={multi} dark={dark} hoverBg={hoverBg} selectedBg={selectedBg} textMain={textMain} textMuted={textMuted} onSelect={handleSelect} />)}
              {filteredRest.length > 0 && <div style={{ height:1, background:dividerColor, margin:"2px 0" }} />}
            </>)}
            {(priorityOptions.length > 0 ? filteredRest : filteredOptions).map(opt => <DropOption key={opt} opt={opt} label={flagMap[opt]?flagMap[opt]+" "+opt:opt} selected={isSelected(opt)} multi={multi} dark={dark} hoverBg={hoverBg} selectedBg={selectedBg} textMain={textMain} textMuted={textMuted} onSelect={handleSelect} />)}
            {filteredOptions.length === 0 && filteredPriority.length === 0 && <div style={{ padding:"14px 16px", fontSize:"0.78rem", color:textMuted, textAlign:"center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function DropOption({ opt, label, selected, multi, dark, hoverBg, selectedBg, textMain, textMuted, onSelect }) {
  return (
    <div onClick={() => onSelect(opt)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", background: selected?selectedBg:"transparent", fontSize:"14px", color: selected?(dark?"#c8a8ff":"#6a30c0"):textMain, fontWeight: selected?600:400, transition:"background 0.12s" }}
      onMouseEnter={e => { if(!selected) e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected?selectedBg:"transparent"; }}>
      {multi && <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, border:"2px solid "+(selected?"#7a3fd1":(dark?"rgba(255,255,255,0.20)":"rgba(122,63,209,0.30)")), background: selected?"#7a3fd1":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.12s" }}>{selected && <TickSmall />}</div>}
      {!multi && selected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark?"#c8a8ff":"#7a3fd1"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M20 6 9 17l-5-5" /></svg>}
      {!multi && !selected && <div style={{ width:13, flexShrink:0 }} />}
      <span style={{ flex:1 }}>{label}</span>
    </div>
  );
}

function QuestionnaireModal({ dark, tierLabel, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);
  const TOTAL_STEPS = 2;

  useEffect(() => { const t = setTimeout(() => { if (firstInputRef.current) firstInputRef.current.focus(); }, 120); return () => clearTimeout(t); }, [step]);

  // ESC key closes modal + lock background scroll while open
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const inputBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.20)";
  const modalBg = dark ? "#0e0820" : "#ffffff";

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };
  const setJobLevel = (val) => { setForm(f => ({ ...f, jobLevel: val, jobLevelOther: val === "Other" ? f.jobLevelOther : "" })); setErrors(e => ({ ...e, jobLevel: undefined, jobLevelOther: undefined })); };

  const inputStyle = (err) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid "+(err?"#e05555":inputBorder), background:inputBg, color:textMain, fontFamily:"inherit", fontSize:"16px", outline:"none", boxSizing:"border-box", transition:"border 0.2s, box-shadow 0.2s", WebkitAppearance:"none", appearance:"none" });
  const labelStyle = { fontSize:"0.65rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:textMuted, display:"block", marginBottom:6 };
  const fieldStyle = { display:"flex", flexDirection:"column", gap:0 };
  const errStyle = { fontSize:"0.62rem", color:"#e05555", marginTop:4 };

  const handlePhoneChange = (val) => { set("businessNumber", val.replace(/[^\d\s\-\+\(\)]/g, "").slice(0, 15)); };
  const handleLinkedInBlur = () => { const v = form.linkedin.trim(); if (v && !v.startsWith("http") && !v.startsWith("linkedin")) set("linkedin", "https://linkedin.com/in/"+v); else if (v && v.startsWith("linkedin.com")) set("linkedin", "https://"+v); };

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = "Required";
      if (!form.lastName.trim()) e.lastName = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";
      if (!form.organisation.trim()) e.organisation = "Required";
      if (!form.country) e.country = "Please select your country";
      if (!form.jobLevel) e.jobLevel = "Required";
      if (form.jobLevel === "Other" && !form.jobLevelOther.trim()) e.jobLevelOther = "Please describe your role";
      if (!form.jobFunction) e.jobFunction = "Required";
    }
    if (step === 2) {
      if (form.topics.length === 0) e.topics = "Select at least one topic";
      if (form.objectives.length === 0) e.objectives = "Select at least one objective";
      if (!form.consent1) e.consent1 = "Required";
      if (!form.consent2) e.consent2 = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);
  const submit = () => { if (validateStep()) onSubmit(form); };

  const stepTitles = ["Your Profile", "Interests & Consent"];
  const stepSubtitles = ["Personal & professional details", "Topics, objectives & agreements"];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"rgba(0,0,0,0.78)", backdropFilter:"blur(12px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:580, maxHeight:"92vh", display:"flex", flexDirection:"column", background:modalBg, borderRadius:24, border: dark?"1px solid rgba(255,255,255,0.10)":"1px solid rgba(122,63,209,0.14)", boxShadow: dark?"0 28px 80px rgba(0,0,0,0.6)":"0 28px 80px rgba(122,63,209,0.15)", overflow:"hidden", position:"relative" }}>

        {/* Floating close button — always visible, sits above content */}
        <button onClick={onClose} aria-label="Close" style={{ position:"absolute", top:14, right:14, zIndex:5, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background: dark?"rgba(255,255,255,0.08)":"rgba(13,5,32,0.06)", border: dark?"1px solid rgba(255,255,255,0.12)":"1px solid rgba(13,5,32,0.08)", borderRadius:"50%", cursor:"pointer", color:textMain, transition:"background 0.15s, transform 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = dark?"rgba(255,255,255,0.14)":"rgba(13,5,32,0.10)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = dark?"rgba(255,255,255,0.08)":"rgba(13,5,32,0.06)"; e.currentTarget.style.transform = "scale(1)"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div style={{ padding:"24px 28px 0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6, paddingRight:40 }}>
            <div>
              <div style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.58rem", fontWeight:700, letterSpacing:"1.8px", textTransform:"uppercase", color:"#f5a623", marginBottom:4 }}>{tierLabel} Pass</div>
              <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"1.05rem", color:textMain, margin:0, lineHeight:1.2 }}>{stepTitles[step-1]}</h2>
              <p style={{ fontSize:"0.68rem", color:textMuted, margin:"4px 0 0", letterSpacing:"0.3px" }}>{stepSubtitles[step-1]}</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"14px 0 6px" }}>
            <span style={{ fontSize:"0.60rem", color: dark?"rgba(255,255,255,0.30)":"rgba(13,5,32,0.30)", fontWeight:600, letterSpacing:"0.5px" }}>Step {step} of {TOTAL_STEPS}</span>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:20 }}>
            {[1,2].map(s => <div key={s} style={{ flex:1, height:3, borderRadius:999, background: s<=step?"linear-gradient(90deg, #7a3fd1, #f5a623)":(dark?"rgba(255,255,255,0.10)":"rgba(122,63,209,0.12)"), transition:"background 0.3s" }} />)}
          </div>
        </div>

        <div style={{ overflowY:"auto", padding:"0 28px 24px", flexGrow:1, WebkitOverflowScrolling:"touch" }}>
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={fieldStyle}><label style={labelStyle}>Salutation</label><CustomDropdown options={SALUTATIONS} value={form.salutation} onChange={v => set("salutation",v)} placeholder="Select\u2026" dark={dark} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={fieldStyle}><label style={labelStyle}>First Name *</label><input ref={firstInputRef} value={form.firstName} onChange={e => set("firstName",e.target.value)} placeholder="Jane" autoComplete="given-name" style={inputStyle(errors.firstName)} />{errors.firstName && <span style={errStyle}>{errors.firstName}</span>}</div>
                <div style={fieldStyle}><label style={labelStyle}>Last Name *</label><input value={form.lastName} onChange={e => set("lastName",e.target.value)} placeholder="Smith" autoComplete="family-name" style={inputStyle(errors.lastName)} />{errors.lastName && <span style={errStyle}>{errors.lastName}</span>}</div>
              </div>
              <div style={fieldStyle}><label style={labelStyle}>Job Title</label><input value={form.jobTitle} onChange={e => set("jobTitle",e.target.value)} placeholder="e.g. Chief Technology Officer" autoComplete="organization-title" style={inputStyle(false)} /></div>
              <div style={fieldStyle}><label style={labelStyle}>Organisation Name *</label><input value={form.organisation} onChange={e => set("organisation",e.target.value)} placeholder="e.g. Acme Corp" autoComplete="organization" style={inputStyle(errors.organisation)} />{errors.organisation && <span style={errStyle}>{errors.organisation}</span>}</div>
              <div style={fieldStyle}><label style={labelStyle}>Business Phone</label><input type="tel" inputMode="tel" value={form.businessNumber} onChange={e => handlePhoneChange(e.target.value)} placeholder="+1 (416) 000-0000" autoComplete="tel" maxLength={15} style={inputStyle(false)} /><span style={{ fontSize:"0.60rem", color: dark?"rgba(255,255,255,0.30)":"rgba(13,5,32,0.35)", marginTop:4 }}>Include country code (e.g. +1 for Canada/US)</span></div>
              <div style={fieldStyle}><label style={labelStyle}>Work Email *</label><input type="email" inputMode="email" value={form.email} onChange={e => set("email",e.target.value)} placeholder="jane@company.com" autoComplete="email" style={inputStyle(errors.email)} />{errors.email && <span style={errStyle}>{errors.email}</span>}</div>
              <div style={fieldStyle}><label style={labelStyle}>Country *</label><CustomDropdown options={COUNTRIES.filter(c => !PRIORITY_COUNTRIES.includes(c))} priorityOptions={PRIORITY_COUNTRIES} flagMap={COUNTRY_FLAGS} value={form.country} onChange={v => set("country",v)} placeholder="Select your country\u2026" searchable dark={dark} error={!!errors.country} maxHeight={200} />{errors.country && <span style={errStyle}>{errors.country}</span>}</div>
              <div style={fieldStyle}><label style={labelStyle}>LinkedIn Profile <span style={{ fontWeight:500, letterSpacing:0, textTransform:"none", color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.35)" }}>(optional)</span></label><input type="url" inputMode="url" value={form.linkedin} onChange={e => set("linkedin",e.target.value)} onBlur={handleLinkedInBlur} placeholder="linkedin.com/in/yourname" autoComplete="url" style={inputStyle(false)} /><span style={{ fontSize:"0.60rem", color: dark?"rgba(255,255,255,0.30)":"rgba(13,5,32,0.35)", marginTop:4 }}>We'll auto-add https:// if needed</span></div>
              <div style={{ width:"100%", height:1, background: dark?"rgba(255,255,255,0.07)":"rgba(122,63,209,0.10)", margin:"4px 0" }} />
              <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.60rem", letterSpacing:"1.5px", textTransform:"uppercase", color: dark?"#c8a8ff":"#7a3fd1" }}>Professional Profile</div>
              <div style={fieldStyle}><label style={labelStyle}>Job Level *</label><CustomDropdown options={JOB_LEVELS} value={form.jobLevel} onChange={setJobLevel} placeholder="Select your level\u2026" dark={dark} error={!!errors.jobLevel} maxHeight={220} />{errors.jobLevel && <span style={errStyle}>{errors.jobLevel}</span>}{form.jobLevel === "Other" && <div style={{ marginTop:10 }}><input value={form.jobLevelOther} onChange={e => set("jobLevelOther",e.target.value)} placeholder="Please describe your role\u2026" style={inputStyle(!!errors.jobLevelOther)} autoFocus />{errors.jobLevelOther && <span style={errStyle}>{errors.jobLevelOther}</span>}</div>}</div>
              <div style={fieldStyle}><label style={labelStyle}>Job Function *</label><CustomDropdown options={JOB_FUNCTIONS} value={form.jobFunction} onChange={v => set("jobFunction",v)} placeholder="Select your function\u2026" dark={dark} error={!!errors.jobFunction} maxHeight={220} />{errors.jobFunction && <span style={errStyle}>{errors.jobFunction}</span>}</div>
            </div>
          )}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={fieldStyle}><label style={labelStyle}>Topics of Interest * <span style={{ color:textMuted, fontWeight:500, letterSpacing:0, textTransform:"none" }}>({form.topics.length} selected)</span></label><CustomDropdown options={TOPICS} value={form.topics} onChange={v => set("topics",v)} placeholder="Select all that apply\u2026" multi dark={dark} error={!!errors.topics} maxHeight={240} />{errors.topics && <span style={errStyle}>{errors.topics}</span>}</div>
              <div style={fieldStyle}><label style={labelStyle}>Objectives for attending * <span style={{ color:textMuted, fontWeight:500, letterSpacing:0, textTransform:"none" }}>({form.objectives.length} selected)</span></label><CustomDropdown options={OBJECTIVES} value={form.objectives} onChange={v => set("objectives",v)} placeholder="Select all that apply\u2026" multi dark={dark} error={!!errors.objectives} maxHeight={240} />{errors.objectives && <span style={errStyle}>{errors.objectives}</span>}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"20px", background: dark?"rgba(122,63,209,0.08)":"rgba(122,63,209,0.04)", borderRadius:14, border: dark?"1px solid rgba(122,63,209,0.20)":"1px solid rgba(122,63,209,0.12)" }}>
                <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1.5px", textTransform:"uppercase", color: dark?"#c8a8ff":"#7a3fd1", marginBottom:2 }}>Your Consent</div>
                {[
                  { key:"consent1", text:"My consents hereto are given to the organisers and I agree to the organiser's terms of service and privacy policies." },
                  { key:"consent2", text:"I acknowledge and agree that the organisers will collect, use, process and/or disclose my personal information for the purposes of securing my registration and attendance for The Tech Festival Canada, including digital platform usage on the The Tech Festival Canada platform, and consent to the collection, use, processing and/or disclosure of my personal information by the organisers for the purposes of receiving updates on the agenda, activities/events, collaboration projects, industry news relating to The Tech Festival Canada." },
                ].map(({ key, text }, i) => (
                  <label key={key} style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
                    <div style={{ position:"relative", flexShrink:0, marginTop:1 }}>
                      <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={{ position:"absolute", opacity:0, width:0, height:0 }} />
                      <div style={{ width:20, height:20, borderRadius:6, border:"2px solid "+(errors[key]?"#e05555":(form[key]?"#7a3fd1":inputBorder)), background: form[key]?"#7a3fd1":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>{form[key] && <TickSmall />}</div>
                    </div>
                    <span style={{ fontSize:"14px", color:textMuted, lineHeight:1.6 }}><strong style={{ color:textMain, fontWeight:700 }}>{i+1}. </strong>{text}</span>
                  </label>
                ))}
                {(errors.consent1 || errors.consent2) && <span style={errStyle}>Both consents are required to proceed.</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"16px 28px 24px", flexShrink:0, borderTop: dark?"1px solid rgba(255,255,255,0.06)":"1px solid rgba(122,63,209,0.08)", display:"flex", gap:10 }}>
          {step > 1 && <button onClick={back} style={{ flex:1, padding:"14px", borderRadius:12, border: dark?"1px solid rgba(255,255,255,0.14)":"1px solid rgba(122,63,209,0.20)", background:"transparent", color:textMain, fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>&larr; Back</button>}
          <button onClick={step < TOTAL_STEPS ? next : submit} style={{ flex:2, padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg, #7a3fd1, #f5a623)", color:"white", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", boxShadow:"0 4px 20px rgba(122,63,209,0.35)" }}>{step < TOTAL_STEPS ? "Continue \u2192" : "Proceed to Payment \u2192"}</button>
        </div>
      </div>
    </div>
  );
}

const PASS_META = {
  connect: { label:"Connect Pass", tagline:"More than just access to the conference.", description:"Designed for attendees who want to start the day in a more curated business environment. With entry to the exclusive CxO Breakfast, you can connect with senior leaders and build meaningful relationships before the main conference begins.", features:["2x Day Conference Access","2x CxO Breakfasts","2x Luncheons","Expo Floor Access","Networking Breaks"], tier:"connect", defaultPrice:599, featured:false },
  influence: { label:"Influence Pass", tagline:"A fuller event experience beyond the conference floor.", description:"Built for decision makers, growth leaders, investors, and professionals who want premium daytime access plus entry to the Gala Dinner and Networking Reception \u2014 creating space for higher-value conversations and stronger business connections.", features:["2x Day Conference Access","2x CxO Breakfasts","2x Luncheons","1x Gala Dinner & Networking Reception","Expo Floor Access","Networking Breaks"], tier:"influence", defaultPrice:799, featured:true },
  power: { label:"Power Pass", tagline:"The ultimate all-access experience.", description:"Built for senior executives, VIP guests, investors, speakers, and leaders who want to experience The Tech Festival Canada at the highest level. With access to every major element of the event, this pass offers the most complete and elevated way to engage with the festival.", features:["2x Day Conference Access","2x CxO Breakfasts","2x Luncheons","1x Gala Dinner & Networking Reception","1x Awards Night","VIP Lounge Access (Both Days)","Expo Floor Access","Networking Breaks"], tier:"power", defaultPrice:999, featured:false },
};

function PassCard({ meta, inventoryItem, onPurchase, dark }) {
  const [hovered, setHovered] = useState(false);
  const price = inventoryItem?.price ?? meta.defaultPrice;
  const remaining = inventoryItem ? Math.max(inventoryItem.total - inventoryItem.sold, 0) : null;
  const soldOut = remaining !== null && remaining <= 0;
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const textLight = dark ? "rgba(255,255,255,0.40)" : "rgba(13,5,32,0.45)";
  const cardBg = dark ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(122,63,209,0.14)";

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position:"relative", flex:"1 1 260px", maxWidth:340, minWidth:240, borderRadius:20, padding:"32px 26px 28px", display:"flex", flexDirection:"column", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", background: meta.featured?(dark?"linear-gradient(135deg, rgba(122,63,209,0.28) 0%, rgba(245,166,35,0.12) 100%)":"linear-gradient(135deg, rgba(122,63,209,0.12) 0%, rgba(245,166,35,0.08) 100%)"):cardBg, border: meta.featured?(dark?"1px solid rgba(122,63,209,0.55)":"1px solid rgba(122,63,209,0.40)"):cardBorder, boxShadow: meta.featured?(dark?"0 8px 48px rgba(122,63,209,0.25)":"0 8px 32px rgba(122,63,209,0.18)"):(dark?"0 4px 32px rgba(0,0,0,0.35)":"0 4px 24px rgba(122,63,209,0.08)"), transform: meta.featured?"scale(1.04)":hovered?"scale(1.02)":"scale(1)", transition:"transform 0.25s ease, box-shadow 0.25s ease", zIndex: meta.featured?2:1 }}>
      {meta.featured && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(90deg, #7a3fd1, #f5a623)", color:"white", fontSize:"0.62rem", fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"5px 16px", borderRadius:999, whiteSpace:"nowrap", fontFamily:"'Orbitron', sans-serif" }}>Most Popular</div>}
      <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.72rem", letterSpacing:"1.5px", textTransform:"uppercase", color: meta.featured?(dark?"#f5a623":"#d98a14"):(dark?"rgba(160,100,255,0.85)":"#7a3fd1"), marginBottom:8 }}>{meta.label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:2 }}><PriceWithAsterisk price={price} color={textMain} fontSize="2.6rem" fontWeight={900} /><span style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.95rem", fontWeight:800, color:textLight, letterSpacing:"1px", textTransform:"uppercase" }}>CAD</span></div>
      <p style={{ fontSize:"0.62rem", fontWeight:600, color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.38)", letterSpacing:"0.3px", marginBottom:4 }}>13% HST included</p>
      <div style={{ width:"100%", height:1, background: dark?"linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 50%,transparent)":"linear-gradient(90deg,transparent,rgba(122,63,209,0.18) 50%,transparent)", margin:"14px 0 16px" }} />
      <p style={{ fontSize:"0.82rem", fontWeight:600, color:textMain, marginBottom:8, lineHeight:1.5, textAlign:"justify" }}>{meta.tagline}</p>
      <p style={{ fontSize:"0.76rem", color:textMuted, lineHeight:1.65, marginBottom:18, textAlign:"justify", hyphens:"auto" }}>{meta.description}</p>
      <div style={{ fontSize:"0.66rem", fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:textLight, marginBottom:10 }}>Includes</div>
      <ul style={{ listStyle:"none", padding:0, margin:"0 0 auto", display:"flex", flexDirection:"column", gap:8 }}>{meta.features.map(f => <li key={f} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:"0.78rem", color:textMuted, lineHeight:1.4 }}><CheckIcon />{f}</li>)}</ul>
      <button disabled={soldOut} onClick={() => !soldOut && onPurchase(meta.tier, meta.label)}
        style={{ marginTop:24, width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor: soldOut?"not-allowed":"pointer", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.68rem", letterSpacing:"1px", textTransform:"uppercase", color: soldOut?(dark?"rgba(255,255,255,0.3)":"rgba(13,5,32,0.3)"):"white", background: soldOut?(dark?"rgba(255,255,255,0.05)":"rgba(13,5,32,0.05)"):meta.featured?"linear-gradient(135deg, #7a3fd1, #f5a623)":(dark?"rgba(122,63,209,0.35)":"#7a3fd1"), boxShadow: soldOut||!meta.featured?"none":"0 4px 20px rgba(122,63,209,0.4)", transition:"all 0.2s" }}
        onMouseEnter={(e) => { if (!soldOut && !meta.featured) e.currentTarget.style.background = dark?"rgba(122,63,209,0.55)":"#6330b3"; }}
        onMouseLeave={(e) => { if (!soldOut && !meta.featured) e.currentTarget.style.background = dark?"rgba(122,63,209,0.35)":"#7a3fd1"; }}>
        {soldOut ? "Sold Out" : "Get Your Pass"}
      </button>
    </div>
  );
}

export default function Tickets() {
  const [inventory, setInventory] = useState([]);
  const [dark, setDark] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("");

  useEffect(() => { setDark(document.body.classList.contains("dark-mode")); const obs = new MutationObserver(() => setDark(document.body.classList.contains("dark-mode"))); obs.observe(document.body, { attributes:true, attributeFilter:["class"] }); return () => obs.disconnect(); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("success") === "true") { setShowSuccessModal(true); window.history.replaceState(null, "", window.location.pathname); } }, []);
  useEffect(() => { const load = async () => { try { const res = await fetch(API+"/admin/inventory/public"); const data = await res.json(); setInventory(Array.isArray(data)?data:[]); } catch(err) { console.error("Inventory fetch failed", err); } }; load(); }, []);

  const getTier = (tier) => inventory.find((i) => i.tier === tier) || null;
  const handleOpenQuestionnaire = (tier, label) => { setPendingTier(tier); setPendingLabel(label); setQuestionnaireOpen(true); };
  const handlePurchase = async (formData) => {
    setQuestionnaireOpen(false);
    try { const token = localStorage.getItem("token"); const res = await fetch(API+"/payments/create-checkout", { method:"POST", headers:{ "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) }, body:JSON.stringify({ tier:pendingTier }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Checkout failed"); window.location.href = data.url; }
    catch(err) { console.error("Purchase error:", err); alert(err.message || "Purchase failed"); }
  };

  const passes = ["connect","influence","power"];
  const passLabels = { connect:"Connect", influence:"Influence", power:"Power" };
  const allFeatures = ["2x Day Conference Access","Expo Floor Access","Networking Breaks","2x CxO Breakfasts","2x Luncheons","1x Gala Dinner & Networking Reception","1x Awards Night","VIP Lounge Access (Both Days)"];
  const passFeatureMap = { connect:[true,true,true,true,true,false,false,false], influence:[true,true,true,true,true,true,false,false], power:[true,true,true,true,true,true,true,true] };
  const bg = dark ? "#06020f" : "#ffffff";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.68)";

  return (
    <><Navbar />
      <div style={{ minHeight:"100vh", background:bg, color:textMain, position:"relative", transition:"background 0.3s ease" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background: dark?"radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.06) 0%, transparent 70%)":"radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.05) 0%, transparent 70%)" }} />
        <div style={{ position:"relative", zIndex:1, paddingBottom:"1px" }}>
          <div style={{ textAlign:"center", padding:"100px 24px 60px", maxWidth:780, margin:"0 auto" }}>
            <h1 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"clamp(2rem, 5vw, 3.2rem)", letterSpacing:"-1px", lineHeight:1.15, marginBottom:20, color:textMain }}>Choose Your Pass</h1>
            <p style={{ fontSize:"1rem", color:textMuted, lineHeight:1.75, textAlign:"justify", hyphens:"auto" }}>Whether you are coming to learn, connect, explore partnerships, or experience the event at the highest level, The Tech Festival Canada offers a pass designed for every kind of delegate.</p>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:20, justifyContent:"center", alignItems:"stretch", padding:"0 24px 80px", maxWidth:1260, margin:"0 auto" }}>
            {passes.map(key => <PassCard key={key} meta={PASS_META[key]} inventoryItem={getTier(key)} onPurchase={handleOpenQuestionnaire} dark={dark} />)}
          </div>
          <div style={{ maxWidth:900, margin:"0 auto 80px", padding:"0 24px" }}>
            <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"1rem", letterSpacing:"1px", textTransform:"uppercase", color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.40)", textAlign:"center", marginBottom:28 }}>Pass Comparison</h2>
            <div style={{ backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", background: dark?"rgba(255,255,255,0.04)":"rgba(122,63,209,0.03)", border: dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(122,63,209,0.10)", borderRadius:20, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ minWidth:500 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1.5fr repeat(3, 1fr)", borderBottom: dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(122,63,209,0.10)", padding:"14px 24px" }}>
                  <div style={{ fontSize:"0.7rem", color:textMuted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", display:"flex", alignItems:"center" }}>Feature</div>
                  {passes.map(p => <div key={p} style={{ display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.62rem", letterSpacing:"0.8px", textTransform:"uppercase", color: p==="influence"?(dark?"#f5a623":"#d98a14"):textMuted }}>{passLabels[p]}</div>)}
                </div>
                {allFeatures.map((feature, fi) => (
                  <div key={feature} style={{ display:"grid", gridTemplateColumns:"1.5fr repeat(3, 1fr)", padding:"13px 24px", borderBottom: fi<allFeatures.length-1?(dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(122,63,209,0.05)"):"none", background: fi%2===0?(dark?"rgba(255,255,255,0.01)":"rgba(122,63,209,0.02)"):"transparent" }}>
                    <div style={{ fontSize:"0.78rem", color: dark?"rgba(255,255,255,0.65)":"rgba(13,5,32,0.80)", display:"flex", alignItems:"center" }}>{feature}</div>
                    {passes.map(p => <div key={p} style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>{passFeatureMap[p][fi] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark?"#f5a623":"#d98a14"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : <span style={{ color: dark?"rgba(255,255,255,0.15)":"rgba(13,5,32,0.15)", fontSize:"1rem", lineHeight:1 }}>&mdash;</span>}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ maxWidth:760, margin:"0 auto 120px", padding:"0 24px", textAlign:"center" }}>
            <div style={{ backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", background: dark?"linear-gradient(135deg, rgba(122,63,209,0.12) 0%, rgba(245,166,35,0.06) 100%)":"linear-gradient(135deg, rgba(122,63,209,0.07) 0%, rgba(245,166,35,0.04) 100%)", border: dark?"1px solid rgba(122,63,209,0.25)":"1px solid rgba(122,63,209,0.14)", borderRadius:24, padding:"48px 40px" }}>
              <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1.5px", textTransform:"uppercase", color: dark?"#f5a623":"#d98a14", marginBottom:14 }}>Why Upgrade Your Pass</div>
              <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"clamp(1.3rem, 3vw, 1.9rem)", letterSpacing:"-0.5px", color:textMain, marginBottom:20, lineHeight:1.2 }}>Every Level Unlocks<br /><span style={{ color: dark?"#f5a623":"#d98a14" }}>More Opportunity</span></h2>
              <p style={{ fontSize:"0.88rem", color:textMuted, lineHeight:1.8, textAlign:"justify", hyphens:"auto" }}>Each pass level is designed to unlock a deeper layer of value. As you move up, the experience becomes more curated, more exclusive, and more relationship driven.</p>
            </div>
          </div>
          <Footer />
        </div>
        {questionnaireOpen && <QuestionnaireModal dark={dark} tierLabel={pendingLabel} onClose={() => setQuestionnaireOpen(false)} onSubmit={handlePurchase} />}
        {showSuccessModal && (
          <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", zIndex:100001, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"24px", width:"100%", maxWidth:"420px", background: dark?"#120a22":"#ffffff", padding:"40px 32px", borderRadius:"24px", border: dark?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(122,63,209,0.1)" }}>
              <div style={{ textAlign:"center", color:textMain }}>
                <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"2rem", margin:"0 0 12px 0", color:"#f5a623" }}>Thank You!</h2>
                <p style={{ opacity:0.8, margin:0, fontSize:"1.1rem", lineHeight:1.6 }}>Thank you for purchasing your ticket.</p>
                <p style={{ opacity:0.6, marginTop:"8px", fontSize:"0.95rem" }}>Please check your email for the invoice and QR code.</p>
              </div>
              <button onClick={() => { setShowSuccessModal(false); window.location.href = "/"; }}
                style={{ background:"linear-gradient(135deg, #7a3fd1, #f5a623)", border:"none", color:"white", padding:"16px 32px", borderRadius:"12px", cursor:"pointer", fontFamily:"'Orbitron', sans-serif", textTransform:"uppercase", fontSize:"0.85rem", letterSpacing:"1px", fontWeight:700, width:"100%" }}>Go to Home</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
