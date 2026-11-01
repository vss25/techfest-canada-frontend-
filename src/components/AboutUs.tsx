import React, { useState, useEffect, useRef } from "react"
import {
  Pen, PaintBucket, Home as HomeIcon, Ruler, PenTool, Building2,
  Award, Users, Calendar, CheckCircle, Sparkles, Star, ArrowRight,
  Zap, TrendingUp, HelpCircle, Mail, Heart, Shield, Cpu, Atom,
  Lock, Settings, Leaf, Clock, Trophy, Target,
} from "lucide-react"
import { motion, useScroll, useTransform, useInView, useSpring, useMotionValueEvent } from "framer-motion"
import { InteractiveGlobe } from "./ui/interactive-globe"
import imageUrlBuilder from "@sanity/image-url"
// The site's CMS reader (src/utils/sanity.js): the API CDN without @sanity/client's code (Oct 31 2026).
import { client } from "../utils/sanity"

const builder = imageUrlBuilder(client)
function urlFor(source) {
  if (!source) return { url: () => "" }
  return builder.image(source)
}

const iconMap = {
  pen: <Pen className="w-5 h-5" />,
  paint: <PaintBucket className="w-5 h-5" />,
  home: <HomeIcon className="w-5 h-5" />,
  ruler: <Ruler className="w-5 h-5" />,
  tool: <PenTool className="w-5 h-5" />,
  building: <Building2 className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
  users: <Users className="w-6 h-6" />,
  calendar: <Calendar className="w-5 h-5" />,
  trending: <TrendingUp className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  check: <CheckCircle className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  zap: <Zap className="w-6 h-6" />,
  cpu: <Cpu className="w-5 h-5" />,
  atom: <Atom className="w-5 h-5" />,
  lock: <Lock className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  leaf: <Leaf className="w-5 h-5" />,
  clock: <Clock className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
}

const FIXED_SERVICES = [
  { title: "Healthcare & Lifesciences", description: "Connecting health innovators with buyers, policymakers, and capital to deploy at scale.", iconName: "heart", position: "left" },
  { title: "Banking, Financial Services & Insurance", description: "Where fintech meets enterprise — driving real procurement and partnerships.", iconName: "building", position: "left" },
  { title: "Supply Chain, Manufacturing & Infrastructure", description: "Bringing tech solutions to the backbone of Canada's industrial economy.", iconName: "tool", position: "left" },
  { title: "Defence & Public Safety", description: "Bridging the gap between cutting-edge tech and national security priorities.", iconName: "shield", position: "left" },
  { title: "Energy & Utilities", description: "Accelerating Canada's clean energy transition through applied innovation.", iconName: "zap", position: "left" },
  { title: "Artificial Intelligence", description: "Unlocking the Future of Innovation — from models to real-world deployment.", iconName: "cpu", position: "right" },
  { title: "Quantum Computing", description: "Unleashing Infinite Possibilities — Canada's quantum advantage on the world stage.", iconName: "atom", position: "right" },
  { title: "Cybersecurity", description: "Building resilient digital infrastructure for enterprise and government.", iconName: "lock", position: "right" },
  { title: "Robotics & Automation", description: "From factory floors to smart cities — automation that drives real ROI.", iconName: "settings", position: "right" },
  { title: "Sustainability & CleanTech", description: "Pioneering a Greener, Smarter Future through technology-led climate action.", iconName: "leaf", position: "right" },
]

const FALLBACK_STATS = [
  { value: 150, suffix: "+", label: "Builds Completed", iconName: "award" },
  { value: 12, suffix: "", label: "Event Years", iconName: "calendar" },
  { value: 98, suffix: "%", label: "Success Rate", iconName: "trending" },
]

function injectMinutesStat(stats) {
  if (!stats || stats.length === 0) return FALLBACK_STATS
  var result = [...stats]
  return result
}

