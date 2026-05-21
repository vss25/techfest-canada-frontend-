import { useState, useRef, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function FirstTimers() {
  const [isDark, setIsDark] = useState(true);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const bg        = isDark ? "#07030f"                : "#f4f0ff";
  const cardBg    = isDark ? "rgba(255,255,255,0.03)" : "rgba(122,63,209,0.04)";
  const border    = isDark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.18)";
  const textMain  = isDark ? "#ffffff"                : "#0f0520";
  const textMuted = isDark ? "rgba(200,180,255,0.8)"  : "rgba(60,30,110,0.85)";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style>{`
        @media (max-width: 900px) {
          .ft-row { grid-template-columns: 1fr !important; direction: ltr !important; gap: 40px !important; }
          .ft-bottom-cta-grid { grid-template-columns: 1fr !important; }
          .ft-img { min-height: 300px !important; }
        }
        @media (max-width: 540px) {
          .ft-cta-row { flex-direction: column !important; align-items: stretch !important; }
          .ft-cta-row a { width: 100% !important; text-align: center !important; justify-content: center !important; }
          .ft-bottom-cta-grid { min-height: auto !important; }
        }

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
        @keyframes ft-aurora {
          from { background-position: 50% 50%, 50% 50%; }
          to   { background-position: 350% 50%, 350% 50%; }
        }
        .ft-aurora-layer {
          position: absolute; inset: -10px; pointer-events: none;
          will-change: transform;
          background-size: 300%, 200%;
          background-position: 50% 50%;
          filter: blur(10px);
          opacity: 0.50;
        }
        .ft-aurora-layer--dark {
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
        }
        .ft-aurora-layer--dark::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: ft-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }
        .ft-aurora-layer--light {
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-white) 0%, var(--aurora-white) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          opacity: 0.35; filter: blur(12px);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
        }
        .ft-aurora-layer--light::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-white) 0%, var(--aurora-white) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-white) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          background-size: 200%, 100%;
          background-attachment: fixed;
          animation: ft-aurora 60s linear infinite;
          mix-blend-mode: difference;
        }
      `}</style>

      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", minHeight: "100vh",
        background: isDark ? "#06020f" : "#f4f0ff",
      }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div className={isDark ? "ft-aurora-layer ft-aurora-layer--dark" : "ft-aurora-layer ft-aurora-layer--light"} />
        </div>

        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: isDark
            ? "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #06020f 100%)"
            : "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #f4f0ff 100%)",
        }} />

        <motion.div style={{
          y: heroY, opacity: heroOpacity,
          position: "relative", zIndex: 10,
          textAlign: "center", padding: "0 5%",
          maxWidth: 1000, margin: "0 auto",
          paddingTop: "clamp(100px, 15vw, 140px)",
          paddingBottom: "clamp(60px, 10vw, 100px)",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
          >
            <h1 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              fontWeight: 900, lineHeight: 1.1,
              marginBottom: 28, letterSpacing: "-0.5px",
            }}>
              Welcome to{" "}
              <span style={{
                background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>The Tech Festival Canada</span>
            </h1>

            <p style={{
              fontSize: "clamp(1.1rem, 2vw, 1.3rem)",
              color: textMuted, lineHeight: 1.7,
              maxWidth: 780, marginBottom: 48,
            }}>
              If this is your first time, here is what to expect and how to get the most value from the experience. This is built for outcomes: clearer decisions, faster partnerships, and real momentum after the event.
            </p>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{ marginTop: 56, color: textMuted, fontSize: "0.8rem", textAlign: "center", opacity: 0.8 }}
            >
              <div style={{ fontSize: "1.4rem" }}>↓</div>
              <div style={{ letterSpacing: "2px", marginTop: 6, fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", fontWeight: 700 }}>SCROLL</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ ROW 1 — THE CONFERENCE ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={false}
        image="/ft-conference.jpg" imageAlt="Keynote presentation showing five tech pillars and applied sectors"
        cta={{ label: "Get Your Pass", href: "/tickets" }}
      >
        <h2 style={headingStyle(textMain)}>
          The <GradientSpan>Conference</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          Our conference is curated around five tech pillars and the real world sectors where they are being adopted. Every session is designed to unpack opportunities, challenges, and practical solutions you can take back to your organization.
        </p>

        <SubHeading textMain={textMain}>5 Tech Pillars</SubHeading>
        <ListBlock textMain={textMain} items={[
          "Artificial Intelligence and Generative AI",
          "Quantum Computing",
          "Sustainability and Climate Tech",
          "Cybersecurity and Digital Trust",
          "Robotics and Intelligent Infrastructure",
        ]} />

        <SubHeading textMain={textMain}>5 Applied Sectors</SubHeading>
        <p style={paraStyle(textMuted)}>
          We bring these conversations into the sectors where the demand is urgent and budgets are real:
        </p>
        <ListBlock textMain={textMain} items={[
          "Energy and Utilities",
          "Healthcare and Life Sciences",
          "Defence and National Security",
          "Financial Services and Insurance",
          "Supply Chain, Manufacturing, and Critical Infrastructure",
        ]} />

        <SubHeading textMain={textMain}>Where Pillars Meet Sectors</SubHeading>
        <p style={paraStyle(textMuted)}>
          This is where the magic happens. You will see how each pillar translates into real use cases inside each sector, who is buying, what procurement looks like, and what it takes to implement successfully. The goal is to connect solution providers with decision makers who need outcomes, so conversations can move from interest to pilots to partnerships and contracts.
        </p>
      </ContentRow>

      {/* ═══════════ ROW 2 — THE EXPO ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={true} hasBg={true}
        image="/ft-expo.jpg" imageAlt="The Tech Festival Canada expo and networking floor"
        cta={{ label: "Partner With Us", href: "/sponsor" }}
      >
        <h2 style={headingStyle(textMain)}>
          The <GradientSpan>Expo</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          The Expo is where technology comes alive. Companies from across Canada and around the world showcase products, platforms, and solutions. Expect demos, live conversations with builders, and a front row view of what is being deployed now, not someday.
        </p>
      </ContentRow>

      {/* ═══════════ ROW 3 — AWARDS NIGHT ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={false}
        image="/ft-awards.jpg" imageAlt="Canada Tech Titans Awards Night ceremony"
        cta={{ label: "Get Your Pass", href: "/tickets" }}
      >
        <h2 style={headingStyle(textMain)}>
          Awards <GradientSpan>Night</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          Our Awards Night celebrates the Tech Titans of Canada. We recognize the innovators, builders, researchers, and leaders who are shaping the future and delivering real impact across the country.
        </p>
      </ContentRow>

      {/* ═══════════ ROW 4 — CxO BREAKFAST ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={true} hasBg={true}
        image="/ft-breakfast.jpg" imageAlt="CxO Breakfast with senior leaders"
        cta={{ label: "Get Your Pass", href: "/tickets" }}
      >
        <h2 style={headingStyle(textMain)}>
          CxO <GradientSpan>Breakfast</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          An exclusive invitation only breakfast for CxOs and senior leaders. This is where business happens in a quieter, higher trust setting. Think strategic conversations, peer connections, and deal making over breakfast.
        </p>
      </ContentRow>

      {/* ═══════════ ROW 5 — GALA DINNER ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={false}
        image="/ft-gala.jpg" imageAlt="Gala Dinner and Networking Reception"
        cta={{ label: "Get Your Pass", href: "/tickets" }}
      >
        <h2 style={headingStyle(textMain)}>
          Gala Dinner and <GradientSpan>Networking Reception</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          A premium evening to deepen relationships with speakers, exhibitors, partners, and senior attendees. If you want stronger connections, this is where they form.
        </p>
      </ContentRow>

      {/* ═══════════ ROW 6 — CONSULTATION CLINIC ═══════════ */}
      <ContentRow isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
        reverse={true} hasBg={true}
        image="/ft-clinic.jpg" imageAlt="Consultation Clinic at The Tech Festival Canada"
        cta={{ label: "Partner With Us", href: "/sponsor" }}
      >
        <h2 style={headingStyle(textMain)}>
          Consultation <GradientSpan>Clinic</GradientSpan>
        </h2>
        <p style={paraStyle(textMuted)}>
          In collaboration with government bodies, associations, and academic institutes, our Consultation Clinic helps you move forward with clarity. Whether you are looking for guidance on funding, programs, partnerships, talent, standards, research support, or market entry, you will find credible direction and next steps.
        </p>
      </ContentRow>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{ padding: "100px 5%", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="ft-bottom-cta-grid"
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
            borderRadius: 28, overflow: "hidden",
            border: `1px solid ${border}`, background: cardBg, minHeight: 400,
          }}
        >
          {/* Logo panel */}
          <div style={{
            position: "relative",
            background: isDark ? "#120a22" : "#ede8f7",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", minHeight: 300,
          }}>
            <img
              src="/Tech_Festival_Canada_Logo_Dark_Transparent.png"
              alt="The Tech Festival Canada"
              style={{
                width: "65%", maxWidth: 300, height: "auto", objectFit: "contain",
                filter: isDark
                  ? "drop-shadow(0 0 40px rgba(122,63,209,0.25))"
                  : "invert(1) drop-shadow(0 8px 24px rgba(122,63,209,0.18))",
              }}
            />
            <div style={{
              position: "absolute", width: "70%", height: "70%", borderRadius: "50%",
              background: isDark
                ? "radial-gradient(circle, rgba(122,63,209,0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(122,63,209,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
          </div>

          {/* Text panel */}
          <div style={{ padding: "clamp(40px, 6vw, 64px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 900, lineHeight: 1.2, marginBottom: 20, color: textMain,
            }}>
              Ready to <GradientSpan>show up prepared?</GradientSpan>
            </h2>
            <p style={{ color: textMuted, lineHeight: 1.7, fontSize: "1.1rem", marginBottom: 36, maxWidth: 480 }}>
              Secure your seat at The Westin Harbour Castle, Toronto on October 26–27, 2026. Spaces are limited — this is not a conference you attend passively.
            </p>
            <div className="ft-cta-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <motion.a href="/tickets" className="btn-primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 14 }}>
                Get Your Tickets
              </motion.a>
              <motion.a href="/sponsor" className="btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{ borderRadius: 14 }}>
                Partner With Us
              </motion.a>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════ */

function headingStyle(textMain) {
  return {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
    fontWeight: 900, lineHeight: 1.25,
    marginBottom: 24, color: textMain,
  };
}

function paraStyle(textMuted) {
  return {
    color: textMuted, lineHeight: 1.7, fontSize: "1.1rem",
    marginBottom: 24, textAlign: "justify", hyphens: "auto",
  };
}

function GradientSpan({ children }) {
  return (
    <span style={{
      background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    }}>{children}</span>
  );
}

function SubHeading({ textMain, children }) {
  return (
    <p style={{
      fontFamily: "'Orbitron', sans-serif",
      fontSize: "1rem", fontWeight: 800,
      color: textMain, marginBottom: 14, marginTop: 32,
    }}>{children}</p>
  );
}

function ListBlock({ textMain, items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
      {items.map((item) => (
        <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, paddingLeft: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand-orange, #f5a623)", flexShrink: 0 }} />
          <span style={{ fontSize: "1.05rem", fontWeight: 500, color: textMain }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTENT ROW — alternating text + image
   ═══════════════════════════════════════════════════════ */

function ContentRow({ isDark, textMain, textMuted, border, reverse, hasBg, image, imageAlt, cta, children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isPrimary = cta.label === "Get Your Pass";

  return (
    <section ref={ref} style={{
      padding: "clamp(80px, 10vw, 120px) 5%",
      background: hasBg ? (isDark ? "rgba(122,63,209,0.04)" : "rgba(122,63,209,0.03)") : "transparent",
      borderTop: hasBg ? `1px solid ${border}` : "none",
      borderBottom: hasBg ? `1px solid ${border}` : "none",
    }}>
      <div className="ft-row" style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "clamp(40px, 6vw, 80px)", alignItems: "center",
        direction: reverse ? "rtl" : "ltr",
      }}>
        {/* TEXT */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", bounce: 0.2, duration: 1.2 }}
          style={{ direction: "ltr" }}
        >
          {children}

          <motion.a
            href={cta.href}
            className={isPrimary ? "btn-primary" : "btn-outline"}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{ marginTop: 16, borderRadius: 14 }}
          >
            {cta.label} →
          </motion.a>
        </motion.div>

        {/* IMAGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: "spring", bounce: 0.15, duration: 1.3, delay: 0.15 }}
          style={{ direction: "ltr" }}
        >
          <div className="ft-img" style={{
            borderRadius: 24, overflow: "hidden",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.12)"}`,
            minHeight: 400, position: "relative",
          }}>
            <img src={image} alt={imageAlt}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 400 }} />
            <div style={{
              position: "absolute", inset: 0,
              background: isDark
                ? "linear-gradient(to top, rgba(7,3,15,0.3) 0%, transparent 40%)"
                : "linear-gradient(to top, rgba(244,240,255,0.15) 0%, transparent 40%)",
              pointerEvents: "none",
            }} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
