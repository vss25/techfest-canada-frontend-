import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import "../admin/admin.css";
import { ADMIN_API } from "../admin/api";
import { useAdminThemeRoot } from "../admin/theme";

const field =
  "w-full rounded-xl border border-ttfc-field bg-ttfc-ink/70 px-4 py-3 text-[15px] text-ttfc-text placeholder:text-ttfc-dim transition focus:border-ttfc-purple focus:outline-none focus:ring-2 focus:ring-ttfc-purple/30";

// Forgot password (Nov 18 2026): "Send a link to email to reset". The email links back here with
// ?reset=<token>; the backend (POST /auth/forgot-password with admin: true) sends staff that link.
const RESET_TOKEN = /^[a-f0-9]{64}$/;

function Notice({ tone, children }: { tone: "ok" | "warn" | "error"; children: ReactNode }) {
  const cls = tone === "ok" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    : tone === "warn" ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : "border-red-400/40 bg-red-500/10 text-red-100";
  const Icon = tone === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mt-5 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{children}</span>
    </p>
  );
}

const linkBtn = "font-semibold text-ttfc-text underline underline-offset-4 hover:text-ttfc-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple rounded";
const primaryBtn = "mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ttfc-pink via-ttfc-purple to-ttfc-orange text-[15px] font-bold text-white shadow-lg shadow-ttfc-pink/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-ttfc-panel disabled:cursor-not-allowed disabled:opacity-60";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resetToken = new URLSearchParams(window.location.search).get("reset") || "";
  const [mode, setMode] = useState<"signin" | "forgot" | "reset">(resetToken ? "reset" : "signin");
  const [sent, setSent] = useState("");
  const [done, setDone] = useState(false);
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { expired?: boolean; passwordRequired?: boolean } | null;
  const expired = state?.expired;
  // Sent here by the panel: they're signed in with an emailed code, which the panel doesn't take.
  const passwordRequired = state?.passwordRequired;
  // The staff panel's light / dark choice (admin/theme.js) applies here too.
  const { theme } = useAdminThemeRoot();

  useEffect(() => {
    document.body.classList.add("ttfc-admin-open");
    return () => document.body.classList.remove("ttfc-admin-open");
  }, []);

  const go = (next: "signin" | "forgot") => { setMode(next); setError(""); setSent(""); setPassword(""); setConfirm(""); setLoading(false); };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${ADMIN_API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), admin: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Couldn't send the link. Try again."));
      setSent(`If ${email.trim()} has a staff account, a reset link is on its way. It works for 1 hour. Check your spam folder if it doesn't arrive in a few minutes.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't send the link";
      setError(msg === "Failed to fetch" ? "Can't reach the server. Check your connection and try again." : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setLoading(true);
    setError("");
    try {
      if (!RESET_TOKEN.test(resetToken)) throw new Error("This reset link is invalid or has expired. Ask for a new one.");
      const res = await fetch(`${ADMIN_API}/auth/reset-password/${resetToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Couldn't change the password. Try again."));
      // The link is used up: take it out of the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      setDone(true);
      go("signin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't change the password";
      setError(msg === "Failed to fetch" ? "Can't reach the server. Check your connection and try again." : msg);
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${ADMIN_API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(data.error || "");
        throw new Error(/user not found|invalid password/i.test(msg) ? "Wrong email or password." : msg || "Sign-in failed. Try again.");
      }
      localStorage.setItem("token", data.token);
      window.dispatchEvent(new Event("authChanged"));
      // ?next=/some/page (the staging bar's "Staff sign-in"): back to that page on this site only.
      const next = new URLSearchParams(window.location.search).get("next") || "";
      navigate(/^\/(?!\/)/.test(next) ? next : "/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setError(msg === "Failed to fetch" ? "Can't reach the server. Check your connection and try again." : msg);
      setLoading(false);
    }
  };

  return (
    <div className="ttfc-admin relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-ttfc-pink/25 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-ttfc-purple/25 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-[260px] w-[260px] rounded-full bg-ttfc-orange/10 blur-[100px]" aria-hidden="true" />

      <main className="relative w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={theme === "light" ? "/Tech_Festival_Canada_Logo_Light_Transparent.webp" : "/Tech_Festival_Canada_Logo_Dark_Transparent.webp"} alt="The Tech Festival Canada" className="h-20 w-auto" />
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ttfc-line bg-ttfc-contrast/5 px-3 py-1 text-xs font-semibold text-ttfc-muted">
            <Lock className="h-3 w-3" aria-hidden="true" /> Staff only
          </p>
        </div>

        {mode === "forgot" ? (
          <form onSubmit={handleForgot} className="rounded-[22px] border border-ttfc-line bg-ttfc-panel/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8" noValidate>
            <h1 className="text-2xl font-bold tracking-tight text-ttfc-contrast">Reset your password</h1>
            <p className="mt-1.5 text-sm text-ttfc-muted">Enter your staff email. We'll email you a link to choose a new password.</p>
            {sent && !error && <Notice tone="ok">{sent}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            <div className="mt-6 space-y-1.5">
              <label htmlFor="admin-reset-email" className="text-[13px] font-semibold text-ttfc-text/90">Email</label>
              <input id="admin-reset-email" type="email" required autoComplete="username" autoFocus value={email}
                onChange={(e) => { setEmail(e.target.value); setSent(""); }} className={field} placeholder="you@thetechfestival.com" />
            </div>
            <button type="submit" disabled={loading || !/\S+@\S+\.\S+/.test(email)} className={primaryBtn}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Sending…" : sent ? "Send another link" : "Email me a reset link"}
            </button>
            <p className="mt-5 text-center text-sm text-ttfc-muted">
              <button type="button" onClick={() => go("signin")} className={linkBtn}>Back to sign in</button>
            </p>
          </form>
        ) : mode === "reset" ? (
          <form onSubmit={handleReset} className="rounded-[22px] border border-ttfc-line bg-ttfc-panel/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8" noValidate>
            <h1 className="text-2xl font-bold tracking-tight text-ttfc-contrast">Choose a new password</h1>
            <p className="mt-1.5 text-sm text-ttfc-muted">At least 8 characters. You'll sign in with it next.</p>
            {error && (
              <Notice tone="error">
                {error}{/expired|invalid/i.test(error) && <> <button type="button" onClick={() => { window.history.replaceState(null, "", window.location.pathname); go("forgot"); }} className={linkBtn}>Send a new link</button></>}
              </Notice>
            )}
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-new-password" className="text-[13px] font-semibold text-ttfc-text/90">New password</label>
                <div className="relative">
                  <input id="admin-new-password" type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" autoFocus value={password}
                    onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ttfc-dim hover:text-ttfc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple">
                    {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="admin-confirm-password" className="text-[13px] font-semibold text-ttfc-text/90">Type it again</label>
                <input id="admin-confirm-password" type={show ? "text" : "password"} required autoComplete="new-password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
            </div>
            <button type="submit" disabled={loading || !password || !confirm} className={primaryBtn}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Saving…" : "Save new password"}
            </button>
            <p className="mt-5 text-center text-sm text-ttfc-muted">
              <button type="button" onClick={() => { window.history.replaceState(null, "", window.location.pathname); go("signin"); }} className={linkBtn}>Back to sign in</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="rounded-[22px] border border-ttfc-line bg-ttfc-panel/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8" noValidate>
            <h1 className="text-2xl font-bold tracking-tight text-ttfc-contrast">Sign in to the staff panel</h1>
            <p className="mt-1.5 text-sm text-ttfc-muted">Use your TTFC staff or volunteer account.</p>

            {done && !error && <Notice tone="ok">Password changed. Sign in with your new password.</Notice>}
            {passwordRequired && !error && (
              <p role="status" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-100">
                That sign-in works in the TTFC apps, but the staff panel needs your email and password. Sign in below.
              </p>
            )}
            {expired && !passwordRequired && !error && !done && (
              <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-100">Your session ended. Please sign in again.</p>
            )}
            {error && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
              </p>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-[13px] font-semibold text-ttfc-text/90">Email</label>
                <input id="admin-email" type="email" required autoComplete="username" autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)} className={field} placeholder="you@thetechfestival.com" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="admin-password" className="text-[13px] font-semibold text-ttfc-text/90">Password</label>
                  <button type="button" onClick={() => go("forgot")} className={`text-[13px] ${linkBtn}`}>Forgot password?</button>
                </div>
                <div className="relative">
                  <input id="admin-password" type={show ? "text" : "password"} required autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ttfc-dim hover:text-ttfc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple">
                    {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className={primaryBtn}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="mt-5 text-center text-xs text-ttfc-dim">Every action in the panel is logged.</p>
          </form>
        )}
      </main>
    </div>
  );
}
