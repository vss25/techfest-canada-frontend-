import { useEffect, useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import emailjs from "@emailjs/browser";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PartnerGrid from "../components/PartnerGrid";

var EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
var EASE_OUT_QUART = [0.22, 1, 0.36, 1];

function RevealText({ children, delay, as, className, style }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 50, filter: "blur(16px)", clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)", clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.4, delay: delay || 0, ease: EASE_OUT_EXPO }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

function HeroReveal({ children, delay, as, className, style }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 50, filter: "blur(16px)", clipPath: "inset(0 100% 0 0)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 1.4, delay: delay || 0, ease: EASE_OUT_EXPO }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

function SoftReveal({ children, delay, className, style, as }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.0, delay: delay || 0, ease: EASE_OUT_QUART }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

function HeroSoft({ children, delay, className, style, as }) {
  var Tag = motion[as || "div"];
  return (
    <Tag
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1.0, delay: delay || 0, ease: EASE_OUT_QUART }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTACT MODAL — EmailJS integration
   ═══════════════════════════════════════════════════════════ */
function ContactModal({ open, onClose, dark, accent, orange }) {
  var s1 = useState(""); var firstName = s1[0]; var setFirstName = s1[1];
  var s2 = useState(""); var lastName = s2[0]; var setLastName = s2[1];
  var s3 = useState(""); var email = s3[0]; var setEmail = s3[1];
  var s4 = useState(""); var message = s4[0]; var setMessage = s4[1];
  var s5 = useState("idle"); var status = s5[0]; var setStatus = s5[1];
  var s6 = useState({}); var errors = s6[0]; var setErrors = s6[1];

  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.65)";
  var modalBg = dark ? "#0e0820" : "#ffffff";
  var inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  var inputBorder = dark ? "rgba(255,255,255,0.12)" : "rgba(122,63,209,0.18)";

  // Reset when modal closes
  useEffect(function () {
    if (!open) {
      setTimeout(function () {
        setFirstName(""); setLastName(""); setEmail(""); setMessage("");
        setStatus("idle"); setErrors({});
      }, 300);
    }
  }, [open]);

  var validate = function () {
    var e = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!message.trim()) e.message = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  var handleSubmit = function (ev) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    emailjs.send(
      "service_gy3fvru",
      "template_ufqzzep",
      {
        from_name: firstName + " " + lastName,
        from_email: email,
        message: "[Institutional Partnership Inquiry]\n\nFrom: " + firstName + " " + lastName + "\nEmail: " + email + "\n\nMessage:\n" + message,
      },
      "gZgYZtLCXPVgUsVj_"
    ).then(function () {
      setStatus("sent");
    }).catch(function () {
      setStatus("error");
    });
  };

  var inputStyle = function (err) {
    return {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid " + (err ? "#e05555" : inputBorder),
      background: inputBg,
      color: textMain,
      fontFamily: "inherit",
      fontSize: "15px",
      outline: "none",
      boxSizing: "border-box",
      transition: "border 0.2s",
    };
  };

  var labelStyle = {
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: textMuted,
    display: "block",
    marginBottom: 6,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              width: "100%", maxWidth: 480,
              maxHeight: "92vh", overflow: "auto",
              background: modalBg,
              borderRadius: 24,
              border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(122,63,209,0.14)",
              boxShadow: dark ? "0 28px 80px rgba(0,0,0,0.6)" : "0 28px 80px rgba(122,63,209,0.15)",
              position: "relative",
            }}
          >
            {/* Close X */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", top: 16, right: 16,
                background: "none", border: "none", cursor: "pointer",
                color: textMuted, fontSize: "1.6rem", lineHeight: 1,
                padding: "4px 10px", borderRadius: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={function (e) { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; }}
              onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
            >×</button>

            <div style={{ padding: "32px 32px 28px" }}>
              {/* Header */}
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: orange,
                marginBottom: 8,
              }}>Institutional Partnership</div>
              <h2 style={{
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 800,
                fontSize: "1.3rem",
                color: textMain,
                margin: "0 0 10px",
                letterSpacing: "-0.3px",
              }}>Get in Touch</h2>
              <p style={{
                fontSize: "0.88rem",
                color: textMuted,
                margin: "0 0 24px",
                lineHeight: 1.6,
              }}>Tell us about your organization and we'll be in touch within two business days.</p>

              {status === "sent" ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "linear-gradient(135deg, " + accent + ", " + orange + ")",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </motion.div>
                  <h3 style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: textMain,
                    margin: "0 0 8px",
                  }}>Message Sent</h3>
                  <p style={{ fontSize: "0.85rem", color: textMuted, lineHeight: 1.6, margin: 0 }}>
                    Thanks for reaching out. We'll be in touch shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* First / Last name */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      <input
                        value={firstName}
                        onChange={function (e) { setFirstName(e.target.value); setErrors(function (er) { var n = Object.assign({}, er); delete n.firstName; return n; }); }}
                        placeholder="Jane"
                        autoComplete="given-name"
                        style={inputStyle(errors.firstName)}
                      />
                      {errors.firstName && <span style={{ fontSize: "0.65rem", color: "#e05555", marginTop: 4, display: "block" }}>{errors.firstName}</span>}
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name *</label>
                      <input
                        value={lastName}
                        onChange={function (e) { setLastName(e.target.value); setErrors(function (er) { var n = Object.assign({}, er); delete n.lastName; return n; }); }}
                        placeholder="Smith"
                        autoComplete="family-name"
                        style={inputStyle(errors.lastName)}
                      />
                      {errors.lastName && <span style={{ fontSize: "0.65rem", color: "#e05555", marginTop: 4, display: "block" }}>{errors.lastName}</span>}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={function (e) { setEmail(e.target.value); setErrors(function (er) { var n = Object.assign({}, er); delete n.email; return n; }); }}
                      placeholder="jane@company.com"
                      autoComplete="email"
                      style={inputStyle(errors.email)}
                    />
                    {errors.email && <span style={{ fontSize: "0.65rem", color: "#e05555", marginTop: 4, display: "block" }}>{errors.email}</span>}
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Message *</label>
                    <textarea
                      value={message}
                      onChange={function (e) { setMessage(e.target.value); setErrors(function (er) { var n = Object.assign({}, er); delete n.message; return n; }); }}
                      placeholder="Tell us about your organization and partnership interest..."
                      rows={5}
                      style={Object.assign({}, inputStyle(errors.message), { resize: "vertical", minHeight: 110, fontFamily: "inherit" })}
                    />
                    {errors.message && <span style={{ fontSize: "0.65rem", color: "#e05555", marginTop: 4, display: "block" }}>{errors.message}</span>}
                  </div>

                  {status === "error" && (
                    <p style={{ color: "#e05555", fontSize: "0.78rem", textAlign: "center", margin: 0 }}>
                      Something went wrong. Please try again or email sales@thetechfestival.com directly.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, " + accent + ", " + orange + ")",
                      color: "white",
                      fontFamily: "'Orbitron', sans-serif",
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      cursor: status === "sending" ? "wait" : "pointer",
                      boxShadow: "0 8px 24px rgba(122,63,209,0.35)",
                      opacity: status === "sending" ? 0.7 : 1,
                      transition: "transform 0.2s, opacity 0.2s",
                      marginTop: 4,
                    }}
                    onMouseEnter={function (e) { if (status !== "sending") e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={function (e) { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {status === "sending" ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Partners2026() {
  var s = useState(false);
  var dark = s[0];
  var setDark = s[1];
  var sM = useState(false); var contactOpen = sM[0]; var setContactOpen = sM[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var heroRef = useRef(null);
  var scrollData = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  var heroY = useTransform(scrollData.scrollYProgress, [0, 1], ["0%", "30%"]);
  var heroOpacity = useTransform(scrollData.scrollYProgress, [0, 0.7], [1, 0]);

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.62)" : "rgba(13,5,32,0.62)";
  var textDim = dark ? "rgba(255,255,255,0.30)" : "rgba(13,5,32,0.30)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var orange = dark ? "#f5a623" : "#d98a14";
  var borderCol = dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)";

  var brandGradient = "linear-gradient(135deg, " + accent + ", " + orange + ")";

  return (
    <>
      <style>{`
        .tfc-grad-text {
          background-image: var(--tfc-gradient);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px transparent;
          display: inline-block;
        }
        .tfc-grad-text.tfc-grad-block { display: block; width: 100%; }
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
        .tfc-film-grain {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 30; opacity: 0.04; mix-blend-mode: overlay;
          background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
        }
        .tfc-grid-backdrop {
          position: absolute; inset: 0; background-size: 60px 60px;
          background-image:
            linear-gradient(to right, var(--tfc-grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--tfc-grid-line) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
          pointer-events: none; opacity: 0.5;
        }
        :root {
          --aurora-white: #ffffff; --aurora-black: #06020f; --aurora-transparent: transparent;
          --aurora-purple: #7a3fd1; --aurora-violet: #9b57e8; --aurora-lilac: #c4a0f5;
          --aurora-orange: #f5a623; --aurora-amber: #f7c15e;
        }
        @keyframes tfc-aurora { from { background-position: 50% 50%, 50% 50%; } to { background-position: 350% 50%, 350% 50%; } }
        .tfc-aurora-layer {
          position: absolute; inset: -10px; pointer-events: none;
          will-change: transform; background-size: 300%, 200%;
          background-position: 50% 50%; filter: blur(10px); opacity: 0.45;
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
          background-size: 200%, 100%; background-attachment: fixed;
          animation: tfc-aurora 60s linear infinite; mix-blend-mode: difference;
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
          background-size: 200%, 100%; background-attachment: fixed;
          animation: tfc-aurora 60s linear infinite; mix-blend-mode: difference;
        }
        .tfc-divider {
          height: 1px; width: 100%; max-width: 100px; margin: 0 auto;
          background: linear-gradient(90deg, transparent, var(--tfc-divider-color), transparent);
        }
      `}</style>

      <Navbar />
      <div
        style={{
          minHeight: "100vh", background: bg, color: textMain,
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

        {/* HERO */}
        <section
          ref={heroRef}
          style={{
            position: "relative", minHeight: "92vh",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "clamp(120px, 16vw, 160px) 5% clamp(60px, 10vw, 120px)",
            overflow: "hidden",
            background: dark
              ? "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.14) 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.07) 0%, transparent 70%)",
          }}
        >
          <div className="tfc-grid-backdrop" />
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div className={dark ? "tfc-aurora-layer tfc-aurora-layer--dark" : "tfc-aurora-layer tfc-aurora-layer--light"} />
          </div>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: dark
              ? "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #06020f 100%)"
              : "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #ffffff 100%)",
          }} />
          <div className="tfc-film-grain" />

          <motion.div style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <HeroSoft delay={0.1}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "4px", textTransform: "uppercase", color: orange, marginBottom: 28 }}>
                The Tech Festival Canada 2026
              </div>
            </HeroSoft>

            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(2.5rem, 7vw, 5rem)", letterSpacing: "-1.5px", lineHeight: 1.05, marginBottom: 32 }}>
              <HeroReveal as="span" delay={0.3} className="tfc-silver-text" style={{ display: "block" }}>Institutions</HeroReveal>
              <HeroReveal as="span" delay={0.55} className="tfc-grad-text" style={{ display: "block" }}>Involved</HeroReveal>
            </h1>

            <HeroSoft delay={0.95}>
              <p style={{ fontSize: "clamp(1rem, 1.6vw, 1.2rem)", color: textMuted, lineHeight: 1.8, maxWidth: 680, margin: "0 auto", textAlign: "center", fontWeight: 400 }}>
                The Tech Festival Canada is supported by a growing network of government bodies, industry associations, academic institutions, enterprise partners, and international trade organisations. Together, we're building Canada's definitive technology platform.
              </p>
            </HeroSoft>

            <HeroSoft delay={1.2}>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                style={{ marginTop: 64, textAlign: "center", color: textDim, fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase" }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>↓</div>
                Discover Our Network
              </motion.div>
            </HeroSoft>
          </motion.div>
        </section>

        {/* STATS */}
        <section style={{ padding: "80px 5% 40px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "clamp(1.5rem, 4vw, 4rem)", justifyItems: "center" }}>
            {[
              { val: "25+", label: "Partners" },
              { val: "10+", label: "Countries" },
              { val: "5", label: "Tech Pillars" },
              { val: "2", label: "Days" },
            ].map(function (stat, i) {
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 1.0, delay: i * 0.1, ease: EASE_OUT_QUART }}
                  style={{ textAlign: "center" }}
                >
                  <div className="tfc-grad-text" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, lineHeight: 1, letterSpacing: "-1px" }}>
                    {stat.val}
                  </div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: textDim, marginTop: 10 }}>
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* PARTNER GRID */}
        <section style={{ padding: "60px 0 100px" }}>
          <SoftReveal>
            <div style={{ textAlign: "center", fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: textDim, marginBottom: 16 }}>
              The Network
            </div>
          </SoftReveal>

          <RevealText
            as="h2"
            delay={0.1}
            className="tfc-grad-text tfc-grad-block"
            style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", letterSpacing: "-0.5px", lineHeight: 1.15, textAlign: "center", margin: "0 auto 18px", padding: "0 5%", maxWidth: 900 }}
          >
            Attending Institutions
          </RevealText>

          <SoftReveal delay={0.4}>
            <p style={{ fontSize: "clamp(0.95rem, 1.4vw, 1.1rem)", color: textMuted, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 36px", padding: "0 5%", textAlign: "center" }}>
              Government bodies, industry associations, academic institutions, enterprises, startups, and international trade organisations — all in one room.
            </p>
          </SoftReveal>

          <SoftReveal delay={0.6}>
            <div className="tfc-divider" style={{ marginBottom: 48 }} />
          </SoftReveal>

          <PartnerGrid dark={dark} accent={accent} />
        </section>

        {/* CTA */}
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
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: orange, marginBottom: 18 }}>
                Want to be listed?
              </div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", letterSpacing: "-0.5px", lineHeight: 1.15, marginBottom: 18, color: textMain }}>
                Become an Institutional <span className="tfc-grad-text">Partner</span>
              </h2>
              <p style={{ fontSize: "1rem", color: textMuted, lineHeight: 1.75, maxWidth: 500, margin: "0 auto 28px", textAlign: "center" }}>
                Whether you're a government body, association, academic institution, or enterprise — there's a partnership model that fits. Let's build Canada's tech future together.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <motion.a
                  href="/sponsor"
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "inline-flex", alignItems: "center", padding: "14px 32px", borderRadius: 999,
                    background: brandGradient, color: "#fff",
                    fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", fontWeight: 800,
                    letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none",
                    boxShadow: "0 12px 28px rgba(122,63,209,0.35), inset 0 1px 1px rgba(255,255,255,0.3)",
                  }}
                >View Partnerships</motion.a>

                <motion.button
                  type="button"
                  onClick={function () { setContactOpen(true); }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    display: "inline-flex", alignItems: "center", padding: "14px 32px", borderRadius: 999,
                    background: "transparent", color: accent, cursor: "pointer",
                    fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", fontWeight: 800,
                    letterSpacing: "1.5px", textTransform: "uppercase",
                    border: "2px solid " + accent,
                  }}
                >Contact Us</motion.button>
              </div>
            </div>
          </SoftReveal>
        </section>

        <Footer />
      </div>

      <ContactModal open={contactOpen} onClose={function () { setContactOpen(false); }} dark={dark} accent={accent} orange={orange} />
    </>
  );
}
