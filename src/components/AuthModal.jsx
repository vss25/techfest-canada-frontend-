import { useState, useEffect, useRef } from "react";
import { getPendingPurchase, clearPendingPurchase } from "../utils/purchase";
import { maskEmail, cleanCode, requestEmailLink, verifyEmailCode } from "../utils/emailLink";

const API = "https://techfest-canada-backend.onrender.com/api/auth";
const GOOGLE_CLIENT_ID = "676399067827-8rri9ibgjqonjfs5ov6laul096rj1m7o.apps.googleusercontent.com";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MailIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

const RESEND_SECONDS = 30;

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065z"/>
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose, onSurvey }) {
  const [view, setView] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const googleBtnRef = useRef(null);
  // "Email me a sign-in link": the address it went to, the code typed, errors, resend cooldown.
  const [linkEmail, setLinkEmail] = useState("");
  const [code, setCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Detect dark mode
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.body.classList.contains("dark-mode")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setForm({ name: "", email: "", password: "" }); setLinkError(""); }, [view]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!isOpen) return;
    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 1 });
    };
    if (window.google) initGoogle();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const finishAuth = (token, isNew = false, name = "") => {
    localStorage.setItem("token", token);
    const pending = getPendingPurchase();
    onClose();
    // Dispatch auth event so Navbar/App updates without full reload
    window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { token, name } }));
    if (pending) {
      clearPendingPurchase();
      window.dispatchEvent(new CustomEvent("resumePurchase", { detail: pending }));
    } else if (isNew) {
      // Small delay so modal closes first, then survey appears
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("showSurvey", { detail: { name } }));
      }, 350);
    } else {
      // Soft reload — only reload if not already on dashboard
      const path = window.location.pathname;
      if (path === "/dashboard") {
        window.dispatchEvent(new CustomEvent("dashboardRefresh"));
      } else {
        window.location.reload();
      }
    }
  };

  const handleGoogleResponse = async (response) => {
    try {
      const res = await fetch(`${API}/google`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ credential: response.credential }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      finishAuth(data.token);
    } catch { alert("Google sign-in failed"); }
  };

  const handleGoogleClick = () => {
    const btn = googleBtnRef.current?.querySelector("div[role=button]");
    if (btn) btn.click();
  };

  const handleLinkedIn = () => { window.location.href = `${API}/linkedin`; };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch(`${API}/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:form.email, password:form.password }) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      finishAuth(data.token);
    } catch(err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch(`${API}/register`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      finishAuth(data.token, true, form.name);
    } catch(err){ alert(err.message); } finally{ setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch(`${API}/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Server error. Please try again."); }
      if (!res.ok) throw new Error(data.error || "Request failed");
      alert("Password reset email sent.");
      setView("login");
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  }; 
  const sendLink = async (email) => {
    setLoading(true); setLinkError("");
    try {
      await requestEmailLink(email);
      setLinkEmail(String(email).trim());
      setCode("");
      setCooldown(RESEND_SECONDS);
      setView("emailCode");
    } catch (err) { setLinkError(err.message); } finally { setLoading(false); }
  };

  const handleEmailLink = (e) => { e.preventDefault(); sendLink(form.email); };

  const submitCode = async (value) => {
    const clean = cleanCode(value);
    if (clean.length !== 6 || loading) return;
    setLoading(true); setLinkError("");
    try {
      const data = await verifyEmailCode(linkEmail, clean);
      finishAuth(data.token, !!data.created);
    } catch (err) { setLinkError(err.message); setCode(""); } finally { setLoading(false); }
  };

  const handleCodeChange = (e) => {
    const next = cleanCode(e.target.value);
    setCode(next);
    if (linkError) setLinkError("");
    if (next.length === 6) submitCode(next);
  };

  // Theme-aware colors
  const bg        = isDark ? "#0f0720"         : "#ffffff";
  const cardBg    = isDark ? "#160c2c"         : "#f8f6ff";
  const border    = isDark ? "rgba(122,63,209,0.30)" : "rgba(122,63,209,0.20)";
  const textMain  = isDark ? "#ffffff"         : "#1a0a40";
  const textMuted = isDark ? "rgba(200,180,240,0.7)" : "rgba(80,60,120,0.7)";
  const inputBg   = isDark ? "#1e1040"         : "#ede8ff";
  const inputBorder = isDark ? "rgba(122,63,209,0.35)" : "rgba(122,63,209,0.25)";
  const socialBg  = isDark ? "#1e1040"         : "#ede8ff";
  const socialBorder = isDark ? "rgba(122,63,209,0.35)" : "rgba(122,63,209,0.20)";

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    border: `1.5px solid ${inputBorder}`,
    background: inputBg,
    color: textMain,
    fontSize: "0.92rem",
    fontFamily: "inherit",
    marginBottom: 12,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const socialBtnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "13px",
    borderRadius: 12,
    border: `1.5px solid ${socialBorder}`,
    background: socialBg,
    color: textMain,
    fontWeight: 700,
    fontSize: "0.92rem",
    cursor: "pointer",
    marginBottom: 12,
    transition: "background 0.2s, border-color 0.2s",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: isDark ? "rgba(0,0,0,0.75)" : "rgba(20,10,50,0.45)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, zIndex: 9999,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        padding: "36px 32px",
        borderRadius: 20,
        background: cardBg,
        border: `1.5px solid ${border}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(122,63,209,0.15)"
          : "0 20px 60px rgba(122,63,209,0.15), 0 0 0 1px rgba(122,63,209,0.12)",
        position: "relative",
      }}>

        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: isDark ? "rgba(122,63,209,0.15)" : "rgba(122,63,209,0.10)",
          border: `1px solid ${border}`,
          borderRadius: "50%", width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: textMuted, cursor: "pointer", fontSize: 14,
        }}>✕</button>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isDark ? "rgba(122,63,209,0.15)" : "rgba(122,63,209,0.10)",
            border: `1px solid ${border}`,
            borderRadius: 999, padding: "4px 14px",
            fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "1.2px", textTransform: "uppercase",
            color: isDark ? "#c4a8ff" : "#7a3fd1", marginBottom: 12,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 5px #f5a623", display: "inline-block" }} />
            TFC 2026
          </div>
          <h2 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "1.5rem", fontWeight: 900,
            color: textMain, margin: 0,
          }}>
            {view === "login"  && <>Welcome <span style={{ color: "#f5a623" }}>Back</span></>}
            {view === "signup" && <>Create <span style={{ color: "#f5a623" }}>Account</span></>}
            {view === "forgot" && <>Reset <span style={{ color: "#f5a623" }}>Password</span></>}
            {view === "emailLink" && <>Sign-in <span style={{ color: "#f5a623" }}>Link</span></>}
            {view === "emailCode" && <>Check your <span style={{ color: "#f5a623" }}>Email</span></>}
          </h2>
        </div>

        {/* Social buttons */}
        {(view === "login" || view === "signup") && (
          <>
            <div ref={googleBtnRef} style={{ display: "none" }} />
            <button style={socialBtnStyle} onClick={handleGoogleClick}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a1560" : "#e0d8ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = socialBg; }}>
              <GoogleIcon /> Continue with Google
            </button>
            <button style={socialBtnStyle} onClick={handleLinkedIn}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a1560" : "#e0d8ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = socialBg; }}>
              <LinkedInIcon /> Continue with LinkedIn
            </button>
            <button style={socialBtnStyle} onClick={() => setView("emailLink")}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a1560" : "#e0d8ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = socialBg; }}>
              <MailIcon color={isDark ? "#c4a8ff" : "#7a3fd1"} /> Email me a sign-in link
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: border }} />
              <span style={{ fontSize: "0.8rem", color: textMuted, fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: border }} />
            </div>
          </>
        )}

        {/* LOGIN */}
        {view === "login" && (
          <form onSubmit={handleLogin}>
            <input style={inputStyle} name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
            <input style={inputStyle} name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <span style={{ color: "#f5a623", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }} onClick={() => setView("forgot")}>
                Forgot password?
              </span>
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12,
              color: "white", fontWeight: 800, fontSize: "0.88rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s, transform 0.2s",
            }}>
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
            <p style={{ textAlign: "center", marginTop: 16, color: textMuted, fontSize: "0.88rem" }}>
              Don't have an account?{" "}
              <span style={{ color: "#f5a623", cursor: "pointer", fontWeight: 700 }} onClick={() => setView("signup")}>Sign up</span>
            </p>
          </form>
        )}

        {/* SIGNUP */}
        {view === "signup" && (
          <form onSubmit={handleSignup}>
            <input style={inputStyle} name="name" type="text" placeholder="Full name" value={form.name} onChange={handleChange} required />
            <input style={inputStyle} name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
            <input style={inputStyle} name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12,
              color: "white", fontWeight: 800, fontSize: "0.88rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Creating account..." : "CREATE ACCOUNT"}
            </button>
            <p style={{ textAlign: "center", marginTop: 16, color: textMuted, fontSize: "0.88rem" }}>
              Already have an account?{" "}
              <span style={{ color: "#f5a623", cursor: "pointer", fontWeight: 700 }} onClick={() => setView("login")}>Sign in</span>
            </p>
          </form>
        )}

        {/* EMAIL ME A SIGN-IN LINK */}
        {view === "emailLink" && (
          <form onSubmit={handleEmailLink}>
            <p style={{ color: textMuted, fontSize: "0.9rem", lineHeight: 1.55, margin: "0 0 16px", textAlign: "center" }}>
              Enter the email you used to buy your ticket. We'll email you a link that signs you straight in.
            </p>
            <input style={inputStyle} name="email" type="email" autoComplete="email" inputMode="email" placeholder="Email you bought your ticket with" value={form.email} onChange={handleChange} required autoFocus />
            {linkError && <p role="alert" style={{ color: "#e05555", fontSize: "0.82rem", margin: "-4px 0 12px" }}>{linkError}</p>}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12,
              color: "white", fontWeight: 800, fontSize: "0.88rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Sending..." : "EMAIL ME A LINK"}
            </button>
            <p style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ color: "#f5a623", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" }} onClick={() => setView("login")}>← Back to sign in</span>
            </p>
          </form>
        )}

        {/* CHECK YOUR EMAIL + 6-DIGIT CODE */}
        {view === "emailCode" && (
          <form onSubmit={(e) => { e.preventDefault(); submitCode(code); }}>
            <p style={{ color: textMuted, fontSize: "0.9rem", lineHeight: 1.55, margin: "0 0 18px", textAlign: "center" }}>
              We sent a sign-in link to <strong style={{ color: textMain }}>{maskEmail(linkEmail)}</strong>. It works for 15 minutes. Or enter the 6-digit code from the email.
            </p>
            <input
              style={{ ...inputStyle, textAlign: "center", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "0.45em", paddingLeft: "calc(16px + 0.45em)", fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace" }}
              name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
              placeholder="000000" aria-label="6-digit code" value={code} onChange={handleCodeChange} autoFocus
              aria-invalid={!!linkError} disabled={loading}
            />
            {linkError && <p role="alert" style={{ color: "#e05555", fontSize: "0.82rem", margin: "-4px 0 12px", textAlign: "center" }}>{linkError}</p>}
            <button type="submit" disabled={loading || code.length !== 6} style={{ ...{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12,
              color: "white", fontWeight: 800, fontSize: "0.88rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }, opacity: loading || code.length !== 6 ? 0.6 : 1, cursor: loading || code.length !== 6 ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16, fontSize: "0.85rem", fontWeight: 700 }}>
              <button type="button" disabled={cooldown > 0 || loading} onClick={() => sendLink(linkEmail)}
                style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: "inherit", fontWeight: 700, color: cooldown > 0 ? textMuted : "#f5a623", cursor: cooldown > 0 ? "default" : "pointer" }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </button>
              <button type="button" onClick={() => setView("emailLink")}
                style={{ background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: "inherit", fontWeight: 700, color: "#f5a623", cursor: "pointer" }}>
                Use a different email
              </button>
            </div>
            <p style={{ color: textMuted, fontSize: "0.78rem", lineHeight: 1.5, margin: "16px 0 0", textAlign: "center" }}>
              Nothing there? Check your spam folder, and make sure it's the email on your ticket.
            </p>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword}>
            <input style={inputStyle} name="email" type="email" placeholder="Enter your email" value={form.email} onChange={handleChange} required />
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              border: "none", borderRadius: 12,
              color: "white", fontWeight: 800, fontSize: "0.88rem",
              fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.5px",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Sending..." : "SEND RESET LINK"}
            </button>
            <p style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ color: "#f5a623", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" }} onClick={() => setView("login")}>← Back to login</span>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
