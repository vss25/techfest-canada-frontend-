
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SponsorInquiryModal from "../components/SponsorInquiryModal";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

var TIERS = [
  { name: "Platinum", price: "$24,999", color: "#b99eff" },
  { name: "Gold",     price: "$19,999", color: "#f5a623" },
  { name: "Silver",   price: "$14,999", color: "#c0c0c0" },
  { name: "Bronze",   price: "$9,999",  color: "#cd7f32" },
];

var ROWS = [
  { group: "Exhibit & Presence" },
  { label: "Booth Space (10ft × 10ft)",        values: ["4", "3", "2", "1"] },
  { label: "Curated Conference Sessions",      values: ["2", "1", false, false] },
  { label: "Delegate Passes",                  values: ["15", "8", "6", "4"] },
  { label: "VIP Lounge Access",                values: ["15", "8", "5", "3"] },
  { label: "1:1 Curated Meetings",             values: ["10", "7", "3", "2"] },
  { group: "Branding & Visibility" },
  { label: "LED Screen Booth Wall",            values: ["Large", "Medium", "Small", "Thumbnail"] },
  { label: "Branded Signage",                  values: ["Large", "Medium", "Small", "Thumbnail"] },
  { label: "e-Show Directory",                 values: ["Double Spread", "Full Page", "Full Page", "Half Page"] },
  { label: "Delegate Bag Insert",              values: ["Full Page", "Full Page", "Full Page", "Full Page"] },
  { label: "Visitor Bag Insert",               values: ["Full Page", "Full Page", "Full Page", "Full Page"] },
  { label: "EDM Spotlights",                   values: ["4", "3", "3", "1"] },
  { group: "Thought Leadership" },
  { label: "Award Presenting Opportunity",     values: ["2", "1", false, false] },
  { label: "Opening Ceremony Guest of Honour", values: [true, true, false, false] },
  { label: "Press Release & Media Interview",  values: [true, true, true, true] },
  { label: "Product Demo",                     values: [true, true, true, true] },
  { label: "Live Podcast Recording",           values: [true, true, true, true] },
  { group: "Digital & Post-Event" },
  { label: "Website Showcase (50 Words)",      values: [true, true, true, true] },
  { label: "Post Event Social Media Video",    values: [true, true, true, true] },
];

