import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Eye, EyeOff, HelpCircle, KeyRound, Ticket, ArrowRight, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useStore, session } from "../lib/store";
import { auth, enterGuest, requestEmailLink, ticketLogin, staffSignIn, verifyEmailCode, verifyEmailToken, cleanTicketId, isSignedIn } from "../lib/auth";
import { pwa } from "../lib/pwa";
import { EVENT } from "../lib/config";
import { WelcomeCard } from "../components/AppNotices";

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

/** The sign-in screen's 54-pt buttons: icon, label, then an arrow on the right. */
function BigButton({ children, icon, filled, loading, type = "button", ...rest }) {
  const Icon = icon;
  return (
    <button type={type} className={filled ? "big-btn big-btn--filled pressable" : "big-btn pressable"} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 aria-hidden="true" className="big-btn-icon" style={{ animation: "spin .8s linear infinite" }} /> : <Icon aria-hidden="true" className="big-btn-icon" />}
      <span className="big-btn-label">{children}</span>
      {!loading && <ArrowRight aria-hidden="true" className="big-btn-arrow" />}
    </button>
  );
}

/** "Where's my pass ID?": where it is and what it looks like, as the pass email shows it. */
function PassIdHelp({ id, onClose, anchorRef, below }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { onClose(); anchorRef.current?.focus(); } };
    const onDown = (e) => { if (!ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [onClose, anchorRef]);
  return (
    <div ref={ref} id={id} className={below ? "pass-pop pass-pop--below" : "pass-pop"} role="dialog" aria-label="Where's my pass ID?">
      <b className="pass-pop-title">Where's my pass ID?</b>
      <p>It's in the email with your pass, labelled “Ticket ID”, next to your QR code.</p>
      <div className="pass-pop-sample"><span>TICKET ID</span><code>A1B2C3D4E5F6</code></div>
      <p className="pass-pop-note">12 letters and numbers. Capitals don't matter.</p>
    </div>
  );
}

