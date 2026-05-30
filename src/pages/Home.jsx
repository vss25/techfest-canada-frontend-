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
   EXPANDED INNOVATION FRAMEWORK
   9 Tech Pillars + 11 Applied Sectors
   ═══════════════════════════════════════════════════════════ */

var TECH_PILLARS = [
  {
    num: "01",
    title: "Artificial and Augmented Intelligence, and Autonomous Systems",
    items: [
      "Generative AI and foundation models",
      "Enterprise AI deployment and governance",
      "Autonomous decision systems",
      "Human-AI collaboration",
      "Ethical AI and trust frameworks",
    ],
    accent: "#b99eff",
  },
  {
    num: "02",
    title: "Quantum Technologies",
    items: [
      "Quantum computing hardware and algorithms",
      "Quantum communications and encryption",
      "Post-quantum cryptography",
      "Quantum sensing and detection",
      "Commercialization pathways",
    ],
    accent: "#56b3f5",
  },
  {
    num: "03",
    title: "Cybersecurity and Digital Trust",
    items: [
      "Zero trust architectures",
      "Threat intelligence and cyber defense",
      "Identity and access management",
      "Critical infrastructure protection",
      "AI-driven cyber defense",
    ],
    accent: "#f57eb3",
  },
  {
    num: "04",
    title: "Robotics and Intelligent Automation",
    items: [
      "Industrial robotics",
      "Autonomous vehicles and drones",
      "Smart manufacturing systems",
      "Robotic process automation",
      "Human-machine interfaces",
    ],
    accent: "#f5a623",
  },
  {
    num: "05",
    title: "Sustainability and Clean Technology",
    items: [
      "Carbon capture and climate tech",
      "Smart energy systems",
      "ESG data and reporting platforms",
      "Circular economy technologies",
      "Green infrastructure innovation",
    ],
    accent: "#3fd19c",
  },
  {
    num: "06",
    title: "Data Infrastructure and Cloud Ecosystems",
    items: [
      "Cloud computing and hyperscale systems",
      "Data lakes and real-time analytics",
      "Edge computing and distributed systems",
      "Data governance and sovereignty",
      "Digital twin environments",
    ],
    accent: "#7a3fd1",
  },
  {
    num: "07",
    title: "Advanced Connectivity and Communications",
    items: [
      "5G and next-generation networks",
      "Satellite communications and space-based internet",
      "Internet of Things ecosystems",
      "Secure communications platforms",
      "Network resilience and redundancy",
    ],
    accent: "#56b3f5",
  },
  {
    num: "08",
    title: "Human Augmentation and Future Interfaces",
    items: [
      "Wearable technologies",
      "Brain-computer interfaces",
      "Extended reality and spatial computing",
      "Biometric systems",
      "Digital identity and human enhancement",
    ],
    accent: "#e91e8c",
  },
  {
    num: "09",
    title: "AI Governance and Compliance",
    items: [
      "AI policy, regulation, and global standards",
      "Ethical AI and responsible deployment",
      "AI risk management and assurance",
      "Data governance, privacy, and sovereignty",
      "Certification, compliance, and trust frameworks",
    ],
    accent: "#f5a623",
  },
];

var APPLIED_SECTORS = [
  { num: "01", title: "Healthcare and Life Sciences", desc: "Precision medicine, AI diagnostics, digital health platforms, biotech innovation, and public health systems." },
  { num: "02", title: "Banking, Financial Services and Fintech", desc: "Digital banking, blockchain and digital assets, fraud detection, regulatory technology, and payment innovation." },
  { num: "03", title: "Supply Chain, Manufacturing and Infrastructure", desc: "Industry 4.0 smart factories, logistics optimization, digital supply networks, infrastructure resilience, and construction tech." },
  { num: "04", title: "Defense and Public Safety", desc: "Cyber defense, intelligence systems, situational awareness, emergency response, and national security infrastructure." },
  { num: "05", title: "Energy and Utilities", desc: "Smart grids and grid security, renewable energy, energy storage, nuclear innovation and SMRs, and energy trading systems." },
  { num: "06", title: "Smart Cities and Green Tech", desc: "Urban digital infrastructure, smart mobility, sustainable planning, climate monitoring, and green building technologies." },
  { num: "07", title: "Transportation, Aerospace and Mobility", desc: "Autonomous transportation, aviation innovation, urban mobility, drone logistics, and space-enabled transportation." },
  { num: "08", title: "Education, Workforce and Digital Society", desc: "Future of work, cyber education pipelines, EdTech platforms, digital inclusion, and workforce transformation." },
  { num: "09", title: "Aerospace, Space and Defense Systems", desc: "Satellite systems, space commercialization, defense aerospace platforms, orbital security, and advanced propulsion." },
  { num: "10", title: "Emergency Response and Disaster Resilience", desc: "Crisis response, disaster prediction and early warning, climate resilience, search and rescue innovation, and continuity systems." },
  { num: "11", title: "Government, Defense and Strategic Procurement", desc: "Public sector procurement, defense modernization, sovereign tech strategies, public-private partnerships, and compliance frameworks." },
];

