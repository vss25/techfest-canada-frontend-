import { useEffect, useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PartnerGrid from "../components/PartnerGrid";

/* ══════════════════════════════════════════════════════════
   CATEGORY SECTIONS — Sanity contract preserved
   ══════════════════════════════════════════════════════════ */
var CATEGORIES = [
  {
    title: "Government Partners",
    subtitle: "Federal, provincial, and municipal bodies supporting innovation and trade in Canada.",
    sanityCategory: "governmentPartners",
  },
  {
    title: "Industry Associates",
    subtitle: "National associations and alliances across technology, cybersecurity, and critical infrastructure.",
    sanityCategory: "industryAssociates",
  },
  {
    title: "Academic & Research Institutions",
    subtitle: "Leading universities, research labs, and innovation centres driving deep tech in Canada.",
    sanityCategory: "academicResearchInstitutions",
  },
  {
    title: "Corporate & Enterprise Partners",
    subtitle: "Enterprise technology companies, hyperscalers, and systems integrators powering the ecosystem.",
    sanityCategory: "corporateEnterprisePartners",
  },
  {
    title: "Startup & Ecosystem Partners",
    subtitle: "Accelerators, incubators, and ecosystem builders nurturing Canada's next generation of startups.",
    sanityCategory: "startupEcosystemPartners",
  },
  {
    title: "International Trade Bodies",
    subtitle: "Foreign trade commissions, consulates, and international chambers supporting cross-border tech collaboration.",
    sanityCategory: "internationalTradeBodies",
  },
];

/* ══════════════════════════════════════════════════════════
   ANIMATION PRESETS — brand-launch easing
   ══════════════════════════════════════════════════════════ */
var EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
var EASE_OUT_QUART = [0.22, 1, 0.36, 1];

/* ══════════════════════════════════════════════════════════
   REVEAL TEXT — clip-path wipe + blur entrance
   "Unleashed" headline reveal, like a brand launch
   ══════════════════════════════════════════════════════════ */
function RevealText({ children, delay, as, className, style }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{
        opacity: 0,
        y: 50,
        filter: "blur(16px)",
        clipPath: "inset(0 100% 0 0)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        clipPath: "inset(0 0% 0 0)",
      }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 1.4,
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
      viewport={{ once: true, margin: "-60px" }}
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

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Partners2026() {
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

  // Gradient passed to category headings — same one "Involved" uses
  var brandGradient = "linear-gradient(135deg, " + accent + ", " + orange + ")";

  return (
    <>
      <style>{`
        /* ─────────────────────────────────────────────
           BRAND GRADIENT TEXT (same as "Involved")
           Display defaults to inline-block but can be
           overridden via inline style for headings that
           need to be full-width and centered.
           ───────────────────────────────────────────── */
        .tfc-grad-text {
          background-image: var(--tfc-gradient);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px transparent;
          display: inline-block;
        }
        .tfc-grad-text.tfc-grad-block {
          display: block;
          width: 100%;
        }

        /* ─────────────────────────────────────────────
           SILVER MATTE TEXT — premium depth treatment
           Light mode: dark gradient with subtle drop shadow
           Dark mode: white-to-silver gradient with glow
           ───────────────────────────────────────────── */
        .tfc-silver-text {
          background: var(--tfc-silver-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          transform: translateZ(0);
          filter: var(--tfc-silver-filter);
          display: inline-block;
        }

        /* ─────────────────────────────────────────────
           FILM GRAIN — subtle texture overlay on hero
           ───────────────────────────────────────────── */
        .tfc-film-grain {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 30;
          opacity: 0.04;
          mix-blend-mode: overlay;
          background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
        }

        /* ─────────────────────────────────────────────
           SUBTLE GRID BACKDROP on hero
           ───────────────────────────────────────────── */
        .tfc-grid-backdrop {
          position: absolute;
          inset: 0;
          background-size: 60px 60px;
          background-image:
            linear-gradient(to right, var(--tfc-grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--tfc-grid-line) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          pointer-events: none;
          opacity: 0.5;
        }

        /* ─────────────────────────────────────────────
           AURORA — kept from previous version
           ───────────────────────────────────────────── */
        :root {
          --aurora-white: #ffffff;
          --aurora-black: #06020f;
          --aurora-transparent: transparent;
          --aurora-purple: #7a3fd1;
          --aurora-violet: #9b57e8;
          --aurora-lilac: #c4a0f5;
          --aurora-orange: #f5a623;
          --aurora-amber: #f7c15e;
        }
        @keyframes tfc-aurora {
          from { background-position: 50% 50%, 50% 50%; }
          to   { background-position: 350% 50%, 350% 50%; }
        }
        .tfc-aurora-layer {
          position: absolute; inset: -10px; pointer-events: none;
          will-change: transform;
          background-size: 300%, 200%;
          background-position: 50% 50%;
          filter: blur(10px);
          opacity: 0.45;
        }
        .tfc-aurora-layer--dark {
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
        }
        .tfc-aurora-layer--dark::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: tfc-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }
        .tfc-aurora-layer--light {
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-white) 0%, var(--aurora-white) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          opacity: 0.3; filter: blur(12px);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
        }
        .tfc-aurora-layer--light::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-white) 0%, var(--aurora-white) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: tfc-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }

        /* ─────────────────────────────────────────────
           SECTION DIVIDER — soft glow line
           ───────────────────────────────────────────── */
        .tfc-divider {
          height: 1px;
          width: 100%;
          max-width: 100px;
          margin: 0 auto;
          background: linear-gradient(90deg, transparent, var(--tfc-divider-color), transparent);
        }
      `}</style>

      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: textMain,
          ["--tfc-gradient"]: brandGradient,
          ["--tfc-silver-gradient"]: dark
            ? "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)"
            : "linear-gradient(180deg, #0d0520 0%, rgba(13,5,32,0.55) 100%)",
          ["--tfc-silver-filter"]: dark
            ? "drop-shadow(0px 8px 18px rgba(185,158,255,0.15)) drop-shadow(0px 2px 4px rgba(0,0,0,0.4))"
            : "drop-shadow(0px 8px 18px rgba(122,63,209,0.12)) drop-shadow(0px 2px 4px rgba(122,63,209,0.06))",
          ["--tfc-grid-line"]: dark ? "rgba(255,255,255,0.05)" : "rgba(13,5,32,0.05)",
          ["--tfc-divider-color"]: dark ? "rgba(185,158,255,0.35)" : "rgba(122,63,209,0.35)",
        }}
      >

        {/* ═══════════════════════════════════════════════════
            HERO — cinematic brand-launch reveal
            ═══════════════════════════════════════════════════ */}
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
          {/* Grid backdrop */}
          <div className="tfc-grid-backdrop" />

          {/* Aurora */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div className={dark ? "tfc-aurora-layer tfc-aurora-layer--dark" : "tfc-aurora-layer tfc-aurora-layer--light"} />
          </div>

          {/* Radial vignette to fade aurora at edges */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: dark
              ? "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #06020f 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #ffffff 100%)",
          }} />

          {/* Film grain */}
          <div className="tfc-film-grain" />

          {/* Hero content */}
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
              <RevealText as="span" delay={0.3} className="tfc-silver-text" style={{ display: "block" }}>
                Institutions
              </RevealText>
              <RevealText as="span" delay={0.55} className="tfc-grad-text" style={{ display: "block" }}>
                Involved
              </RevealText>
            </h1>

            <SoftReveal delay={0.95}>
              <p
                style={{
                  fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
                  color: textMuted,
                  lineHeight: 1.8,
                  maxWidth: 680,
                  margin: "0 auto",
                  textAlign: "center",
                  fontWeight: 400,
                }}
              >
                The Tech Festival Canada is supported by a growing network of government bodies, industry associations, academic institutions, enterprise partners, and international trade organisations. Together, we're building Canada's definitive technology platform.
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
                Discover Our Network
              </motion.div>
            </SoftReveal>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STATS — cinematic counters
            ═══════════════════════════════════════════════════ */}
        <section style={{ padding: "80px 5% 40px", maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "clamp(1.5rem, 4vw, 4rem)",
              justifyItems: "center",
            }}
          >
            {[
              { val: "25+", label: "Partners" },
              { val: "6", label: "Categories" },
              { val: "10+", label: "Countries" },
              { val: "5", label: "Tech Pillars" },
            ].map(function (stat, i) {
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 1.0,
                    delay: i * 0.1,
                    ease: EASE_OUT_QUART,
                  }}
                  style={{ textAlign: "center" }}
                >
                  <div
                    className="tfc-grad-text"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "clamp(2rem, 4vw, 3rem)",
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: "-1px",
                    }}
                  >
                    {stat.val}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: textDim,
                      marginTop: 10,
                    }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            CATEGORY SECTIONS — each one is a brand reveal
            ═══════════════════════════════════════════════════ */}
        <section style={{ padding: "60px 0 100px" }}>
          {CATEGORIES.map(function (cat, catIdx) {
            return (
              <CategoryBlock
                key={cat.sanityCategory}
                category={cat}
                dark={dark}
                accent={accent}
                textMuted={textMuted}
                textDim={textDim}
              />
            );
          })}
        </section>

        {/* ═══════════════════════════════════════════════════
            CTA — premium close
            ═══════════════════════════════════════════════════ */}
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
                Want to be listed?
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
                Become an Institutional{" "}
                <span className="tfc-grad-text">Partner</span>
              </h2>
              <p
                style={{
                  fontSize: "1rem",
                  color: textMuted,
                  lineHeight: 1.75,
                  maxWidth: 500,
                  margin: "0 auto 32px",
                  textAlign: "center",
                }}
              >
                Whether you're a government body, association, academic institution, or enterprise — there's a partnership model that fits. Let's build Canada's tech future together.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <motion.a
                  href="/sponsor"
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
                  View Partnerships
                </motion.a>
                <motion.a
                  href="mailto:sales@thetechfestival.com"
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
                  Contact Us
                </motion.a>
              </div>
            </div>
          </SoftReveal>
        </section>

        <Footer />
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   CATEGORY BLOCK — title + subtitle + grid, all centered
   Each title gets the brand gradient (same as "Involved")
   ══════════════════════════════════════════════════════════ */
