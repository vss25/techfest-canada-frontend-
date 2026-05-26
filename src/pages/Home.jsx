import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AboutUs from "../components/AboutUs";
import { useEffect, useState, useRef } from "react";
import InquiryModal from "../components/InquiryModal";
import PostPurchaseModal from "../components/PostPurchaseModal";
import OnboardingSurvey from "../components/OnboardingSurvey";
import { motion, useInView, AnimatePresence } from "framer-motion";
import SponsorMarquee from "../components/SponsorMarquee";
import NewsletterBar from "../components/NewsletterBar";
import {
  InteractiveGlobe,
  TECH_PILLARS,
  APPLIED_SECTORS,
} from "../components/InteractiveGlobe";

var containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.3 },
  },
};

var itemBlur = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 22 },
  visible: {
    opacity: 1, filter: "blur(0px)", y: 0,
    transition: { type: "spring", bounce: 0.3, duration: 1.5 },
  },
};

function TextReveal(props) {
  var text = props.text;
  var colors = props.colors || [];
  var style = props.style || {};
  var delay = props.delay || 0;
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-60px" });
  var words = text.split(" ");
  return (
    <motion.h2
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.14, delayChildren: delay } },
      }}
      style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "0.18em", flexWrap: "wrap", ...style }}
    >
      {words.map(function (word, i) {
        return (
          <motion.span key={i}
            variants={{
              hidden: { opacity: 0, y: 50, filter: "blur(16px)", scale: 0.8 },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { type: "spring", damping: 14, stiffness: 100, duration: 1 } },
            }}
            style={{ display: "inline-block", color: colors[i] || "inherit", willChange: "transform, opacity, filter" }}
          >{word}</motion.span>
        );
      })}
    </motion.h2>
  );
}

function DividerReveal(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
      style={{ width: 120, height: 3, borderRadius: 2, background: "linear-gradient(90deg, " + props.accent + ", var(--brand-orange, #f5a623))", margin: "2rem auto 2.5rem", transformOrigin: "center" }}
    />
  );
}

function SubtitleReveal(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.p ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.4, delay: 0.5 }}
      className="hero-sub"
      style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.3rem)", lineHeight: 1.85, fontWeight: 400, maxWidth: 920, color: props.textMid, textAlign: "justify", hyphens: "auto", marginBottom: "3rem" }}
    >
      Canada's first-of-its-kind, deal-making platform where
      innovators, buyers, and policymakers turn emerging tech into real partnerships,
      pilots, and contracts, not just conversations. Expect a never-seen-before concentration of
      senior decision-makers from enterprise and critical sectors, alongside government,
      associations, media, and leading research institutions.
    </motion.p>
  );
}

function CTAReveal(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.2, delay: 0.6 }}
      className="hero-ctas-wrap"
      style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}
    >
      <motion.a href="/tickets" className="btn-primary"
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 14, textDecoration: "none", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "1.2px", textTransform: "uppercase" }}
      >
        Get Your Pass
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </motion.a>
      <motion.a href="/sponsor#compare-packages" className="btn-outline"
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none" }}
      >
        Partner With Us
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
      </motion.a>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FrameworkAccordion — one expandable card per pillar / sector