/* Tech pillar card */
function PillarCard({ pillar, index, dark }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-50px" });
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.62)" : "rgba(13,5,32,0.62)";
  var cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  var cardBorder = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: "easeOut" }}
      whileHover={{ y: -6, borderColor: pillar.accent }}
      style={{
        background: cardBg,
        border: "1.5px solid " + cardBorder,
        borderRadius: 18,
        padding: "clamp(22px, 2.5vw, 28px)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.25s ease",
        boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 4px 20px rgba(122,63,209,0.05)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Accent corner */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: 60, background: pillar.accent, borderRadius: "0 0 4px 0" }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 900,
          color: pillar.accent,
          letterSpacing: "-0.5px",
        }}>{pillar.num}</span>
        <h3 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.92rem",
          fontWeight: 800,
          color: textMain,
          margin: 0,
          lineHeight: 1.35,
          letterSpacing: "-0.2px",
        }}>{pillar.title}</h3>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "auto 0 0", display: "flex", flexDirection: "column", gap: 7 }}>
        {pillar.items.map(function (item, i) {
          return (
            <li key={i} style={{
              fontSize: "0.78rem",
              color: textMuted,
              lineHeight: 1.5,
              paddingLeft: 14,
              position: "relative",
            }}>
              <span style={{
                position: "absolute",
                left: 0, top: 9,
                width: 5, height: 5,
                borderRadius: "50%",
                background: pillar.accent,
                opacity: 0.7,
              }} />
              {item}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

/* Applied sector card - compact */
function SectorCard({ sector, index, dark }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-50px" });
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.60)";
  var accent = dark ? "#f5a623" : "#d98a14";
  var cardBg = dark ? "rgba(245,166,35,0.04)" : "rgba(245,166,35,0.03)";
  var cardBorder = dark ? "rgba(245,166,35,0.12)" : "rgba(245,166,35,0.18)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}
      whileHover={{ y: -4, borderColor: accent }}
      style={{
        background: cardBg,
        border: "1.5px solid " + cardBorder,
        borderRadius: 16,
        padding: "20px 22px",
        transition: "border-color 0.25s ease",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.78rem",
          fontWeight: 900,
          color: accent,
          letterSpacing: "0.5px",
        }}>{sector.num}</span>
        <h4 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.82rem",
          fontWeight: 800,
          color: textMain,
          margin: 0,
          lineHeight: 1.3,
          letterSpacing: "-0.1px",
        }}>{sector.title}</h4>
      </div>
      <p style={{
        fontSize: "0.76rem",
        color: textMuted,
        lineHeight: 1.6,
        margin: 0,
      }}>{sector.desc}</p>
    </motion.div>
  );
}

