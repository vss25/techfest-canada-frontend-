import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API } from "../utils/api";

/* ============================================================
   ICONS & HELPERS (shared, no emoji)
   ============================================================ */
function ChevronDown({ color, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.2s ease" }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TickSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function formatPrice(n) {
  const num = Number(n);
  return num.toLocaleString("en-CA", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/* ============================================================
   STATIC DATA
   ============================================================ */
const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const PRIORITY_COUNTRIES = ["Canada", "United States", "United Kingdom", "Australia"];
const COUNTRY_FLAGS = { Canada: "\u{1F1E8}\u{1F1E6}", "United States": "\u{1F1FA}\u{1F1F8}", "United Kingdom": "\u{1F1EC}\u{1F1E7}", Australia: "\u{1F1E6}\u{1F1FA}" };

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "H.E.", "Hon.", "Prof."];
const JOB_LEVELS = ["Student","Entry Level","Mid Level Professional","Manager","Senior Manager","Director","Vice President","C-Level / Executive","Founder / Owner / Partner","Government / Public Sector","Investor","Academic / Research","Other"];
const JOB_FUNCTIONS = ["Compliance & Risk Management","Consulting & Advisory","Cybersecurity","Data, Analytics & Insights","Environmental, Social & Corporate Governance (ESG)","Executive Leadership & Board of Directors","Finance & Accounting","HR & Recruiting","Investing","Legal","Marketing & Communications","Operations & Project Management","Partnerships","Policy","Procurement & Vendor Management","Product","Research, Content & Journalism","Sales, BD & Account Management","Strategy, Innovation, R&D","Technology & IT","Not Applicable"];
const TOPICS = ["Artificial Intelligence","Quantum Computing","Cybersecurity","Robotics & Automation","Sustainability & CleanTech","Healthcare & Lifesciences","Banking, Financial Services & Insurance","Supply Chain, Manufacturing & Infrastructure","Defence & Public Safety","Energy & Utilities"];
const OBJECTIVES = ["Education","Investments","Jobs","Market Entry","Networking","Partnerships","Regulatory and Policy Dialogue","Solutions","Talent","Trends and Insights"];

const EMPTY_FORM = { salutation:"",firstName:"",lastName:"",jobTitle:"",organisation:"",businessNumber:"",email:"",country:"",linkedin:"",jobLevel:"",jobLevelOther:"",jobFunction:"",topics:[],objectives:[],consent1:false,consent2:false };

const TIER_LABELS = { connect: "Connect", influence: "Influence", power: "Power" };
const TIER_DEFAULT_PRICE = { connect: 599, influence: 799, power: 999 };

/* ============================================================
   CUSTOM DROPDOWN (reused from tickets page)
   ============================================================ */
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

/* ============================================================
   ERROR BOUNDARY — catches any error in CheckoutInner and shows a friendly fallback
   ============================================================ */
import React from "react";
class CheckoutErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[Checkout] crashed:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <Navbar />
          <div style={{ minHeight:"60vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center" }}>
            <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"1.5rem", marginBottom:14 }}>Something went wrong</h2>
            <p style={{ opacity:0.7, marginBottom:24, maxWidth:520, lineHeight:1.6 }}>
              The checkout page hit a snag. Please head back to the tickets page and try again.
              {this.state.error?.message ? <><br /><br /><code style={{ fontSize:"0.75rem", opacity:0.6 }}>{this.state.error.message}</code></> : null}
            </p>
            <a href="/tickets" style={{ display:"inline-block", padding:"14px 28px", borderRadius:12, background:"linear-gradient(135deg, #7a3fd1, #f5a623)", color:"#fff", textDecoration:"none", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.72rem", letterSpacing:"1.5px", textTransform:"uppercase" }}>Back to Tickets</a>
          </div>
          <Footer />
        </>
      );
    }
    return this.props.children;
  }
}

/* ============================================================
   FULL-PAGE CHECKOUT (wrapped in error boundary)
   ============================================================ */
export default function Checkout() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutInner />
    </CheckoutErrorBoundary>
  );
}

