import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../utils/api";

export default function LinkedinLanding() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() =>
      setDark(document.body.classList.contains("dark-mode"))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const bg = dark ? "#151035" : "#f4f0ff";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const textLight = dark ? "rgba(255,255,255,0.40)" : "rgba(13,5,32,0.45)";
  const cardBg = dark ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(214,48,140,0.35)" : "1px solid rgba(214,48,140,0.20)";
  const inputBg = dark ? "rgba(255,255,255,0.04)" : "rgba(214,48,140,0.03)";
  const inputBdr = dark ? "rgba(240,106,176,0.20)" : "rgba(214,48,140,0.20)";

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/linkedin-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          source: "linkedin",
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      // Success — redirect to home
      navigate("/");
    } catch (err) {
      console.error("LinkedIn lead submit error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: textMain,
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>

      {/* Ambient background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: dark
          ? "radial-gradient(ellipse 70% 55% at 30% 20%, rgba(214,48,140,0.15) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(245,166,35,0.08) 0%, transparent 70%)"
          : "radial-gradient(ellipse 70% 55% at 30% 20%, rgba(214,48,140,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(245,166,35,0.04) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480 }}>

        {/* Logo / brand mark */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.7rem", fontWeight: 800,
            letterSpacing: "2px", textTransform: "uppercase",
            color: dark ? "#f5a623" : "#d98a14",
            marginBottom: 8,
          }}>
            The Tech Festival Canada
          </div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.6rem", fontWeight: 600,
            letterSpacing: "1.5px", textTransform: "uppercase",
            color: textLight,
          }}>
            26 – 27 October 2026 · Toronto
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: cardBg, border: cardBorder,
          borderRadius: 24, padding: "clamp(28px, 5vw, 44px)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          boxShadow: dark ? "0 20px 60px rgba(214,48,140,0.25)" : "0 20px 60px rgba(214,48,140,0.12)",
        }}>

          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900, fontSize: "clamp(1.6rem, 4vw, 2.1rem)",
            letterSpacing: "-0.5px", lineHeight: 1.2,
            color: textMain, margin: "0 0 12px", textAlign: "center",
          }}>
            Get Event{" "}
            <span style={{
              background: "#D6308C",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Info</span>
          </h1>

          <p style={{
            fontSize: "0.95rem", color: textMuted,
            lineHeight: 1.6, margin: "0 0 28px",
            textAlign: "center",
          }}>
            Enter your details and our team will be in touch with everything you need to know about attending, exhibiting, or partnering with TTFC 2026.
          </p>

          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px",
                textTransform: "uppercase", color: textMuted,
                display: "block", marginBottom: 8,
              }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  border: "1px solid " + inputBdr, background: inputBg, color: textMain,
                  fontFamily: "inherit", fontSize: "0.95rem", outline: "none",
                  boxSizing: "border-box", transition: "border 0.2s",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px",
                textTransform: "uppercase", color: textMuted,
                display: "block", marginBottom: 8,
              }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  border: "1px solid " + inputBdr, background: inputBg, color: textMain,
                  fontFamily: "inherit", fontSize: "0.95rem", outline: "none",
                  boxSizing: "border-box", transition: "border 0.2s",
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: 16,
                background: "rgba(224,85,85,0.10)",
                border: "1px solid rgba(224,85,85,0.30)",
                borderRadius: 10, color: "#e05555",
                fontSize: "0.85rem",
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 12,
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Orbitron', sans-serif", fontWeight: 800,
                fontSize: "0.78rem", letterSpacing: "1px", textTransform: "uppercase",
                color: "white",
                background: "#D6308C",
                boxShadow: "0 4px 20px rgba(214,48,140,0.4)",
                transition: "all 0.2s", opacity: loading ? 0.7 : 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {loading ? "Sending…" : (
                <>
                  Submit
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <p style={{
              marginTop: 16, textAlign: "center",
              fontSize: "0.72rem", color: textLight, lineHeight: 1.5,
            }}>
              By submitting, you agree to receive event information from The Tech Festival Canada. You can unsubscribe anytime.
            </p>
          </form>
        </div>

        {/* Small footer under card */}
        <div style={{
          textAlign: "center", marginTop: 24,
          fontSize: "0.72rem", color: textLight,
        }}>
          Produced by AtlasLink Markets Inc.
        </div>
      </div>
    </div>
  );
}