// ────────────────────────────────────────────────────────────────────────
function FrameworkAccordion(props) {
  var item        = props.item;
  var index       = props.index;
  var type        = props.type;          // "pillar" | "sector"
  var open        = props.open;
  var onToggle    = props.onToggle;
  var dark        = props.dark;
  var elementRef  = props.elementRef;    // for scroll-into-view

  var isPillar = type === "pillar";
  var accent   = isPillar ? "#f5a623" : (dark ? "#b99eff" : "#7a3fd1");
  var accentSoft = isPillar
    ? "rgba(245,166,35,0.10)"
    : (dark ? "rgba(185,158,255,0.10)" : "rgba(122,63,209,0.08)");
  var bgCard = dark ? "rgba(255,255,255,0.03)" : "rgba(13,5,32,0.025)";
  var bgCardOpen = dark ? "rgba(255,255,255,0.05)" : "rgba(13,5,32,0.04)";
  var border = dark ? "rgba(255,255,255,0.08)" : "rgba(13,5,32,0.08)";
  var borderOpen = isPillar
    ? "rgba(245,166,35,0.45)"
    : (dark ? "rgba(185,158,255,0.45)" : "rgba(122,63,209,0.4)");
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid  = dark ? "rgba(255,255,255,0.72)" : "rgba(13,5,32,0.7)";
  var prefix   = isPillar ? "P" : "S";
  var num      = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      ref={elementRef}
      layout
      style={{
        border: "1px solid " + (open ? borderOpen : border),
        background: open ? bgCardOpen : bgCard,
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 12,
        boxShadow: open
          ? (isPillar
              ? "0 10px 40px -18px rgba(245,166,35,0.35)"
              : "0 10px 40px -18px rgba(122,63,209,0.35)")
          : "none",
        transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.3s ease",
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          textAlign: "left",
          color: textMain,
        }}
      >
        {/* Number badge */}
        <div
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 10,
            background: accentSoft,
            border: "1px solid " + (open ? borderOpen : border),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Orbitron', monospace",
            fontWeight: 800,
            fontSize: "0.78rem",
            color: accent,
            letterSpacing: "0.5px",
          }}
        >
          {prefix}{num}
        </div>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: accent,
              marginBottom: 4,
              opacity: 0.9,
            }}
          >
            {item.shortLabel}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)",
              lineHeight: 1.35,
              color: textMain,
            }}
          >
            {item.title}
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 20px 22px 80px" }}>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: 10,
                }}
              >
                {item.subsections.map(function (sub, i) {
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        color: textMid,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: accent,
                          marginTop: 9,
                          boxShadow: "0 0 8px " + accent,
                        }}
                      />
                      <span>{sub}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FrameworkSection — globe + tabs + accordions
// ────────────────────────────────────────────────────────────────────────
function FrameworkSection(props) {
  var dark     = props.dark;
  var textMain = props.textMain;
  var textMid  = props.textMid;
  var accent   = props.accent;

  var tabState     = useState("pillars");   var tab        = tabState[0];    var setTab        = tabState[1];
  var openState    = useState(null);        var openId     = openState[0];   var setOpenId     = openState[1];
  var selectedState= useState(null);        var selectedId = selectedState[0]; var setSelectedId = selectedState[1];

  var sectionRef = useRef(null);
  var sectionInView = useInView(sectionRef, { once: true, margin: "-100px" });
  var itemRefs = useRef({});

  function selectNode(id) {
    var isPillar = TECH_PILLARS.some(function (p) { return p.id === id; });
    var nextTab  = isPillar ? "pillars" : "sectors";
    setTab(nextTab);
    setOpenId(id);
    setSelectedId(id);

    // Scroll into view after AnimatePresence tab transition settles
    setTimeout(function () {
      var el = itemRefs.current[id];
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 380);
  }

  function toggleOpen(id) {
    var next = openId === id ? null : id;
    setOpenId(next);
    setSelectedId(next);
  }

  var items = tab === "pillars" ? TECH_PILLARS : APPLIED_SECTORS;
  var sectionBg     = dark ? "#06020f" : "#ffffff";
  var panelBg       = dark ? "rgba(255,255,255,0.02)" : "rgba(13,5,32,0.015)";
  var panelBorder   = dark ? "rgba(255,255,255,0.08)" : "rgba(13,5,32,0.08)";
  var tabInactiveBg = dark ? "rgba(255,255,255,0.04)" : "rgba(13,5,32,0.04)";
  var tabInactiveColor = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";

  return (
    <section
      ref={sectionRef}
      id="framework"
      style={{
        position: "relative",
        background: sectionBg,
        padding: "7rem 5% 8rem",
        borderTop: "1px solid " + panelBorder,
      }}
    >
      {/* Atmospheric backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 50% at 50% 10%, " +
            (dark ? "rgba(122,63,209,0.10)" : "rgba(122,63,209,0.05)") +
            ", transparent 70%)",
        }}
      />

      <div style={{ position: "relative", maxWidth: 1320, margin: "0 auto" }}>

        {/* ── Section eyebrow / heading / subhead ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 18px",
              borderRadius: 999,
              background: dark ? "rgba(245,166,35,0.10)" : "rgba(245,166,35,0.12)",
              border: "1px solid rgba(245,166,35,0.35)",
              fontFamily: "'Orbitron', monospace",
              fontSize: "0.7rem",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--brand-orange, #f5a623)",
              fontWeight: 700,
              marginBottom: 22,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand-orange, #f5a623)", boxShadow: "0 0 10px #f5a623" }} />
            The Innovation Framework
          </div>

          <h2
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.9rem, 4.5vw, 3.6rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              color: textMain,
              marginBottom: 22,
            }}
          >
            From <span style={{ color: accent }}>Innovation</span>{" "}
            to <span style={{ color: "var(--brand-orange, #f5a623)" }}>Impact</span>.
          </h2>

          <p
            style={{
              fontSize: "clamp(1.05rem, 1.6vw, 1.25rem)",
              fontWeight: 500,
              lineHeight: 1.6,
              color: textMid,
              maxWidth: 780,
              margin: "0 auto 14px",
            }}
          >
            Where core technologies converge with real-world transformation.
          </p>

          <p
            style={{
              fontSize: "0.98rem",
              lineHeight: 1.75,
              color: textMid,
              maxWidth: 820,
              margin: "0 auto",
              opacity: 0.85,
            }}
          >
            Nine deep-tech pillars, eleven applied sectors. Tap any node on the globe — or any
            card below — to expand the focus areas TTFC 2026 will host on stage, in the matrix
            sessions, and across the deal-making floor.
          </p>
        </motion.div>

        {/* ── Two-column: Globe (sticky) + Accordion list ─────────────── */}
        <div
          className="framework-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
            gap: "3.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: Globe panel */}
          <div className="framework-globe-col" style={{ position: "sticky", top: 100 }}>
            <div
              style={{
                position: "relative",
                background: panelBg,
                border: "1px solid " + panelBorder,
                borderRadius: 24,
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(50% 50% at 50% 50%, " +
                    (dark ? "rgba(122,63,209,0.08)" : "rgba(122,63,209,0.04)") +
                    ", transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <InteractiveGlobe
                size={Math.min(520, 520)}
                isDarkMode={dark}
                selectedId={selectedId}
                onNodeClick={selectNode}
              />

              {/* Legend */}
              <div
                style={{
                  position: "relative",
                  marginTop: 18,
                  display: "flex",
                  gap: 24,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  color: textMid,
                  fontFamily: "'Orbitron', monospace",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: "radial-gradient(circle, #ffe678, #f5a623)",
                      boxShadow: "0 0 10px rgba(245,166,35,0.6)",
                    }}
                  />
                  9 Tech Pillars
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: "radial-gradient(circle, #d2aaff, #8c50e6)",
                      boxShadow: "0 0 10px rgba(140,80,230,0.6)",
                    }}
                  />
                  11 Applied Sectors
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  marginTop: 10,
                  fontSize: "0.72rem",
                  color: textMid,
                  opacity: 0.65,
                  textAlign: "center",
                }}
              >
                Drag to rotate · Click any node to expand
              </div>
            </div>
          </div>

          {/* RIGHT: Tabs + Accordion list */}
          <div className="framework-list-col">
            {/* Tabs */}
            <div
              role="tablist"
              style={{
                display: "inline-flex",
                padding: 4,
                borderRadius: 14,
                background: tabInactiveBg,
                border: "1px solid " + panelBorder,
                marginBottom: 22,
                gap: 4,
              }}
            >
              {[
                { id: "pillars", label: "9 Tech Pillars", count: TECH_PILLARS.length, color: "var(--brand-orange, #f5a623)" },
                { id: "sectors", label: "11 Applied Sectors", count: APPLIED_SECTORS.length, color: accent },
              ].map(function (t) {
                var active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={function () { setTab(t.id); }}
                    style={{
                      position: "relative",
                      padding: "10px 18px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: active
                        ? (dark ? "rgba(13,5,32,0.6)" : "rgba(255,255,255,1)")
                        : "transparent",
                      color: active ? textMain : tabInactiveColor,
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      transition: "all 0.2s ease",
                      boxShadow: active
                        ? (dark ? "0 2px 12px rgba(0,0,0,0.4)" : "0 2px 12px rgba(13,5,32,0.06)")
                        : "none",
                    }}
                  >
                    <span style={{ color: active ? t.color : "inherit" }}>{t.count}</span>{" "}
                    {t.label.replace(/^\d+\s+/, "")}
                  </button>
                );
              })}
            </div>

            {/* Accordion list */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {items.map(function (item, i) {
                  return (
                    <FrameworkAccordion
                      key={item.id}
                      item={item}
                      index={i}
                      type={tab === "pillars" ? "pillar" : "sector"}
                      open={openId === item.id}
                      onToggle={function () { toggleOpen(item.id); }}
                      dark={dark}
                      elementRef={function (el) { itemRefs.current[item.id] = el; }}
                    />
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .framework-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .framework-globe-col {
            position: relative !important;
            top: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ────────────────────────────────────────────────────────────────────────
export default function Home() {
  var s1 = useState(false); var inquiryOpen = s1[0];        var setInquiryOpen = s1[1];
  var s2 = useState(false); var surveyOpen = s2[0];         var setSurveyOpen = s2[1];
  var s3 = useState("");    var surveyName = s3[0];         var setSurveyName = s3[1];
  var s4 = useState(false); var purchaseOpen = s4[0];       var setPurchaseOpen = s4[1];
  var s5 = useState("");    var purchaseTicketType = s5[0]; var setPurchaseTicketType = s5[1];
  var s6 = useState(false); var dark = s6[0];               var setDark = s6[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    function h(e) { setSurveyName(e.detail && e.detail.name ? e.detail.name : ""); setSurveyOpen(true); }
    window.addEventListener("showSurvey", h);
    return function () { window.removeEventListener("showSurvey", h); };
  }, []);

  useEffect(function () {
    function h(e) { setPurchaseTicketType(e.detail && e.detail.ticketType ? e.detail.ticketType : "Delegate Pass"); setPurchaseOpen(true); }
    window.addEventListener("purchaseComplete", h);
    return function () { window.removeEventListener("purchaseComplete", h); };
  }, []);

  var bg       = dark ? "#06020f"                : "#ffffff";
  var textMain = dark ? "#ffffff"                : "#0d0520";
  var textMid  = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.78)";
  var accent   = dark ? "#b99eff"                : "#7a3fd1";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden", width: "100%", position: "relative" }}>
      <style>{`
        .tfc-navbar-wrap { border-bottom: none !important; box-shadow: none !important; }
        @media (max-width: 640px) {
          .hero-ctas-wrap { flex-direction: column !important; width: 100% !important; }
          .hero-cta-solid, .hero-cta-ghost { width: 100% !important; justify-content: center !important; }
          .hero-sub { text-align: left !important; max-width: 100% !important; }
        }
        @media (min-width: 641px) {
          .hero-sub { max-width: 920px !important; width: 100% !important; }
        }
      `}</style>

      <Navbar />

      {/* HERO UPPER — always dark regardless of theme */}
      <section style={{ position: "relative", overflow: "hidden", background: "#06020f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
          <video autoPlay muted loop playsInline style={{ position: "absolute", top: "50%", left: "50%", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", transform: "translate(-50%, -50%)", objectFit: "cover" }}>
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.65)" }} />
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 6%", maxWidth: 920, width: "100%" }}
        >
          <motion.div variants={itemBlur} style={{ marginBottom: "2.2rem" }}>
            <img
              src="/Tech_Festival_Canada_Logo_Dark_Transparent.png"
              alt="The Tech Festival Canada"
              style={{ width: "100%", maxWidth: 980, height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 50px rgba(155,135,245,0.22))" }}
            />
          </motion.div>
        </motion.div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, zIndex: 4, background: "linear-gradient(to bottom, transparent, " + bg + ")", pointerEvents: "none" }} />
      </section>

      {/* HERO LOWER */}
      <section id="hero-lower" style={{ position: "relative", background: bg, overflow: "hidden", padding: "6rem 5% 8rem" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

          <TextReveal
            text="MEET BUILD SCALE"
            colors={[dark ? "#ffffff" : "#0d0520", accent, "var(--brand-orange, #f5a623)"]}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2.2rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: "0.5rem", whiteSpace: "nowrap", flexWrap: "nowrap" }}
          />
          <SubtitleReveal textMid={textMid} />
          <CTAReveal dark={dark} textMain={textMain} accent={accent} />
        </div>
      </section>

      {/* INNOVATION FRAMEWORK — 9 Pillars × 11 Sectors */}
      <FrameworkSection dark={dark} textMain={textMain} textMid={textMid} accent={accent} />

      {/* ABOUT */}
      <div id="about-section" style={{ background: bg }}>
        <AboutUs onWriteToUs={function () { setInquiryOpen(true); }} />
      </div>

      <SponsorMarquee dark={dark} />

      <div style={{ height: "4rem", background: dark ? "#06020f" : "#ffffff" }} />
      <NewsletterBar dark={dark} />
      <Footer />

      <InquiryModal isOpen={inquiryOpen} onClose={function () { setInquiryOpen(false); }} />
      <PostPurchaseModal isOpen={purchaseOpen} onClose={function () { setPurchaseOpen(false); }} ticketType={purchaseTicketType} />
      <OnboardingSurvey isOpen={surveyOpen} onClose={function () { setSurveyOpen(false); window.location.reload(); }} userName={surveyName} />
    </div>
  );
}