export default function Login() {
  const a = useStore(auth);
  const p = useStore(pwa);
  const { standalone } = p;
  const navigate = useNavigate();
  const [mode, setMode] = useState("choose"); // choose | email | code | pass | staff | verifying
  const [staffEmail, setStaffEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [lastName, setLastName] = useState("");
  const [passId, setPassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showChooserHelp, setShowChooserHelp] = useState(false);
  const helpBtnRef = useRef(null);
  const fieldHelpRef = useRef(null);
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

  // The sign-in screen is always dark: match the browser chrome / status bar (and the page ground) to it.
  useEffect(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const prev = metas.map((m) => m.getAttribute("content"));
    metas.forEach((m) => m.setAttribute("content", "#0B0823"));
    document.documentElement.classList.add("dark-ground");
    return () => {
      metas.forEach((m, i) => m.setAttribute("content", prev[i]));
      if (!document.getElementById("boot-splash")) document.documentElement.classList.remove("dark-ground");
    };
  }, []);

  // Resend countdown.
  useEffect(() => {
    if (mode !== "code") return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [mode]);

  const go = (m) => { setError(""); setShowHelp(false); setShowChooserHelp(false); setMode(m); };

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

  const submitStaff = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await staffSignIn(staffEmail, password);
      setPassword("");
      navigate("/", { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const guest = () => { enterGuest(); navigate("/", { replace: true }); };
  const left = Math.max(0, Math.ceil(RESEND_SECONDS - (Date.now() - sentAt) / 1000));
  const canPass = lastName.trim().length >= 2 && cleanTicketId(passId).length >= 6;
  const canStaff = plausibleEmail(staffEmail) && password.length > 0;
  const compact = mode !== "choose";

  return (
    <div className="login">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className={compact ? "login-hero login-hero--compact" : "login-hero"}>
        <img src="/app/brand/logo.webp" alt="The Tech Festival Canada" className="login-brand" width="870" height="429" decoding="async" fetchpriority="high" />
        {!compact && <div className="login-tagline">{EVENT.tagline}</div>}
      </div>

      <main id="main" className="login-panel" aria-live="polite">
        <div style={{ color: "var(--tx)" }}><WelcomeCard /></div>
        {a.notice && <div className="note note--gold" role="alert">{a.notice}</div>}

        {mode === "verifying" && (
          <div className="stack" style={{ alignItems: "center", padding: "30px 0" }} role="status">
            <div className="spinner" />
            <p style={{ margin: 0, fontSize: 17 }}>Signing you in…</p>
          </div>
        )}

        {mode === "choose" && (
          <>
            <h1 className="sr-only">Sign in to The Tech Festival Canada</h1>
            <BigButton filled icon={Send} onClick={() => go("email")}>Email me a sign-in link</BigButton>
            <div className="big-btn">
              <button type="button" className="big-btn-hit" aria-label="Sign in with pass ID" onClick={() => go("pass")} />
              <Ticket aria-hidden="true" className="big-btn-icon" />
              <span className="big-btn-label">
                <span aria-hidden="true">Sign in with </span>
                <button type="button" ref={helpBtnRef} className="dotted-term" aria-label="What's a pass ID?" aria-expanded={showChooserHelp} aria-controls="pass-help-pop"
                  onClick={() => setShowChooserHelp((v) => !v)}>pass ID</button>
              </span>
              <ArrowRight aria-hidden="true" className="big-btn-arrow" />
              {showChooserHelp && <PassIdHelp id="pass-help-pop" onClose={() => setShowChooserHelp(false)} anchorRef={helpBtnRef} />}
            </div>
            <div className="or">Or</div>
            <button type="button" className="guest-link pressable" onClick={guest}><Eye aria-hidden="true" />Browse as guest</button>
          </>
        )}

        {(mode === "email" || mode === "code" || mode === "pass" || mode === "staff") && (
          <button type="button" className="login-back pressable" onClick={() => go(mode === "code" ? "email" : "choose")}>
            <ChevronLeft aria-hidden="true" /> Back
          </button>
        )}

        {mode === "email" && (
          <form className="login-form" onSubmit={sendLink} noValidate>
            <h1 className="sr-only">Sign in with your email</h1>
            <input className="login-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoFocus />
            {email && (
              <div className="gold-hint">
                <Ticket aria-hidden="true" />
                <span>Use the same email you bought or registered your pass with.</span>
              </div>
            )}
            {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
            <BigButton type="submit" filled icon={Send} loading={busy} disabled={!plausibleEmail(email)}>Send sign-in link</BigButton>
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("pass")}>Use pass ID instead</button>
            </div>
          </form>
        )}

        {mode === "code" && (
          <div className="login-form">
            <h1 className="sr-only">Check your email</h1>
            <label className="code-boxes" aria-label="6-digit code">
              <input ref={codeRef} value={code} onChange={(e) => onCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} aria-label="6-digit code from the email" disabled={busy} />
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} aria-hidden="true" className={"code-box" + (i === Math.min(code.length, 5) ? " code-box--active" : "")}>{code[i] || ""}</span>
              ))}
            </label>
            <p className="login-copy">
              We emailed a code and a sign-in link to <b>{maskEmail(sentTo)}</b>.
            </p>
            {standalone && <p className="login-copy login-copy--small">Type the 6-digit code here. The link in the email opens in your browser, not in this app.</p>}
            {resent && !error && <p className="login-resent"><CheckCircle2 aria-hidden="true" /> New link sent. The old one no longer works.</p>}
            {busy && <div className="row" style={{ justifyContent: "center" }}><div className="spinner" /></div>}
            {error && <p className="error-text center" role="alert" style={{ margin: 0 }}>{error}</p>}
            <div className="login-links">
              <button type="button" className="login-link" disabled={left > 0 || busy} onClick={(e) => sendLink(e, true)} style={left > 0 ? { opacity: 0.55 } : undefined}>
                {left > 0 ? `Resend in ${left}s` : "Resend"}
              </button>
              <button type="button" className="login-link" onClick={() => { setCode(""); setSentTo(""); go("email"); }}>Use a different email</button>
            </div>
          </div>
        )}

        {mode === "pass" && (
          <form className="login-form" onSubmit={submitPass} noValidate>
            <h1 className="sr-only">Sign in with your pass</h1>
            <input className="login-input" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name on the pass" aria-label="Last name on the pass" autoFocus />
            <div style={{ position: "relative" }}>
              <input id="pass-id" className="login-input" autoCapitalize="characters" autoComplete="off" spellCheck="false" placeholder="Pass ID (e.g. a1b2c3d4e5f6)" aria-label="Pass ID"
                value={passId} onChange={(e) => setPassId(e.target.value)} style={{ paddingRight: 52 }} />
              <button type="button" ref={fieldHelpRef} className="field-help pressable" aria-label="Where's my pass ID?" aria-expanded={showHelp} aria-controls="pass-help-field" onClick={() => setShowHelp((v) => !v)}>
                <HelpCircle aria-hidden="true" />
              </button>
              {showHelp && <PassIdHelp id="pass-help-field" onClose={() => setShowHelp(false)} anchorRef={fieldHelpRef} below />}
            </div>
            {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
            <BigButton type="submit" filled icon={ArrowRight} loading={busy} disabled={!canPass}>Sign in</BigButton>
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => go("email")}>Email me a sign-in link instead</button>
            </div>
          </form>
        )}

        {mode === "staff" && (
          <form className="login-form" onSubmit={submitStaff} noValidate>
            <div>
              <h1 className="staff-title"><KeyRound aria-hidden="true" />Staff sign-in</h1>
              <p className="login-copy" style={{ textAlign: "left", fontSize: 13, marginTop: 4 }}>For TTFC staff and volunteers.</p>
            </div>
            <input className="login-input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck="false"
              value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Staff email" aria-label="Staff email" autoFocus />
            <div style={{ position: "relative" }}>
              <input className="login-input" type={reveal ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" spellCheck="false"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" style={{ paddingRight: 52 }} />
              <button type="button" className="field-help pressable" aria-label={reveal ? "Hide password" : "Show password"} aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>
                {reveal ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
            <BigButton type="submit" filled icon={ArrowRight} loading={busy} disabled={!canStaff}>Sign in</BigButton>
          </form>
        )}
      </main>

      <footer className="login-foot">
        {(mode === "email" || mode === "pass") && (
          <button type="button" className="staff-link" onClick={() => go("staff")}>Staff sign-in</button>
        )}
        {!p.installed && !standalone && mode === "choose" && (
          <Link to="/install" className="login-install"><Download aria-hidden="true" />Install the app</Link>
        )}
        <p className="legal">
          By continuing, you confirm you're 18+ and agree to The&nbsp;Tech&nbsp;Festival&nbsp;Canada's{" "}
          <Link to="/legal/terms">Terms&nbsp;of&nbsp;Use</Link> and <Link to="/legal/privacy">Privacy&nbsp;Policy</Link>.
        </p>
      </footer>
    </div>
  );
}
