import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getConsent, setConsent, clearConsent, loadTrackers, trackersLoaded, OPEN_SETTINGS_EVENT,
} from "../lib/trackers";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const observer = new MutationObserver(() =>
      setIsDark(document.body.classList.contains("dark-mode"))
    );
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // "Cookie settings" in the footer: forget the saved choice and ask again.
  useEffect(() => {
    const open = () => {
      clearConsent();
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  // Analytics/advertising tags (Google Analytics, Meta Pixel, visitor identification)
  // load only on "all". Choosing "essential" after they were loaded on this page
  // reloads the page so they stop.
  const accept = (type) => {
    setConsent(type);
    setVisible(false);
    if (type === "all") loadTrackers();
    else if (trackersLoaded()) window.location.reload();
  };

  const bg     = isDark ? "rgba(18,8,40,0.98)"    : "#ffffff";
  const border = isDark ? "rgba(122,63,209,0.35)"  : "rgba(122,63,209,0.20)";
  const text   = isDark ? "#ffffff"                : "#1a0a40";
  const muted  = isDark ? "rgba(190,165,240,0.75)" : "rgba(90,60,150,0.65)";
  const chipBg = isDark ? "rgba(122,63,209,0.12)"  : "rgba(122,63,209,0.07)";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 180 }}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 540,
            margin: "0 auto",
            background: bg,
            border: `1.5px solid ${border}`,
            borderRadius: 20,
            padding: "22px 20px",
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.65)"
              : "0 16px 48px rgba(122,63,209,0.14)",
            zIndex: 99999,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: isDark ? "rgba(122,63,209,0.20)" : "rgba(122,63,209,0.10)",
              border: `1px solid ${border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem",
            }}>🍪</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem", fontWeight: 800, color: text, marginBottom: 4 }}>
                We use cookies
              </div>
              <p style={{ fontSize: "0.78rem", color: muted, lineHeight: 1.6, margin: 0 }}>
                TFC uses essential cookies to run the site and remember your login. With your permission (Accept All) we also use analytics and advertising cookies.
              </p>
            </div>

            <button onClick={() => accept("essential")} style={{
              background: "none", border: "none", cursor: "pointer",
              color: muted, fontSize: "16px", flexShrink: 0, padding: 2,
            }}>✕</button>
          </div>

          {/* Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden", marginBottom: 14 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 4 }}>
                  {[
                    { emoji: "🔒", label: "Essential",       desc: "Login, security, preferences — always on" },
                    { emoji: "📊", label: "Analytics",       desc: "Google Analytics usage data — only with Accept All" },
                    { emoji: "📣", label: "Advertising",     desc: "Meta Pixel and a visitor-identification service — only with Accept All" },
                    { emoji: "⚙️", label: "Personalisation", desc: "Remember your session and settings" },
                  ].map(c => (
                    <div key={c.label} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: chipBg, border: `1px solid ${border}`,
                      borderRadius: 10, padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>{c.emoji}</span>
                      <span style={{ fontSize: "0.77rem", fontWeight: 700, color: text, flexShrink: 0 }}>{c.label} </span>
                      <span style={{ fontSize: "0.72rem", color: muted }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => accept("all")} style={{
              flex: 2, minWidth: 100, padding: "11px 0",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12, color: "white",
              fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
              fontFamily: "'Orbitron', sans-serif",
            }}>
              Accept All
            </button>
            <button onClick={() => accept("essential")} style={{
              flex: 1, minWidth: 90, padding: "11px 0",
              background: chipBg, border: `1.5px solid ${border}`,
              borderRadius: 12, color: text,
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
            }}>
              Essential Only
            </button>
            <button onClick={() => setShowDetails(v => !v)} style={{
              padding: "11px 14px", background: "none",
              border: `1.5px solid ${border}`, borderRadius: 12,
              color: muted, fontSize: "0.78rem", cursor: "pointer",
              flexShrink: 0,
            }}>
              {showDetails ? "Hide" : "Details"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