function CheckoutInner() {
  const navigate = useNavigate();
  // Use native URLSearchParams to read tier — avoids any router-context issues
  const tier = (typeof window !== "undefined")
    ? (new URLSearchParams(window.location.search).get("tier") || "connect")
    : "connect";
  const tierLabel = TIER_LABELS[tier] || "Connect";

  const [dark, setDark] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);
  const TOTAL_STEPS = 2;

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoStatus, setPromoStatus] = useState(null);
  const [promoError, setPromoError] = useState("");

  useEffect(() => { setDark(document.body.classList.contains("dark-mode")); const obs = new MutationObserver(() => setDark(document.body.classList.contains("dark-mode"))); obs.observe(document.body, { attributes:true, attributeFilter:["class"] }); return () => obs.disconnect(); }, []);

  // Validate tier param
  useEffect(() => {
    if (!TIER_LABELS[tier]) { navigate("/tickets", { replace: true }); }
  }, [tier, navigate]);

  // Fetch live inventory price
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API + "/admin/inventory/public");
        const data = await res.json();
        const item = Array.isArray(data) ? data.find(i => i.tier === tier) : null;
        setInventory(item || null);
      } catch (err) {
        console.error("Inventory fetch failed", err);
      } finally {
        setInventoryLoaded(true);
      }
    };
    load();
  }, [tier]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => { if (firstInputRef.current) firstInputRef.current.focus({ preventScroll: true }); }, 350);
  }, [step]);

  const basePrice = inventory?.price ?? TIER_DEFAULT_PRICE[tier];
  const finalPrice = promoDiscount > 0 ? basePrice * (1 - promoDiscount / 100) : basePrice;

  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const textDim = dark ? "rgba(255,255,255,0.40)" : "rgba(13,5,32,0.45)";
  const bg = dark ? "#06020f" : "#ffffff";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const inputBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.20)";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(122,63,209,0.10)";

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };
  const setJobLevel = (val) => { setForm(f => ({ ...f, jobLevel: val, jobLevelOther: val === "Other" ? f.jobLevelOther : "" })); setErrors(e => ({ ...e, jobLevel: undefined, jobLevelOther: undefined })); };

  const inputStyle = (err) => ({ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid "+(err?"#e05555":inputBorder), background:inputBg, color:textMain, fontFamily:"inherit", fontSize:"16px", outline:"none", boxSizing:"border-box", transition:"border 0.2s, box-shadow 0.2s", WebkitAppearance:"none", appearance:"none" });
  const labelStyle = { fontSize:"0.65rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:textMuted, display:"block", marginBottom:6 };
  const fieldStyle = { display:"flex", flexDirection:"column", gap:0 };
  const errStyle = { fontSize:"0.62rem", color:"#e05555", marginTop:4 };

  const handlePhoneChange = (val) => { set("businessNumber", val.replace(/[^\d\s\-\+\(\)]/g, "").slice(0, 15)); };
  const handleLinkedInBlur = () => { const v = form.linkedin.trim(); if (v && !v.startsWith("http") && !v.startsWith("linkedin")) set("linkedin", "https://linkedin.com/in/"+v); else if (v && v.startsWith("linkedin.com")) set("linkedin", "https://"+v); };

  const applyPromo = useCallback(async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoStatus("loading");
    setPromoError("");
    try {
      const res = await fetch(API+"/promos/validate", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoCode(data.code || code);
        setPromoDiscount(Number(data.discount) || 0);
        setPromoStatus(null);
        setPromoError("");
      } else {
        setPromoStatus("error");
        setPromoError(data.error || "That code isn't valid. Check it and try again.");
      }
    } catch (err) {
      console.error("Promo validation failed", err);
      setPromoStatus("error");
      setPromoError("Couldn't check that code right now. Please try again.");
    }
  }, [promoInput]);

  const removePromo = () => { setPromoCode(""); setPromoDiscount(0); setPromoInput(""); setPromoStatus(null); setPromoError(""); };

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
  const back = () => { if (step > 1) setStep(s => s - 1); else navigate("/tickets"); };

  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API+"/payments/create-checkout", {
        method:"POST",
        headers:{ "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) },
        body:JSON.stringify({ tier, promoCode: promoCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch(err) {
      console.error("Purchase error:", err);
      alert(err.message || "Purchase failed");
      setSubmitting(false);
    }
  };

  const stepTitles = ["Your Profile", "Interests & Confirmation"];
  const stepSubtitles = ["Tell us a bit about you and your organisation", "Topics, promo code, and final review"];

  return (
    <>
      <Navbar />
      <style>{`@keyframes ttfcShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ minHeight: "100vh", background: bg, color: textMain, position: "relative" }}>
        {/* Ambient background */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
          background: dark
            ? "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.05) 0%, transparent 70%)" }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"clamp(80px, 12vw, 120px) clamp(20px, 5vw, 48px) 80px" }}>

          {/* Page header */}
          <div style={{ marginBottom:36 }}>
            <button onClick={back}
              style={{ display:"inline-flex", alignItems:"center", gap:6, background:"none", border:"none", color:textMuted, cursor:"pointer", fontFamily:"'Orbitron', sans-serif", fontSize:"0.62rem", fontWeight:700, letterSpacing:"1.4px", textTransform:"uppercase", padding:"0 0 18px 0" }}
              onMouseEnter={(e) => e.currentTarget.style.color = textMain}
              onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              {step > 1 ? "Back" : "Back to passes"}
            </button>

            <div style={{ display:"flex", alignItems:"baseline", gap:14, flexWrap:"wrap", marginBottom:8 }}>
              <h1 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"clamp(1.6rem, 3.5vw, 2.4rem)", letterSpacing:"-0.5px", margin:0, color:textMain }}>
                Attendee Information
              </h1>
              <span style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.6rem", fontWeight:800, letterSpacing:"2px", textTransform:"uppercase", color:"#f5a623", padding:"5px 12px", borderRadius:999, background:"rgba(245,166,35,0.12)", border:"1px solid rgba(245,166,35,0.30)" }}>{tierLabel} Pass</span>
            </div>
            <p style={{ fontSize:"0.95rem", color:textMuted, margin:0, lineHeight:1.6 }}>{stepSubtitles[step-1]}</p>

            {/* Step progress */}
            <div style={{ marginTop:24, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:"0.62rem", color:textDim, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Step {step} of {TOTAL_STEPS}</span>
              <div style={{ flex:1, display:"flex", gap:6, maxWidth:240 }}>
                {[1,2].map(s => <div key={s} style={{ flex:1, height:3, borderRadius:999, background: s<=step?"linear-gradient(90deg, #7a3fd1, #f5a623)":(dark?"rgba(255,255,255,0.10)":"rgba(122,63,209,0.12)"), transition:"background 0.3s" }} />)}
              </div>
            </div>
          </div>

          {/* Two-column layout: form on left, order summary on right */}
          <div className="checkout-grid" style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) 340px", gap:32, alignItems:"start" }}>
            <style>{`
              @media (max-width: 880px) {
                .checkout-grid { grid-template-columns: 1fr !important; }
                .checkout-summary { position: static !important; order: -1; margin-bottom: 20px; }
              }
            `}</style>

            {/* ====================== LEFT: FORM CARD ====================== */}
            <div style={{ background:cardBg, border:cardBorder, borderRadius:20, padding:"clamp(24px, 3.5vw, 40px)", backdropFilter:"blur(12px)" }}>
              <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"1rem", color:textMain, margin:"0 0 24px", letterSpacing:"-0.3px" }}>{stepTitles[step-1]}</h2>

              {step === 1 && (
                <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Salutation</label>
                    <CustomDropdown options={SALUTATIONS} value={form.salutation} onChange={v => set("salutation",v)} placeholder="Select\u2026" dark={dark} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>First Name *</label>
                      <input ref={firstInputRef} value={form.firstName} onChange={e => set("firstName",e.target.value)} placeholder="Jane" autoComplete="given-name" style={inputStyle(errors.firstName)} />
                      {errors.firstName && <span style={errStyle}>{errors.firstName}</span>}
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Last Name *</label>
                      <input value={form.lastName} onChange={e => set("lastName",e.target.value)} placeholder="Smith" autoComplete="family-name" style={inputStyle(errors.lastName)} />
                      {errors.lastName && <span style={errStyle}>{errors.lastName}</span>}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Job Title</label>
                    <input value={form.jobTitle} onChange={e => set("jobTitle",e.target.value)} placeholder="e.g. Chief Technology Officer" autoComplete="organization-title" style={inputStyle(false)} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Organisation Name *</label>
                    <input value={form.organisation} onChange={e => set("organisation",e.target.value)} placeholder="e.g. Acme Corp" autoComplete="organization" style={inputStyle(errors.organisation)} />
                    {errors.organisation && <span style={errStyle}>{errors.organisation}</span>}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Business Phone</label>
                    <input type="tel" inputMode="tel" value={form.businessNumber} onChange={e => handlePhoneChange(e.target.value)} placeholder="+1 (416) 000-0000" autoComplete="tel" maxLength={15} style={inputStyle(false)} />
                    <span style={{ fontSize:"0.60rem", color:textDim, marginTop:4 }}>Include country code (e.g. +1 for Canada/US)</span>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Work Email *</label>
                    <input type="email" inputMode="email" value={form.email} onChange={e => set("email",e.target.value)} placeholder="jane@company.com" autoComplete="email" style={inputStyle(errors.email)} />
                    {errors.email && <span style={errStyle}>{errors.email}</span>}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Country *</label>
                    <CustomDropdown options={COUNTRIES.filter(c => !PRIORITY_COUNTRIES.includes(c))} priorityOptions={PRIORITY_COUNTRIES} flagMap={COUNTRY_FLAGS} value={form.country} onChange={v => set("country",v)} placeholder="Select your country\u2026" searchable dark={dark} error={!!errors.country} maxHeight={200} />
                    {errors.country && <span style={errStyle}>{errors.country}</span>}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>LinkedIn Profile <span style={{ fontWeight:500, letterSpacing:0, textTransform:"none", color:textDim }}>(optional)</span></label>
                    <input type="url" inputMode="url" value={form.linkedin} onChange={e => set("linkedin",e.target.value)} onBlur={handleLinkedInBlur} placeholder="linkedin.com/in/yourname" autoComplete="url" style={inputStyle(false)} />
                  </div>

                  <div style={{ width:"100%", height:1, background: dark?"rgba(255,255,255,0.07)":"rgba(122,63,209,0.10)", margin:"8px 0 4px" }} />
                  <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.60rem", letterSpacing:"1.5px", textTransform:"uppercase", color: dark?"#c8a8ff":"#7a3fd1" }}>Professional Profile</div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Job Level *</label>
                    <CustomDropdown options={JOB_LEVELS} value={form.jobLevel} onChange={setJobLevel} placeholder="Select your level\u2026" dark={dark} error={!!errors.jobLevel} maxHeight={220} />
                    {errors.jobLevel && <span style={errStyle}>{errors.jobLevel}</span>}
                    {form.jobLevel === "Other" && (
                      <div style={{ marginTop:10 }}>
                        <input value={form.jobLevelOther} onChange={e => set("jobLevelOther",e.target.value)} placeholder="Please describe your role\u2026" style={inputStyle(!!errors.jobLevelOther)} autoFocus />
                        {errors.jobLevelOther && <span style={errStyle}>{errors.jobLevelOther}</span>}
                      </div>
                    )}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Job Function *</label>
                    <CustomDropdown options={JOB_FUNCTIONS} value={form.jobFunction} onChange={v => set("jobFunction",v)} placeholder="Select your function\u2026" dark={dark} error={!!errors.jobFunction} maxHeight={220} />
                    {errors.jobFunction && <span style={errStyle}>{errors.jobFunction}</span>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Topics of Interest * <span style={{ color:textMuted, fontWeight:500, letterSpacing:0, textTransform:"none" }}>({form.topics.length} selected)</span></label>
                    <CustomDropdown options={TOPICS} value={form.topics} onChange={v => set("topics",v)} placeholder="Select all that apply\u2026" multi dark={dark} error={!!errors.topics} maxHeight={240} />
                    {errors.topics && <span style={errStyle}>{errors.topics}</span>}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Objectives for attending * <span style={{ color:textMuted, fontWeight:500, letterSpacing:0, textTransform:"none" }}>({form.objectives.length} selected)</span></label>
                    <CustomDropdown options={OBJECTIVES} value={form.objectives} onChange={v => set("objectives",v)} placeholder="Select all that apply\u2026" multi dark={dark} error={!!errors.objectives} maxHeight={240} />
                    {errors.objectives && <span style={errStyle}>{errors.objectives}</span>}
                  </div>

                  {/* Promo code */}
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Promo Code <span style={{ fontWeight:500, letterSpacing:0, textTransform:"none", color:textDim }}>(optional)</span></label>
                    {promoCode ? (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"12px 14px", borderRadius:10, border:"1px solid "+(dark?"rgba(122,63,209,0.45)":"rgba(122,63,209,0.32)"), background: dark?"rgba(122,63,209,0.12)":"rgba(122,63,209,0.06)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                          <div style={{ width:26, height:26, borderRadius:999, flexShrink:0, background:"linear-gradient(135deg, #7a3fd1, #f5a623)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.78rem", letterSpacing:"0.5px", color:textMain, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{promoCode}</div>
                            <div style={{ fontSize:"0.66rem", color:textMuted, marginTop:1 }}>{promoDiscount}% off applied</div>
                          </div>
                        </div>
                        <button onClick={removePromo} style={{ background:"none", border:"1px solid "+(dark?"rgba(255,255,255,0.18)":"rgba(122,63,209,0.24)"), color:textMuted, borderRadius:8, padding:"6px 12px", fontFamily:"'Orbitron', sans-serif", fontWeight:700, fontSize:"0.55rem", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", flexShrink:0 }}>Remove</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display:"flex", gap:8 }}>
                          <input
                            value={promoInput}
                            onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); if (promoStatus === "error") { setPromoStatus(null); setPromoError(""); } }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                            placeholder="Enter code"
                            autoCapitalize="characters"
                            spellCheck={false}
                            style={{ flex:1, padding:"11px 14px", borderRadius:10, border:"1px solid "+(promoStatus==="error"?"#e05555":inputBorder), background:inputBg, color:textMain, fontFamily:"'Orbitron', sans-serif", fontWeight:700, fontSize:"15px", letterSpacing:"1.5px", textTransform:"uppercase", outline:"none", boxSizing:"border-box" }}
                          />
                          <button type="button" onClick={applyPromo} disabled={promoStatus === "loading" || !promoInput.trim()}
                            style={{ flexShrink:0, padding:"11px 20px", borderRadius:10, border:"none", cursor: (promoStatus==="loading" || !promoInput.trim())?"not-allowed":"pointer", opacity:(promoStatus==="loading" || !promoInput.trim())?0.55:1, background:"linear-gradient(135deg, #7a3fd1, #f5a623)", color:"white", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.62rem", letterSpacing:"1px", textTransform:"uppercase" }}>
                            {promoStatus === "loading" ? "\u2026" : "Apply"}
                          </button>
                        </div>
                        {promoStatus === "error" && <span style={{ ...errStyle, marginTop:6 }}>{promoError}</span>}
                      </>
                    )}
                  </div>

                  {/* Consent */}
                  <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"22px", background: dark?"rgba(122,63,209,0.08)":"rgba(122,63,209,0.04)", borderRadius:14, border: dark?"1px solid rgba(122,63,209,0.20)":"1px solid rgba(122,63,209,0.12)" }}>
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

              {/* ===== Action buttons (form footer) ===== */}
              <div style={{ marginTop:32, paddingTop:24, borderTop: dark?"1px solid rgba(255,255,255,0.06)":"1px solid rgba(122,63,209,0.08)", display:"flex", gap:12 }}>
                <button onClick={back}
                  style={{ flex:"0 0 auto", padding:"14px 28px", borderRadius:12, border: dark?"1px solid rgba(255,255,255,0.14)":"1px solid rgba(122,63,209,0.20)", background:"transparent", color:textMain, fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>
                  &larr; {step > 1 ? "Back" : "Cancel"}
                </button>
                <button onClick={step < TOTAL_STEPS ? next : submit} disabled={submitting}
                  style={{ flex:1, padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg, #7a3fd1, #f5a623)", color:"white", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1px", textTransform:"uppercase", cursor: submitting?"not-allowed":"pointer", opacity: submitting?0.7:1, boxShadow:"0 4px 20px rgba(122,63,209,0.35)" }}>
                  {submitting ? "Redirecting to payment\u2026" : (step < TOTAL_STEPS ? "Continue \u2192" : "Proceed to Payment \u2192")}
                </button>
              </div>
            </div>

            {/* ====================== RIGHT: ORDER SUMMARY ====================== */}
            <div className="checkout-summary" style={{ position:"sticky", top:100 }}>
              <div style={{ background:cardBg, border:cardBorder, borderRadius:20, padding:"26px 24px", backdropFilter:"blur(12px)" }}>
                <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.6rem", letterSpacing:"2px", textTransform:"uppercase", color:textDim, marginBottom:14 }}>Order Summary</div>

                <div style={{ paddingBottom:16, borderBottom: dark?"1px solid rgba(255,255,255,0.06)":"1px solid rgba(122,63,209,0.08)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.85rem", color:textMain, letterSpacing:"-0.2px" }}>{tierLabel} Pass</div>
                      <div style={{ fontSize:"0.7rem", color:textMuted, marginTop:2 }}>1 attendee</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      {inventoryLoaded ? (
                        <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.95rem", color:textMain, textDecoration: promoDiscount > 0 ? "line-through" : "none", textDecorationColor:"#e05555", opacity: promoDiscount > 0 ? 0.55 : 1 }}>
                          ${basePrice.toLocaleString()}
                        </div>
                      ) : (
                        <div style={{ width:80, height:20, borderRadius:6, background: dark?"linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))":"linear-gradient(90deg, rgba(122,63,209,0.05), rgba(122,63,209,0.12), rgba(122,63,209,0.05))", backgroundSize:"200% 100%", animation:"ttfcShimmer 1.4s ease-in-out infinite" }} />
                      )}
                    </div>
                  </div>
                </div>

                {promoDiscount > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom: dark?"1px solid rgba(255,255,255,0.06)":"1px solid rgba(122,63,209,0.08)" }}>
                    <span style={{ fontSize:"0.76rem", color: dark?"#c8a8ff":"#7a3fd1", fontWeight:700 }}>{promoCode} ({promoDiscount}%)</span>
                    <span style={{ fontSize:"0.85rem", fontWeight:800, color: dark?"#c8a8ff":"#7a3fd1", fontFamily:"'Orbitron', sans-serif" }}>&minus;${(basePrice - finalPrice).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"18px 0 6px" }}>
                  <span style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.7rem", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase", color:textMain }}>Total</span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"1.5rem", fontWeight:900, color: promoDiscount > 0 ? (dark?"#f5a623":"#d98a14") : textMain, letterSpacing:"-0.8px", lineHeight:1 }}>
                      ${formatPrice(finalPrice)}
                    </div>
                    <div style={{ fontSize:"0.62rem", color:textDim, marginTop:4, fontWeight:600, letterSpacing:"0.5px" }}>CAD &middot; 13% HST incl.</div>
                  </div>
                </div>

                <p style={{ fontSize:"0.65rem", color:textDim, lineHeight:1.5, margin:"14px 0 0" }}>
                  Pricing is indicative. The exact total (with HST) is shown on the Stripe checkout page before you pay.
                </p>
              </div>

              <div style={{ marginTop:14, padding:"14px 16px", background: dark?"rgba(255,255,255,0.02)":"rgba(122,63,209,0.02)", border: dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(122,63,209,0.08)", borderRadius:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, color:textMuted }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span style={{ fontSize:"0.7rem", fontWeight:600 }}>Secure checkout by Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
