import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import "../admin/admin.css";
import { ADMIN_API } from "../admin/api";

const field =
  "w-full rounded-xl border border-ttfc-line bg-ttfc-ink/70 px-4 py-3 text-[15px] text-ttfc-text placeholder:text-ttfc-dim transition focus:border-ttfc-purple focus:outline-none focus:ring-2 focus:ring-ttfc-purple/30";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const expired = (location.state as { expired?: boolean } | null)?.expired;

  useEffect(() => {
    document.body.classList.add("ttfc-admin-open");
    return () => document.body.classList.remove("ttfc-admin-open");
  }, []);

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
      navigate("/admin");
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
          <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada" className="h-20 w-auto" />
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ttfc-line bg-white/5 px-3 py-1 text-xs font-semibold text-ttfc-muted">
            <Lock className="h-3 w-3" aria-hidden="true" /> Staff only
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-[22px] border border-ttfc-line bg-ttfc-panel/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8" noValidate>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to the staff panel</h1>
          <p className="mt-1.5 text-sm text-ttfc-muted">Use your TTFC staff account.</p>

          {expired && !error && (
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
              <label htmlFor="admin-password" className="text-[13px] font-semibold text-ttfc-text/90">Password</label>
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
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ttfc-pink via-ttfc-purple to-ttfc-orange text-[15px] font-bold text-white shadow-lg shadow-ttfc-pink/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-ttfc-panel disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-5 text-center text-xs text-ttfc-dim">Every action in the panel is logged. Forgot your password? Ask another staff member to reset it.</p>
        </form>
      </main>
    </div>
  );
}
