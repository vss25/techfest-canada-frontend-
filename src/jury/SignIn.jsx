import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { jury, lastEmail, rememberEmail, setJuryToken } from "./api";
import { Button } from "./ui";

/* Jury sign-in: email + a one-time 6-digit code by email (no passwords:
   the organiser, Oct 22 2026). The server's answers never say whether an
   email is a juror's, so neither does this page. */

const HELP = "enquire@thetechfestival.com";

export default function SignIn({ onSignedIn, notice = "" }) {
  const [step, setStep] = useState("email"); // email → code
  const [email, setEmail] = useState(lastEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const done = (r, via) => {
    rememberEmail(email);
    setJuryToken(r.token);
    onSignedIn(r.juror, via);
  };

  const sendCode = async (e) => {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    try {
      await jury.post("/auth/code", { email });
      rememberEmail(email);
      setStep("code");
      setCode("");
      setInfo(`If ${email.trim()} is on the jury, a 6-digit code is on its way. It works for 15 minutes.`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { done(await jury.post("/auth/code/verify", { email, code }), "code"); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="j-signin">
      <div className="j-signin-card j-card">
        <p className="j-eyebrow">The Catalyst Awards · TTFC 2026</p>
        <h1 className="j-h1">Jury sign-in</h1>
        <p className="j-lead">Review and score the nominations allocated to you. About 5 minutes each.</p>

        {notice && <p className="j-note j-note-info" role="status">{notice}</p>}

        {step === "email" && (
          <form onSubmit={sendCode} className="j-form" noValidate>
            <label className="j-label" htmlFor="j-email">Email</label>
            <input id="j-email" className="j-input" type="email" inputMode="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            {error && <p className="j-error" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!email.trim()} className="j-block">Email me a code</Button>
            <p className="j-hint">We'll email a 6-digit code to the address the Catalyst Awards team has for you.</p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verify} className="j-form" noValidate>
            {info && <p className="j-note j-note-good" role="status">{info}</p>}
            <label className="j-label" htmlFor="j-code">6-digit code</label>
            <input id="j-code" className="j-input j-input-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7}
              value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))} placeholder="123 456" autoFocus />
            {error && <p className="j-error" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={code.replace(/\D/g, "").length !== 6} className="j-block">Sign in</Button>
            <div className="j-row-between">
              <button type="button" className="j-link" onClick={() => { setStep("email"); setError(""); setInfo(""); }}>
                <ArrowLeft className="j-ico-sm" aria-hidden="true" /> Use a different email
              </button>
              <button type="button" className="j-link" onClick={sendCode} disabled={busy}>Send a new code</button>
            </div>
          </form>
        )}

        <p className="j-help">Trouble signing in? Write to <a href={`mailto:${HELP}`}>{HELP}</a>.</p>
      </div>
    </div>
  );
}
