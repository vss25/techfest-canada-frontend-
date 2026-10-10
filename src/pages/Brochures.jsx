import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer";

const INDUSTRIES = [
  "Artificial Intelligence","Quantum Computing","Cybersecurity & Digital Trust",
  "Healthcare & Life Sciences","Energy & Utilities","Defence & National Security",
  "Financial Services & Insurance","Supply Chain & Manufacturing",
  "Sustainability & CleanTech","Robotics & Automation","Telecom & 5G",
  "Government & Public Sector","Academia & Research","Venture Capital & Investing",
  "Media & Communications","Other",
];

export default function Brochures() {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState({ firstName:"",lastName:"",company:"",jobTitle:"",industry:"",email:"",phone:"" });
  var form = s2[0]; var setForm = s2[1];
  var s3 = useState({}); var errors = s3[0]; var setErrors = s3[1];
  var s4 = useState(false); var submitted = s4[0]; var setSubmitted = s4[1];
  var s5 = useState(false); var brochureOpen = s5[0]; var setBrochureOpen = s5[1];
  var s6 = useState(false); var btnPulsing = s6[0]; var setBtnPulsing = s6[1];
  var brochureRef = useRef(null);
  var honeypot = useRef("");
  var openedAt = useRef(Date.now()); // bots fill the form in well under a second

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes:true, attributeFilter:["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var bg        = dark ? "#06020f" : "#ffffff";
  var textMain  = dark ? "#ffffff" : "#0d0520";
  var textMid   = dark ? "rgba(200,185,255,0.70)" : "rgba(13,5,32,0.60)";
  var cardBg    = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.03)";
  var cardBdr   = dark ? "rgba(155,135,245,0.15)" : "rgba(122,63,209,0.15)";
  var inputBg   = dark ? "rgba(255,255,255,0.05)" : "rgba(122,63,209,0.04)";
  var inputBdr  = dark ? "rgba(155,135,245,0.20)" : "rgba(122,63,209,0.18)";
  var inputFocus= dark ? "rgba(155,135,245,0.50)" : "rgba(122,63,209,0.45)";

  function validate() {
    var e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim())  e.lastName  = "Required";
    if (!form.email.trim())     e.email     = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field, value) {
    setForm(function (prev) { return { ...prev, [field]: value }; });
    if (errors[field]) setErrors(function (prev) { var n={...prev}; delete n[field]; return n; });
  }

  // Unlock straight away. Saving the details and emailing the brochure happen in
  // the background, so a slow or failed request never blocks the download.
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitted(true);
    setBtnPulsing(true);
    setTimeout(function () { setBtnPulsing(false); }, 3000);

    fetch("https://techfest-canada-backend.onrender.com/api/brochure/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        ...form,
        brochure: "sponsorship",
        page: window.location.pathname,
        referrer: document.referrer,
        _hp: honeypot.current, // bots fill this; humans never see it
        elapsedMs: Date.now() - openedAt.current,
      }),
    }).catch(function (err) { console.error(err); });
  }

  function openBrochure() {
    setBrochureOpen(true);
    setTimeout(function () {
      if (brochureRef.current) brochureRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
    }, 400);
  }

  var fields = [
    { key:"firstName", label:"First Name",    required:true,  placeholder:"Alex", maxLength:80 },
    { key:"lastName",  label:"Last Name",     required:true,  placeholder:"Chen", maxLength:80 },
    { key:"company",   label:"Company Name",  required:false, placeholder:"Acme Corp", maxLength:160 },
    { key:"jobTitle",  label:"Job Title",     required:false, placeholder:"CTO", maxLength:120 },
    { key:"email",     label:"Email Address", required:true,  placeholder:"alex@company.com", type:"email", maxLength:254 },
    { key:"phone",     label:"Phone Number",  required:false, placeholder:"+1 (416) 000-0000", type:"tel", maxLength:40 },
  ];

  return (
    <div style={{ minHeight:"100vh", background:bg, color:textMain, display:"flex", flexDirection:"column", transition:"background 0.3s ease, color 0.3s ease" }}>
      <Navbar />

      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .brochure-input {
          width:100%; box-sizing:border-box; padding:13px 16px; border-radius:12px;
          font-family:'Orbitron',sans-serif; font-size:0.72rem; font-weight:600;
          letter-spacing:0.5px; outline:none;
          transition:border-color 0.2s ease,background 0.2s ease,box-shadow 0.2s ease;
        }
        .brochure-input:focus { box-shadow:0 0 0 2px ${inputFocus}; }
        .brochure-select {
          appearance:none; -webkit-appearance:none; cursor:pointer;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B87F5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 14px center; padding-right:36px !important;
        }
        .pdf-container::-webkit-scrollbar { width:6px; }
        .pdf-container::-webkit-scrollbar-track { background:rgba(0,0,0,0.2); border-radius:3px; }
        .pdf-container::-webkit-scrollbar-thumb { background:rgba(122,63,209,0.5); border-radius:3px; }
        @media (max-width:640px) { .form-grid { grid-template-columns:1fr !important; } }
      `}</style>

      <main style={{ flex:1, padding:"5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>

          {/* ── HERO HEADING ── */}
          <motion.div
            initial={{ opacity:0, y:30 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7 }}
            style={{ textAlign:"center", marginBottom:"3.5rem" }}
          >
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(122,63,209,0.10)", border:"1px solid rgba(122,63,209,0.25)", borderRadius:999, padding:"5px 18px", marginBottom:20, fontSize:"0.65rem", fontFamily:"'Orbitron',sans-serif", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"#b99eff" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#f5a623", boxShadow:"0 0 6px #f5a623", display:"inline-block" }} />
              TFC 2026 · TORONTO
            </div>
            <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:"1rem", color:textMain }}>
              DOWNLOAD THE{" "}
              <span style={{ background:"linear-gradient(90deg,#7a3fd1,#f5a623)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                BROCHURE
              </span>
            </h1>
            <p style={{ color:textMid, fontSize:"1rem", maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>
              Get the full sponsorship prospectus, delegate categories, and partnership opportunities for Canada's premier tech deal-making event.
            </p>
          </motion.div>

          {/* ── FORM CARD ── */}
          <motion.div
            initial={{ opacity:0, y:40 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7, delay:0.15 }}
            style={{ background:cardBg, border:"1px solid "+cardBdr, borderRadius:28, padding:"clamp(1.5rem,5vw,3rem)", position:"relative", overflow:"hidden" }}
          >
            <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:400, height:120, background:"radial-gradient(ellipse, rgba(122,63,209,0.18) 0%, transparent 70%)", pointerEvents:"none" }} />

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"2rem" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:submitted?"linear-gradient(135deg,#7a3fd1,#f5a623)":"rgba(122,63,209,0.12)", border:"1px solid rgba(122,63,209,0.30)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.5s ease", flexShrink:0 }}>
                {submitted
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b99eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                }
              </div>
              <div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"0.7rem", fontWeight:800, letterSpacing:"1px", textTransform:"uppercase", color:submitted?"#f5a623":"#b99eff", marginBottom:2 }}>
                  {submitted ? "Access Granted" : "Request Access"}
                </div>
                <div style={{ fontSize:"0.78rem", color:textMid }}>{submitted?"Your brochure is ready to view below. We\u2019re also emailing you a copy.":"Fill in your details to unlock the full brochure"}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* honeypot — hidden from humans, catches bots */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                onChange={function(e){ honeypot.current = e.target.value; }}
                style={{ position:"absolute", left:"-9999px", width:1, height:1, opacity:0 }}
              />
              <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem 1.5rem", marginBottom:"1rem" }}>
                {fields.slice(0,4).map(function(f){
                  return (
                    <div key={f.key}>
                      <label style={{ display:"block", fontFamily:"'Orbitron',sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:errors[f.key]?"#ff6b6b":textMid, marginBottom:7 }}>
                        {f.label}{f.required&&<span style={{ color:"#f5a623", marginLeft:3 }}>*</span>}
                      </label>
                      <input className="brochure-input" type={f.type||"text"} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLength}
                        onChange={function(e){handleChange(f.key,e.target.value);}} disabled={submitted}
                        style={{ background:submitted?(dark?"rgba(255,255,255,0.03)":"rgba(122,63,209,0.02)"):inputBg, border:"1px solid "+(errors[f.key]?"#ff6b6b":inputBdr), color:textMain, opacity:submitted?0.6:1, cursor:submitted?"not-allowed":"text" }}
                      />
                      {errors[f.key]&&<div style={{ fontSize:"0.65rem", color:"#ff6b6b", marginTop:4, fontFamily:"'Orbitron',sans-serif", letterSpacing:"0.5px" }}>{errors[f.key]}</div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginBottom:"1rem" }}>
                <label style={{ display:"block", fontFamily:"'Orbitron',sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:textMid, marginBottom:7 }}>Industry</label>
                <select className="brochure-input brochure-select" value={form.industry}
                  onChange={function(e){handleChange("industry",e.target.value);}} disabled={submitted}
                  style={{ background:submitted?(dark?"rgba(255,255,255,0.03)":"rgba(122,63,209,0.02)"):inputBg, border:"1px solid "+inputBdr, color:form.industry?textMain:textMid, width:"100%", boxSizing:"border-box", opacity:submitted?0.6:1, cursor:submitted?"not-allowed":"pointer" }}
                >
                  <option value="" disabled>Select your industry…</option>
                  {INDUSTRIES.map(function(ind){return <option key={ind} value={ind} style={{ background:dark?"#0e0820":"#ffffff", color:textMain }}>{ind}</option>;})}
                </select>
              </div>

              <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem 1.5rem", marginBottom:"2rem" }}>
                {fields.slice(4).map(function(f){
                  return (
                    <div key={f.key}>
                      <label style={{ display:"block", fontFamily:"'Orbitron',sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:errors[f.key]?"#ff6b6b":textMid, marginBottom:7 }}>
                        {f.label}{f.required&&<span style={{ color:"#f5a623", marginLeft:3 }}>*</span>}
                        {!f.required&&<span style={{ color:textMid, opacity:0.5, marginLeft:6, fontSize:"0.55rem" }}>(optional)</span>}
                      </label>
                      <input className="brochure-input" type={f.type||"text"} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLength}
                        onChange={function(e){handleChange(f.key,e.target.value);}} disabled={submitted}
                        style={{ background:submitted?(dark?"rgba(255,255,255,0.03)":"rgba(122,63,209,0.02)"):inputBg, border:"1px solid "+(errors[f.key]?"#ff6b6b":inputBdr), color:textMain, opacity:submitted?0.6:1, cursor:submitted?"not-allowed":"text" }}
                      />
                      {errors[f.key]&&<div style={{ fontSize:"0.65rem", color:"#ff6b6b", marginTop:4, fontFamily:"'Orbitron',sans-serif", letterSpacing:"0.5px" }}>{errors[f.key]}</div>}
                    </div>
                  );
                })}
              </div>

              {!submitted ? (
                <motion.button type="submit" whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer", fontFamily:"'Orbitron',sans-serif", fontSize:"0.78rem", fontWeight:800, letterSpacing:"1.2px", textTransform:"uppercase", background:"linear-gradient(135deg,#7a3fd1,#f5a623)", color:"#ffffff", boxShadow:"0 6px 28px rgba(122,63,209,0.28)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Unlock Brochure
                </motion.button>
              ) : (
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(122,63,209,0.30),transparent)" }} />
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"0.6rem", color:"#b99eff", letterSpacing:"1px" }}>ACCESS GRANTED</div>
                  <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(122,63,209,0.30),transparent)" }} />
                </div>
              )}
            </form>
          </motion.div>

          {/* ── SHOW BROCHURE BUTTON ── */}
          <AnimatePresence>
            {submitted && !brochureOpen && (
              <motion.div initial={{ opacity:0, y:30, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.6, delay:0.2 }} style={{ textAlign:"center", marginTop:"3rem" }}>
                <p style={{ color:textMid, fontSize:"0.82rem", marginBottom:"1.5rem", fontFamily:"'Orbitron',sans-serif", letterSpacing:"0.5px" }}>Your brochure is ready →</p>
                <motion.button onClick={openBrochure}
                  animate={btnPulsing?{boxShadow:["0 0 0 0 rgba(122,63,209,0.6)","0 0 0 24px rgba(122,63,209,0)","0 0 0 0 rgba(122,63,209,0)"]}:{}}
                  transition={{ repeat:Infinity, duration:1.8 }}
                  whileHover={{ scale:1.05, y:-3 }} whileTap={{ scale:0.97 }}
                  style={{ padding:"20px 56px", borderRadius:18, border:"none", cursor:"pointer", fontFamily:"'Orbitron',sans-serif", fontSize:"0.85rem", fontWeight:900, letterSpacing:"1.5px", textTransform:"uppercase", background:"linear-gradient(135deg,#7a3fd1 0%,#c4607a 50%,#f5a623 100%)", color:"#ffffff", display:"inline-flex", alignItems:"center", gap:14, boxShadow:"0 8px 40px rgba(122,63,209,0.35)", position:"relative", overflow:"hidden" }}
                >
                  <motion.div animate={{ x:["-100%","200%"] }} transition={{ repeat:Infinity, duration:2.2, ease:"easeInOut" }}
                    style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.18) 50%,transparent 60%)", pointerEvents:"none" }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  View Full Brochure
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </motion.button>
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
                  style={{ marginTop:"1rem", display:"flex", alignItems:"center", justifyContent:"center", gap:6, color:textMid, fontSize:"0.68rem", fontFamily:"'Orbitron',sans-serif", letterSpacing:"0.5px" }}>
                  <motion.span animate={{ y:[0,4,0] }} transition={{ repeat:Infinity, duration:1.5 }}>↓</motion.span>
                  SCROLL THROUGH ALL 14 PAGES
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BROCHURE VIEWER ── */}
          <AnimatePresence>
            {brochureOpen && (
              <motion.div ref={brochureRef} initial={{ opacity:0, height:0, marginTop:0 }} animate={{ opacity:1, height:"auto", marginTop:"3rem" }} transition={{ duration:0.7, ease:[0.215,0.61,0.355,1] }}>
                <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3, duration:0.5 }}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", padding:"0 4px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#f5a623", boxShadow:"0 0 8px #f5a623", animation:"shimmer 2s ease-in-out infinite" }} />
                    <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"0.62rem", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"#b99eff" }}>TFC 2026 · OFFICIAL SPONSORSHIP BROCHURE</span>
                  </div>
                  <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"0.6rem", color:textMid, letterSpacing:"0.5px" }}>14 PAGES</span>
                </motion.div>

                <motion.div initial={{ scale:0.94, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ delay:0.25, duration:0.65, ease:[0.215,0.61,0.355,1] }}
                  style={{ borderRadius:24, overflow:"hidden", border:"1px solid "+cardBdr, boxShadow:dark?"0 24px 80px rgba(0,0,0,0.6)":"0 24px 80px rgba(122,63,209,0.12)", position:"relative" }}>
                  <div style={{ height:4, background:"linear-gradient(90deg,#7a3fd1,#c4607a,#f5a623)", width:"100%" }} />
                  <div className="pdf-container" style={{ background:dark?"#0a0518":"#f5f3ff", overflowY:"auto", maxHeight:"82vh" }}>
                    <iframe src="/Brochure.pdf#toolbar=0&navpanes=0&scrollbar=0" title="Tech Festival Canada 2026 Brochure" style={{ width:"100%", height:"85vh", border:"none", display:"block" }} />
                  </div>
                  <div style={{ height:4, background:"linear-gradient(90deg,#f5a623,#c4607a,#7a3fd1)", width:"100%" }} />
                </motion.div>

                <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6, duration:0.5 }}
                  style={{ marginTop:"2rem", display:"flex", flexDirection:"column", alignItems:"center", gap:12, paddingBottom:"2rem" }}>
                  <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                    {[0,1,2].map(function(i){ return <motion.div key={i} animate={{ y:[0,-5,0] }} transition={{ delay:i*0.15, repeat:Infinity, duration:1.2 }} style={{ width:4, height:4, borderRadius:"50%", background:i===1?"#f5a623":"#7a3fd1", opacity:0.8 }} />; })}
                  </div>
                  <motion.a href="/Brochure.pdf" download="TechFestivalCanada_2026_Brochure.pdf"
                    whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }}
                    style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"18px 52px", borderRadius:16, background:dark?"#ffffff":"#0d0520", color:dark?"#0d0520":"#ffffff", fontFamily:"'Orbitron',sans-serif", fontSize:"0.78rem", fontWeight:900, letterSpacing:"1px", textTransform:"uppercase", textDecoration:"none", boxShadow:dark?"0 6px 32px rgba(255,255,255,0.12)":"0 6px 32px rgba(13,5,32,0.18)", transition:"background 0.3s,color 0.3s,box-shadow 0.3s" }}
                    onMouseEnter={function(e){e.currentTarget.style.background="linear-gradient(135deg,#7a3fd1,#f5a623)";e.currentTarget.style.color="#fff";e.currentTarget.style.boxShadow="0 8px 40px rgba(122,63,209,0.35)";}}
                    onMouseLeave={function(e){e.currentTarget.style.background=dark?"#ffffff":"#0d0520";e.currentTarget.style.color=dark?"#0d0520":"#ffffff";e.currentTarget.style.boxShadow=dark?"0 6px 32px rgba(255,255,255,0.12)":"0 6px 32px rgba(13,5,32,0.18)";}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </motion.a>
                  <p style={{ color:textMid, fontSize:"0.68rem", fontFamily:"'Orbitron',sans-serif", letterSpacing:"0.5px", margin:0 }}>
                    PDF · 14 pages · For sponsorship enquiries:{" "}
                    <a href="mailto:sales@thetechfestival.com" style={{ color:"#b99eff", textDecoration:"none" }}>sales@thetechfestival.com</a>
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      <Footer />
    </div>
  );
}
