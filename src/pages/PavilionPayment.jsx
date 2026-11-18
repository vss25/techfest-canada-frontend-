import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API } from "../utils/api";

/* ============================================================
   CONFETTI CANVAS — copied pattern from tickets success screen
   ============================================================ */
function ConfettiCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);

    const colors = ["#D6308C", "#f5a623", "#e91e8c", "#F06AB0", "#56b3f5", "#3fd19c", "#ffffff"];
    const particles = [];
    const origins = [
      { x: w * 0.3, y: h * 0.45 },
      { x: w * 0.7, y: h * 0.45 },
    ];

    for (let i = 0; i < 180; i++) {
      const origin = origins[i % 2];
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 14 + 6;
      particles.push({
        x: origin.x, y: origin.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.5 ? "rect" : "circle",
        opacity: 1, gravity: 0.35, drag: 0.985,
      });
    }

    let frameId, elapsed = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= p.drag;
        p.rotation += p.rotationSpeed;
        if (elapsed > 90) p.opacity = Math.max(0, p.opacity - 0.012);
        if (p.opacity > 0 && p.y < h + 50) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      });
      elapsed++;
      if (alive && elapsed < 240) frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(frameId); window.removeEventListener("resize", handleResize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 100000 }} />;
}

/* ============================================================
   PAGE
   ============================================================ */

