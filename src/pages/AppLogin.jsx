import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  appLoginUrl, isMobileDevice, maskEmail, requestEmailLink, storeSession, verifyEmailLink,
} from "../utils/emailLink";

/* ============================================================
   /app-login?token=…
   Where the "Your TTFC sign-in link" email lands. On a phone it
   hands the one-time token to the app (ttfc://login?token=…); the
   visitor can also sign in on the website instead. The token is
   single use, so nothing is verified until someone taps a button:
   verifying on load would burn the link before the app gets it.
   index.html moves the token into sessionStorage before analytics
   scripts can read the URL.
   ============================================================ */

const ORBITRON = "'Orbitron', sans-serif";
const GRADIENT = "linear-gradient(135deg, #7a3fd1, #f5a623)";
const SUPPORT_EMAIL = "info@thetechfestival.com";
const TOKEN_KEY = "ttfc.appLoginToken";

function readToken() {
  const fromUrl = new URLSearchParams(window.location.search).get("token");
  if (fromUrl) return fromUrl;
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

function forgetToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

function useBodyDark() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.body.classList.contains("dark-mode"));
  useEffect(() => {
    const sync = () => setDark(document.body.classList.contains("dark-mode"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function AppLogin() {
  const navigate = useNavigate();
  const dark = useBodyDark();
  const [token] = useState(readToken);
  const [mobile] = useState(isMobileDevice);
  // opening → choose → verifying → (navigates away) | error ; no token → invalid
  const [status, setStatus] = useState(() => (!token ? "invalid" : mobile ? "opening" : "choose"));
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [sendError, setSendError] = useState("");
  const tried = useRef(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "Sign in · TTFC 2026";
    const robots = document.createElement("meta");
    robots.name = "robots"; robots.content = "noindex, nofollow";
    const referrer = document.createElement("meta");
    referrer.name = "referrer"; referrer.content = "no-referrer";
    document.head.append(robots, referrer);
    return () => { document.title = prev; robots.remove(); referrer.remove(); };
  }, []);

  // On a phone, try the app straight away; show the buttons if we're still here shortly after.
  useEffect(() => {
    if (status !== "opening") return undefined;
    if (!tried.current) {
      tried.current = true;
      window.location.href = appLoginUrl(token);
    }
    const t = setTimeout(() => setStatus((s) => (s === "opening" ? "choose" : s)), 1600);
    return () => clearTimeout(t);
  }, [status, token]);

  const signInHere = async () => {
    setStatus("verifying"); setError("");
    try {
      const data = await verifyEmailLink(token);
      forgetToken();
      storeSession(data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      forgetToken();
      setError(err.message);
      setStatus("error");
    }
  };

  const sendNewLink = async (e) => {
    e.preventDefault();
    setSending(true); setSendError("");
    try {
      await requestEmailLink(email);
      setSentTo(email.trim());
    } catch (err) { setSendError(err.message); } finally { setSending(false); }
  };

  /* ---------- theme ---------- */
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.68)" : "rgba(13,5,32,0.68)";
  const textDim = dark ? "rgba(255,255,255,0.45)" : "rgba(13,5,32,0.48)";
  const bg = dark ? "#06020f" : "#ffffff";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const inputBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.20)";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(122,63,209,0.12)";
  const accent = dark ? "#c8a8ff" : "#7a3fd1";
  const divider = dark ? "rgba(255,255,255,0.07)" : "rgba(122,63,209,0.10)";

  const card = { background: cardBg, border: cardBorder, borderRadius: 20, padding: "clamp(28px, 7vw, 44px) clamp(20px, 6vw, 40px)", backdropFilter: "blur(12px)", textAlign: "center", boxShadow: dark ? "none" : "0 20px 60px rgba(122,63,209,0.10)" };
  const h1 = { fontFamily: ORBITRON, fontWeight: 900, fontSize: "clamp(1.25rem, 6vw, 1.7rem)", lineHeight: 1.3, margin: "0 0 12px", color: textMain };
  const lead = { margin: "0 auto", maxWidth: 400, color: textMuted, lineHeight: 1.6, fontSize: "1rem" };
  const btnBase = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 54, padding: "15px 18px", borderRadius: 14, fontFamily: ORBITRON, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "1.2px", textTransform: "uppercase", textDecoration: "none", cursor: "pointer", boxSizing: "border-box" };
  const primary = { ...btnBase, border: "none", background: GRADIENT, color: "#fff", boxShadow: "0 6px 24px rgba(122,63,209,0.35)" };
  const secondary = { ...btnBase, border: "1.5px solid " + inputBorder, background: "transparent", color: textMain };
  const spinner = <div aria-hidden="true" style={{ width: 38, height: 38, margin: "0 auto 20px", borderRadius: 999, border: `3px solid ${divider}`, borderTopColor: "#7a3fd1", animation: "alSpin 0.8s linear infinite" }} />;
  const badge = (
    <div aria-hidden="true" style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: 20, background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(122,63,209,0.35)" }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
    </div>
  );

  let content;
  if (status === "opening" || status === "verifying") {
    content = (
      <div style={card} role="status" aria-live="polite">
        {spinner}
        <h1 style={h1}>{status === "opening" ? "Opening the TTFC app…" : "Signing you in…"}</h1>
        <p style={lead}>{status === "opening" ? "One moment." : "Just a second."}</p>
      </div>
    );
  } else if (status === "choose") {
    content = (
      <div style={card}>
        {badge}
        <h1 style={h1}>{mobile ? "Opening the TTFC app…" : "Sign in to TTFC 2026"}</h1>
        <p style={lead}>
          {mobile
            ? "If the app didn't open, tap the button below. No app yet? You can sign in on the website instead."
            : "This link signs you in to the TTFC app. Open the email on your phone to go straight into the app, or sign in on this computer."}
        </p>
        <div style={{ display: "flex", flexDirection: mobile ? "column" : "column-reverse", gap: 12, marginTop: 24 }}>
          <a href={appLoginUrl(token)} style={mobile ? primary : secondary}>Open the TTFC app</a>
          <button type="button" onClick={signInHere} style={mobile ? secondary : primary}>
            {mobile ? "Sign in on the website instead" : "Sign in on the website"}
          </button>
        </div>
        <p style={{ margin: "22px 0 0", color: textDim, fontSize: "0.82rem", lineHeight: 1.5 }}>
          The link works once and expires 15 minutes after it was sent.
        </p>
      </div>
    );
  } else {
    const invalid = status === "invalid";
    content = (
      <div style={card} role="alert">
        <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 10 }}>🔗</div>
        <h1 style={h1}>{invalid ? "This link isn't complete" : "Let's get you a new link"}</h1>
        <p style={{ ...lead, marginBottom: 22 }}>
          {invalid
            ? "It may have been copied without the end part. Open it again from the email, or get a new one below."
            : error || "Sign-in links work once, for 15 minutes. Get a new one below."}
        </p>
        {sentTo ? (
          <p role="status" style={{ margin: "0 0 6px", padding: "14px 16px", borderRadius: 12, background: dark ? "rgba(76,201,140,0.10)" : "rgba(30,150,90,0.07)", border: "1px solid rgba(60,180,120,0.30)", color: dark ? "#9fe6c2" : "#1d7a4c", fontSize: "0.92rem", lineHeight: 1.5 }}>
            Check your email. If {maskEmail(sentTo)} has a TTFC ticket, a new sign-in link is on its way.
          </p>
        ) : (
          <form onSubmit={sendNewLink} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
            <label htmlFor="al-email" style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: textMuted }}>Email you bought your ticket with</label>
            <input id="al-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              style={{ width: "100%", padding: "13px 14px", minHeight: 50, borderRadius: 12, border: "1px solid " + inputBorder, background: inputBg, color: textMain, fontFamily: "inherit", fontSize: "16px", outline: "none", boxSizing: "border-box" }} />
            {sendError && <span role="alert" style={{ fontSize: "0.8rem", color: "#e05555" }}>{sendError}</span>}
            <button type="submit" disabled={sending} style={{ ...primary, opacity: sending ? 0.7 : 1, cursor: sending ? "not-allowed" : "pointer" }}>
              {sending ? "Sending…" : "Email me a new link"}
            </button>
          </form>
        )}
        <p style={{ margin: "20px 0 0", color: textMuted, fontSize: "0.9rem" }}>
          Need a hand? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: accent, fontWeight: 700 }}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <style>{"@keyframes alSpin { to { transform: rotate(360deg); } }"}</style>
      <div style={{ minHeight: "100vh", background: bg, color: textMain, position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: dark
            ? "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.07) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.06) 0%, transparent 70%)" }} />
        <main style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "clamp(96px, 16vw, 140px) 16px 64px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <span style={{ fontFamily: ORBITRON, fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "#f5a623", padding: "5px 12px", borderRadius: 999, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.30)" }}>TTFC 2026</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: textDim, alignSelf: "center" }}>Oct 26–27 · Toronto</span>
          </div>
          {content}
          <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: "0.88rem" }}>
            <Link to="/" style={{ color: textDim, textDecoration: "none", fontWeight: 600 }}>← thetechfestival.com</Link>
          </p>
        </main>
      </div>
    </>
  );
}
