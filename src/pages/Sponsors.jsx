import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SponsorMarquee from "../components/SponsorMarquee";

export default function Sponsors() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const bg = isDark ? "#06020f" : "#f4f0ff";
  const textMain = isDark ? "#ffffff" : "#0f0520";
  const textMuted = isDark ? "rgba(200,180,255,0.8)" : "rgba(60,30,110,0.85)";

  return (
    <div
      style={{
        background: bg,
        color: textMain,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 5%",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: 800, width: "100%" }}
        >
          <p
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: isDark ? "#b99eff" : "#7a3fd1",
              marginBottom: "1.2rem",
            }}
          >
            TFC 2026
          </p>

          <h1
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              fontWeight: 900,
              letterSpacing: "2px",
              marginBottom: "1rem",
              textTransform: "uppercase",
              color: textMain,
            }}
          >
            2026 Partners
          </h1>

          <h2
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(3.5rem, 8vw, 6.5rem)",
              fontWeight: 900,
              marginBottom: "2rem",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Coming Soon.
          </h2>

          <p
            style={{
              fontSize: "1.1rem",
              color: textMuted,
              lineHeight: 1.8,
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            We are currently curating the ecosystem of innovators and leaders
            who will be at The Tech Festival Canada 2026. The full partner
            directory will be announced shortly.
          </p>
        </motion.div>
      </main>

      <SponsorMarquee dark={isDark} />

      <Footer />
    </div>
  );
}
