import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Smartphone, MapPin } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/* /contact: who to write to. The App Store listing's Support URL points here. */
const CONTACTS = [
  { title: "General enquiries and app help", email: "enquire@thetechfestival.com", body: "Passes, tickets, the TTFC app and anything else about the festival." },
  { title: "Sponsorship and exhibiting", email: "sales@thetechfestival.com", body: "Sponsorship packages, booths and partnerships." },
  { title: "Media and press", email: "marcom@thetechfestival.com", body: "Press passes, interviews and media partnerships." },
];

export default function Contact() {
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
  const accent = isDark ? "#b99eff" : "#7a3fd1";
  const card = {
    background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
    border: `1px solid ${isDark ? "rgba(185,158,255,0.18)" : "rgba(122,63,209,0.14)"}`,
    borderRadius: 20,
    padding: "22px 24px",
    textAlign: "left",
  };
  const cardTitle = { fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px", color: textMain };
  const cardBody = { fontSize: "0.98rem", color: textMuted, lineHeight: 1.65, margin: 0 };
  const link = { color: accent, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, overflowWrap: "anywhere" };

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
          padding: "120px 16px 80px",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: 760, width: "100%" }}
        >
          <p
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: accent,
              marginBottom: "1.2rem",
            }}
          >
            TTFC 2026
          </p>

          <h1
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "1px",
              margin: "0 0 1rem",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Contact us
          </h1>

          <p style={{ fontSize: "1.1rem", color: textMuted, lineHeight: 1.8, maxWidth: 560, margin: "0 auto 2.4rem" }}>
            Questions about your pass, the app or the festival? Write to the team and we&apos;ll get back to you.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            {CONTACTS.map((c) => (
              <section key={c.email} style={card}>
                <h2 style={cardTitle}>{c.title}</h2>
                <p style={{ ...cardBody, marginBottom: 10 }}>{c.body}</p>
                <a href={`mailto:${c.email}`} style={{ ...link, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Mail size={16} aria-hidden="true" style={{ flex: "none" }} /> {c.email}
                </a>
              </section>
            ))}

            <section style={card}>
              <h2 style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}>
                <Smartphone size={16} aria-hidden="true" style={{ flex: "none", color: accent }} /> The TTFC app
              </h2>
              <p style={{ ...cardBody, marginBottom: 10 }}>
                For help signing in or with your pass, email <a href="mailto:enquire@thetechfestival.com" style={link}>enquire@thetechfestival.com</a> from
                the address on your ticket, and include your ticket ID if you have it.
              </p>
              <p style={cardBody}>
                To delete your app account, open the app and go to Profile, then Settings, then Privacy &amp; data, then Delete account.
                See our <Link to="/privacy#app" style={link}>Privacy Policy</Link> for what is deleted.
              </p>
            </section>

            <section style={card}>
              <h2 style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} aria-hidden="true" style={{ flex: "none", color: accent }} /> The venue
              </h2>
              <p style={cardBody}>
                The Westin Harbour Castle, 1 Harbour Square, Toronto, ON M5J 1A6, Canada. 26–27 October 2026.{" "}
                <Link to="/venue" style={link}>Getting there</Link>
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