var ADDITIONAL_PACKAGES = [
  {
    name: "Delegate Kit Partner", price: "$4,999", icon: "🎒",
    description: "Your brand in every delegate's hands — logo and insert included in all delegate kits distributed at registration.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Lanyard & Badge Partner", price: "$4,999", icon: "🪪",
    description: "Maximum visibility — your brand worn by every attendee throughout the entire event.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Product Demo", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Luncheon Partner", price: "$14,999", icon: "🍽️",
    description: "Own the luncheon experience — branded as the exclusive host of the midday networking session attended by all delegates.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Product Demo", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "CxO Breakfast Partner", price: "$9,999", icon: "☕",
    description: "Exclusive access to the highest-trust setting at the festival — an invitation-only breakfast for C-Suite and senior executives.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Gala Dinner Partner", price: "$19,999", icon: "🥂",
    description: "Be the name behind the most prestigious evening of the festival — a premium dinner and networking reception for senior leaders.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Product Demo", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "WiFi Partner", price: "$2,499", icon: "📶",
    description: "Your brand on every screen, every device — logo featured on the event WiFi splash page accessed by all attendees.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Registration Partner", price: "$4,999", icon: "📋",
    description: "First impressions start here — your brand is front and centre at the registration desk, the first touchpoint for every attendee.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Product Demo", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Visitor Bag Partner", price: "$4,999", icon: "🛍️",
    description: "Your materials in every visitor bag — reach the broader audience beyond delegates with your branded content.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "1 EDM Spotlight", "Thumbnail LED Screen & Branded Signage", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
  {
    name: "Custom Category Sponsor", price: "$7,499", icon: "⭐",
    description: "A bespoke naming opportunity — sponsor a specific category, zone, or experience that aligns with your brand identity.",
    highlights: ["1 Booth Space (10ft × 10ft)", "2 Delegate Passes", "Delegate Bag Insert: Full Page", "e-Show Directory: Half Page", "1 EDM Spotlight", "1:1 Curated Meetings (×2)", "VIP Lounge Access (×3)", "Press Release & Media Interview", "Thumbnail LED Screen & Branded Signage", "Product Demo", "Live Podcast Recording", "Website Showcase (50 Words)", "Post Event Social Media Video"],
  },
];

export default function Sponsor() {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(false); var inquiryOpen = s2[0]; var setInquiryOpen = s2[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var bg       = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid  = dark ? "rgba(220,210,255,0.82)" : "rgba(13,5,32,0.62)";
  var textSoft = dark ? "rgba(200,185,255,0.50)" : "rgba(90,40,180,0.40)";
  var cardBg   = dark ? "rgba(255,255,255,0.05)" : "rgba(122,63,209,0.03)";
  var cardBdr  = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.12)";
  var accent   = dark ? "#b99eff" : "#7a3fd1";

  return (
    <>
      <style>{`
        @keyframes sponsor-glow-breathe {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        .sponsor-hero {
          position: relative; overflow: hidden;
          min-height: 80vh;
          display: flex; align-items: center; justify-content: center;
        }
        .sponsor-hero-grid {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background-image:
            linear-gradient(rgba(122,63,209,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122,63,209,0.04) 1px, transparent 1px);
          background-size: 68px 68px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 100%);
        }
        .sponsor-hero-glow {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 1;
          animation: sponsor-glow-breathe 8s ease-in-out infinite;
        }
        .sp-desktop-table { display: block; }
        .sp-mobile-cards  { display: none;  }
        .additional-grid  { grid-template-columns: repeat(3, 1fr); }
        .tier-tabs {
          display: flex; border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(122,63,209,0.20); margin-bottom: 24px;
          position: sticky; top: 82px; z-index: 50;
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }
        .tier-tab {
          flex: 1; padding: 14px 6px; border: none; background: transparent;
          font-family: 'Orbitron', sans-serif; font-size: 0.68rem; font-weight: 900;
          letter-spacing: 0.5px; text-transform: uppercase;
          text-align: center; cursor: pointer; transition: all 0.2s ease;
        }
        .benefit-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid rgba(122,63,209,0.09);
        }
        .benefit-row:last-child { border-bottom: none; }
        .add-highlight-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 7px 0; border-bottom: 1px solid rgba(122,63,209,0.08);
        }
        .add-highlight-item:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .sp-desktop-table { display: none  !important; }
          .sp-mobile-cards  { display: block !important; }
          .sponsor-hero { min-height: auto; padding-top: 5rem; padding-bottom: 4rem; }
          .additional-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .additional-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <Navbar />

      {/* HERO */}
      <section className="sponsor-hero" style={{ background: bg }}>
        <div className="sponsor-hero-grid" />
        <div className="sponsor-hero-glow" style={{ width: 650, height: 650, top: -200, left: -150, filter: "blur(90px)", background: dark ? "radial-gradient(circle, rgba(122,63,209,0.22) 0%, transparent 70%)" : "radial-gradient(circle, rgba(122,63,209,0.10) 0%, transparent 70%)" }} />
        <div className="sponsor-hero-glow" style={{ width: 500, height: 500, top: -100, right: -180, filter: "blur(100px)", animationDelay: "3s", background: dark ? "radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 70%)" : "radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)" }} />

        <div style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto", padding: "clamp(5rem,10vw,8rem) 6%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <motion.h1
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.25, duration: 1.5, delay: 0.25 }}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2.2rem,5.5vw,4rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.5px", marginBottom: 10 }}
          >
            <span style={{ color: textMain }}>Partner With Us </span>
            <span style={{ background: "linear-gradient(135deg,#7a3fd1,#f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>To Lead The Future</span>
          </motion.h1>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
            style={{ width: 70, height: 2, borderRadius: 2, background: "linear-gradient(90deg," + accent + ",#f5a623)", margin: "18px auto 24px", transformOrigin: "center" }} />

          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 1.4, delay: 0.45 }}
            style={{ fontSize: "clamp(0.95rem,1.5vw,1.1rem)", lineHeight: 1.85, color: textMid, maxWidth: 600, marginBottom: 36, textAlign: "justify", hyphens: "auto" }}>
            The Tech Festival Canada is the ultimate platform for companies to showcase their leadership in emerging technologies. Our sponsorship packages provide unparalleled branding, networking, and thought-leadership opportunities, helping your company stay ahead in a competitive market.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 1.2, delay: 0.6 }}>
            <button onClick={function () { setInquiryOpen(true); }} className="btn-primary"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", padding: "17px 42px", borderRadius: 14, cursor: "pointer", transition: "all 0.25s ease" }}
            >Write to Us <span style={{ marginLeft: 10 }}>→</span></button>
          </motion.div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, zIndex: 4, pointerEvents: "none", background: "linear-gradient(to bottom, transparent, " + bg + ")" }} />
      </section>

      {/* COMPARISON TABLE */}
      <ComparisonTable dark={dark} bg={bg} textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} cardBg={cardBg} cardBdr={cardBdr} onInquiry={function () { setInquiryOpen(true); }} />

      {/* ADDITIONAL PACKAGES */}
      <AdditionalPackages dark={dark} bg={bg} textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} cardBg={cardBg} cardBdr={cardBdr} onInquiry={function () { setInquiryOpen(true); }} />

      {/* BOTTOM CTA */}
      <section style={{ background: bg, padding: "0 6% 5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", background: "linear-gradient(135deg, rgba(122,63,209,0.12), rgba(245,166,35,0.08))", border: "1px solid " + cardBdr, borderRadius: 28, padding: "clamp(2.5rem,5vw,4rem)", textAlign: "center" }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 900, color: textMain, marginBottom: 12 }}>Ready to Partner?</p>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: textMid, maxWidth: 500, margin: "0 auto 28px" }}>Get in touch to discuss a custom package tailored to your goals, or secure one of our standard partnerships today.</p>
          <button onClick={function () { setInquiryOpen(true); }} className="btn-primary"
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", padding: "16px 38px", borderRadius: 14, cursor: "pointer", transition: "transform 0.2s ease" }}
          >Write to Us</button>
        </div>
      </section>

      <Footer />
      <SponsorInquiryModal isOpen={inquiryOpen} onClose={function () { setInquiryOpen(false); }} />
    </>
  );
}

function ComparisonTable(props) {
  var dark = props.dark; var bg = props.bg; var textMain = props.textMain;
  var textMid = props.textMid; var textSoft = props.textSoft; var accent = props.accent;
  var cardBg = props.cardBg; var cardBdr = props.cardBdr;

  var sectionRef = useRef(null); var theadRef = useRef(null);
  var s1 = useState(false); var showBar = s1[0]; var setShowBar = s1[1];
  var s2 = useState(0);     var activeTier = s2[0]; var setActiveTier = s2[1];

  useEffect(function () {
    function onScroll() {
      if (!sectionRef.current || !theadRef.current) return;
      var sR = sectionRef.current.getBoundingClientRect();
      var tR = theadRef.current.getBoundingClientRect();
      setShowBar(tR.bottom < 80 && sR.bottom > 80);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  var groupSections = (function () {
    var sections = []; var current = null; var items = [];
    ROWS.forEach(function (row) {
      if (row.group) { if (current) sections.push({ group: current, items: items }); current = row.group; items = []; }
      else { items.push(row); }
    });
    if (current) sections.push({ group: current, items: items });
    return sections;
  })();

  return (
    <>
      <div className="sp-desktop-table" style={{ position: "fixed", top: 80, left: 0, right: 0, zIndex: 900, transform: showBar ? "translateY(0)" : "translateY(-100%)", opacity: showBar ? 1 : 0, transition: "transform 0.3s ease, opacity 0.25s ease", pointerEvents: showBar ? "auto" : "none", padding: "0 6%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "28% repeat(4,1fr)", background: dark ? "rgba(10,5,24,0.96)" : "rgba(248,246,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid " + cardBdr, boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.6)" : "0 4px 24px rgba(122,63,209,0.08)" }}>
            <div style={{ padding: "16px 24px", display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: textSoft }}>Benefit</span>
            </div>
            {TIERS.map(function (tier) {
              return (
                <div key={tier.name} style={{ padding: "14px 12px", textAlign: "center", borderLeft: "1px solid " + cardBdr, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <div style={{ width: 24, height: 3, borderRadius: 3, background: tier.color, boxShadow: "0 0 10px " + tier.color + "50", marginBottom: 4 }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.78rem", fontWeight: 900, color: textMain }}>{tier.name}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.95rem", fontWeight: 900, color: tier.color }}>{tier.price}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section ref={sectionRef} style={{ background: bg, padding: "5rem 6%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHeader eyebrow="Sponsorship Tiers" title="Compare Packages" subtitle="Every benefit at a glance — pick the partnership level that matches your ambitions." textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} />

          <div className="sp-desktop-table" style={{ marginTop: "2.5rem", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 860, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
              <thead ref={theadRef} style={{ visibility: showBar ? "hidden" : "visible", opacity: showBar ? 0 : 1, transition: "opacity 0.2s ease" }}>
                <tr>
                  <th style={{ background: dark ? "#0d0620" : "#f4f0ff", padding: "22px 24px", textAlign: "left", borderBottom: "2px solid " + cardBdr, width: "28%" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: textSoft }}>Benefit</span>
                  </th>
                  {TIERS.map(function (tier) {
                    return (
                      <th key={tier.name} style={{ background: dark ? "#0d0620" : "#f4f0ff", padding: "20px 16px", textAlign: "center", borderBottom: "2px solid " + cardBdr, borderLeft: "1px solid " + cardBdr, width: "18%" }}>
                        <div style={{ width: 32, height: 4, borderRadius: 4, background: tier.color, margin: "0 auto 12px", boxShadow: "0 0 14px " + tier.color + "60" }} />
                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.88rem", fontWeight: 900, color: textMain, display: "block" }}>{tier.name}</span>
                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1.15rem", fontWeight: 900, color: tier.color, display: "block", marginTop: 5 }}>{tier.price}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(function (row, ri) {
                  if (row.group) {
                    return (
                      <tr key={ri}>
                        <td colSpan={5} style={{ padding: "20px 24px 12px", background: dark ? "rgba(122,63,209,0.10)" : "rgba(122,63,209,0.04)", borderTop: ri > 0 ? "2px solid " + cardBdr : "none" }}>
                          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: accent }}>{row.group}</span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={ri}
                      style={{ background: ri % 2 === 0 ? "transparent" : (dark ? "rgba(155,135,245,0.04)" : "rgba(122,63,209,0.02)") }}
                      onMouseEnter={function (e) { e.currentTarget.style.background = dark ? "rgba(155,135,245,0.09)" : "rgba(122,63,209,0.05)"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.background = ri % 2 === 0 ? "transparent" : (dark ? "rgba(155,135,245,0.04)" : "rgba(122,63,209,0.02)"); }}
                    >
                      <td style={{ padding: "16px 24px", fontSize: "0.95rem", fontWeight: 500, color: dark ? "rgba(220,210,255,0.88)" : "rgba(13,5,32,0.72)", borderTop: "1px solid " + (dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.06)"), lineHeight: 1.4 }}>{row.label}</td>
                      {row.values.map(function (val, vi) {
                        return (
                          <td key={vi} style={{ padding: "16px 14px", textAlign: "center", borderTop: "1px solid " + (dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.06)"), borderLeft: "1px solid " + (dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.06)"), fontSize: "0.92rem" }}>
                            {val === true  ? <span style={{ color: "#4ade80", fontSize: "1.3rem", fontWeight: 700 }}>✓</span>
                           : val === false ? <span style={{ color: dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)" }}>—</span>
                           : <span style={{ fontWeight: 700, color: dark ? "rgba(255,255,255,0.92)" : "#0d0520" }}>{val}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sp-mobile-cards" style={{ marginTop: "2rem" }}>
            <div className="tier-tabs">
              {TIERS.map(function (tier, i) {
                var active = activeTier === i;
                return (
                  <button key={tier.name} className="tier-tab"
                    onClick={function () { setActiveTier(i); }}
                    style={{ background: active ? tier.color : "transparent", color: active ? "#fff" : (dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.45)"), borderRight: i < TIERS.length - 1 ? "1px solid rgba(122,63,209,0.18)" : "none" }}
                  >{tier.name}</button>
                );
              })}
            </div>

            {TIERS.map(function (tier, ti) {
              if (activeTier !== ti) return null;
              return (
                <motion.div key={tier.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  style={{ background: dark ? "rgba(255,255,255,0.05)" : "#ffffff", border: "1px solid " + (dark ? "rgba(155,135,245,0.22)" : "rgba(122,63,209,0.14)"), borderRadius: 20, padding: "24px 20px", boxShadow: dark ? "0 4px 28px rgba(0,0,0,0.4)" : "0 4px 20px rgba(122,63,209,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                      <div style={{ width: 32, height: 4, borderRadius: 4, background: tier.color, boxShadow: "0 0 12px " + tier.color + "70", marginBottom: 8 }} />
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1.1rem", fontWeight: 900, color: textMain }}>{tier.name} Partner</div>
                    </div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1.5rem", fontWeight: 900, color: tier.color }}>{tier.price}</div>
                  </div>

                  {groupSections.map(function (section) {
                    return (
                      <div key={section.group} style={{ marginBottom: 22 }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: accent, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid " + (dark ? "rgba(155,135,245,0.22)" : "rgba(122,63,209,0.14)") }}>{section.group}</div>
                        {section.items.map(function (row) {
                          var val = row.values[ti];
                          return (
                            <div key={row.label} className="benefit-row">
                              <span style={{ fontSize: "0.88rem", fontWeight: 500, flex: 1, lineHeight: 1.4, color: dark ? "rgba(220,210,255,0.90)" : "rgba(13,5,32,0.75)" }}>{row.label}</span>
                              <span style={{ fontSize: "0.88rem", fontWeight: 700, textAlign: "right", flexShrink: 0, color: val === false ? (dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)") : val === true ? "#4ade80" : textMain }}>
                                {val === true ? "✓" : val === false ? "—" : val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <div style={{ marginTop: 12, padding: 2, borderRadius: 14 }}>
                    <button onClick={props.onInquiry} className="btn-primary" style={{ width: "100%", padding: "16px", borderRadius: 12, cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "0.82rem", fontWeight: 900, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                      Enquire About {tier.name} →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function AdditionalPackages(props) {
  var dark = props.dark; var textMain = props.textMain; var textMid = props.textMid;
  var textSoft = props.textSoft; var accent = props.accent; var cardBdr = props.cardBdr;
  var sectionBg = dark ? "#0b0618" : "#f4f0ff";
  var sectionBorder = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.12)";

  return (
    <section style={{ background: sectionBg, borderTop: "1px solid " + sectionBorder, borderBottom: "1px solid " + sectionBorder, padding: "5rem 6%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionHeader eyebrow="Event Partnerships" title="Category Partnerships" subtitle="Own a specific moment at the festival. These partnerships tie your brand to a named experience and come with core visibility and activation benefits." textMain={textMain} textMid={textMid} textSoft={textSoft} accent={accent} />
        <div className="additional-grid" style={{ display: "grid", gap: 20, marginTop: "2.5rem" }}>
          {ADDITIONAL_PACKAGES.map(function (pkg, i) {
            return <AdditionalCard key={pkg.name} pkg={pkg} dark={dark} textMain={textMain} textMid={textMid} accent={accent} cardBdr={cardBdr} delay={i * 0.06} onInquiry={props.onInquiry} />;
          })}
        </div>
      </div>
    </section>
  );
}

function AdditionalCard(props) {
  var pkg = props.pkg; var dark = props.dark; var textMain = props.textMain; var accent = props.accent;
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });

  var cardBg    = dark ? "rgba(255,255,255,0.06)" : "#ffffff";
  var cardBdr   = dark ? "rgba(155,135,245,0.22)" : "rgba(122,63,209,0.14)";
  var descColor = dark ? "rgba(210,200,255,0.82)" : "rgba(60,30,110,0.72)";
  var itemColor = dark ? "rgba(230,222,255,0.94)" : "rgba(13,5,32,0.80)";

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.1, delay: props.delay }}
      whileHover={{ y: -4 }}
      style={{ borderRadius: 20, padding: "28px 24px", background: cardBg, border: "1px solid " + cardBdr, boxShadow: dark ? "0 4px 28px rgba(0,0,0,0.45)" : "0 4px 20px rgba(122,63,209,0.07)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: "1.6rem" }}>{pkg.icon}</span>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1rem", fontWeight: 900, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{pkg.price}</span>
      </div>
      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.78rem", fontWeight: 900, color: textMain, marginBottom: 8, lineHeight: 1.3 }}>{pkg.name}</div>
      <p style={{ fontSize: "0.82rem", color: descColor, lineHeight: 1.7, margin: "0 0 16px" }}>{pkg.description}</p>
      <div style={{ height: 1, marginBottom: 16, background: dark ? "linear-gradient(90deg,rgba(155,135,245,0.35),transparent)" : "linear-gradient(90deg,rgba(122,63,209,0.20),transparent)" }} />
      <div style={{ flex: 1, marginBottom: 20 }}>
        {pkg.highlights.map(function (item) {
          return (
            <div key={item} className="add-highlight-item" style={{ borderBottomColor: dark ? "rgba(155,135,245,0.10)" : "rgba(122,63,209,0.07)", color: itemColor }}>
              <span style={{ color: "#4ade80", fontSize: "0.78rem", flexShrink: 0, marginTop: 2 }}>✓</span>
              <span style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>{item}</span>
            </div>
          );
        })}
      </div>
      <button onClick={props.onInquiry} className="btn-outline"
        style={{ width: "100%", padding: "11px", borderRadius: 10, cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", transition: "all 0.2s ease" }}
      >Enquire →</button>
    </motion.div>
  );
}

function SectionHeader(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ type: "spring", bounce: 0.2, duration: 1.2 }} style={{ textAlign: "center", marginBottom: "1rem" }}>
      <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: props.textSoft, marginBottom: 12 }}>{props.eyebrow}</p>
      <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.5rem,3.5vw,2.4rem)", fontWeight: 900, color: props.textMain, marginBottom: 16 }}>{props.title}</h2>
      <div style={{ width: 60, height: 2, borderRadius: 2, background: "linear-gradient(90deg," + props.accent + ",#f5a623)", margin: "0 auto 20px" }} />
      <p style={{ fontSize: "0.95rem", lineHeight: 1.8, color: props.textMid, maxWidth: 600, margin: "0 auto" }}>{props.subtitle}</p>
    </motion.div>
  );
}

var JOB_TITLES = [
  "Head of AI / ML",
  "Director of Data Science",
  "GenAI Program Lead",
  "AI Product Manager",
  "Enterprise Architecture Lead",
  "Platform Engineering Lead",
  "MLOps Lead",
  "Data Engineering Lead",
  "Contact Center Transformation Lead",
  "AI Governance and Responsible AI Lead",
  "Quantum Program Director",
  "Research Director",
  "CTO for Advanced R&D",
  "Cryptography Lead",
  "Post Quantum Migration Lead",
  "High Performance Computing Director",
  "Industry Innovation Lab Lead",
  "University Research Lead",
  "VP Manufacturing",
  "Plant Manager",
  "Automation Director",
  "Robotics Engineer",
  "Warehouse and Fulfillment Operations Director",
  "Safety Engineering Lead",
  "Quality Assurance Lead",
  "Field Operations Lead",
  "Energy and Utilities Director",
  "Grid Modernization Lead",
  "Facilities Director",
  "Building Decarbonization Lead",
  "EV Fleet Manager",
  "Mobility Lead",
  "Carbon Accounting and ESG Reporting Lead",
  "Circular Economy Packaging Sustainability Lead",
  "Climate Risk and Resilience Lead",
  "Other",
];

var INDUSTRIES = {
  "Artificial Intelligence": [
    "Infrastructure and Compute",
    "Models and Model Providers",
    "Platforms, MLOps, and Deployment",
    "Data and Synthetic Data",
    "Search, RAG, and Knowledge Systems",
    "Agents and Automation",
    "Security and Privacy",
    "Governance, Risk, and Compliance",
    "Enterprise Applications",
    "Industrial AI (Vision, Robotics, Autonomy)",
  ],
  "Quantum Computing": [
    "Hardware and Processors",
    "Enabling Tech and Cryo Systems",
    "Control, Test, and Instrumentation",
    "Cloud Access Platforms",
    "Software, SDKs, and Compilers",
    "Algorithms and Industry Apps",
    "Error Correction and Benchmarking",
    "Quantum Networking and QKD",
    "Post Quantum Security",
    "Quantum Sensing and Metrology",
  ],
  "Robotics": [
    "Industrial and Cobots",
    "Mobile Robots (AMRs/AGVs)",
    "Warehouse and Fulfillment",
    "Service Robotics",
    "Healthcare and Assistive",
    "Drones and Aerial",
    "Autonomous Vehicles and Field Robotics",
    "Humanoids",
    "Components, Sensors, and Perception",
    "Software, Simulation, Integration, and Safety",
  ],
  "Clean Technology": [
    "Clean Energy Generation",
    "Storage and Batteries",
    "Grid and Energy Software",
    "Buildings and Efficiency",
    "Electrification and EV Charging",
    "Carbon Accounting and ESG Tech",
    "Carbon Capture and Removal",
    "Hydrogen and Sustainable Fuels",
    "Circular Economy and Sustainable Materials",
    "Water, Air, and Climate Resilience",
  ],
};

function SponsorInquiryForm(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;

  var s1 = useState(""); var firstName = s1[0]; var setFirstName = s1[1];
  var s2 = useState(""); var lastName = s2[0]; var setLastName = s2[1];
  var s3 = useState(""); var email = s3[0]; var setEmail = s3[1];
  var s4 = useState(""); var phone = s4[0]; var setPhone = s4[1];
  var s5 = useState(""); var company = s5[0]; var setCompany = s5[1];
  var s6 = useState(""); var jobTitle = s6[0]; var setJobTitle = s6[1];
  var s7 = useState(""); var industry = s7[0]; var setIndustry = s7[1];
  var s8 = useState(false); var sending = s8[0]; var setSending = s8[1];
  var s9 = useState("idle"); var status = s9[0]; var setStatus = s9[1];
  var s10 = useState(false); var dark = s10[0]; var setDark = s10[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return function () { document.body.style.overflow = ""; };
  }, [isOpen]);

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setSending(true);

    var messageLines = [
      "[Sponsorship Enquiry]",
      "Name: " + firstName + " " + lastName,
      email ? "Email: " + email : "",
      phone ? "Phone: " + phone : "",
      company ? "Company: " + company : "",
      jobTitle ? "Job Title: " + jobTitle : "",
      industry ? "Industry: " + industry : "",
    ].filter(Boolean).join("\n");

    fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  "service_gy3fvru",
        template_id: "template_ufqzzep",
        user_id:     "gZgYZtLCXPVgUsVj_",
        template_params: {
          to_email:   "baldeep@thetechfestival.com",
          from_name:  firstName + " " + lastName,
          from_email: email || "not provided",
          message:    messageLines,
        },
      }),
    })
      .then(function (res) {
        setSending(false);
        if (res.ok || res.status === 200) {
          setStatus("success");
          setTimeout(function () {
            setStatus("idle");
            setFirstName(""); setLastName(""); setEmail("");
            setPhone(""); setCompany(""); setJobTitle(""); setIndustry("");
            onClose();
          }, 2200);
        } else {
          setStatus("error");
        }
      })
      .catch(function () {
        setSending(false);
        setStatus("error");
      });
  }

  var bgCard = dark ? "#0d0620" : "#ffffff";
  var borderCol = dark ? "rgba(122,63,209,0.22)" : "rgba(122,63,209,0.12)";
  var inputBg = dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.04)";
  var inputBdr = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.12)";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";
  var accent = dark ? "#b99eff" : "#7a3fd1";

  var inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid " + inputBdr,
    background: inputBg,
    color: textMain,
    fontSize: "0.9rem",
    fontWeight: 500,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  var selectStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid " + inputBdr,
    background: inputBg,
    color: textMain,
    fontSize: "0.88rem",
    fontWeight: 500,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='" + (dark ? "%23b99eff" : "%237a3fd1") + "' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  var labelStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.62rem",
    fontWeight: 800,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: textMid,
    marginBottom: 8,
    display: "block",
  };

  var industryKeys = Object.keys(INDUSTRIES);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sponsor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 10000,
              background: "rgba(0,0,0,0.70)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal wrapper — flex centered */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
          <motion.div
            key="sponsor-modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            style={{
              position: "relative",
              width: "min(520px, 92vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: bgCard,
              border: "1px solid " + borderCol,
              borderRadius: 24,
              padding: "36px 32px",
              boxShadow: dark
                ? "0 24px 80px rgba(0,0,0,0.7)"
                : "0 24px 80px rgba(122,63,209,0.12)",
              pointerEvents: "auto",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 18, right: 18,
                width: 34, height: 34, borderRadius: "50%",
                border: "1px solid " + borderCol,
                background: "transparent",
                color: textMid, fontSize: "1rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>

            {/* Header */}
            <h2 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "1.4rem", fontWeight: 900,
              color: textMain, marginBottom: 4,
            }}>
              Get in <span style={{ color: "var(--brand-orange, #f5a623)" }}>Touch</span>
            </h2>
            <p style={{
              fontSize: "0.85rem", color: textMid,
              marginBottom: 28, lineHeight: 1.5,
            }}>
              Interested in sponsoring or exhibiting? Fill in your details and our partnerships team will be in touch.
            </p>

            {status === "success" ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
              }}>
                <div style={{ fontSize: "2.4rem", marginBottom: 14 }}>✓</div>
                <p style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "1rem", fontWeight: 800,
                  color: textMain, marginBottom: 6,
                }}>Enquiry Sent</p>
                <p style={{ fontSize: "0.85rem", color: textMid }}>
                  We'll get back to you shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Row: First + Last Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>First Name <span style={{ color: "var(--brand-orange)" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={function (e) { setFirstName(e.target.value); }}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name <span style={{ color: "var(--brand-orange)" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={function (e) { setLastName(e.target.value); }}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Row: Email + Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>Professional Email</label>
                    <input
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={function (e) { setEmail(e.target.value); }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Business Phone</label>
                    <input
                      type="tel"
                      placeholder="+1 (416) 000-0000"
                      value={phone}
                      onChange={function (e) { setPhone(e.target.value); }}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Company */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Company</label>
                  <input
                    type="text"
                    placeholder="Your organization"
                    value={company}
                    onChange={function (e) { setCompany(e.target.value); }}
                    style={inputStyle}
                  />
                </div>

                {/* Row: Job Title + Industry */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                  <div>
                    <label style={labelStyle}>Job Title</label>
                    <select
                      value={jobTitle}
                      onChange={function (e) { setJobTitle(e.target.value); }}
                      style={selectStyle}
                    >
                      <option value="" disabled>Select title</option>
                      {JOB_TITLES.map(function (t) {
                        return <option key={t} value={t}>{t}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Industry</label>
                    <select
                      value={industry}
                      onChange={function (e) { setIndustry(e.target.value); }}
                      style={selectStyle}
                    >
                      <option value="" disabled>Select industry</option>
                      {industryKeys.map(function (group) {
                        return (
                          <optgroup key={group} label={group}>
                            {INDUSTRIES[group].map(function (ind) {
                              return <option key={ind} value={ind}>{ind}</option>;
                            })}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Error message */}
                {status === "error" && (
                  <div style={{
                    textAlign: "center", padding: "10px 14px", marginBottom: 14,
                    background: "rgba(255,107,107,0.10)", border: "1px solid rgba(255,107,107,0.25)",
                    borderRadius: 8, fontSize: "0.78rem", color: "#ff6b6b",
                  }}>Something went wrong. Please try again.</div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || !firstName.trim() || !lastName.trim()}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: 14,
                    border: "none",
                    cursor: (!firstName.trim() || !lastName.trim()) ? "not-allowed" : "pointer",
                    background: (!firstName.trim() || !lastName.trim())
                      ? (dark ? "rgba(155,135,245,0.15)" : "rgba(122,63,209,0.10)")
                      : "linear-gradient(135deg, #7a3fd1, #f5a623)",
                    color: (!firstName.trim() || !lastName.trim())
                      ? textMid
                      : "#ffffff",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    transition: "all 0.25s ease",
                    opacity: sending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {sending ? "Sending..." : "Send Enquiry →"}
                </button>
              </>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