export default function AboutUs({ onWriteToUs }) {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(null);  var data = s2[0];  var setData = s2[1];
  var s3 = useState(true);  var loading = s3[0]; var setLoading = s3[1];

  var sectionRef = useRef(null)
  var statsRef   = useRef(null)
  var isInView   = useInView(sectionRef, { once: false, amount: 0.1 })

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"))
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"))
    })
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] })
    return function () { obs.disconnect() }
  }, [])

  useEffect(function () {
    client.fetch('*[_type == "aboutContent"][0]')
      .then(function (result) {
        if (result) {
          setData({ ...result, services: FIXED_SERVICES, stats: injectMinutesStat(result.stats) })
        } else {
          setData({ headline: "Beyond Theory", services: FIXED_SERVICES, stats: FALLBACK_STATS })
        }
      })
      .catch(function () {
        setData({ headline: "Beyond Theory", services: FIXED_SERVICES, stats: FALLBACK_STATS })
      })
      .finally(function () { setLoading(false) })
  }, [])

  var scrollData = useScroll({ target: sectionRef, offset: ["start end", "end start"] })
  var rotate1 = useTransform(scrollData.scrollYProgress, [0, 1], [0, 12])
  var rotate2 = useTransform(scrollData.scrollYProgress, [0, 1], [0, -12])

  var bg        = dark ? "#06020f" : "#ffffff"
  var textMain  = dark ? "#ffffff" : "#0d0520"
  var textMuted = dark ? "rgba(220,208,255,0.85)" : "rgba(60,30,110,0.72)"
  var cardBg    = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.04)"
  var cardBdr   = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.14)"
  var accent    = dark ? "#b99eff" : "#7a3fd1"

  var containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  var itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] } },
  }

  if (loading) return (
    <div style={{ padding: "6rem 0", textAlign: "center", background: bg, color: textMuted, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em", fontSize: "0.75rem" }}>
      INITIALIZING ECOSYSTEM...
    </div>
  )
  if (!data) return null

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{ width: "100%", padding: "7rem 1.5rem", background: bg, color: textMain, overflow: "hidden", position: "relative", transition: "background 0.4s ease, color 0.4s ease" }}
    >
      <style>{`
        @keyframes aboutGlobeSpin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .about-grid { grid-template-columns: 1fr !important; }
          .about-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }

          .service-card-right,
          .service-card-left {
            align-items: flex-start !important;
            text-align: left !important;
            width: 100% !important;
          }
          .service-card-right .service-icon-row,
          .service-card-left .service-icon-row {
            flex-direction: row !important;
            justify-content: flex-start !important;
            width: 100% !important;
          }
          .service-card-right h3,
          .service-card-left h3 {
            text-align: left !important;
            font-size: 0.95rem !important;
          }
          .about-sector-label,
          .about-pillar-label {
            justify-content: flex-start !important;
            text-align: left !important;
          }
        }

        @media (max-width: 540px) {
          .about-stats-grid { grid-template-columns: 1fr !important; }
          .about-cta-inner { flex-direction: column !important; text-align: center !important; }
          .about-cta-tags { justify-content: center !important; }
        }
      `}</style>

      <motion.div
        style={{ maxWidth: 1152, margin: "0 auto", position: "relative", zIndex: 10 }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "5rem" }}>
          <motion.h2 variants={itemVariants} style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem,6vw,4.5rem)",
            fontWeight: 900, textAlign: "center", marginBottom: "2rem",
            letterSpacing: "-0.03em", color: textMain, lineHeight: 1.1, textTransform: "uppercase",
          }}>
            {data.headline}
          </motion.h2>
          <motion.div variants={itemVariants} style={{ width: 96, height: 8, borderRadius: 9999, background: "linear-gradient(90deg, #7a3fd1, #f5a623)" }} />
          <motion.p variants={itemVariants} style={{
            textAlign: "justify", hyphens: "auto", maxWidth: 768, marginTop: "2rem",
            color: textMuted, fontSize: "1rem", lineHeight: 1.8,
          }}>
            The Tech Festival Canada's <strong style={{ color: "#f5a623" }}>5 tech pillars</strong> aren't discussed in isolation. They're showcased through <strong style={{ color: accent }}>5 applied sectors</strong> where the demand is urgent and budgets are real. Every session, showcase, and networking moment is designed to answer one question:{" "}
            <em style={{ color: textMain, fontWeight: 600 }}>How does this technology get deployed, scaled, and procured in Canada, NOW?</em>
          </motion.p>
        </div>

        {/* ── Content Grid ── */}
        <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4rem", alignItems: "center" }}>

          {/* Left — Tech Pillars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="about-pillar-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(245,166,35,0.9)", boxShadow: "0 0 6px rgba(245,166,35,0.6)", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(245,166,35,0.85)" }}>5 TECH PILLARS</span>
            </div>
            {data.services?.filter(function (s) { return s.position === "right" }).map(function (service, i) {
              return <ServiceCard key={i} {...service} align="left" dark={dark} textMain={textMain} cardBg={cardBg} cardBdr={cardBdr} />
            })}
          </div>

          {/* Center — Globe */}
          <motion.div variants={itemVariants} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem 0" }}>
            <div style={{ position: "relative", width: 320, height: 320 }}>
              <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "conic-gradient(from 0deg, rgba(122,63,209,0.5), rgba(245,166,35,0.4), rgba(122,63,209,0.5), rgba(245,166,35,0.4), rgba(122,63,209,0.5))", animation: "aboutGlobeSpin 12s linear infinite", opacity: 0.4 }} />
              <InteractiveGlobe size={320} isDarkMode={dark} autoRotateSpeed={0.0012} />
            </div>
            <motion.div style={{ position: "absolute", inset: -16, border: "2px solid rgba(122,63,209,0.10)", borderRadius: 24, zIndex: -1, rotate: rotate1 }} />
            <motion.div style={{ position: "absolute", inset: -40, border: "2px solid rgba(245,166,35,0.10)", borderRadius: 40, zIndex: -2, rotate: rotate2 }} />
          </motion.div>

          {/* Right — Applied Sectors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="about-sector-label" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(160,100,255,0.85)" }}>5 APPLIED SECTORS</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(160,100,255,0.9)", boxShadow: "0 0 6px rgba(160,100,255,0.6)", display: "inline-block", flexShrink: 0 }} />
            </div>
            {data.services?.filter(function (s) { return s.position === "left" }).map(function (service, i) {
              return <ServiceCard key={i} {...service} align="right" dark={dark} textMain={textMain} cardBg={cardBg} cardBdr={cardBdr} />
            })}
          </div>
        </div>

        {/* ── Stats ── */}
        <div ref={statsRef} className="about-stats-grid" style={{ marginTop: "8rem", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2rem" }}>
          {data.stats?.map(function (stat, index) {
            return <StatBox key={index} {...stat} index={index} delay={index * 0.1} dark={dark} textMain={textMain} textMuted={textMuted} cardBg={cardBg} cardBdr={cardBdr} />
          })}
        </div>

        {/* ── Bottom CTA ── */}
        <motion.div
          className="about-cta-inner"
          variants={itemVariants}
          style={{
            marginTop: "7rem", position: "relative", overflow: "hidden",
            background: cardBg, border: "1px solid " + cardBdr,
            padding: "3rem", borderRadius: "2.5rem",
            display: "flex", flexDirection: "row", alignItems: "center",
            justifyContent: "space-between", gap: "2.5rem",
          }}
        >
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(122,63,209,0.10), transparent)" }} />

          <div style={{ flex: 1, position: "relative", zIndex: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(122,63,209,0.12)", border: "1px solid rgba(122,63,209,0.28)", borderRadius: 999, padding: "4px 14px", marginBottom: 14, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#b99eff" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 5px #f5a623", display: "inline-block" }} />
              TTFC 2026
            </div>
            <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.75rem", fontWeight: 900, marginBottom: "0.75rem", color: textMain, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
              GET <span style={{ color: "#f5a623" }}>INVOLVED</span>
            </h3>
            <div className="about-cta-tags" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Volunteer", "Collaborate", "Become a Community Partner"].map(function (tag) {
                return (
                  <span key={tag} style={{ background: "rgba(122,63,209,0.10)", border: "1px solid rgba(122,63,209,0.22)", borderRadius: 999, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 600, color: textMuted }}>
                    {tag}
                  </span>
                )
              })}
            </div>
          </div>

          <button
            onClick={onWriteToUs}
            style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "white", padding: "18px 40px", borderRadius: 18, border: "none", cursor: "pointer", fontSize: "0.92rem", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, letterSpacing: "0.5px", whiteSpace: "nowrap", transition: "transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 6px 28px rgba(122,63,209,0.3)", flexShrink: 0 }}
            onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <Mail size={18} />
            Write to Us
          </button>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ── Service Card ── */