export default function PavilionPayment() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [applicationRef, setApplicationRef] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    setDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() =>
      setDark(document.body.classList.contains("dark-mode"))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Handle success redirect from Stripe → fire confirmation emails
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") !== "true") return;

    setShowSuccessModal(true);

    let stashed = null;
    try {
      const raw = sessionStorage.getItem("pavilionPaymentInfo");
      if (raw) stashed = JSON.parse(raw);
    } catch (e) {
      console.error("Could not read pavilion payment stash:", e);
    }

    if (stashed?.contactEmail && stashed?.companyName) {
      fetch(`${API}/pavilion/payment-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: stashed.companyName,
          contactEmail: stashed.contactEmail,
          applicationRef: stashed.applicationRef || "N/A",
        }),
      })
        .then(() => {
          sessionStorage.removeItem("pavilionPaymentInfo");
        })
        .catch((err) => {
          console.error("Payment confirmation email trigger failed:", err);
        });
    } else {
      console.warn("No stashed payment info found — confirmation emails may not have been sent");
    }

    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const bg = dark ? "#151035" : "#ffffff";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const textLight = dark ? "rgba(255,255,255,0.40)" : "rgba(13,5,32,0.45)";
  const cardBg = dark ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(214,48,140,0.55)" : "1px solid rgba(214,48,140,0.40)";
  const inputBg = dark ? "rgba(255,255,255,0.04)" : "rgba(214,48,140,0.03)";
  const inputBdr = dark ? "rgba(240,106,176,0.14)" : "rgba(214,48,140,0.16)";

  const handlePay = async () => {
    setError("");
    if (!companyName.trim()) return setError("Please enter your company name.");
    if (!contactEmail.trim()) return setError("Please enter your contact email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return setError("Please enter a valid email.");

    setLoading(true);

    try {
      sessionStorage.setItem("pavilionPaymentInfo", JSON.stringify({
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim(),
        applicationRef: applicationRef.trim() || "N/A",
      }));
    } catch (e) {
      console.warn("Could not stash pavilion payment info:", e);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/payments/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          type: "pavilion-deposit",
          tier: "pavilion-deposit",
          amount: 50000,
          metadata: {
            companyName: companyName.trim(),
            contactEmail: contactEmail.trim(),
            applicationRef: applicationRef.trim() || "N/A",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      console.error("Pavilion payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: "1px solid " + inputBdr, background: inputBg, color: textMain,
    fontFamily: "inherit", fontSize: "0.95rem", outline: "none",
    boxSizing: "border-box", transition: "border 0.2s",
  };
  const labelStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px",
    textTransform: "uppercase", color: textMuted,
    display: "block", marginBottom: 8,
  };

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "100vh", background: bg, color: textMain, position: "relative", transition: "background 0.3s ease" }}>

        {/* Ambient background glow */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: dark
            ? "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(214,48,140,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(214,48,140,0.05) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Hero */}
          <div style={{ textAlign: "center", padding: "100px 24px 40px", maxWidth: 720, margin: "0 auto" }}>
            <span style={{
              display: "inline-block",
              background: "rgba(63,209,156,0.12)",
              border: "1px solid rgba(63,209,156,0.35)",
              color: "#3fd19c",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.65rem", fontWeight: 800, letterSpacing: "1.5px",
              textTransform: "uppercase", padding: "8px 20px",
              borderRadius: 999, marginBottom: 20,
            }}>
              For approved applicants only
            </span>
            <h1 style={{
              fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 3.2rem)", letterSpacing: "-1px",
              lineHeight: 1.15, marginBottom: 18, color: textMain,
            }}>
              Complete Your{" "}
              <span style={{
                background: "#D6308C",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Pavilion Payment</span>
            </h1>
            <p style={{ fontSize: "1rem", color: textMuted, lineHeight: 1.75 }}>
              Congratulations on your approval. Complete your booking deposit below to confirm your spot inside the India Startup Pavilion at TTFC 2026.
            </p>
          </div>

          {/* Payment card */}
          <div style={{ maxWidth: 560, margin: "0 auto 60px", padding: "0 24px" }}>
            <div style={{
              position: "relative",
              backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
              background: cardBg, border: cardBorder,
              borderRadius: 24, padding: "clamp(28px, 5vw, 44px)",
              boxShadow: dark ? "0 8px 48px rgba(214,48,140,0.20)" : "0 8px 32px rgba(214,48,140,0.15)",
            }}>

              {/* Amount */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  fontFamily: "'Orbitron', sans-serif", fontWeight: 800,
                  fontSize: "0.7rem", letterSpacing: "1.5px", textTransform: "uppercase",
                  color: dark ? "#f5a623" : "#d98a14", marginBottom: 8,
                }}>Application Deposit</div>
                <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "clamp(3rem, 8vw, 4.5rem)", fontWeight: 900,
                    color: textMain, lineHeight: 1, letterSpacing: "-2px",
                  }}>$500</span>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: "1rem",
                    fontWeight: 800, color: textLight, letterSpacing: "1px",
                  }}>CAD</span>
                </div>
                <p style={{ fontSize: "0.7rem", color: textLight, marginTop: 6, letterSpacing: "0.3px" }}>
                  + 13% HST · Non-refundable · Applied towards final booth balance
                </p>
              </div>

              {/* Divider */}
              <div style={{
                width: "100%", height: 1,
                background: dark
                  ? "linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 50%,transparent)"
                  : "linear-gradient(90deg,transparent,rgba(214,48,140,0.18) 50%,transparent)",
                margin: "0 0 28px",
              }} />

              {/* Form fields */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company as it appears on the application"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Contact Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Same email used in your application"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  Application Reference <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={applicationRef}
                  onChange={(e) => setApplicationRef(e.target.value)}
                  placeholder="If provided in your approval email"
                  style={inputStyle}
                />
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding: "12px 16px", marginBottom: 16,
                  background: "rgba(224,85,85,0.10)",
                  border: "1px solid rgba(224,85,85,0.30)",
                  borderRadius: 10, color: "#e05555",
                  fontSize: "0.85rem",
                }}>{error}</div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
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
                {loading ? "Redirecting to Stripe…" : (
                  <>
                    Pay $500 + HST Securely
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>

              {/* Secure badge */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, marginTop: 16, color: textLight, fontSize: "0.72rem",
                textAlign: "center",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure payment via Stripe · 13% HST added at checkout
              </div>
            </div>

            {/* Not approved? */}
            <div style={{
              textAlign: "center", marginTop: 32,
              padding: "20px 24px", borderRadius: 16,
              background: dark ? "rgba(255,255,255,0.02)" : "rgba(214,48,140,0.03)",
              border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(214,48,140,0.08)",
            }}>
              <p style={{ fontSize: "0.85rem", color: textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                Haven't submitted an application yet?
              </p>
              <a href="/exhibit/india-pavilion" style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.7rem", fontWeight: 800, letterSpacing: "1px",
                textTransform: "uppercase", color: "#f5a623",
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                Start your application <span>→</span>
              </a>
            </div>
          </div>

          <Footer />
        </div>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <>
            <ConfettiCanvas />
            <div style={{
              position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
              zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "24px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
            }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
                width: "100%", maxWidth: 460,
                background: dark ? "#120a22" : "#ffffff",
                padding: "48px 32px", borderRadius: 24,
                border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(214,48,140,0.1)",
                boxShadow: "0 30px 80px rgba(214,48,140,0.35)",
                animation: "ttfcSuccessIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                <style>{`@keyframes ttfcSuccessIn { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#D6308C",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 12px 32px rgba(214,48,140,0.4)",
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <div style={{ textAlign: "center", color: textMain }}>
                  <h2 style={{
                    fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
                    fontSize: "1.9rem", margin: "0 0 12px", letterSpacing: "-0.5px",
                  }}>
                    <span style={{
                      backgroundImage: "#D6308C",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      color: "transparent",
                    }}>Payment Received!</span>
                  </h2>
                  <p style={{ opacity: 0.85, margin: 0, fontSize: "1.05rem", lineHeight: 1.6, fontWeight: 500 }}>
                    Thank you for your deposit.
                  </p>
                  <p style={{ opacity: 0.65, marginTop: 8, fontSize: "0.9rem", lineHeight: 1.55 }}>
                    Your India Pavilion booking is confirmed. A receipt has been sent to your email. Our team will follow up with next steps shortly.
                  </p>
                </div>

                <button
                  onClick={() => { setShowSuccessModal(false); navigate("/"); }}
                  style={{
                    background: "#D6308C",
                    border: "none", color: "white", padding: "16px 32px",
                    borderRadius: 12, cursor: "pointer",
                    fontFamily: "'Orbitron', sans-serif", textTransform: "uppercase",
                    fontSize: "0.78rem", letterSpacing: "1.5px", fontWeight: 800,
                    width: "100%", boxShadow: "0 8px 24px rgba(214,48,140,0.4)",
                  }}
                >Back to Home</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
