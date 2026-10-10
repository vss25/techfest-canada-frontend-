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
   KEY DATES — edit the ISO dates (YYYY-MM-DD, Toronto time);
   the *_LABEL text and the timeline follow automatically.
   NOMINATIONS_END_DATE is the single source for the hero pill,
   the line above "Submit Your Nomination", the success message
   and the timeline's "Nominations open" stage.
   ═══════════════════════════════════════════════════════ */

var NOMINATIONS_END_DATE  = "2026-10-15";
var NOMINATIONS_OPEN_DATE = "2026-07-01";
var AWARDS_NIGHT_DATE     = "2026-10-26";
var FESTIVAL_START_DATE   = "2026-10-26";
var FESTIVAL_END_DATE     = "2026-10-27";

var NOMINATIONS_END_LABEL = formatDay(NOMINATIONS_END_DATE, true); // "15 Oct 2026"
var NOMINATIONS_END_SHORT = formatDay(NOMINATIONS_END_DATE, false); // "15 Oct" (hero pill)

/* ═══════════════════════════════════════════════════════
   DATE HELPERS (plain YYYY-MM-DD strings, no timezone drift)
   ═══════════════════════════════════════════════════════ */

/* Function declarations (not vars) so the *_LABEL constants above can use them. */
function monthName(m) { return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]; }

function parseISO(iso) { var p = iso.split("-"); return { y: +p[0], m: +p[1], d: +p[2] }; }

function formatDay(iso, withYear) {
  var p = parseISO(iso);
  return p.d + " " + monthName(p.m) + (withYear ? " " + p.y : "");
}

function formatRange(start, end) {
  if (start === end) return formatDay(start, false);
  var a = parseISO(start); var b = parseISO(end);
  if (a.y === b.y && a.m === b.m) return a.d + "–" + b.d + " " + monthName(b.m);
  return formatDay(start, false) + " – " + formatDay(end, false);
}