function ConvergenceSection({ dark }) {
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.65)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var orange = dark ? "#f5a623" : "#d98a14";

  var introRef = useRef(null);
  var introInView = useInView(introRef, { once: true, margin: "-100px" });

  var sectorsIntroRef = useRef(null);
  var sectorsIntroInView = useInView(sectorsIntroRef, { once: true, margin: "-80px" });

  var collisionRef = useRef(null);
  var collisionInView = useInView(collisionRef, { once: true, margin: "-100px" });

  return (
    <section style={{
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

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1240, margin: "0 auto" }}>

        {/* ─── INTRO ─── */}
        <motion.div
          ref={introRef}
          initial={{ opacity: 0, y: 30 }}
          animate={introInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ maxWidth: 860, margin: "0 auto clamp(50px, 7vw, 80px)", textAlign: "center" }}
        >
          <div style={{
            display: "inline-block",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700, fontSize: "0.62rem",
            letterSpacing: "3px", textTransform: "uppercase",
            color: orange, marginBottom: 18,
            padding: "6px 16px", borderRadius: 999,
            background: orange + "15", border: "1px solid " + orange + "30",
          }}>OUR FRAMEWORK</div>

          <h2 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
            lineHeight: 1.1, letterSpacing: "-1px",
            color: textMain, marginBottom: 18,
          }}>
            From Innovation to Impact.
          </h2>
          <h3 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(1.1rem, 2.2vw, 1.55rem)",
            lineHeight: 1.3, letterSpacing: "-0.3px",
            marginBottom: 24,
          }}>
            Where Core Technologies Converge with{" "}
            <span style={{
              backgroundImage: "linear-gradient(135deg, " + accent + ", " + orange + ")",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}>Real-World Transformation</span>
          </h3>
          <p style={{
            fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
            color: textMuted, lineHeight: 1.75,
            maxWidth: 700, margin: "0 auto",
          }}>
            Our expanded innovation framework reflects how technology is being deployed at global scale: nine core technology pillars converging with eleven applied sectors where real-world impact happens.
          </p>
        </motion.div>

        {/* ─── 9 TECH PILLARS ─── */}
        <div style={{ marginBottom: "clamp(70px, 10vw, 110px)" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={introInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ textAlign: "center", marginBottom: 36 }}
          >
            <div style={{
              display: "inline-block",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700, fontSize: "0.58rem",
              letterSpacing: "2.5px", textTransform: "uppercase",
              color: accent, marginBottom: 12,
              padding: "5px 14px", borderRadius: 999,
              background: accent + "15", border: "1px solid " + accent + "30",
            }}>NINE CORE PILLARS</div>
            <h3 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              letterSpacing: "-0.5px",
              color: textMain, margin: 0,
            }}>Technology Pillars</h3>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "clamp(14px, 1.5vw, 20px)",
          }}>
            {TECH_PILLARS.map(function (pillar, i) {
              return <PillarCard key={pillar.num} pillar={pillar} index={i} dark={dark} />;
            })}
          </div>
        </div>

        {/* ─── DIVIDER ─── */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={sectorsIntroInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            width: "100%", maxWidth: 200, height: 2,
            background: "linear-gradient(90deg, transparent, " + accent + ", " + orange + ", transparent)",
            margin: "0 auto clamp(50px, 7vw, 80px)",
            transformOrigin: "center",
          }}
        />

        {/* ─── 11 APPLIED SECTORS ─── */}
        <div style={{ marginBottom: "clamp(60px, 9vw, 100px)" }}>
          <motion.div
            ref={sectorsIntroRef}
            initial={{ opacity: 0, y: 16 }}
            animate={sectorsIntroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 36 }}
          >
            <div style={{
              display: "inline-block",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700, fontSize: "0.58rem",
              letterSpacing: "2.5px", textTransform: "uppercase",
              color: orange, marginBottom: 12,
              padding: "5px 14px", borderRadius: 999,
              background: orange + "15", border: "1px solid " + orange + "30",
            }}>ELEVEN APPLIED SECTORS</div>
            <h3 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              letterSpacing: "-0.5px",
              color: textMain, margin: "0 0 12px",
            }}>Where the Pillars Get Deployed</h3>
            <p style={{
              fontSize: "0.95rem", color: textMuted,
              lineHeight: 1.6, maxWidth: 580, margin: "0 auto",
            }}>
              Industries where technology meets policy, strategy, and real-world implementation.
            </p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "clamp(12px, 1.2vw, 16px)",
          }}>
            {APPLIED_SECTORS.map(function (sector, i) {
              return <SectorCard key={sector.num} sector={sector} index={i} dark={dark} />;
            })}
          </div>
        </div>

        {/* ─── COLLISION CALL-TO-ACTION ─── */}
        <motion.div
          ref={collisionRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={collisionInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: "spring", damping: 22, stiffness: 90, delay: 0.1 }}
          style={{
            maxWidth: 820, margin: "0 auto",
            textAlign: "center",
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
            marginBottom: 20, color: textMain,
          }}>
            We're now thinking<br />
            <span style={{
              backgroundImage: "linear-gradient(135deg, " + accent + ", " + orange + ", #e91e8c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}>COLLISION.</span>
          </h3>

          <p style={{
            fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
            color: textMuted, lineHeight: 1.75,
            maxWidth: 620, margin: "0 auto",
          }}>
            Where AI collides with policy. Where quantum collides with finance. Where defense collides with sustainability. Where ideas don't just meet — they collide, react, and produce something the world hasn't seen yet.
          </p>
        </motion.div>

      </div>
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
        }
        @media (min-width: 641px) {
          .hero-sub { max-width: 920px !important; width: 100% !important; }
        }
      `}</style>

      <Navbar />

      {/* HERO UPPER */}
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

      {/* ─── EXPANDED FRAMEWORK ─── */}
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
