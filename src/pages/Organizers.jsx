import { useEffect, useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/* ══════════════════════════════════════════════════════════
   ANIMATION PRESETS
   ══════════════════════════════════════════════════════════ */
var EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
var EASE_OUT_QUART = [0.22, 1, 0.36, 1];

/* ══════════════════════════════════════════════════════════
   REVEAL TEXT — opacity + blur entrance (no clip-path)
   This guarantees text shows on mobile even if useInView is flaky
   ══════════════════════════════════════════════════════════ */
function RevealText({ children, delay, as, className, style }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 1.0,
        delay: delay || 0,
        ease: EASE_OUT_EXPO,
      }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ══════════════════════════════════════════════════════════
   SOFT FADE — for body text and supporting elements
   ══════════════════════════════════════════════════════════ */
function SoftReveal({ children, delay, className, style, as }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 1.0,
        delay: delay || 0,
        ease: EASE_OUT_QUART,
      }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ══════════════════════════════════════════════════════════
   CONTENT
   ══════════════════════════════════════════════════════════ */
var SERVICES = [
  {
    title: "Business Intelligence & Market Insights",
    body: "Industry deep-dives, competitive landscaping, demand and supply analysis, and bespoke research engagements that surface where markets are heading and where the white space lies.",
  },
  {
    title: "Strategy Consulting",
    body: "Market entry, growth strategy, sector diversification, partnership architecture and commercial planning for corporates, public-sector clients and high-growth ventures.",
  },
  {
    title: "Marketing & Brand Consultancy",
    body: "Positioning, messaging, brand voice, demand generation, content strategy and integrated campaigns that move audiences and pipelines.",
  },
  {
    title: "Conferences, Exhibitions & Curated Convenings",
    body: "End-to-end production of large-format business events that bring policymakers, executives and innovators into the same room, with a global MICE delivery track record.",
  },
];

var SECTORS = [
  "Technology & Digital Infrastructure",
  "Financial Services & Insurance",
  "Energy & Utilities",
  "Healthcare & Life Sciences",
  "Manufacturing & Supply Chain",
  "Defence & National Security",
  "Public Sector & Economic Development",
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Organizers() {
  var s = useState(false);
  var dark = s[0];
  var setDark = s[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  // Hero parallax
  var heroRef = useRef(null);
  var scrollData = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  var heroY = useTransform(scrollData.scrollYProgress, [0, 1], ["0%", "30%"]);
  var heroOpacity = useTransform(scrollData.scrollYProgress, [0, 0.7], [1, 0]);

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.62)" : "rgba(13,5,32,0.62)";
  var textDim = dark ? "rgba(255,255,255,0.30)" : "rgba(13,5,32,0.30)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var orange = dark ? "#f5a623" : "#d98a14";
  var borderCol = dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)";
  var cardBg = dark ? "rgba(255,255,255,0.03)" : "rgba(122,63,209,0.025)";

  var brandGradient = "linear-gradient(135deg, " + accent + ", " + orange + ")";

  return (
    <>
      <style>{`
        /* ─── BRAND GRADIENT TEXT ─── */
        .org-grad-text {
          background-image: var(--org-gradient);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px transparent;
          display: inline-block;
        }
        .org-grad-text.org-grad-block {
          display: block;
          width: 100%;
        }

        /* ─── SILVER MATTE TEXT ─── */
        .org-silver-text {
          background: var(--org-silver-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          transform: translateZ(0);
          filter: var(--org-silver-filter);
          display: inline-block;
        }

        /* ─── FILM GRAIN ─── */
        .org-film-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 30;
          opacity: 0.04;
          mix-blend-mode: overlay;
          background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
        }

        /* ─── GRID BACKDROP ─── */
        .org-grid-backdrop {
          position: absolute;
          inset: 0;
          background-size: 60px 60px;
          background-image:
            linear-gradient(to right, var(--org-grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--org-grid-line) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          pointer-events: none;
          opacity: 0.5;
        }

        /* ─── AURORA ─── */
        :root {
          --org-aurora-white: #ffffff;
          --org-aurora-black: #06020f;
          --org-aurora-purple: #7a3fd1;
          --org-aurora-violet: #9b57e8;
          --org-aurora-lilac: #c4a0f5;
          --org-aurora-orange: #f5a623;
          --org-aurora-amber: #f7c15e;
        }
        @keyframes org-aurora {
          from { background-position: 50% 50%, 50% 50%; }
          to   { background-position: 350% 50%, 350% 50%; }
        }
        .org-aurora-layer {
          position: absolute; inset: -10px; pointer-events: none;
          will-change: transform;
          background-size: 300%, 200%;
          background-position: 50% 50%;
          filter: blur(10px);
          opacity: 0.45;
        }
        .org-aurora-layer--dark {
          background-image:
            repeating-linear-gradient(100deg, var(--org-aurora-black) 0%, var(--org-aurora-black) 7%, transparent 10%, transparent 12%, var(--org-aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--org-aurora-purple) 10%, var(--org-aurora-lilac) 15%, var(--org-aurora-orange) 20%, var(--org-aurora-amber) 25%, var(--org-aurora-violet) 30%);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
        }
        .org-aurora-layer--dark::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--org-aurora-black) 0%, var(--org-aurora-black) 7%, transparent 10%, transparent 12%, var(--org-aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--org-aurora-purple) 10%, var(--org-aurora-lilac) 15%, var(--org-aurora-orange) 20%, var(--org-aurora-amber) 25%, var(--org-aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: org-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }
        .org-aurora-layer--light {
          background-image:
            repeating-linear-gradient(100deg, var(--org-aurora-white) 0%, var(--org-aurora-white) 7%, transparent 10%, transparent 12%, var(--org-aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--org-aurora-purple) 10%, var(--org-aurora-lilac) 15%, var(--org-aurora-orange) 20%, var(--org-aurora-amber) 25%, var(--org-aurora-violet) 30%);
          opacity: 0.3; filter: blur(12px);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
        }
        .org-aurora-layer--light::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--org-aurora-white) 0%, var(--org-aurora-white) 7%, transparent 10%, transparent 12%, var(--org-aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--org-aurora-purple) 10%, var(--org-aurora-lilac) 15%, var(--org-aurora-orange) 20%, var(--org-aurora-amber) 25%, var(--org-aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: org-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }

        /* ─── DIVIDER ─── */
        .org-divider {
          height: 1px;
          width: 100%;
          max-width: 100px;
          margin: 0 auto;
          background: linear-gradient(90deg, transparent, var(--org-divider-color), transparent);
        }

        /* ─── SERVICE CARDS ─── */
        .org-service-card {
          position: relative;
          padding: 36px 32px;
          border-radius: 20px;
          background: var(--org-card-bg);
          border: 1px solid var(--org-card-border);
          overflow: hidden;
          isolation: isolate;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                      box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                      border-color 0.4s ease;
        }
        .org-service-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            500px circle at var(--mx, 50%) var(--my, 50%),
            var(--org-sheen) 0%,
            transparent 40%
          );
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: 1;
        }
        @media (hover: hover) and (pointer: fine) {
          .org-service-card:hover { transform: translateY(-4px); }
          .org-service-card:hover::before { opacity: 1; }
        }
        @media (max-width: 540px) {
          .org-service-card {
            padding: 24px 22px;
            border-radius: 16px;
          }
        }

        /* ─── SECTOR PILLS ─── */
        .org-sector-pill {
          display: inline-flex;
          align-items: center;
          padding: 12px 22px;
          border-radius: 999px;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          background: var(--org-pill-bg);
          color: var(--org-pill-text);
          border: 1px solid var(--org-pill-border);
          transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .org-sector-pill:hover {
            transform: translateY(-2px);
            background: var(--org-pill-hover-bg);
            border-color: var(--org-pill-hover-border);
          }
        }
        @media (max-width: 540px) {
          .org-sector-pill {
            padding: 10px 18px;
            font-size: 0.66rem;
          }
        }
      `}</style>

      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: textMain,
          ["--org-gradient"]: brandGradient,
          ["--org-silver-gradient"]: dark
            ? "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)"
            : "linear-gradient(180deg, #0d0520 0%, rgba(13,5,32,0.55) 100%)",
          ["--org-silver-filter"]: dark
            ? "drop-shadow(0px 8px 18px rgba(185,158,255,0.15)) drop-shadow(0px 2px 4px rgba(0,0,0,0.4))"
            : "drop-shadow(0px 8px 18px rgba(122,63,209,0.12)) drop-shadow(0px 2px 4px rgba(122,63,209,0.06))",
          ["--org-grid-line"]: dark ? "rgba(255,255,255,0.05)" : "rgba(13,5,32,0.05)",
          ["--org-divider-color"]: dark ? "rgba(185,158,255,0.35)" : "rgba(122,63,209,0.35)",
          ["--org-card-bg"]: cardBg,
          ["--org-card-border"]: borderCol,
          ["--org-sheen"]: dark ? "rgba(185,158,255,0.10)" : "rgba(122,63,209,0.08)",
          ["--org-pill-bg"]: dark ? "rgba(255,255,255,0.05)" : "rgba(122,63,209,0.05)",
          ["--org-pill-text"]: dark ? "rgba(255,255,255,0.85)" : "rgba(13,5,32,0.78)",
          ["--org-pill-border"]: dark ? "rgba(155,135,245,0.25)" : "rgba(122,63,209,0.20)",
          ["--org-pill-hover-bg"]: dark ? "rgba(155,135,245,0.12)" : "rgba(122,63,209,0.10)",
          ["--org-pill-hover-border"]: dark ? "rgba(155,135,245,0.5)" : "rgba(122,63,209,0.4)",
        }}
      >

        {/* ═══════════════ HERO ═══════════════ */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            minHeight: "92vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(120px, 16vw, 160px) 5% clamp(60px, 10vw, 120px)",
            overflow: "hidden",
            background: dark
              ? "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.14) 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.07) 0%, transparent 70%)",
          }}
        >
          <div className="org-grid-backdrop" />

          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div className={dark ? "org-aurora-layer org-aurora-layer--dark" : "org-aurora-layer org-aurora-layer--light"} />
          </div>

          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: dark
              ? "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #06020f 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #ffffff 100%)",
          }} />

          <div className="org-film-grain" />

          <motion.div
            style={{
              y: heroY,
              opacity: heroOpacity,
              position: "relative",
              zIndex: 10,
              maxWidth: 900,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <SoftReveal delay={0.1}>
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: orange,
                  marginBottom: 28,
                }}
              >
                The Tech Festival Canada 2026
              </div>
            </SoftReveal>

            <h1
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(2.5rem, 7vw, 5rem)",
                letterSpacing: "-1.5px",
                lineHeight: 1.05,
                marginBottom: 32,
              }}
            >
              <RevealText as="span" delay={0.3} className="org-silver-text" style={{ display: "block" }}>
                Meet the
              </RevealText>
              <RevealText as="span" delay={0.55} className="org-grad-text" style={{ display: "block" }}>
                Organizers
              </RevealText>
            </h1>

            <SoftReveal delay={0.95}>
              <p
                style={{
                  fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
                  color: textMuted,
                  lineHeight: 1.8,
                  maxWidth: 720,
                  margin: "0 auto",
                  textAlign: "center",
                  fontWeight: 400,
                }}
              >
                The Tech Festival Canada is produced by AtlasLink Markets Inc. — a Canadian-incorporated business intelligence and strategy advisory firm translating signal into decisions, and decisions into measurable commercial outcomes.
              </p>
            </SoftReveal>

            <SoftReveal delay={1.2}>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                style={{
                  marginTop: 64,
                  textAlign: "center",
                  color: textDim,
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>↓</div>
                Discover AtlasLink
              </motion.div>
            </SoftReveal>
          </motion.div>
        </section>

        {/* ═══════════════ ABOUT ═══════════════ */}
        <section style={{ padding: "100px 5% 60px", maxWidth: 900, margin: "0 auto" }}>
          <SoftReveal>
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: textDim,
                marginBottom: 16,
              }}
            >
              About Us
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="org-grad-text org-grad-block"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            AtlasLink Markets Inc.
          </RevealText>

          <SoftReveal delay={0.4}>
            <div className="org-divider" style={{ marginBottom: 36 }} />
          </SoftReveal>

          <SoftReveal delay={0.5}>
            <p
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.1rem)",
                color: textMuted,
                lineHeight: 1.85,
                textAlign: "center",
                maxWidth: 760,
                margin: "0 auto",
              }}
            >
              <strong style={{ color: textMain, fontWeight: 700 }}>AtlasLink Markets Inc.</strong>{" "}
              is a Canadian-incorporated business intelligence and strategy advisory firm headquartered in Oakville, Ontario. We help organisations navigate complex, fast-moving markets through evidence-led research, sharp positioning, and high-impact execution. Our practice sits at the intersection of data, strategy and storytelling — translating signal into decisions, and decisions into measurable commercial outcomes for corporates, scale-ups, government agencies and institutional partners across the global trade corridor.
            </p>
          </SoftReveal>
        </section>

        {/* ═══════════════ WHAT WE DO ═══════════════ */}
        <section style={{ padding: "60px 5%", maxWidth: 1200, margin: "0 auto" }}>
          <SoftReveal>
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: textDim,
                marginBottom: 16,
              }}
            >
              What We Do
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="org-grad-text org-grad-block"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            Our Practice
          </RevealText>

          <SoftReveal delay={0.4}>
            <div className="org-divider" style={{ marginBottom: 56 }} />
          </SoftReveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {SERVICES.map(function (service, i) {
              return (
                <ServiceCard
                  key={service.title}
                  service={service}
                  index={i}
                  textMain={textMain}
                  textMuted={textMuted}
                  accent={accent}
                />
              );
            })}
          </div>
        </section>

        {/* ═══════════════ SECTORS WE SERVE ═══════════════ */}
        <section style={{ padding: "80px 5% 60px", maxWidth: 1100, margin: "0 auto" }}>
          <SoftReveal>
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: textDim,
                marginBottom: 16,
              }}
            >
              Sectors We Serve
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="org-grad-text org-grad-block"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            Industries In Focus
          </RevealText>

          <SoftReveal delay={0.4}>
            <div className="org-divider" style={{ marginBottom: 48 }} />
          </SoftReveal>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {SECTORS.map(function (sector, i) {
              return (
                <motion.div
                  key={sector}
                  initial={{ opacity: 0, scale: 0.85, y: 16 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.06,
                    ease: EASE_OUT_QUART,
                  }}
                  className="org-sector-pill"
                >
                  {sector}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════ FLAGSHIP INITIATIVE ═══════════════ */}
        <section style={{ padding: "80px 5% 60px", maxWidth: 900, margin: "0 auto" }}>
          <SoftReveal>
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: orange,
                marginBottom: 16,
              }}
            >
              Flagship Initiative
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="org-grad-text org-grad-block"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            The Tech Festival Canada (TTFC) 2026
          </RevealText>

          <SoftReveal delay={0.4}>
            <div className="org-divider" style={{ marginBottom: 36 }} />
          </SoftReveal>

          <SoftReveal delay={0.5}>
            <p
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.1rem)",
                color: textMuted,
                lineHeight: 1.85,
                textAlign: "center",
                maxWidth: 760,
                margin: "0 auto",
              }}
            >
              AtlasLink is the producer of <strong style={{ color: textMain, fontWeight: 700 }}>TTFC 2026</strong>, a national-scale technology and innovation festival convening senior leaders across artificial intelligence, quantum computing, cybersecurity, robotics and sustainability — with applied tracks across financial services, healthcare, energy, defence and supply chain.
            </p>
          </SoftReveal>
        </section>

        {/* ═══════════════ LEADERSHIP ═══════════════ */}
        <section style={{ padding: "80px 5% 100px", maxWidth: 900, margin: "0 auto" }}>
          <SoftReveal>
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: textDim,
                marginBottom: 16,
              }}
            >
              Leadership
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="org-grad-text org-grad-block"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            Built By Practitioners
          </RevealText>

          <SoftReveal delay={0.4}>
            <div className="org-divider" style={{ marginBottom: 36 }} />
          </SoftReveal>

          <SoftReveal delay={0.5}>
            <p
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.1rem)",
                color: textMuted,
                lineHeight: 1.85,
                textAlign: "center",
                maxWidth: 760,
                margin: "0 auto 28px",
              }}
            >
              Serial entrepreneurs with an MBA from the Indian School of Business and executive education from The Wharton School and the Kellogg School of Management. Our team holds PMP, 6 Sigma and COPC certifications, and brings over two decades of experience across strategy, international business development and large-format MICE programmes — including engagements with world-renowned events.
            </p>
          </SoftReveal>

          <SoftReveal delay={0.7}>
            <p
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.1rem)",
                color: textMuted,
                lineHeight: 1.85,
                textAlign: "center",
                maxWidth: 760,
                margin: "0 auto",
                fontStyle: "italic",
              }}
            >
              We combine the rigour of a research house, the creativity of a marketing studio and the convening power of an events company under one roof. Clients engage us when the stakes are high, the answer isn't obvious, and the work has to be done well.
            </p>
          </SoftReveal>
        </section>

        {/* ═══════════════ CTA ═══════════════ */}
        <section style={{ padding: "60px 5% 100px", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <SoftReveal>
            <div
              style={{
                padding: "clamp(40px, 6vw, 64px)",
                borderRadius: 24,
                background: dark
                  ? "linear-gradient(135deg, rgba(122,63,209,0.12), rgba(245,166,35,0.06))"
                  : "linear-gradient(135deg, rgba(122,63,209,0.07), rgba(245,166,35,0.04))",
                border: "1px solid " + borderCol,
                boxShadow: dark
                  ? "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)"
                  : "0 30px 80px -20px rgba(122,63,209,0.18), inset 0 1px 1px rgba(255,255,255,0.8)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  color: orange,
                  marginBottom: 18,
                }}
              >
                Get In Touch
              </div>
              <h2
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.15,
                  marginBottom: 18,
                  color: textMain,
                }}
              >
                Work with{" "}
                <span className="org-grad-text">AtlasLink</span>
              </h2>
              <p
                style={{
                  fontSize: "1rem",
                  color: textMuted,
                  lineHeight: 1.75,
                  maxWidth: 500,
                  margin: "0 auto 28px",
                  textAlign: "center",
                }}
              >
                374 Wheatboom Drive, Oakville, Ontario, Canada · Federally incorporated in Canada
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <motion.a
                  href="mailto:info@atlaslinkmarkets.com"
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "14px 32px",
                    borderRadius: 999,
                    background: brandGradient,
                    color: "#fff",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    boxShadow: "0 12px 28px rgba(122,63,209,0.35), inset 0 1px 1px rgba(255,255,255,0.3)",
                  }}
                >
                  Email Us
                </motion.a>
                <motion.a
                  href="https://www.atlaslinkmarkets.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "14px 32px",
                    borderRadius: 999,
                    background: "transparent",
                    color: accent,
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    border: "2px solid " + accent,
                  }}
                >
                  Visit Website
                </motion.a>
              </div>
              <p
                style={{
                  marginTop: 28,
                  fontSize: "0.82rem",
                  color: textDim,
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: "1px",
                }}
              >
                +1 647 946 4643
              </p>
            </div>
          </SoftReveal>
        </section>

        <Footer />
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   SERVICE CARD — depth + mouse sheen
   ══════════════════════════════════════════════════════════ */
function ServiceCard({ service, index, textMain, textMuted, accent }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, amount: 0.15 });

  var onMove = function (e) {
    var rect = e.currentTarget.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mx", mx + "px");
    e.currentTarget.style.setProperty("--my", my + "px");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.9,
        delay: index * 0.1,
        ease: EASE_OUT_QUART,
      }}
      className="org-service-card"
      onMouseMove={onMove}
    >
      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: accent,
          marginBottom: 14,
        }}
      >
        0{index + 1}
      </div>
      <h3
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 800,
          fontSize: "clamp(1.05rem, 1.6vw, 1.2rem)",
          letterSpacing: "-0.2px",
          lineHeight: 1.3,
          color: textMain,
          marginBottom: 14,
        }}
      >
        {service.title}
      </h3>
      <p
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: "0.95rem",
          color: textMuted,
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {service.body}
      </p>
    </motion.div>
  );
}
