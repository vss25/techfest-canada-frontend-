import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AboutUs from "../components/AboutUs";
import { useEffect, useState, useRef } from "react";
import InquiryModal from "../components/InquiryModal";
import PostPurchaseModal from "../components/PostPurchaseModal";
import OnboardingSurvey from "../components/OnboardingSurvey";
import { motion, useInView } from "framer-motion";
import SponsorMarquee from "../components/SponsorMarquee";
import NewsletterBar from "../components/NewsletterBar";

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
