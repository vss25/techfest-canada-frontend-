import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PostPurchaseModal({ isOpen, onClose, ticketType = "Delegate Pass", userName = "" }) {
  const [isDark, setIsDark] = useState(true);
  const [step, setStep] = useState(0); // 0 = confetti anim, 1 = main card

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const observer = new MutationObserver(() => setIsDark(document.body.classList.contains("dark-mode")));
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      const t = setTimeout(() => setStep(1), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cardBg = isDark ? "#160c2c" : "#f8f6ff";
  const border = isDark ? "rgba(122,63,209,0.35)" : "rgba(122,63,209,0.25)";
  const text   = isDark ? "#ffffff" : "#0f0520";
  const muted  = isDark ? "rgba(200,180,255,0.65)" : "rgba(60,30,110,0.65)";
  const firstName = (userName || "Delegate").split(" ")[0];

  const PERKS = [
    { icon: "🎟", title: "Ticket Confirmed", desc: "Check your email for your digital pass" },
    { icon: "📍", title: "The Westin Harbour Castle", desc: "Mon–Tue, October 26–27, 2026 · Toronto" },
    { icon: "🤝", title: "500+ Decision Makers", desc: "You're now part of the inner circle" },
    { icon: "📱", title: "The TTFC App", desc: "Your pass, agenda and networking. Coming soon to iPhone & Android" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, zIndex: 99999,
          }}
        >
          {/* Confetti burst dots */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.2, 0],
                x: (Math.cos((i / 20) * Math.PI * 2) * (100 + Math.random() * 150)),
                y: (Math.sin((i / 20) * Math.PI * 2) * (100 + Math.random() * 150)),
              }}
              transition={{ duration: 1.4, delay: i * 0.03, ease: "easeOut" }}
              style={{
                position: "absolute", top: "50%", left: "50%",
                width: i % 3 === 0 ? 10 : 6, height: i % 3 === 0 ? 10 : 6,
                borderRadius: i % 4 === 0 ? 2 : "50%",
                background: i % 3 === 0 ? "#f5a623" : i % 3 === 1 ? "#7a3fd1" : "#22c55e",
                pointerEvents: "none",
              }}
            />
          ))}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="card"
                initial={{ scale: 0.85, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 200 }}
                style={{
                  width: "100%", maxWidth: 520,
                  background: cardBg,
                  border: `1.5px solid ${border}`,
                  borderRadius: 28, padding: "44px 36px",
                  textAlign: "center",
                  position: "relative", overflow: "hidden",
                  boxShadow: isDark ? "0 40px 100px rgba(0,0,0,0.8)" : "0 30px 80px rgba(122,63,209,0.2)",
                }}
              >
                {/* Top glow */}
                <div style={{
                  position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
                  width: 300, height: 300, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(245,166,35,0.25), transparent 70%)",
                  pointerEvents: "none",
                }} />

                {/* Top bar */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 4, borderRadius: "28px 28px 0 0",
                  background: "linear-gradient(90deg, #7a3fd1, #f5a623, #22c55e)",
                }} />

                {/* Ticket icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.15 }}
                  style={{
                    width: 88, height: 88, borderRadius: "50%",
                    margin: "0 auto 24px",
                    background: "linear-gradient(135deg, rgba(122,63,209,0.25), rgba(245,166,35,0.20))",
                    border: `2px solid rgba(245,166,35,0.4)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.6rem",
                  }}
                >
                  🎉
                </motion.div>

                {/* Eyebrow */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.30)",
                  borderRadius: 999, padding: "5px 16px",
                  fontSize: "0.65rem", fontWeight: 800,
                  letterSpacing: "1.2px", textTransform: "uppercase",
                  color: "#22c55e", marginBottom: 18,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
                  Purchase Confirmed
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "clamp(1.3rem, 4vw, 1.7rem)",
                    fontWeight: 900, color: text, lineHeight: 1.2, marginBottom: 10,
                  }}
                >
                  You're in, {firstName}! 🚀
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  style={{
                    fontSize: "0.88rem", color: muted,
                    lineHeight: 1.7, marginBottom: 8,
                  }}
                >
                  Your <strong style={{ color: text }}>{ticketType}</strong> is confirmed.
                  A confirmation has been sent to your email.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ fontSize: "0.82rem", color: muted, lineHeight: 1.7, marginBottom: 32 }}
                >
                  Welcome to <strong style={{ background: "linear-gradient(135deg,#7a3fd1,#f5a623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>The Tech Festival Canada 2026</strong>. We can't wait to see you in Toronto.
                </motion.p>

                {/* Perks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
                  {PERKS.map((p, i) => (
                    <motion.div
                      key={p.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      style={{
                        background: isDark ? "rgba(122,63,209,0.08)" : "rgba(122,63,209,0.06)",
                        border: `1px solid ${border}`,
                        borderRadius: 14, padding: "14px 14px",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{p.icon}</div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 800, color: text, marginBottom: 3, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ fontSize: "0.68rem", color: muted, lineHeight: 1.4 }}>{p.desc}</div>
                    </motion.div>
                  ))}
                </div>

                {/* CTAs */}
                <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
                  <motion.a
                    href="/agenda"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    style={{
                      display: "block", padding: "14px",
                      background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
                      border: "none", borderRadius: 14, color: "white",
                      fontFamily: "'Orbitron', sans-serif", fontWeight: 800,
                      fontSize: "0.82rem", textDecoration: "none",
                      letterSpacing: "0.4px", cursor: "pointer",
                    }}
                  >
                    See the Agenda →
                  </motion.a>
                  <motion.button
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75 }}
                    style={{
                      padding: "12px",
                      background: "none",
                      border: `1.5px solid ${border}`,
                      borderRadius: 14, color: muted,
                      fontSize: "0.8rem", cursor: "pointer",
                    }}
                  >
                    Continue Browsing
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
