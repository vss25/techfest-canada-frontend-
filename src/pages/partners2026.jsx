import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PartnerMarquee from "../components/PartnerMarquee";

/* ══════════════════════════════════════════════════════════
   ANIMATED SECTION WRAPPER 
   ══════════════════════════════════════════════════════════ */
function FadeInSection({ children, delay }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: delay || 0, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   CATEGORY SECTIONS — maps to Sanity category values
   ══════════════════════════════════════════════════════════ */
var CATEGORIES = [
  {
    title: "Government Partners",
    subtitle: "Federal, provincial, and municipal bodies supporting innovation and trade in Canada.",
    icon: "🏛️",
    sanityCategory: "governmentPartners",
  },
  {
    title: "Industry Associates",
    subtitle: "National associations and alliances across technology, cybersecurity, and critical infrastructure.",
    icon: "🤝",
    sanityCategory: "industryAssociates",
  },
  {
    title: "Academic & Research Institutions",
    subtitle: "Leading universities, research labs, and innovation centres driving deep tech in Canada.",
    icon: "🎓",
    sanityCategory: "academicResearchInstitutions",
  },
  {
    title: "Corporate & Enterprise Partners",
    subtitle: "Enterprise technology companies, hyperscalers, and systems integrators powering the ecosystem.",
    icon: "🏢",
    sanityCategory: "corporateEnterprisePartners",
  },
  {
    title: "Startup & Ecosystem Partners",
    subtitle: "Accelerators, incubators, and ecosystem builders nurturing Canada's next generation of startups.",
    icon: "🚀",
    sanityCategory: "startupEcosystemPartners",
  },
  {
    title: "International Trade Bodies",
    subtitle: "Foreign trade commissions, consulates, and international chambers supporting cross-border tech collaboration.",
    icon: "🌍",
    sanityCategory: "internationalTradeBodies",
  },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Partners2026() {
  var s = useState(false); var dark = s[0]; var setDark = s[1];
  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";
  var textDim = dark ? "rgba(255,255,255,0.25)" : "rgba(13,5,32,0.25)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var orange = dark ? "#f5a623" : "#d98a14";
  var borderCol = dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)";

  // Gradient string — recomputed when theme changes, fed into CSS variables
  var gradient = "linear-gradient(135deg, " + accent + ", " + orange + ")";

  return (
    <>
      <style>{`
        @keyframes marqueeLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        /* ─────────────────────────────────────────────────────
           GRADIENT TEXT — defined once as a real CSS class so it
           survives React re-renders on theme toggle. The actual
           gradient comes from a CSS variable set inline, so it
           still updates correctly when dark mode changes.
           ───────────────────────────────────────────────────── */
        .tfc-gradient-text {
          background-image: var(--tfc-gradient);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          /* Safari/iOS sometimes drops the clip on repaint — this nudges
             it to redraw cleanly */
          -webkit-text-stroke: 1px transparent;
          display: inline-block;
        }

        /* ─────────────────────────────────────────────────────
           AURORA — animated dancing lights (from FirstTimers)
           ───────────────────────────────────────────────────── */
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
          opacity: 0.50;
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
          opacity: 0.35; filter: blur(12px);
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
      `}</style>

      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: textMain,
          // expose the gradient to CSS classes via a custom property
          ["--tfc-gradient"]: gradient,
        }}
      >

        {/* ─── HERO (with aurora) ─── */}
        <section style={{
          position: "relative",
          padding: "clamp(120px, 16vw, 160px) 5% clamp(50px, 8vw, 80px)",
          overflow: "hidden",
          background: dark
            ? "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.06) 0%, transparent 70%)",
        }}>
          {/* Aurora background layer — purely decorative, sits behind everything */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div className={dark ? "tfc-aurora-layer tfc-aurora-layer--dark" : "tfc-aurora-layer tfc-aurora-layer--light"} />
          </div>

          {/* Soft radial mask for depth — fades aurora into page bg at edges */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: dark
              ? "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #06020f 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #ffffff 100%)",
          }} />

          {/* Hero content — sits above aurora */}
          <div style={{ position: "relative", zIndex: 2, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase", color: orange, marginBottom: 18 }}>THE TECH FESTIVAL CANADA 2026</div>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.2rem)", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 20 }}>
                Institutions<br />
                <span className="tfc-gradient-text">Involved</span>
              </h1>
              <p style={{ fontSize: "1rem", color: textMuted, lineHeight: 1.75, maxWidth: 620, margin: "0 auto" }}>
                The Tech Festival Canada is supported by a growing network of government bodies, industry associations, academic institutions, enterprise partners, and international trade organisations. Together, we're building Canada's definitive technology platform.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ─── MARQUEE ROW 1 ─── */}
        <PartnerMarquee dark={dark} title="Our Partners & Supporters" category="partnersAndSupporters" />

        {/* ─── STATS ROW ─── */}
        <FadeInSection delay={0.1}>
          <section style={{ padding: "48px 5%", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "clamp(2rem, 6vw, 5rem)", flexWrap: "wrap" }}>
              {[
                { val: "25+", label: "Partners" },
                { val: "6", label: "Categories" },
                { val: "10+", label: "Countries" },
                { val: "5", label: "Tech Pillars" },
              ].map(function (s) {
                return (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div
                      className="tfc-gradient-text"
                      style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                        fontWeight: 900,
                      }}
                    >
                      {s.val}
                    </div>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: textDim, marginTop: 4 }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </FadeInSection>

        {/* ─── PARTNER CATEGORY MARQUEES ─── */}
        <section style={{ padding: "0 0 80px" }}>
          {CATEGORIES.map(function (cat, catIdx) {
            return (
              <FadeInSection key={cat.sanityCategory} delay={catIdx * 0.08}>
                <div style={{ marginBottom: 0 }}>
                  {/* Category header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 5%", marginBottom: 10 }}>
                    <span style={{ fontSize: "1.5rem" }}>{cat.icon}</span>
                    <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.3px", margin: 0 }}>{cat.title}</h2>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: textMuted, lineHeight: 1.6, marginBottom: 24, padding: "0 5%", maxWidth: 600 }}>{cat.subtitle}</p>

                  {/* Sanity-powered marquee for this category */}
                  <PartnerMarquee dark={dark} title={cat.title} category={cat.sanityCategory} />
                </div>
              </FadeInSection>
            );
          })}
        </section>

        {/* ─── MARQUEE ROW 2 ─── */}
        <PartnerMarquee dark={dark} title="And many more joining" category="other" />

        {/* ─── CTA SECTION ─── */}
        <FadeInSection delay={0.1}>
          <section style={{ padding: "80px 5%", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <div style={{
              padding: "clamp(32px, 5vw, 56px)",
              borderRadius: 20,
              background: dark
                ? "linear-gradient(135deg, rgba(122,63,209,0.10), rgba(245,166,35,0.05))"
                : "linear-gradient(135deg, rgba(122,63,209,0.06), rgba(245,166,35,0.03))",
              border: "1px solid " + borderCol,
            }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: orange, marginBottom: 14 }}>WANT TO BE LISTED?</div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(1.3rem, 3vw, 1.8rem)", letterSpacing: "-0.5px", lineHeight: 1.15, marginBottom: 16 }}>
                Become an Institutional<br /><span style={{ color: orange }}>Partner</span>
              </h2>
              <p style={{ fontSize: "0.92rem", color: textMuted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 28px" }}>
                Whether you're a government body, association, academic institution, or enterprise — there's a partnership model that fits. Let's build Canada's tech future together.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/sponsor" style={{
                  display: "inline-flex", alignItems: "center", padding: "12px 28px", borderRadius: 999,
                  background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff",
                  fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: 800,
                  letterSpacing: "1.2px", textTransform: "uppercase", textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(122,63,209,0.3)", transition: "transform 0.2s",
                }}
                  onMouseEnter={function (e) { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.transform = "translateY(0)"; }}
                >View Partnerships</a>
                <a href="mailto:sales@thetechfestival.com" style={{
                  display: "inline-flex", alignItems: "center", padding: "12px 28px", borderRadius: 999,
                  background: "transparent", color: accent,
                  fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: 800,
                  letterSpacing: "1.2px", textTransform: "uppercase", textDecoration: "none",
                  border: "2px solid " + accent, transition: "all 0.2s",
                }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}
                >Contact Us</a>
              </div>
            </div>
          </section>
        </FadeInSection>

        <Footer />
      </div>
    </>
  );
}
