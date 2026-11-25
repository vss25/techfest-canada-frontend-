import { useState, useEffect } from "react";
import { MapPin, Calendar, Clock, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_DATE = new Date("2026-10-28T09:00:00");

const CYCLING_WORDS = [
  "AI",
  "Quantum",
  "Cybersecurity",
  "Robotics",
  "Sustainability",
];


function getTimeLeft() {
  const now = new Date();
  const diff = EVENT_DATE - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function FlipUnit({ value, label, isDark }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlip(true);
      const t = setTimeout(() => { setPrev(value); setFlip(false); }, 350);
      return () => clearTimeout(t);
    }
  }, [value]);

  const display = String(value).padStart(2, "0");
  const prevDisplay = String(prev).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        position: "relative",
        width: 72, height: 80,
        perspective: 400,
      }}>
        {/* Back card (new value) */}
        <div style={{
          position: "absolute", inset: 0,
          background: isDark
            ? "linear-gradient(160deg, rgba(40,20,80,0.95), rgba(20,10,45,0.98))"
            : "linear-gradient(160deg, rgba(240,235,255,0.98), rgba(255,255,255,0.95))",
          border: `1px solid ${isDark ? "rgba(214,48,140,0.35)" : "rgba(214,48,140,0.20)"}`,
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 8px 24px rgba(214,48,140,0.12)",
        }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "2rem", fontWeight: 900,
            background: "#D6308C",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>{display}</span>
        </div>

        {/* Flip overlay */}
        <AnimatePresence>
          {flip && (
            <motion.div
              key={display}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0,
                background: isDark
                  ? "linear-gradient(160deg, rgba(214,48,140,0.4), rgba(40,20,80,0.98))"
                  : "linear-gradient(160deg, rgba(214,48,140,0.15), rgba(255,255,255,0.98))",
                border: `1px solid rgba(214,48,140,0.5)`,
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2,
                transformOrigin: "center",
              }}
            >
              <span style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "2rem", fontWeight: 900,
                background: "#D6308C",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>{display}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center line */}
        <div style={{
          position: "absolute", top: "50%", left: 8, right: 8,
          height: 1, background: isDark ? "rgba(214,48,140,0.25)" : "rgba(214,48,140,0.15)",
          transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none",
        }} />
      </div>

      <span style={{
        fontSize: "0.6rem", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "1.2px",
        color: isDark ? "rgba(180,155,230,0.65)" : "rgba(100,70,180,0.65)",
      }}>{label}</span>
    </div>
  );
}

