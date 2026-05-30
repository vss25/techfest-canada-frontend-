import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AboutUs from "../components/AboutUs";
import { useEffect, useState, useRef } from "react";
import InquiryModal from "../components/InquiryModal";
import PostPurchaseModal from "../components/PostPurchaseModal";
import OnboardingSurvey from "../components/OnboardingSurvey";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import SponsorMarquee from "../components/SponsorMarquee";
import NewsletterBar from "../components/NewsletterBar";

var containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } },
};

var itemBlur = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 22 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { type: "spring", bounce: 0.3, duration: 1.5 } },
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
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.14, delayChildren: delay } } }}
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
      Canada's first-of-its-kind, deal-making platform where innovators, buyers, and policymakers turn emerging tech into real partnerships, pilots, and contracts, not just conversations. Expect a never-seen-before concentration of senior decision-makers from enterprise and critical sectors, alongside government, associations, media, and leading research institutions.
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
      <motion.a href="/tickets" className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 14, textDecoration: "none", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "1.2px", textTransform: "uppercase" }}
      >
        Get Your Pass
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </motion.a>
      <motion.a href="/sponsor#compare-packages" className="btn-outline" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none" }}
      >
        Partner With Us
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
      </motion.a>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONVERGENCE TIMELINE — scroll-triggered story
   ═══════════════════════════════════════════════════════════ */

var TIMELINE_STEPS = [
  {
    num: "01",
    icon: "🔀",
    title: "The Convergence is Real",
    headline: "Technology is no longer siloed.",
    body: "AI, cybersecurity, quantum, data infrastructure, and governance are converging into interconnected systems. Our expanded pillars reflect this reality — and position TTFC at the forefront of that convergence.",
    accent: "#b99eff",
  },
  {
    num: "02",
    icon: "🌐",
    title: "From Conference to Strategic Platform",
    headline: "Where technology meets policy.",
    body: "By introducing AI Governance & Compliance and expanding into aerospace, disaster resilience, and strategic procurement, we move beyond a traditional tech conference into a platform where ideas become real-world implementation.",
    accent: "#f5a623",
  },
  {
    num: "03",
    icon: "🎯",
    title: "Relevance for Enterprise, Government & Investors",
    headline: "Where the funding is going.",
    body: "Our expanded applied sectors — smart cities, green tech, aerospace, emergency resilience, public sector procurement — align directly with where global capital, policy attention, and large-scale adoption are happening right now.",
    accent: "#e91e8c",
  },
  {
    num: "04",
    icon: "🤝",
    title: "Unlocking Partnership Opportunities",
    headline: "Sponsors mapped to outcomes.",
    body: "A broader, clearly-defined framework lets us map sponsors directly to both core technologies and industry applications. Better alignment, clearer value, stronger long-term partnerships.",
    accent: "#56b3f5",
  },
  {
    num: "05",
    icon: "🛡️",
    title: "Leadership in Trust & Governance",
    headline: "Capability isn't the question. Trust is.",
    body: "As AI adoption accelerates globally, the defining issue is no longer capability alone — it's trust. By addressing governance, ethics, certification, and compliance, we position TTFC as a leader in shaping responsible innovation.",
    accent: "#3fd19c",
  },
];

function TimelineStep({ step, index, dark }) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-100px" });
  var isLeft = index % 2 === 0;

  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.65)";
  var cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  var cardBorder = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end", marginBottom: "clamp(60px, 8vw, 100px)" }}>

      {/* Center dot on timeline */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
        style={{
          position: "absolute", left: "50%", top: 32, transform: "translateX(-50%)",
          width: 20, height: 20, borderRadius: "50%",
          background: step.accent,
          boxShadow: "0 0 0 4px " + (dark ? "#06020f" : "#ffffff") + ", 0 0 30px " + step.accent + "80",
          zIndex: 2,
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -50 : 50, y: 20 }}
        animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ type: "spring", damping: 22, stiffness: 90, delay: 0.1 }}
        className="timeline-card"
        style={{
          width: "calc(50% - 40px)",
          padding: "clamp(24px, 3.5vw, 36px)",
          borderRadius: 20,
          background: cardBg,
          border: "1px solid " + cardBorder,
          boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(122,63,209,0.08)",
          position: "relative",
        }}
      >
        {/* Accent line */}
        <div style={{
          position: "absolute",
          top: 0,
          [isLeft ? "right" : "left"]: -1,
          width: 3, height: "100%",
          background: "linear-gradient(180deg, " + step.accent + ", transparent)",
          borderRadius: isLeft ? "0 20px 20px 0" : "20px 0 0 20px",
        }} />

        {/* Step number + icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "2.5px",
            color: step.accent,
            padding: "5px 12px",
            borderRadius: 999,
            background: step.accent + "15",
            border: "1px solid " + step.accent + "30",
          }}>STEP {step.num}</div>
          <span style={{ fontSize: "1.6rem" }}>{step.icon}</span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
          fontWeight: 800,
          color: textMain,
          margin: "0 0 10px",
          lineHeight: 1.25,
          letterSpacing: "-0.3px",
        }}>{step.title}</h3>

        {/* Headline */}
        <p style={{
          fontSize: "clamp(0.95rem, 1.4vw, 1.1rem)",
          fontWeight: 700,
          color: step.accent,
          margin: "0 0 14px",
          lineHeight: 1.4,
        }}>{step.headline}</p>

        {/* Body */}
        <p style={{
          fontSize: "0.92rem",
          lineHeight: 1.75,
          color: textMuted,
          margin: 0,
        }}>{step.body}</p>
      </motion.div>
    </div>
  );
}

