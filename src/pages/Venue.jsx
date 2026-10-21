import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Use local images if available, fallback to real Westin-style hotel photos
const IMAGES = [
  "/venue1.jpg",
  "/venue2.jpg",
  "/venue3.jpg",
  "/venue4.jpg",
  "/venue5.jpg",
];

const GALLERY = [
  { src: "/venue1.jpg", fallback: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85", label: "Aerial View" },
  { src: "/venue2.jpg", fallback: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85", label: "Pool" },
  { src: "/venue3.jpg", fallback: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85", label: "City View" },
  { src: "/venue4.jpg", fallback: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=85", label: "VIP Lounge" },
  { src: "/venue5.jpg", fallback: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85", label: "Lobby" },
];

// Fallback: if local images fail, swap to these
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=85",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=85",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=85",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=85",
];

// Cvent's own viewers for the Westin (from its Cvent listing, Social Tables). The 3D room can't be framed
// by other sites, so it opens in a new tab; the floor plan is embedded, loaded only once someone asks
// (Cvent sets its own cookies). Same links as the TTFC app's Venue screen.
const WALKTHROUGH_3D = "https://pr3d.socialtables.com/room/1650904?sourceSite=ifp";
const FLOOR_PLANS = "https://connect.socialtables.com/embed/3198/floors/248117?lang=en-US&measurementSystem=imperial";

function FadeIn({ children, delay = 0, y = 30 }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.215, 0.61, 0.355, 1] }}
    >{children}</motion.div>
  );
}

