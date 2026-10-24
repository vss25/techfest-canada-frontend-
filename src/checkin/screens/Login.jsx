import { useState } from "react";
import { signIn } from "../lib/desk.js";
import { DESK_NAME } from "../deskPath.js";

/* Sign-in: TTFC staff and volunteer accounts only (POST /api/auth/login with staffOnly, then the desk checks the
   check-in right). Volunteers' logins are made by management in Admin › More › Staff accounts. */
export default function Login({ again = false, notice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    setError("");
    try { await signIn(email, password); } catch (err) { setError(err.message || "Sign-in failed."); } finally { setBusy(false); }
  };
  return (
    <main className="ci-login">
      <form className="ci-login-card" onSubmit={submit} noValidate>
        <img src="icons/icon-192.png" alt="" width="72" height="72" className="ci-login-icon" />
        <h1>{DESK_NAME}</h1>
        {notice && <p className="ci-error" role="alert">{notice}</p>}
        <p className="ci-muted">{again ? "Your sign-in has ended. Sign in again: taps saved on this device are kept and sent after (still recorded as made by whoever made them)." : "For TTFC staff and volunteers. Sign in with the email and password you were given."}</p>
        <label className="ci-field">
          <span>Email</span>
          <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
        </label>
        <label className="ci-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="ci-error" role="alert">{error}</p>}
        <button type="submit" className="ci-btn ci-btn-primary ci-btn-xl" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="ci-small ci-muted">No login yet? Ask TTFC management to create one in Admin › Staff accounts.</p>
      </form>
    </main>
  );
}
