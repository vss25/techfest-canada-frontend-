import { useState, useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SponsorMarquee from "../components/SponsorMarquee";
import NewsletterBar from "../components/NewsletterBar";
import NominationForm from "../components/NominationForm";
import useSiteSettings from "../hooks/useSiteSettings";
import { ClosedNotice } from "../components/SiteNotices";

/* ═══════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════ */

var containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } },
};

var itemBlur = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 22 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { type: "spring", bounce: 0.3, duration: 1.5 } },
};

var wordVariants = {
  hidden: { opacity: 0, y: 50, filter: "blur(16px)", scale: 0.8 },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { type: "spring", damping: 14, stiffness: 100, duration: 1 } },
};

/* ═══════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════ */

function TextReveal({ text, colors, style, delay }) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.h2 ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"}
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.14, delayChildren: delay || 0 } } }}
      style={Object.assign({ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "0.18em", flexWrap: "nowrap", margin: 0 }, style || {})}
    >
      {text.split(" ").map(function (word, i) {
        return <motion.span key={i} variants={wordVariants} style={{ display: "inline-block", color: (colors && colors[i]) || "inherit", willChange: "transform, opacity, filter" }}>{word}</motion.span>;
      })}
    </motion.h2>
  );
}

function DividerReveal({ accent }) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ scaleX: 0, opacity: 0 }} animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
      style={{ width: 120, height: 3, borderRadius: 2, background: "linear-gradient(90deg, " + accent + ", #f5a623)", margin: "2rem auto 2.5rem", transformOrigin: "center" }}
    />
  );
}

function ScrollReveal({ children, delay }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: delay || 0, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  );
}

function ScrollP({ children, textMid, align, maxW }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.p ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.4, delay: 0.3 }}
      style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "clamp(1.05rem,1.7vw,1.2rem)", color: textMid, lineHeight: 1.85, textAlign: align || "center", maxWidth: maxW || 700, margin: align === "left" ? "1.5rem 0 0" : "0 auto" }}
    >{children}</motion.p>
  );
}

/* ═══════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════ */

var PILLARS = ["Artificial Intelligence", "Quantum Computing", "Robotics", "CleanTech & Sustainability", "Cybersecurity"];
var SECTORS = ["Healthcare & Life Sciences", "Manufacturing, Supply Chain & Infrastructure", "Defence, National Security & Public Safety", "Energy & Utilities", "Banking, Financial Services & Insurance"];

var ALL_CATEGORIES = [];
var n = 1;
PILLARS.forEach(function (p) { SECTORS.forEach(function (s) { ALL_CATEGORIES.push({ num: n, name: "The Catalyst Award for " + p + " in " + s, pillar: p, sector: s }); n++; }); });

var SPECIAL_AWARDS = [
  { num: 26, name: "The Catalyst Lifetime Achievement Award", desc: "Sustained and transformative contribution to Canada's technology ecosystem over a distinguished career." },
  { num: 27, name: "The Catalyst Rising Innovator Award", desc: "A Canadian startup demonstrating a breakthrough application of TTFC technology pillars." },
  { num: 28, name: "The Catalyst Cross-Border Impact Award", desc: "A Canada-international collaboration driving measurable technology adoption across borders." },
];

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */

