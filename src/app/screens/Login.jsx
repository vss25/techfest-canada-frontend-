import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, HelpCircle, Mail, Ticket, ArrowRight, Send, CheckCircle2 } from "lucide-react";
import { useStore, session } from "../lib/store";
import { auth, enterGuest, requestEmailLink, ticketLogin, verifyEmailCode, verifyEmailToken, cleanTicketId, isSignedIn } from "../lib/auth";
import { pwa } from "../lib/pwa";
import { EVENT } from "../lib/config";
import { Button } from "../components/ui";

/* =========================================================
   Sign-in, as in the apps: an emailed sign-in link + 6-digit
   code, or the pass ID + last name, or browse as a guest.
   A link opened from the email lands on the website's
   /app-login, which hands the token over to /app/login.
========================================================= */

const RESEND_SECONDS = 30;

function maskEmail(email) {
  const [local = "", domain = ""] = String(email || "").trim().toLowerCase().split("@");
  if (!local || !domain) return String(email || "");
  return `${local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)}•••@${domain}`;
}
const plausibleEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());

function takeHandoffToken() {
  const t = window.__ttfcLoginToken || session.get("ttfc.appLoginToken") || "";
  window.__ttfcLoginToken = "";
  session.set("ttfc.appLoginToken", null);
  return t;
}