export default function Venue() {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(0);     var activeImg = s2[0]; var setActiveImg = s2[1];
  var s3 = useState(false); var planOn = s3[0]; var setPlanOn = s3[1];
  var s4 = useState(false); var planLoaded = s4[0]; var setPlanLoaded = s4[1];
  var heroRef = useRef(null);
  var scrollData = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  var heroY  = useTransform(scrollData.scrollYProgress, [0, 1], ["0%", "30%"]);
  var heroOp = useTransform(scrollData.scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    var t = setInterval(function () { setActiveImg(function (i) { return (i + 1) % GALLERY.length; }); }, 4000);
    return function () { clearInterval(t); };
  }, []);

  var bg       = dark ? "#06020f" : "#faf9ff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid  = dark ? "rgba(220,210,255,0.82)" : "rgba(13,5,32,0.65)";
  var cardBg   = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var cardBdr  = dark ? "rgba(155,135,245,0.15)" : "rgba(122,63,209,0.12)";
  var accent   = dark ? "#b99eff" : "#7a3fd1";

  return (
    <div style={{ background: bg, color: textMain, minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        .venue-img-dot { width:10px;height:10px;border-radius:50%;border:none;cursor:pointer;transition:all 0.3s ease; }
        .space-card:hover { transform:translateY(-4px) !important; }
        .venue-bento-grid { display:grid; }
        .mobile-gallery-strip { display:none; }
        @keyframes venueSpin { to { transform: rotate(360deg); } }
        .explore-3d:hover { transform:translateY(-4px); box-shadow:0 18px 48px rgba(122,63,209,0.35) !important; }
        .explore-load:hover { filter:brightness(1.08); }
        .fp-embed { aspect-ratio:16/10; }
        @media(max-width:860px){ .explore-grid { grid-template-columns:1fr !important; } }
        @media(max-width:640px){
          .fp-embed { aspect-ratio:4/5; }
          .venue-bento-grid { display:none !important; }
          .mobile-gallery-strip { display:block !important; }
          .venue-stats-row { flex-direction:column !important; gap:12px !important; }
          .location-grid { grid-template-columns:1fr !important; }
        }
      `}} />

      {/* HERO */}
      <section ref={heroRef} style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div style={{ position: "absolute", inset: "-10%", y: heroY, zIndex: 0 }}>
          <AnimatePresence mode="sync">
            {GALLERY.map(function (img, i) {
              return i === activeImg ? (
                <motion.img key={img.src} src={img.src} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}
                  onError={function(e) { e.currentTarget.src = img.fallback; }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null;
            })}
          </AnimatePresence>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,2,15,0.55) 0%, rgba(6,2,15,0.35) 40%, rgba(6,2,15,0.75) 100%)" }} />
        </motion.div>

        {/* Hero content — centered */}
        <motion.div style={{ position: "relative", zIndex: 5, textAlign: "center", padding: "0 6%", maxWidth: 860, width: "100%", opacity: heroOp, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "8px 22px", marginBottom: 28, fontSize: "0.75rem", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#ffffff" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 8px #f5a623", display: "inline-block", animation: "pulseGlow 2s ease-in-out infinite" }} />
            TTFC 2026 — Official Venue
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.9 }}
            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(3rem,7vw,5.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", color: "#ffffff", marginBottom: 20, textShadow: "0 4px 40px rgba(0,0,0,0.4)", textAlign: "center" }}
          >
            The Westin<br />
            <span style={{ background: "linear-gradient(90deg,#b99eff,#f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Harbour Castle</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
            style={{ fontSize: "clamp(1rem,2vw,1.25rem)", color: "rgba(255,255,255,0.85)", lineHeight: 1.8, maxWidth: 560, margin: "0 auto 40px", textAlign: "center" }}
          >
            Toronto's most iconic waterfront hotel. Where Canada's tech leaders will converge on 26–27 October 2026.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}
            className="venue-stats-row"
            style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
          >
            {[{ num: "977", label: "Rooms" }, { num: "40+", label: "Floors" }, { num: "Lake Ontario", label: "Waterfront" }].map(function (s) {
              return (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: 16, padding: "16px 32px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", marginBottom: 4 }}>{s.num}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{s.label}</div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Scroll hint — centered via flexbox */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: "absolute", bottom: 76, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.72rem", fontFamily: "'Orbitron',sans-serif", letterSpacing: "2px" }}
        >
          <span>SCROLL</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </motion.div>

        {/* Image dots — centered via flexbox */}
        <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10, zIndex: 7 }}>
          {GALLERY.map(function (_, i) {
            return <button key={i} className="venue-img-dot" onClick={function () { setActiveImg(i); }}
              style={{ background: i === activeImg ? "#f5a623" : "rgba(255,255,255,0.40)", transform: i === activeImg ? "scale(1.4)" : "scale(1)" }} />;
          })}
        </div>
      </section>

      {/* INTRO STRIP */}
      <section style={{ background: dark ? "#06020f" : "#0d0520", padding: "3.5rem 6%", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(122,63,209,0.25) 0%, transparent 70%)", pointerEvents: "none" }} />
        <FadeIn>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: "#ffffff", marginBottom: 8 }}>1 Harbour Square, Toronto</div>
              <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.60)", letterSpacing: "0.5px" }}>Ontario, Canada · M5J 1A6</div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="https://maps.google.com/?q=Westin+Harbour+Castle+Toronto" target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.2s ease" }}
                onMouseEnter={function (e) { e.currentTarget.style.background = "rgba(122,63,209,0.25)"; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Get Directions
              </a>
              <a href="https://www.marriott.com/en-us/hotels/yyzwh-the-westin-harbour-castle-toronto/overview/" target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 12, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#ffffff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}
              >Book a Room</a>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* GALLERY */}
      <section style={{ background: bg, padding: "6rem 5%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: 12 }}>The Setting</p>
              <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, color: textMain, marginBottom: 16 }}>A Landmark on the Waterfront</h2>
              <div style={{ width: 50, height: 3, borderRadius: 3, background: "linear-gradient(90deg,#7a3fd1,#f5a623)", margin: "0 auto" }} />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="venue-bento-grid" style={{ gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "280px 280px", gap: 12 }}>
              {[
                { col: "1/8", row: "1/2", src: 0, label: "Aerial View" },
                { col: "8/13", row: "1/2", src: 1, label: "Pool" },
                { col: "1/5", row: "2/3", src: 2, label: "City View" },
                { col: "5/9", row: "2/3", src: 3, label: "VIP Lounge" },
                { col: "9/13", row: "2/3", src: 4, label: "Lobby" },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ gridColumn: item.col, gridRow: item.row, borderRadius: 20, overflow: "hidden", position: "relative" }}>
                    <img src={IMAGES[item.src]} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease" }}
                      onMouseEnter={function (e) { e.currentTarget.style.transform = "scale(1.04)"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }} onError={function(e) { var idx = IMAGES.indexOf(e.currentTarget.src.replace(window.location.origin,"")); if(idx >= 0) e.currentTarget.src = FALLBACK_IMAGES[idx]; }} />
                    <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "7px 14px", fontFamily: "'Orbitron',sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "1px", color: "#fff", textTransform: "uppercase" }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
          <div className="mobile-gallery-strip">
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
              {GALLERY.map(function (img, i) {
                return <img key={i} src={img.src} alt={img.label} onError={function(e) { e.currentTarget.src = img.fallback; }} style={{ width: 280, height: 200, objectFit: "cover", borderRadius: 16, flexShrink: 0 }} />;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section style={{ background: dark ? "rgba(122,63,209,0.04)" : "rgba(122,63,209,0.03)", borderTop: "1px solid " + cardBdr, padding: "6rem 5%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div className="location-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: 16 }}>Getting Here</p>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginBottom: 20, lineHeight: 1.2 }}>Right in the Heart of Toronto</h2>
                <p style={{ fontSize: "1rem", color: textMid, lineHeight: 1.9, marginBottom: 28 }}>
                  Situated on the iconic Toronto waterfront, The Westin Harbour Castle is steps from the CN Tower, Union Station, and the city's financial district — the perfect backdrop for Canada's most important tech gathering.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {[
                    "Union Station — 10 min walk",
                    "Toronto Pearson Airport — 30 min drive",
                    "Financial District — 5 min walk",
                    "CN Tower & Rogers Centre — 15 min walk",
                  ].map(function (text) {
                    return (
                      <div key={text} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: cardBg, border: "1px solid " + cardBdr, borderRadius: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.95rem", color: textMain, fontWeight: 500 }}>{text}</span>
                      </div>
                    );
                  })}
                </div>
                <a href="https://maps.google.com/?q=Westin+Harbour+Castle+Toronto" target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 34px", borderRadius: 12, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#ffffff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}
                >Open in Maps</a>
              </div>
              <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid " + cardBdr, boxShadow: dark ? "0 12px 48px rgba(0,0,0,0.5)" : "0 12px 48px rgba(122,63,209,0.10)", position: "relative", aspectRatio: "1/1" }}>
                <iframe title="Westin Harbour Castle Toronto"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2886.9!2d-79.3732!3d43.6403!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89d4cb2b9c01d5c1%3A0x8e9c4f3a5e6d7b8c!2sThe%20Westin%20Harbour%20Castle%2C%20Toronto!5e0!3m2!1sen!2sca!4v1700000000000"
                  style={{ width: "100%", height: "100%", border: "none", display: "block", filter: dark ? "invert(90%) hue-rotate(180deg)" : "none" }}
                  allowFullScreen loading="lazy" />
                <div style={{ position: "absolute", top: 16, left: 16, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", borderRadius: 10, padding: "8px 14px", fontFamily: "'Orbitron',sans-serif", fontSize: "0.65rem", fontWeight: 800, color: "#fff", letterSpacing: "1px", textTransform: "uppercase" }}>TTFC 2026</div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* EXPLORE THE VENUE */}
      <section style={{ background: bg, padding: "6rem 5%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: 12 }}>Explore the Venue</p>
              <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, color: textMain, marginBottom: 16 }}>Walk the Westin Before You Arrive</h2>
              <div style={{ width: 50, height: 3, borderRadius: 3, background: "linear-gradient(90deg,#7a3fd1,#f5a623)", margin: "0 auto" }} />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="explore-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, alignItems: "stretch" }}>
              <a href={WALKTHROUGH_3D} target="_blank" rel="noopener noreferrer" className="explore-3d"
                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 28, padding: "2rem", borderRadius: 24, background: "linear-gradient(135deg,#7a3fd1 0%,#9b4fd6 55%,#f5a623 130%)", color: "#ffffff", textDecoration: "none", boxShadow: dark ? "0 12px 48px rgba(0,0,0,0.5)" : "0 12px 48px rgba(122,63,209,0.18)", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
              >
                <span style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", display: "grid", placeItems: "center" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                </span>
                <span>
                  <span style={{ display: "block", fontFamily: "'Orbitron',sans-serif", fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.25, marginBottom: 10 }}>Harbour Ballroom in 3D</span>
                  <span style={{ display: "block", fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(255,255,255,0.86)" }}>Walk the main stage room · opens Cvent's 3D viewer</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)", fontFamily: "'Orbitron',sans-serif", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Open the 3D Walkthrough
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
                </span>
              </a>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: 24, background: cardBg, border: "1px solid " + cardBdr, boxShadow: dark ? "0 12px 48px rgba(0,0,0,0.5)" : "0 12px 48px rgba(122,63,209,0.10)" }}>
                <div className="fp-embed" style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: dark ? "#0d0520" : "#f3eefc" }}>
                  {planOn ? (
                    <>
                      {!planLoaded && (
                        <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 1, background: dark ? "#0d0520" : "#f3eefc" }}>
                          <span style={{ width: 30, height: 30, borderRadius: "50%", border: "3px solid " + cardBdr, borderTopColor: accent, animation: "venueSpin 0.8s linear infinite" }} />
                          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Loading the floor plan</span>
                        </div>
                      )}
                      <iframe src={FLOOR_PLANS} title="Interactive floor plan of The Westin Harbour Castle, Convention Level" loading="lazy" allow="fullscreen"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms" referrerPolicy="strict-origin-when-cross-origin"
                        onLoad={function () { setPlanLoaded(true); }}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", display: "block", background: "#ffffff" }} />
                    </>
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "1.5rem", textAlign: "center", background: dark ? "radial-gradient(circle at 30% 20%, rgba(122,63,209,0.28), transparent 60%), #0d0520" : "radial-gradient(circle at 30% 20%, rgba(122,63,209,0.14), transparent 60%), #f3eefc" }}>
                      <span style={{ width: 56, height: 56, borderRadius: 16, display: "grid", placeItems: "center", background: dark ? "rgba(185,158,255,0.14)" : "rgba(122,63,209,0.10)", color: accent }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/></svg>
                      </span>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "1.1rem", fontWeight: 900, color: textMain }}>Interactive floor plans</span>
                      <span style={{ fontSize: "0.95rem", color: textMid, lineHeight: 1.6, maxWidth: 380 }}>Every room on the Convention Level, with photos and setups.</span>
                      <button type="button" className="explore-load" onClick={function () { setPlanOn(true); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7a3fd1,#9b4fd6)", color: "#ffffff", fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", transition: "filter 0.2s ease" }}
                      >Load the Floor Plan</button>
                      <span style={{ fontSize: "0.78rem", color: textMid, opacity: 0.85 }}>Loads Cvent's viewer, which sets its own cookies.</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 6px 4px" }}>
                  <span style={{ fontSize: "0.8rem", color: textMid }}>Floor plans by Cvent</span>
                  <a href={FLOOR_PLANS} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600, color: accent, textDecoration: "none" }}>
                    Open in a new tab
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ background: bg, padding: "0 5% 6rem" }}>
        <FadeIn>
          <div style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, rgba(122,63,209,0.10), rgba(245,166,35,0.07))", border: "1px solid " + cardBdr, borderRadius: 28, padding: "clamp(2.5rem,5vw,4rem)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(122,63,209,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 900, color: textMain, marginBottom: 16 }}>Secure Your Stay</h2>
            <p style={{ fontSize: "1rem", color: textMid, lineHeight: 1.8, maxWidth: 480, margin: "0 auto 32px" }}>
              Limited rooms available at the TTFC 2026 event rate. Book early to stay at the venue and be at the heart of it all.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="https://www.marriott.com/en-us/hotels/yyzwh-the-westin-harbour-castle-toronto/overview/" target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 34px", borderRadius: 12, background: dark ? "#ffffff" : "#0d0520", color: dark ? "#0d0520" : "#ffffff", textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.2s ease" }}
                onMouseEnter={function (e) { e.currentTarget.style.background = "linear-gradient(135deg,#7a3fd1,#f5a623)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = dark ? "#ffffff" : "#0d0520"; e.currentTarget.style.color = dark ? "#0d0520" : "#ffffff"; }}
              >Book at Westin</a>
              <a href="/tickets"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 34px", borderRadius: 12, border: "1.5px solid " + cardBdr, color: textMain, textDecoration: "none", fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", background: "transparent", transition: "all 0.2s ease" }}
                onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#7a3fd1"; e.currentTarget.style.color = "#7a3fd1"; }}
                onMouseLeave={function (e) { e.currentTarget.style.borderColor = cardBdr; e.currentTarget.style.color = textMain; }}
              >Get Your Pass</a>
            </div>
          </div>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
}