function ServiceCard({ iconName, title, align, dark, textMain, cardBg, cardBdr }) {
  var isRight = align === "right"
  return (
    <motion.div
      whileHover={{ x: isRight ? -8 : 8 }}
      className={isRight ? "service-card-right" : "service-card-left"}
      style={{ display: "flex", flexDirection: "column", alignItems: isRight ? "flex-end" : "flex-start", cursor: "default", width: "100%" }}
    >
      <div className="service-icon-row" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8, flexDirection: isRight ? "row-reverse" : "row", width: "100%" }}>
        <div style={{ padding: 14, background: cardBg, border: "1px solid " + cardBdr, borderRadius: 14, color: "#f5a623", display: "flex", flexShrink: 0, transition: "background 0.3s ease" }}>
          {iconMap[iconName] || <HelpCircle className="w-5 h-5" />}
        </div>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.82rem", fontWeight: 700, color: textMain, lineHeight: 1.35, textAlign: isRight ? "right" : "left" }}>{title}</h3>
      </div>
    </motion.div>
  )
}

/* ── Stat Box ── */
var statIcons = [
  <Users className="w-7 h-7" />,
  <Sparkles className="w-7 h-7" />,
  <Clock className="w-7 h-7" />,
  <Trophy className="w-7 h-7" />,
]

function StatBox({ iconName, value, suffix, label, delay, index, dark, textMain, textMuted, cardBg, cardBdr }) {
  var s1 = useState(0); var displayValue = s1[0]; var setDisplayValue = s1[1];
  var ref = useRef(null)
  var isVisible = useInView(ref, { once: true })
  var springValue = useSpring(0, { stiffness: 35, damping: 15 })

  useMotionValueEvent(springValue, "change", function (latest) {
    setDisplayValue(Math.floor(latest))
  })

  useEffect(function () {
    if (isVisible) springValue.set(value)
  }, [isVisible, value, springValue])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.8 }}
      viewport={{ once: true }}
      style={{ background: cardBg, border: "1px solid " + cardBdr, padding: "2.5rem", borderRadius: 24, display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.3s ease" }}
      whileHover={{ borderColor: "rgba(245,166,35,0.30)", y: -4 }}
    >
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(245,166,35,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5a623", marginBottom: 24, flexShrink: 0 }}>
        {statIcons[index] || iconMap[iconName] || <TrendingUp className="w-7 h-7" />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2.25rem", fontWeight: 900, marginBottom: 12, color: textMain, letterSpacing: "0.05em" }}>
          {displayValue}{suffix}
        </div>
        <div style={{ color: textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}>
          {label && label.replace(/-/g, " ")}
        </div>
      </div>
    </motion.div>
  )
}