export default function Login() {
  const a = useStore(auth);
  const { standalone } = useStore(pwa);
  const navigate = useNavigate();
  const [mode, setMode] = useState("choose"); // choose | email | code | pass | verifying
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [lastName, setLastName] = useState("");
  const [passId, setPassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [resent, setResent] = useState(false);
  const [, setTick] = useState(0);
  const codeRef = useRef(null);
  const handled = useRef(false);

  // A sign-in link handed over from /app-login.
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const t = takeHandoffToken();
    if (!t) {
      if (isSignedIn(auth.get())) navigate("/", { replace: true });
      return;
    }
    (async () => {
      setMode("verifying");
      try {
        await verifyEmailToken(t);
        navigate("/", { replace: true });
      } catch (e) {
        setError(e.message || "That sign-in link didn't work. Get a new one below.");
        setMode("email");
      }
    })();
  }, [navigate]);

  // Resend countdown.
  useEffect(() => {
    if (mode !== "code") return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [mode]);

  const go = (m) => { setError(""); setMode(m); };

  const sendLink = async (e, resend = false) => {
    e?.preventDefault();
    const target = resend ? sentTo : email.trim();
    if (!plausibleEmail(target)) { setError("Enter a valid email address."); return; }
    setBusy(true); setError("");
    try {
      await requestEmailLink(target);
      setSentTo(target.toLowerCase());
      setSentAt(Date.now());
      setCode("");
      setResent(resend);
      setMode("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const submitCode = async (value) => {
    setBusy(true); setError("");
    try {
      await verifyEmailCode(sentTo, value);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setCode("");
      codeRef.current?.focus();
    } finally { setBusy(false); }
  };

  const onCode = (raw) => {
    const clean = raw.replace(/\D/g, "").slice(0, 6);
    setCode(clean);
    if (clean) setError("");
    if (clean.length === 6 && !busy) submitCode(clean);
  };

  const submitPass = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await ticketLogin(lastName, passId);
      navigate("/", { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const guest = () => { enterGuest(); navigate("/", { replace: true }); };
  const left = Math.max(0, Math.ceil(RESEND_SECONDS - (Date.now() - sentAt) / 1000));
  const canPass = lastName.trim().length >= 2 && cleanTicketId(passId).length >= 6;
  const compact = mode !== "choose";

  return (
    <div className="login">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="login-hero" style={compact ? { flex: "none", padding: "8px 0 22px" } : undefined}>
        <img src="/app/icons/icon-192.png" alt="The Tech Festival Canada" className={compact ? "login-logo login-logo--small app-icon" : "login-logo app-icon"} style={{ width: compact ? 88 : 150 }} />
        <div className="login-tagline">{EVENT.tagline}</div>
        {!compact && <p className="muted" style={{ margin: "14px 0 0" }}>Oct 26–27, 2026 · Westin Harbour Castle, Toronto</p>}
      </div>

      <main id="main" className="login-panel" aria-live="polite">
        {a.notice && <div className="note note--gold" role="alert">{a.notice}</div>}

        {mode === "verifying" && (
          <div className="stack" style={{ alignItems: "center", padding: "30px 0" }} role="status">
            <div className="spinner" />
            <p style={{ margin: 0, fontSize: 17 }}>Signing you in…</p>
          </div>
        )}

        {mode === "choose" && (
          <>
            <Button variant="primary" size="lg" block icon={Send} onClick={() => go("email")}>Email me a sign-in link</Button>
            <Button size="lg" block icon={Ticket} onClick={() => go("pass")}>Sign in with pass ID</Button>
            <div className="or">Or</div>
            <Button size="lg" block icon={Eye} className="btn-ghost" onClick={guest}>Browse as guest</Button>
          </>
        )}

        {(mode === "email" || mode === "code" || mode === "pass") && (
          <button type="button" className="link-btn" style={{ alignSelf: "flex-start", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => go(mode === "code" ? "email" : "choose")}>
            <ChevronLeft aria-hidden="true" style={{ width: 16, height: 16 }} /> Back
          </button>
        )}

        {mode === "email" && (
          <form className="stack" onSubmit={sendLink} noValidate>
            <h1 style={{ fontSize: 22, margin: 0 }}>Sign in with your email</h1>
            <label className="field">
              <span className="field-label" style={{ color: "rgba(255,255,255,.8)" }}>Email</span>
              <input className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
            </label>
            {email && (
              <div className="note note--gold row-top" style={{ fontSize: 14 }}>
                <Ticket aria-hidden="true" style={{ width: 18, height: 18, flex: "none", marginTop: 1 }} />
                <span>Use the same email you bought or registered your pass with.</span>
              </div>
            )}
            {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
            <Button type="submit" variant="primary" size="lg" block icon={Send} loading={busy} disabled={!plausibleEmail(email)}>Send sign-in link</Button>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="link-btn" onClick={() => go("pass")}>Use pass ID instead</button>
            </div>
          </form>
        )}

        {mode === "code" && (
          <div className="stack">
            <h1 style={{ fontSize: 22, margin: 0 }}>Check your email</h1>
            <label className="code-boxes" aria-label="6-digit code">
              <input ref={codeRef} value={code} onChange={(e) => onCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} aria-label="6-digit code from the email" disabled={busy} />
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} aria-hidden="true" className={"code-box" + (i === Math.min(code.length, 5) ? " code-box--active" : "")}>{code[i] || ""}</span>
              ))}
            </label>
            <p className="center" style={{ margin: 0 }}>
              We emailed a code and a sign-in link to <b>{maskEmail(sentTo)}</b>.
            </p>
            <p className="center muted small" style={{ margin: 0 }}>
              {standalone
                ? "Type the 6-digit code here. The link in the email opens in your browser, not in this app."
                : "Type the 6-digit code, or tap the link in the email on this device."}
            </p>
            {resent && !error && <p className="center small" style={{ margin: 0 }}><CheckCircle2 aria-hidden="true" style={{ width: 15, height: 15, verticalAlign: "-3px" }} /> New link sent. The old one no longer works.</p>}
            {busy && <div className="row" style={{ justifyContent: "center" }}><div className="spinner" /></div>}
            {error && <p className="error-text center" role="alert" style={{ margin: 0 }}>{error}</p>}
            <div className="row" style={{ justifyContent: "center", gap: 18 }}>
              <button type="button" className="link-btn" disabled={left > 0 || busy} onClick={(e) => sendLink(e, true)} style={left > 0 ? { opacity: 0.6, textDecoration: "none" } : undefined}>
                {left > 0 ? `Resend in ${left}s` : "Resend"}
              </button>
              <button type="button" className="link-btn" onClick={() => { setCode(""); setSentTo(""); go("email"); }}>Use a different email</button>
            </div>
          </div>
        )}

        {mode === "pass" && (
          <form className="stack" onSubmit={submitPass} noValidate>
            <h1 style={{ fontSize: 22, margin: 0 }}>Sign in with your pass</h1>
            <label className="field">
              <span className="field-label" style={{ color: "rgba(255,255,255,.8)" }}>Last name on the pass</span>
              <input className="input" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoFocus />
            </label>
            <div className="field">
              <label htmlFor="pass-id" className="field-label" style={{ color: "rgba(255,255,255,.8)" }}>Pass ID</label>
              <div style={{ position: "relative" }}>
                <input id="pass-id" className="input" autoCapitalize="characters" autoComplete="off" spellCheck="false" placeholder="e.g. a1b2c3d4e5f6"
                  value={passId} onChange={(e) => setPassId(e.target.value)} style={{ paddingRight: 48 }} aria-describedby={showHelp ? "pass-help" : undefined} />
                <button type="button" className="icon-btn" aria-label="Where's my pass ID?" aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)} style={{ position: "absolute", right: 2, top: 2, color: "#fff" }}>
                  <HelpCircle aria-hidden="true" />
                </button>
              </div>
              {showHelp && (
                <div id="pass-help" className="note" style={{ background: "rgba(255,255,255,.1)" }}>
                  <b>Where's my pass ID?</b>
                  <div className="small" style={{ marginTop: 4 }}>It's in the email with your pass, labelled “Ticket ID”, next to your QR code.</div>
                  <div className="figure" style={{ marginTop: 8, letterSpacing: "0.12em", fontWeight: 700 }}>TICKET ID · A1B2C3D4E5F6</div>
                  <div className="small muted" style={{ marginTop: 4 }}>12 letters and numbers. Capitals don't matter.</div>
                </div>
              )}
            </div>
            {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
            <Button type="submit" variant="primary" size="lg" block icon={ArrowRight} loading={busy} disabled={!canPass}>Sign in</Button>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="link-btn" onClick={() => go("email")}><Mail aria-hidden="true" style={{ width: 15, height: 15, verticalAlign: "-3px", marginRight: 4 }} />Email me a sign-in link instead</button>
            </div>
          </form>
        )}

        <p className="legal">
          By continuing, you confirm you're 18+ and agree to The&nbsp;Tech&nbsp;Festival&nbsp;Canada's{" "}
          <Link to="/legal/terms">Terms&nbsp;of&nbsp;Use</Link> and <Link to="/legal/privacy">Privacy&nbsp;Policy</Link>.
        </p>
        <p className="legal" style={{ marginTop: 0 }}>
          <Link to="/install" style={{ fontWeight: 500 }}>Install the app on your phone</Link>
        </p>
      </main>
    </div>
  );
}