function addDays(iso, days) {
  var p = parseISO(iso);
  return new Date(Date.UTC(p.y, p.m - 1, p.d + days)).toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  var a = parseISO(fromIso); var b = parseISO(toIso);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

function todayInToronto() {
  try {
    var parts = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (pt) { parts[pt.type] = pt.value; });
    return parts.year + "-" + parts.month + "-" + parts.day;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

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
      style={Object.assign({ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: "0.18em", rowGap: 0, flexWrap: "wrap", margin: 0 }, style || {})}
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

/* Jury scoring weights (sum to 100). Ordered by weight so the biggest factor reads first. */
var CRITERIA = [
  { label: "Impact", val: 30, desc: "Measurable results the work has already delivered.", color: "#7a3fd1" },
  { label: "Innovation", val: 25, desc: "How new and significant the technology or approach is.", color: "#9959a6" },
  { label: "Scale", val: 20, desc: "Reach today and the potential to grow.", color: "#b8737a" },
  { label: "Canadian Relevance", val: 15, desc: "Benefit to Canada's technology ecosystem.", color: "#d68c4f" },
  { label: "Execution", val: 10, desc: "Track record of delivering on plans.", color: "#f5a623" },
];

/* Road to Awards Night. Status (done / now / upcoming) is worked out from today's date in Toronto. */
var STAGES = [
  { title: "Nominations open", start: NOMINATIONS_OPEN_DATE, end: NOMINATIONS_END_DATE, endVerb: "Closes", desc: "Free to enter. Self-nominations and third-party nominations welcome." },
  { title: "Jury review", start: addDays(NOMINATIONS_END_DATE, 1), end: addDays(AWARDS_NIGHT_DATE, -1), endVerb: "Ends", desc: "The jury scores every nomination. Shortlisted nominees are contacted directly." },
  { title: "Awards Night", start: AWARDS_NIGHT_DATE, end: AWARDS_NIGHT_DATE, endVerb: "Ends", desc: "Winners announced on Day 1 of The Tech Festival Canada in Toronto." },
];

function stageStatus(stage, today) {
  if (today > stage.end) return "done";
  if (today >= stage.start) return "current";
  return "upcoming";
}

function stageChip(stage, status, today) {
  if (status === "done") return "Done";
  if (status === "upcoming") return "Coming up";
  if (stage.start === stage.end) return "Today";
  var left = daysBetween(today, stage.end);
  if (left <= 0) return "Now · " + stage.endVerb + " today";
  if (left === 1) return "Now · " + stage.endVerb + " tomorrow";
  return "Now · " + stage.endVerb + " in " + left + " days";
}

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

  var today = todayInToronto();
  var tlMuted = dark ? "rgba(185,158,255,0.22)" : "rgba(122,63,209,0.18)";
  var tlDone  = dark ? "#b99eff" : "#7a3fd1";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Jury criteria (stats) ── */
        .aw-crit-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
        .aw-crit-card { display: flex; flex-direction: column; gap: 6px; padding: 18px 16px; border-radius: 14px; border: 1px solid ${cardBdr}; border-top: 3px solid var(--aw-c); background: ${bg}; }
        .aw-crit-val { font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: clamp(1.5rem, 2.2vw, 1.9rem); line-height: 1; color: ${dark ? "#f5a623" : accent}; }
        .aw-crit-label { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 0.68rem; letter-spacing: 1px; text-transform: uppercase; color: ${textMain}; line-height: 1.35; margin-top: 6px; }
        .aw-crit-desc { font-family: 'Montserrat', sans-serif; font-size: 0.84rem; color: ${textMid}; line-height: 1.55; }
        @media (max-width: 860px) {
          .aw-crit-grid { grid-template-columns: 1fr; gap: 10px; }
          .aw-crit-card { display: grid; grid-template-columns: 76px minmax(0, 1fr); column-gap: 14px; align-items: center; padding: 14px 16px; border-top: 1px solid ${cardBdr}; border-left: 4px solid var(--aw-c); }
          .aw-crit-label { margin-top: 0; }
        }

        /* ── Timeline: horizontal on laptop/tablet, vertical on phones ── */
        .aw-tl { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(${STAGES.length}, minmax(0, 1fr)); gap: 20px; }
        .aw-tl-step { position: relative; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .aw-tl-step:not(:last-child)::after { content: ""; position: absolute; top: 10px; left: 30px; right: -12px; height: 2px; border-radius: 2px; background: ${tlMuted}; }
        .aw-tl-step.is-done:not(:last-child)::after { background: ${tlDone}; }
        .aw-tl-dot { position: relative; z-index: 2; flex-shrink: 0; box-sizing: border-box; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .aw-tl-card { flex: 1; min-width: 0; padding: 16px 18px; border-radius: 14px; border: 1px solid ${cardBdr}; background: ${cardBg}; }
        @media (max-width: 767px) {
          .aw-tl { grid-template-columns: 1fr; gap: 0; }
          .aw-tl-step { flex-direction: row; gap: 14px; padding-bottom: 14px; }
          .aw-tl-step:last-child { padding-bottom: 0; }
          .aw-tl-dot { margin-top: 16px; }
          .aw-tl-step:not(:last-child)::after { top: 44px; bottom: -10px; left: 10px; right: auto; width: 2px; height: auto; }
        }

        @media (max-width: 768px) {
          .aw-hero { height: auto !important; min-height: 100vh !important; padding-bottom: 96px !important; }
          .aw-hero-grid { grid-template-columns: 1fr !important; text-align: center !important; gap: 1.5rem !important; padding: 32px 20px 0 !important; }
          .aw-hero-grid > div { align-items: center !important; text-align: center !important; }
          .aw-hero-grid h1 { font-size: clamp(2.2rem, 12vw, 3.5rem) !important; text-align: center !important; }
          .aw-hero-line { flex-wrap: wrap !important; justify-content: center !important; row-gap: 0.1em !important; }
          .aw-hero-grid p { margin-left: auto !important; margin-right: auto !important; }
          .aw-hero-trophy { width: min(80vw, 340px) !important; }
          .aw-hero-ctas { flex-direction: column !important; width: 100% !important; }
          .aw-hero-ctas a { width: 100% !important; justify-content: center !important; }
          .aw-feature-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .aw-hero-pill { padding: 9px 18px !important; letter-spacing: 1px !important; }
        }
      `}} />

      <Navbar />
      <StickyTrophy dark={dark} />

      {/* ════════════════ HERO ════════════════ */}
      <section className="aw-hero" style={{ position: "relative", overflow: "hidden", background: bg, height: "100vh", minHeight: 700, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(" + (dark ? "rgba(122,63,209,0.03)" : "rgba(122,63,209,0.04)") + " 1px, transparent 1px), linear-gradient(90deg, " + (dark ? "rgba(122,63,209,0.03)" : "rgba(122,63,209,0.04)") + " 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)" }} />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          style={{ position: "relative", zIndex: 20, textAlign: "center", paddingTop: "clamp(90px, 12vh, 130px)", paddingLeft: 16, paddingRight: 16 }}>
          <span className="aw-hero-pill" style={{ display: "inline-block", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)", color: "#f5a623", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", padding: "10px 24px", borderRadius: 999 }}>
            Nominations close {NOMINATIONS_END_SHORT}
          </span>
        </motion.div>

        <div className="aw-hero-grid" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", maxWidth: 1500, margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)", gap: "clamp(24px, 4vw, 48px)" }}>
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2.5rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-2px", color: textMain, textTransform: "uppercase", margin: 0 }}>
              YOU<br />HAVE<br />EARNED
            </h1>
            <div className="aw-hero-line" style={{ display: "flex", alignItems: "baseline", gap: "0.25em", marginTop: "clamp(8px, 1.5vw, 16px)" }}>
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
              <img className="aw-hero-trophy" src="/awards-trophy-single.png" alt="The Catalyst Award" style={{ width: "clamp(300px, 42vw, 600px)", maxWidth: "100%", height: "auto",
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
              <span style={{ display: "inline-block", background: "rgba(245,166,35,0.12)", color: "#f5a623", fontFamily: "'Orbitron',sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1.5px", padding: "5px 14px", borderRadius: 999, marginBottom: 20 }}>{nominationsOpen ? "Nominations now open" : "Nominations closed"}</span>
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
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.4rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginBottom: 12 }}>How Winners Are Chosen</h3>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "1rem", color: textMid, lineHeight: 1.7, maxWidth: 620, margin: "0 0 24px" }}>
              The jury scores every nomination out of 100. Each percentage below is how much that criterion counts towards the final score.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            {/* Proportion bar: the five weights side by side, adding up to 100% */}
            <div role="img" aria-label={"Score weighting: " + CRITERIA.map(function (c) { return c.label + " " + c.val + "%"; }).join(", ")}
              style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 8, background: cardBdr }}>
              {CRITERIA.map(function (c) {
                return <div key={c.label} style={{ flex: c.val + " 0 0", background: c.color }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Montserrat',sans-serif", fontSize: "0.75rem", fontWeight: 600, color: textMid, marginBottom: 18 }}>
              <span>Weight of each criterion</span>
              <span>Total = 100%</span>
            </div>

            <div className="aw-crit-grid">
              {CRITERIA.map(function (c) {
                return (
                  <div key={c.label} className="aw-crit-card" style={{ "--aw-c": c.color }}>
                    <div className="aw-crit-val">{c.val}%</div>
                    <div>
                      <div className="aw-crit-label">{c.label}</div>
                      <div className="aw-crit-desc">{c.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.4rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginTop: "clamp(4rem,7vw,6rem)", marginBottom: 10, textAlign: "center" }}>Road to Awards Night</h3>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "0.95rem", color: textMid, lineHeight: 1.6, textAlign: "center", margin: "0 auto 32px", maxWidth: 560 }}>
              The Tech Festival Canada · {formatRange(FESTIVAL_START_DATE, FESTIVAL_END_DATE)} {parseISO(FESTIVAL_END_DATE).y} · Toronto
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <ol className="aw-tl" aria-label="Catalyst Awards timeline">
              {STAGES.map(function (st) {
                var status = stageStatus(st, today);
                var isNow = status === "current";
                var isDone = status === "done";
                return (
                  <li key={st.title} className={"aw-tl-step is-" + status} aria-current={isNow ? "step" : undefined}>
                    <span className="aw-tl-dot" aria-hidden="true" style={{
                      background: isNow ? "#f5a623" : isDone ? "#7a3fd1" : bg,
                      border: isNow || isDone ? "none" : "2px solid " + tlMuted,
                      boxShadow: isNow ? "0 0 0 5px rgba(245,166,35,0.22), 0 0 18px rgba(245,166,35,0.45)" : "none",
                    }}>
                      {isDone && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                      {isNow && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </span>
                    <div className="aw-tl-card" style={isNow ? {
                      border: "1.5px solid rgba(245,166,35,0.60)",
                      background: dark ? "rgba(245,166,35,0.08)" : "rgba(245,166,35,0.07)",
                      boxShadow: dark ? "0 8px 28px rgba(245,166,35,0.10)" : "0 8px 24px rgba(245,166,35,0.14)",
                    } : undefined}>
                      <span style={{
                        display: "inline-block", fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase",
                        padding: isNow ? "5px 10px" : 0, borderRadius: 999, marginBottom: 10,
                        background: isNow ? "#f5a623" : "transparent",
                        color: isNow ? "#1a0b00" : isDone ? tlDone : textMid,
                      }}>{stageChip(st, status, today)}</span>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(0.9rem,1.4vw,1.05rem)", fontWeight: 800, color: textMain, lineHeight: 1.3, marginBottom: 4 }}>{formatRange(st.start, st.end)}</div>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "1rem", fontWeight: 700, color: isDone ? textMid : textMain, marginBottom: 6 }}>{st.title}</div>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "0.86rem", color: textMid, lineHeight: 1.6 }}>{st.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
         NOMINATION FORM (expanding inline)
         ════════════════════════════════════════════════ */}
      {nominationsOpen ? (
        <NominationForm deadlineLabel={NOMINATIONS_END_LABEL} dark={dark} textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} cardBg={cardBg} cardBdr={cardBdr} />
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
              Nominations are free. Self-nominations and third-party nominations welcome.
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