function CategoryBlock({ category, dark, accent, textMuted, textDim }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} style={{ marginBottom: 96 }}>
      {/* Eyebrow tag */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE_OUT_QUART }}
        style={{
          textAlign: "center",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.58rem",
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: textDim,
          marginBottom: 16,
        }}
      >
        Category
      </motion.div>

      {/* Brand-gradient heading — clip-path reveal */}
      <motion.h2
        initial={{
          opacity: 0,
          y: 40,
          filter: "blur(12px)",
          clipPath: "inset(0 100% 0 0)",
        }}
        animate={
          inView
            ? {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                clipPath: "inset(0 0% 0 0)",
              }
            : {}
        }
        transition={{
          duration: 1.3,
          delay: 0.1,
          ease: EASE_OUT_EXPO,
        }}
        className="tfc-grad-text tfc-grad-block"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
          letterSpacing: "-0.5px",
          lineHeight: 1.15,
          textAlign: "center",
          margin: "0 auto 18px",
          padding: "0 5%",
          maxWidth: 900,
        }}
      >
        {category.title}
      </motion.h2>

      {/* Subtitle — soft fade */}
      <motion.p
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
        transition={{
          duration: 1.0,
          delay: 0.4,
          ease: EASE_OUT_QUART,
        }}
        style={{
          fontSize: "clamp(0.9rem, 1.3vw, 1rem)",
          color: textMuted,
          lineHeight: 1.7,
          maxWidth: 600,
          margin: "0 auto 36px",
          padding: "0 5%",
          textAlign: "center",
        }}
      >
        {category.subtitle}
      </motion.p>

      {/* Divider line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1.0, delay: 0.6, ease: EASE_OUT_QUART }}
        className="tfc-divider"
        style={{ marginBottom: 36, transformOrigin: "center" }}
      />

      {/* Grid — Sanity-powered */}
      <PartnerGrid dark={dark} category={category.sanityCategory} accent={accent} />
    </div>
  );
}