function ConvergenceSection({ dark }) {
  var containerRef = useRef(null);
  var scrollHook = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  var scrollYProgress = scrollHook.scrollYProgress;
  var lineHeight = useTransform(scrollYProgress, [0.05, 0.85], ["0%", "100%"]);

  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.65)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var orange = dark ? "#f5a623" : "#d98a14";

  var introRef = useRef(null);
  var introInView = useInView(introRef, { once: true, margin: "-100px" });

  var outroRef = useRef(null);
  var outroInView = useInView(outroRef, { once: true, margin: "-100px" });

  return (
    <section ref={containerRef} style={{
      position: "relative",
      background: dark ? "#06020f" : "#ffffff",
      padding: "clamp(60px, 10vw, 120px) 5% clamp(80px, 12vw, 140px)",
      overflow: "hidden",
    }}>

      {/* Background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: dark
          ? "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(122,63,209,0.10) 0%, transparent 70%)"
          : "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(122,63,209,0.04) 0%, transparent 70%)",
      }} />

      {/* INTRO */}
      <motion.div
        ref={introRef}
        initial={{ opacity: 0, y: 30 }}
        animate={introInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ maxWidth: 800, margin: "0 auto clamp(60px, 8vw, 100px)", textAlign: "center", position: "relative", zIndex: 2 }}
      >
        <div style={{
          display: "inline-block",
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700, fontSize: "0.62rem",
          letterSpacing: "3px", textTransform: "uppercase",
          color: orange, marginBottom: 18,
          padding: "6px 16px", borderRadius: 999,
          background: orange + "15", border: "1px solid " + orange + "30",
        }}>OUR VISION</div>

        <h2 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
          lineHeight: 1.1, letterSpacing: "-1px",
          color: textMain, marginBottom: 20,
        }}>
          We're Not Building a<br />
          <span style={{ backgroundImage: "linear-gradient(135deg, " + accent + ", " + orange + ")", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Tech Conference</span>
        </h2>

        <p style={{ fontSize: "clamp(1rem, 1.6vw, 1.15rem)", color: textMuted, lineHeight: 1.75, maxWidth: 640, margin: "0 auto" }}>
          We're building a global convergence platform where emerging technologies meet critical industries, public policy, and real-world impact. Here's how we're getting there.
        </p>
      </motion.div>

      {/* TIMELINE CONTAINER */}
      <div className="convergence-timeline" style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>

        {/* Center spine — background line */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          width: 2, transform: "translateX(-50%)",
          background: dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.10)",
          zIndex: 0,
        }} />

        {/* Center spine — animated progress fill */}
        <motion.div style={{
          position: "absolute", left: "50%", top: 0,
          width: 2, transform: "translateX(-50%)",
          height: lineHeight,
          background: "linear-gradient(180deg, " + accent + ", " + orange + ")",
          zIndex: 1,
          boxShadow: "0 0 20px " + accent + "80",
        }} />

        {/* Steps */}
        {TIMELINE_STEPS.map(function (step, i) {
          return <TimelineStep key={i} step={step} index={i} dark={dark} />;
        })}
      </div>

      {/* OUTRO — COLLISION moment */}
      <motion.div
        ref={outroRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={outroInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: "spring", damping: 20, stiffness: 90, delay: 0.2 }}
        style={{
          maxWidth: 800, margin: "clamp(60px, 8vw, 100px) auto 0",
          textAlign: "center", position: "relative", zIndex: 2,
          padding: "clamp(40px, 6vw, 72px) clamp(28px, 5vw, 56px)",
          borderRadius: 28,
          background: dark
            ? "linear-gradient(135deg, rgba(122,63,209,0.18), rgba(245,166,35,0.10))"
            : "linear-gradient(135deg, rgba(122,63,209,0.10), rgba(245,166,35,0.06))",
          border: dark ? "1px solid rgba(122,63,209,0.30)" : "1px solid rgba(122,63,209,0.18)",
          boxShadow: dark ? "0 16px 64px rgba(122,63,209,0.20)" : "0 16px 64px rgba(122,63,209,0.10)",
        }}
      >
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700, fontSize: "0.6rem",
          letterSpacing: "3px", textTransform: "uppercase",
          color: orange, marginBottom: 14,
        }}>THE BIG IDEA</div>

        <h3 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: "clamp(2rem, 6vw, 4rem)",
          lineHeight: 1, letterSpacing: "-2px",
          marginBottom: 20,
        }}>
          We're now thinking<br />
          <span style={{ backgroundImage: "linear-gradient(135deg, " + accent + ", " + orange + ", #e91e8c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>COLLISION.</span>
        </h3>

        <p style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)", color: textMuted, lineHeight: 1.75, maxWidth: 580, margin: "0 auto" }}>
          Where AI collides with policy. Where quantum collides with finance. Where defence collides with sustainability. Where ideas don't just meet — they collide, react, and produce something the world hasn't seen yet.
        </p>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */

export default function Home() {
  var s1 = useState(false); var inquiryOpen = s1[0]; var setInquiryOpen = s1[1];
  var s2 = useState(false); var surveyOpen = s2[0]; var setSurveyOpen = s2[1];
  var s3 = useState(""); var surveyName = s3[0]; var setSurveyName = s3[1];
  var s4 = useState(false); var purchaseOpen = s4[0]; var setPurchaseOpen = s4[1];
  var s5 = useState(""); var purchaseTicketType = s5[0]; var setPurchaseTicketType = s5[1];
  var s6 = useState(false); var dark = s6[0]; var setDark = s6[1];

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

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.78)";
  var accent = dark ? "#b99eff" : "#7a3fd1";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden", width: "100%", position: "relative" }}>
      <style>{`
        .tfc-navbar-wrap { border-bottom: none !important; box-shadow: none !important; }
        @media (max-width: 640px) {
          .hero-ctas-wrap { flex-direction: column !important; width: 100% !important; }
          .hero-cta-solid, .hero-cta-ghost { width: 100% !important; justify-content: center !important; }
          .hero-sub { text-align: left !important; max-width: 100% !important; }
          .timeline-card { width: calc(100% - 40px) !important; margin-left: 40px !important; }
          .convergence-timeline > div > div:first-of-type { left: 20px !important; transform: translateX(-50%) !important; }
        }
        @media (min-width: 641px) {
          .hero-sub { max-width: 920px !important; width: 100% !important; }
        }
        @media (max-width: 900px) {
          .convergence-timeline { padding-left: 40px; }
          .convergence-timeline > div { justify-content: flex-start !important; }
          .timeline-card { width: calc(100% - 60px) !important; }
        }
      `}</style>

      <Navbar />

      {/* HERO UPPER — always dark */}
      <section style={{ position: "relative", overflow: "hidden", background: "#06020f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
          <video autoPlay muted loop playsInline style={{ position: "absolute", top: "50%", left: "50%", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", transform: "translate(-50%, -50%)", objectFit: "cover" }}>
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.65)" }} />
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 6%", maxWidth: 920, width: "100%" }}>
          <motion.div variants={itemBlur} style={{ marginBottom: "2.2rem" }}>
            <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada"
              style={{ width: "100%", maxWidth: 980, height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 50px rgba(155,135,245,0.22))" }} />
          </motion.div>
        </motion.div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, zIndex: 4, background: "linear-gradient(to bottom, transparent, " + bg + ")", pointerEvents: "none" }} />
      </section>

      {/* HERO LOWER */}
      <section id="hero-lower" style={{ position: "relative", background: bg, overflow: "hidden", padding: "6rem 5% 8rem" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <TextReveal text="MEET BUILD SCALE"
            colors={[dark ? "#ffffff" : "#0d0520", accent, "var(--brand-orange, #f5a623)"]}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2.2rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: "0.5rem", whiteSpace: "nowrap", flexWrap: "nowrap" }} />
          <SubtitleReveal textMid={textMid} />
          <CTAReveal dark={dark} textMain={textMain} accent={accent} />
        </div>
      </section>

      {/* ─── NEW: CONVERGENCE TIMELINE ─── */}
      <ConvergenceSection dark={dark} />

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