export default function Awards() {
  var site = useSiteSettings();
  var nominationsOpen = site["site.nominations_open"] !== false;
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(null); var expandedRow = s2[0]; var setExpandedRow = s2[1];
  var s3 = useState("Artificial Intelligence"); var activePillar = s3[0]; var setActivePillar = s3[1];

  useEffect(function () {
    var update = function () { setDark(document.body.classList.contains("dark-mode")); };
    update();
    var obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var bg       = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid  = dark ? "rgba(220,210,255,0.78)" : "rgba(13,5,32,0.70)";
  var textSoft = dark ? "rgba(200,185,255,0.38)" : "rgba(13,5,32,0.42)";
  var accent   = dark ? "#b99eff" : "#7a3fd1";
  var cardBg   = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var cardBdr  = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.14)";
  var sectionBg = dark ? "#0a0618" : "#f4f0ff";

  var filtered = activePillar === "all" ? ALL_CATEGORIES : ALL_CATEGORIES.filter(function (a) { return a.pillar === activePillar; });

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .aw-hero-grid { grid-template-columns: 1fr !important; text-align: center !important; gap: 2rem !important; padding: 0 20px !important; }
          .aw-hero-grid > div { align-items: center !important; text-align: center !important; }
          .aw-hero-grid h1 { font-size: clamp(2.2rem, 12vw, 3.5rem) !important; text-align: center !important; }
          .aw-hero-ctas { flex-direction: column !important; width: 100% !important; }
          .aw-hero-ctas a { width: 100% !important; justify-content: center !important; }
          .aw-feature-grid { grid-template-columns: 1fr !important; }
          .aw-criteria-bar { flex-wrap: wrap !important; }
          .aw-criteria-bar > div { flex: 1 1 calc(33% - 1px) !important; min-width: 80px !important; }
          .aw-timeline-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; padding-bottom: 16px !important; }
          .aw-timeline-inner { min-width: 600px !important; }
        }
        @media (max-width: 480px) {
          .aw-criteria-bar > div { flex: 1 1 calc(50% - 1px) !important; }
        }
      `}} />

      <Navbar />
      <StickyTrophy dark={dark} />

      {/* ════════════════ HERO ════════════════ */}
      <section style={{ position: "relative", overflow: "hidden", background: bg, height: "100vh", minHeight: 700, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(" + (dark ? "rgba(122,63,209,0.03)" : "rgba(122,63,209,0.04)") + " 1px, transparent 1px), linear-gradient(90deg, " + (dark ? "rgba(122,63,209,0.03)" : "rgba(122,63,209,0.04)") + " 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)" }} />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          style={{ position: "relative", zIndex: 20, textAlign: "center", paddingTop: "clamp(90px, 12vh, 130px)" }}>
          <span style={{ display: "inline-block", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)", color: "#f5a623", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", padding: "10px 24px", borderRadius: 999 }}>
            Nominations Open July 2026
          </span>
        </motion.div>

        <div className="aw-hero-grid" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", maxWidth: 1500, margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)", gap: "clamp(24px, 4vw, 48px)" }}>
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.5rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-2px", color: textMain, textTransform: "uppercase", margin: 0 }}>
              YOU<br />HAVE<br />EARNED
            </h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25em", marginTop: "clamp(8px, 1.5vw, 16px)" }}>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.5rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-2px", color: textMain, textTransform: "uppercase", margin: 0 }}>THIS</h1>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.5rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-2px", margin: 0, color: "#f5a623" }}>MOMENT.</h1>
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)", color: textMid, lineHeight: 1.75, maxWidth: 420, marginTop: 28 }}>
              The hard work is done. Now let Canada know about it.
            </p>
            <motion.a href="#awards-list" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 24, padding: "15px 34px", borderRadius: 14, background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
              Explore Awards
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </motion.a>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <motion.div animate={{ y: [0, -14, 0], rotate: [-3, -1, -3] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
              <img src="/awards-trophy-single.png" alt="The Catalyst Award" style={{ width: "clamp(300px, 42vw, 600px)", height: "auto",
                filter: dark ? "drop-shadow(0 24px 80px rgba(122,63,209,0.50)) drop-shadow(0 8px 28px rgba(245,166,35,0.20))" : "drop-shadow(0 24px 80px rgba(0,0,0,0.18))",
              }} />
            </motion.div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 20, textAlign: "center" }}>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <span style={{ color: textSoft, fontSize: "0.58rem", fontFamily: "'Orbitron',sans-serif", letterSpacing: "3px" }}>(SCROLL)</span>
          </motion.div>
        </motion.div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, zIndex: 15, background: "linear-gradient(to bottom, transparent, " + bg + ")", pointerEvents: "none" }} />
      </section>

      <TrophyScroll bg={bg} dark={dark} textMain={textMain} textSoft={textSoft} accent={accent} />

      <section style={{ padding: "5rem 5%", background: bg }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <DividerReveal accent={accent} />
          <ScrollP textMid={textMid}>
            Winning changes things. It opens doors, builds credibility, and gives your team something to rally around. Whether this is your first recognition or a global enterprise adding to a legacy, earned recognition tells the market that what you're doing is working.
          </ScrollP>
        </div>
      </section>

      <section style={{ padding: "6rem 5%", background: sectionBg, borderTop: "1px solid " + cardBdr, borderBottom: "1px solid " + cardBdr }}>
        <div className="aw-feature-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(2rem,5vw,5rem)", alignItems: "center" }}>
          <div>
            <TextReveal text="OWN YOUR" colors={[textMain, textMain]} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.2rem,5vw,4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", justifyContent: "flex-start" }} />
            <TextReveal text="INDUSTRY" colors={["#f5a623"]} delay={0.15} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.2rem,5vw,4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", justifyContent: "flex-start" }} />
            <ScrollP textMid={textMid} align="left" maxW={480}>
              You set the standard. Our jury confirms it. The companies, teams, and individuals who win earn more than a trophy — they earn a story the market trusts and teams are proud to tell.
            </ScrollP>
          </div>

          <ScrollReveal>
            <div style={{ background: cardBg, border: "1px solid " + cardBdr, borderRadius: 20, padding: "clamp(24px,4vw,40px)", transition: "border-color 0.3s ease", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(122,63,209,0.06)" }}
              onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#f5a623"; }}
              onMouseLeave={function (e) { e.currentTarget.style.borderColor = cardBdr; }}>
              <span style={{ display: "inline-block", background: "rgba(245,166,35,0.12)", color: "#f5a623", fontFamily: "'Orbitron',sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1.5px", padding: "5px 14px", borderRadius: 999, marginBottom: 20 }}>Nominations Open July 2026</span>
              <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: "clamp(1rem,2vw,1.3rem)", color: textMain, marginBottom: 10, lineHeight: 1.3 }}>The Catalyst Awards</h3>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "0.98rem", color: textMid, lineHeight: 1.75, marginBottom: 20 }}>Honouring the pioneers transforming industries through technology. 25 core categories across the 5x5 pillar-sector matrix, plus 3 special recognition awards.</p>
              <a href="#awards-list" style={{ color: "#f5a623", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", letterSpacing: "1px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                View all categories <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
              <div style={{ height: 1, background: cardBdr, margin: "20px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", color: textMid }}>Awards Night</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "#f5a623" }}>October 26, 2026</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section id="awards-list" style={{ background: sectionBg, borderBottom: "1px solid " + cardBdr }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(3rem,6vw,5rem) 5% 0" }}>
          <TextReveal text="Discover Our Award Categories" colors={[textMain, textMain, textMain, accent]} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, marginBottom: "0.5rem" }} />
          <DividerReveal accent={accent} />

          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", justifyContent: "center", paddingBottom: 16 }}>
            {PILLARS.map(function (p) { return { key: p, label: p.length > 18 ? p.split(" &")[0] : p }; }).map(function (f) {
              var active = activePillar === f.key;
              return (
                <button key={f.key} onClick={function () { setActivePillar(f.key); setExpandedRow(null); }}
                  style={{ border: "1px solid " + (active ? "rgba(245,166,35,0.40)" : cardBdr), background: active ? "rgba(245,166,35,0.12)" : "transparent", color: active ? "#f5a623" : textSoft, fontFamily: "'Orbitron',sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", padding: "10px 16px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}
                >{f.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {filtered.map(function (award) {
            return <AwardRow key={award.num} award={award} dark={dark} textMain={textMain} textMid={textMid} textSoft={textSoft} cardBdr={cardBdr} isOpen={false} onToggle={function () {}} />;
          })}
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(2rem,4vw,4rem) 5%" }}>
          <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "#f5a623", marginBottom: 16 }}>Special Recognition</p>
          {SPECIAL_AWARDS.map(function (award) {
            return <AwardRow key={award.num} award={award} dark={dark} textMain={textMain} textMid={textMid} textSoft={textSoft} cardBdr={cardBdr} isOpen={expandedRow === award.num} onToggle={function () { setExpandedRow(expandedRow === award.num ? null : award.num); }} />;
          })}
        </div>
      </section>

      <section style={{ padding: "clamp(4rem,8vw,7rem) 5%", background: bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <ScrollReveal>
            <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: textSoft, marginBottom: 12 }}>Evaluation</p>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.4rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginBottom: 28 }}>How Winners Are Chosen</h3>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="aw-criteria-bar" style={{ display: "flex", borderRadius: 16, overflow: "hidden", border: "1px solid " + cardBdr }}>
              {[
                { label: "Innovation", val: "25%" },
                { label: "Impact", val: "30%" },
                { label: "Scale", val: "20%" },
                { label: "Canadian", val: "15%" },
                { label: "Execution", val: "10%" },
              ].map(function (c, i) {
                return (
                  <div key={c.label} style={{ flex: 1, padding: "clamp(16px,2.5vw,28px) clamp(10px,1.5vw,18px)", textAlign: "center", background: bg, borderRight: i < 4 ? "1px solid " + cardBdr : "none" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.1rem,2vw,1.6rem)", fontWeight: 900, color: "#f5a623", marginBottom: 4 }}>{c.val}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(0.48rem,0.7vw,0.58rem)", fontWeight: 700, color: textSoft, letterSpacing: "0.5px", textTransform: "uppercase" }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.4rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginTop: "clamp(4rem,7vw,6rem)", marginBottom: 32, textAlign: "center" }}>Road to Awards Night</h3>
          </ScrollReveal>

          <div className="aw-timeline-wrap" style={{ overflow: "visible" }}>
            <div className="aw-timeline-inner" style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
              <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 2, background: dark ? "linear-gradient(90deg, rgba(185,158,255,0.15), rgba(245,166,35,0.25))" : "linear-gradient(90deg, rgba(122,63,209,0.12), rgba(245,166,35,0.18))" }} />
              {[
                { d: "Jun", l: "Framework" },
                { d: "Jul–Aug", l: "Nominations" },
                { d: "Sep", l: "Screening" },
                { d: "Oct 6", l: "Shortlist" },
                { d: "Oct 15", l: "Sealed" },
                { d: "Oct 26", l: "Awards Night", h: true },
              ].map(function (t, i) {
                return (
                  <ScrollReveal key={t.d} delay={i * 0.06}>
                    <div style={{ textAlign: "center", position: "relative", zIndex: 2, minWidth: 75, padding: "0 4px" }}>
                      <div style={{ width: t.h ? 14 : 8, height: t.h ? 14 : 8, borderRadius: "50%", background: t.h ? "#f5a623" : (dark ? "rgba(185,158,255,0.30)" : "rgba(122,63,209,0.20)"), margin: t.h ? "-3px auto 10px" : "0 auto 10px", boxShadow: t.h ? "0 0 14px rgba(245,166,35,0.40)" : "none" }} />
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, color: t.h ? "#f5a623" : textSoft, letterSpacing: "1px", marginBottom: 3 }}>{t.d}</div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: textMain, lineHeight: 1.3 }}>{t.l}</div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
         NOMINATION FORM (expanding inline)
         ════════════════════════════════════════════════ */}
      {nominationsOpen ? (
        <NominationForm dark={dark} textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} cardBg={cardBg} cardBdr={cardBdr} />
      ) : (
        <section id="nominations" style={{ padding: "clamp(3rem, 6vw, 5rem) 5%", background: dark ? "#0a0618" : "#f4f0ff", borderTop: "1px solid " + cardBdr, scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <ClosedNotice dark={dark} title="Nominations are closed" body="Thank you to everyone who nominated. Follow us for the finalists and the Catalyst Awards night." />
          </div>
        </section>
      )}

      {/* ════════════════ CTA ════════════════ */}
      <section style={{ padding: "clamp(4rem,8vw,7rem) 5%", background: sectionBg, borderTop: "1px solid " + cardBdr }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <ScrollReveal>
            <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: textSoft, marginBottom: 16 }}>Free to nominate</p>
            <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.8rem,4.5vw,3.2rem)", fontWeight: 900, color: textMain, lineHeight: 1.08, marginBottom: 18 }}>
              Ready to be <span style={{ color: "#f5a623" }}>recognised?</span>
            </h2>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "1.05rem", color: textMid, lineHeight: 1.8, maxWidth: 480, margin: "0 auto 32px" }}>
              Nominations are free. Self-nominations and third-party nominations welcome. Portal opens July 1, 2026.
            </p>
            <div className="aw-hero-ctas" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <motion.a href="/tickets" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 34px", borderRadius: 14, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#fff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}
              >Get Your Pass</motion.a>
              <motion.a href="/sponsor#compare-packages" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 34px", borderRadius: 14, border: "1.5px solid " + cardBdr, color: textMain, textDecoration: "none", background: "transparent", fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}
              >Partner With Us</motion.a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <NewsletterBar dark={dark} />
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TROPHY SCROLL
   ═══════════════════════════════════════════════════════ */

function TrophyScroll({ bg, dark, textMain, textSoft, accent }) {
  var containerRef = useRef(null);
  var scrollData = useScroll({ target: containerRef });
  var s1 = useState(false); var isMobile = s1[0]; var setIsMobile = s1[1];

  useEffect(function () {
    function check() { setIsMobile(window.innerWidth <= 768); }
    check(); window.addEventListener("resize", check);
    return function () { window.removeEventListener("resize", check); };
  }, []);

  var rotate = useTransform(scrollData.scrollYProgress, [0, 1], [20, 0]);
  var scale = useTransform(scrollData.scrollYProgress, [0, 1], isMobile ? [0.75, 0.95] : [1.05, 1]);
  var translateY = useTransform(scrollData.scrollYProgress, [0, 1], [0, -80]);

  return (
    <div ref={containerRef} style={{ height: isMobile ? "45rem" : "65rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: isMobile ? "1rem" : "3rem 5%", background: bg }}>
      <div style={{ width: "100%", position: "relative", perspective: "1000px" }}>
        <motion.div style={{ translateY: translateY, maxWidth: 800, margin: "0 auto 2rem", textAlign: "center" }}>
          <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: textSoft, marginBottom: 14 }}>The Catalyst Awards</p>
          <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.6rem,3.5vw,3rem)", fontWeight: 900, color: textMain, lineHeight: 1.1, margin: 0 }}>
            28 Awards. One Stage.{" "}
            <span style={{ background: "linear-gradient(135deg, #7a3fd1, #f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Infinite Impact.</span>
          </h2>
        </motion.div>

        <motion.div style={{ rotateX: rotate, scale: scale, maxWidth: 900, margin: "0 auto", width: "100%", borderRadius: 24, overflow: "hidden",
          boxShadow: dark ? "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026" : "0 9px 20px rgba(122,63,209,0.08), 0 37px 37px rgba(122,63,209,0.06), 0 84px 50px rgba(122,63,209,0.03)",
          border: "1px solid " + (dark ? "rgba(155,135,245,0.12)" : "rgba(122,63,209,0.10)"),
        }}>
          <img src="/awards-trophy-single.png" alt="The Catalyst Award Trophy" style={{ width: "100%", height: "auto", display: "block" }} />
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AWARD LIST ROW
   ═══════════════════════════════════════════════════════ */

function AwardRow({ award, dark, textMain, textMid, textSoft, cardBdr, isOpen, onToggle }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-20px" });
  var expandable = !!award.desc;

  return (
    <motion.div ref={ref} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.4, delay: (award.num % 5) * 0.03 }}
      onClick={expandable ? onToggle : undefined}
      style={{
        display: "flex", alignItems: "center", gap: "clamp(12px,2vw,24px)",
        padding: "clamp(14px,2vw,22px) clamp(16px,3vw,32px)",
        borderBottom: "1px solid " + cardBdr, cursor: expandable ? "pointer" : "default",
        transition: "background 0.25s ease",
        background: isOpen ? (dark ? "rgba(245,166,35,0.08)" : "rgba(245,166,35,0.05)") : "transparent",
      }}
      onMouseEnter={function (e) { if (!isOpen) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"; }}
      onMouseLeave={function (e) { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(0.68rem,1.1vw,0.82rem)", fontWeight: 800, color: isOpen ? "#f5a623" : textSoft, minWidth: 30, transition: "color 0.25s ease" }}>★</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "clamp(0.82rem,1.5vw,1.05rem)", fontWeight: 700, color: textMain, lineHeight: 1.4 }}>{award.name}</div>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.25 }} style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {award.desc
              ? <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "0.92rem", color: textMid, lineHeight: 1.7, margin: 0 }}>{award.desc}</p>
              : <>
                  <span style={{ fontSize: "0.72rem", padding: "5px 14px", borderRadius: 6, background: dark ? "rgba(185,158,255,0.10)" : "rgba(122,63,209,0.08)", color: dark ? "#b99eff" : "#7a3fd1", fontWeight: 700, fontFamily: "'Orbitron',sans-serif" }}>{award.pillar}</span>
                  <span style={{ fontSize: "0.72rem", padding: "5px 14px", borderRadius: 6, background: "rgba(245,166,35,0.10)", color: "#f5a623", fontWeight: 700, fontFamily: "'Orbitron',sans-serif" }}>{award.sector}</span>
                </>
            }
          </motion.div>
        )}
      </div>
      {expandable && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isOpen ? "#f5a623" : textSoft} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transition: "transform 0.25s ease, stroke 0.25s ease", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
        <path d="M9 18l6-6-6-6" />
      </svg>}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   STICKY TROPHY
   ═══════════════════════════════════════════════════════ */

function StickyTrophy({ dark }) {
  var s1 = useState(1); var opacity = s1[0]; var setOpacity = s1[1];
  var s2 = useState(false); var pastHero = s2[0]; var setPastHero = s2[1];

  useEffect(function () {
    function onScroll() {
      var scrollY = window.scrollY;
      var vh = window.innerHeight;
      if (scrollY < vh) {
        setOpacity(1);
        setPastHero(false);
      } else if (scrollY < vh * 3) {
        var fade = 1 - ((scrollY - vh) / (vh * 2));
        setOpacity(Math.max(0.06, fade * 0.18));
        setPastHero(true);
      } else {
        setOpacity(0.06);
        setPastHero(true);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  if (!pastHero) return null;

  return (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-6deg)", zIndex: 1, pointerEvents: "none", width: "clamp(250px, 30vw, 420px)", opacity: opacity, transition: "opacity 0.3s ease" }}>
      <img src="/awards-trophy-single.png" alt="" style={{ width: "100%", height: "auto",
        filter: dark ? "drop-shadow(0 16px 48px rgba(122,63,209,0.30)) brightness(0.7)" : "drop-shadow(0 16px 48px rgba(0,0,0,0.08)) brightness(0.9)",
      }} />
    </div>
  );
}