export function EventCountdown({ isDark = true }) {
  const [time, setTime] = useState(getTimeLeft());
  const [wordIdx, setWordIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % CYCLING_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const cardBg = isDark
    ? "rgba(14,7,32,0.92)"
    : "rgba(252,250,255,0.96)";
  const borderCol = isDark
    ? "rgba(214,48,140,0.30)"
    : "rgba(214,48,140,0.18)";
  const textMain = isDark ? "#ffffff" : "#1a0a40";
  const textMuted = isDark ? "rgba(180,155,230,0.75)" : "rgba(100,70,160,0.75)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
      }}
    >
      {/* Main card — glass/transparent, no heavy card */}
      <div className="ecd-outer" style={{
        position: "relative",
        background: isDark ? "rgba(10,5,25,0.35)" : "rgba(255,255,255,0.30)",
        border: `1px solid ${isDark ? "rgba(214,48,140,0.18)" : "rgba(214,48,140,0.12)"}`,
        borderRadius: 28,
        padding: "36px 36px 32px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: isDark
          ? "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 8px 32px rgba(214,48,140,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
        transition: "transform 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        overflow: "hidden",
      }}>

        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(${isDark ? "rgba(214,48,140,0.03)" : "rgba(214,48,140,0.02)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(214,48,140,0.03)" : "rgba(214,48,140,0.02)"} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          borderRadius: 28,
        }} />

        {/* Logo + eyebrow row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8 }}>
          {/* Full wordmark — swaps with theme */}
          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isDark ? "rgba(214,48,140,0.15)" : "rgba(214,48,140,0.08)",
            border: `1px solid ${isDark ? "rgba(214,48,140,0.35)" : "rgba(214,48,140,0.20)"}`,
            borderRadius: 999, padding: "5px 12px",
            fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "1.2px", textTransform: "uppercase",
            color: isDark ? "#c4a8ff" : "#D6308C",
            whiteSpace: "nowrap",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#f5a623", boxShadow: "0 0 6px #f5a623",
              animation: "ctdPulse 2s ease infinite",
              display: "inline-block",
            }} />
            Live Event
          </div>
        </div>

        {/* Animated word */}
        <div style={{ marginBottom: 6, position: "relative", textAlign: "right" }}>
          <p style={{ fontSize: "0.78rem", color: textMuted, fontWeight: 600, marginBottom: 4 }}>
            Covering the future of
          </p>
          <div style={{ height: 40, overflow: "hidden", position: "relative", display: "flex", justifyContent: "center" }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={CYCLING_WORDS[wordIdx]}
                initial={{ y: 24, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0,  opacity: 1, filter: "blur(0px)" }}
                exit={  { y: -24, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  display: "block",
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "1.4rem", fontWeight: 900,
                  background: "#D6308C",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  position: "absolute",
                }}
              >
                {CYCLING_WORDS[wordIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1, marginBottom: 14,
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(214,48,140,0.4), rgba(245,166,35,0.2), transparent)"
            : "linear-gradient(90deg, transparent, rgba(214,48,140,0.2), rgba(245,166,35,0.1), transparent)",
        }} />

        {/* Countdown units */}
        <div style={{
          display: "flex", gap: 10,
          justifyContent: "center", marginBottom: 28,
          position: "relative",
        }}>
          <FlipUnit value={time.days}    label="Days"    isDark={isDark} />
          <div style={{ display:"flex", alignItems:"center", paddingBottom:22, color: isDark?"rgba(214,48,140,0.6)":"rgba(214,48,140,0.4)", fontSize:"1.4rem", fontWeight:900 }}>:</div>
          <FlipUnit value={time.hours}   label="Hours"   isDark={isDark} />
          <div style={{ display:"flex", alignItems:"center", paddingBottom:22, color: isDark?"rgba(214,48,140,0.6)":"rgba(214,48,140,0.4)", fontSize:"1.4rem", fontWeight:900 }}>:</div>
          <FlipUnit value={time.minutes} label="Minutes" isDark={isDark} />
          <div style={{ display:"flex", alignItems:"center", paddingBottom:22, color: isDark?"rgba(214,48,140,0.6)":"rgba(214,48,140,0.4)", fontSize:"1.4rem", fontWeight:900 }}>:</div>
          <FlipUnit value={time.seconds} label="Seconds" isDark={isDark} />
        </div>

        {/* Event details row */}
        <div style={{
          display: "flex", gap: 10,
          marginBottom: 24, flexWrap: "wrap",
        }}>
          <div style={{
            flex: 1, minWidth: 160,
            background: isDark ? "rgba(214,48,140,0.12)" : "rgba(214,48,140,0.06)",
            border: `1px solid ${isDark ? "rgba(214,48,140,0.20)" : "rgba(214,48,140,0.12)"}`,
            borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: isDark ? "rgba(214,48,140,0.18)" : "rgba(214,48,140,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isDark ? "#c4a8ff" : "#D6308C", flexShrink: 0,
            }}>
              <Calendar size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Date</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: textMain }}>Wednesday, Oct 28, 2026</div>
            </div>
          </div>

          <div style={{
            flex: 1, minWidth: 160,
            background: isDark ? "rgba(245,166,35,0.10)" : "rgba(245,166,35,0.05)",
            border: `1px solid ${isDark ? "rgba(245,166,35,0.18)" : "rgba(245,166,35,0.12)"}`,
            borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: isDark ? "rgba(245,166,35,0.15)" : "rgba(245,166,35,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f5a623", flexShrink: 0,
            }}>
              <MapPin size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Venue</div>
              <a href="https://maps.google.com/?q=The+Carlu+Toronto" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", fontWeight: 700, color: textMain, textDecoration: "underline", textDecorationColor: "rgba(245,166,35,0.5)", cursor: "pointer" }}>The Carlu, Toronto</a>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.68rem", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Tickets Sold
            </span>
            <span style={{ fontSize: "0.68rem", color: isDark ? "#c4a8ff" : "#D6308C", fontWeight: 700 }}>68%</span>
          </div>
          <div style={{
            height: 6, borderRadius: 999,
            background: isDark ? "rgba(214,48,140,0.15)" : "rgba(214,48,140,0.10)",
            overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "0%" }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.5 }}
              style={{
                height: "100%", borderRadius: 999,
                background: "#D6308C",
              }}
            />
          </div>
          <div style={{ fontSize: "0.65rem", color: textMuted, marginTop: 4 }}>
            Limited early-bird passes remaining
          </div>
        </div>

        {/* CTA */}
        <a
          href="/tickets"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px 0",
            background: "#D6308C",
            border: "none", borderRadius: 14,
            color: "white", fontWeight: 800, fontSize: "0.88rem",
            fontFamily: "'Orbitron', monospace",
            letterSpacing: "0.5px", cursor: "pointer",
            textDecoration: "none",
            transition: "opacity 0.2s, transform 0.2s",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {/* Shimmer */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            style={{
              position: "absolute", top: 0, left: 0, width: "40%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              transform: "skewX(-20deg)",
            }}
          />
          <Sparkles size={16} />
          Secure Your Seat Now
          <ChevronRight size={16} />
        </a>
      </div>

      <style>{`
        @keyframes ctdPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(1.4); }
        }
        @media (max-width: 480px) {
          .ecd-outer { padding: 18px 14px !important; }
          .ecd-digits { gap: 4px !important; }
          .ecd-digit-box { min-width: 48px !important; padding: 8px 4px !important; }
          .ecd-digit-num { font-size: 1.5rem !important; }
          .ecd-chips-row { flex-direction: column !important; gap: 8px !important; }
          .ecd-chip-box { min-width: unset !important; }
        }
      `}</style>
    </div>
  );
}
