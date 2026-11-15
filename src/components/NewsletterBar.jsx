import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://techfest-canada-backend.onrender.com/api";

export default function NewsletterBar({ dark }) {
  var s1 = useState(""); var email = s1[0]; var setEmail = s1[1];
  var s2 = useState(false); var agreed = s2[0]; var setAgreed = s2[1];
  var s3 = useState(false); var submitted = s3[0]; var setSubmitted = s3[1];
  var s4 = useState(""); var error = s4[0]; var setError = s4[1];

  var bg     = dark ? "linear-gradient(135deg, rgba(122,63,209,0.18), rgba(245,166,35,0.10))" : "linear-gradient(135deg, #7a3fd1, #c4607a, #f5a623)";
  var border = dark ? "rgba(155,135,245,0.20)" : "transparent";

  
  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email."); return; }
    if (!agreed) { setError("Please agree to receive communications."); return; }
    setError("");
    
    const subscribeUrl = `${API}/subscriptions/subscribe`;
    console.log("[Newsletter] Submitting to:", subscribeUrl);
    
    try {
      const res = await fetch(subscribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" })
      });
      const data = await res.json();
      console.log("[Newsletter] Response:", res.status, data);
      
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("[Newsletter] Error:", err);
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <section style={{ background: dark ? "#06020f" : "#faf9ff", padding: "0 5% 5rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: bg, border: "1px solid " + border, borderRadius: 24, padding: "clamp(1.8rem,4vw,2.8rem) clamp(1.5rem,5vw,3.5rem)", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>

        {/* Left text */}
        <div style={{ flexShrink: 0, maxWidth: 380 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(0.9rem,2vw,1.1rem)", fontWeight: 900, color: "#ffffff", marginBottom: 6, letterSpacing: "0.5px" }}>
            SIGN UP FOR TTFC 2027 UPDATES
          </div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            Speaker & agenda drops, ticket discounts, and exclusive opportunities.
          </div>
        </div>

        {/* Right form */}
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 260, maxWidth: 480 }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="email"
                  placeholder="Work Email"
                  value={email}
                  onChange={function (e) { setEmail(e.target.value); setError(""); }}
                  style={{ flex: 1, minWidth: 180, padding: "12px 18px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "0.88rem", outline: "none", backdropFilter: "blur(8px)", fontFamily: "inherit" }}
                />
                <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", background: "#ffffff", color: "#7a3fd1", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Notify Me
                </motion.button>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={agreed} onChange={function (e) { setAgreed(e.target.checked); setError(""); }}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: "#f5a623", width: 15, height: 15 }}
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
                  I agree to receive communications from The Tech Festival Canada.{" "}
                  <a href="/privacy" style={{ color: "rgba(255,255,255,0.90)", textDecoration: "underline" }}>Privacy Policy</a>
                </span>
              </label>
              {error && <div style={{ fontSize: "0.72rem", color: "#ffd580", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px" }}>{error}</div>}
            </motion.form>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.3 }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", background: "rgba(255,255,255,0.15)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <span style={{ fontSize: "1.4rem" }}>✅</span>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800, color: "#ffffff", marginBottom: 2 }}>You're on the list!</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.70)" }}>We'll be in touch with the latest TFC 2026 news.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
