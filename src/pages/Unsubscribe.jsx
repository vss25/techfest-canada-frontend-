import { useEffect, useState } from "react";
import { AlertCircle, BellOff, BellRing, Check, Loader2 } from "lucide-react";
import AuroraBackground from "../components/AuroraBackground";
import { ATT_CSS } from "./attendingStyles";
import { ENQUIRE } from "../lib/attending";
import { setDigestEmail } from "../lib/sharePagesApi";

/* =========================================================
   /unsubscribe?t=<token>: the "What you missed" email's
   unsubscribe link (Oct 22 2026). Unlinked and noindex, in the
   /attending look. One button turns those emails off for the
   person the email went to (POST /api/notify/email-prefs, see
   src/lib/sharePagesApi.js), and "Turn them back on" undoes it.
   It waits for the tap rather than acting on page load, so mail
   apps that open links to check them can't unsubscribe anyone;
   mail apps' own Unsubscribe button uses the email's one-click
   header, straight to the server.
========================================================= */

const SETTINGS = "/app/profile/notifications";

export default function Unsubscribe() {
  const [t] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("t") || ""));
  const [state, setState] = useState(t ? "ask" : "invalid"); // ask | busy | off | on | invalid | error
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = "Email preferences · TTFC 2026";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    document.body.classList.add("att-open");
    return () => { document.title = prev; robots.remove(); document.body.classList.remove("att-open"); };
  }, []);

  const change = async (on) => {
    setState("busy");
    setError("");
    try {
      const r = await setDigestEmail(t, on);
      if (r?.email) setEmail(r.email);
      setState(r?.digestEmail === true ? "on" : "off");
    } catch (e) {
      if (e?.status === 404 || e?.status === 410 || e?.code === "invalid") setState("invalid");
      else { setError(e?.message || "That didn't work. Try again in a moment."); setState("error"); }
    }
  };

  return (
    <div className="att-root">
      <style>{ATT_CSS + CSS}</style>
      <AuroraBackground />
      <header className="att-brand">
        <img src="/Tech_Festival_Canada_Logo_Dark_Transparent.png" alt="The Tech Festival Canada" width="240" height="150" />
      </header>

      <main className="att-card un-card" aria-live="polite">
        {state === "ask" || state === "busy" || state === "error" ? (
          <>
            <span className="un-ico" aria-hidden="true"><BellOff size={24} /></span>
            <h1 className="un-title">Stop “What you missed” emails?</h1>
            <p className="un-sub">These are the short summaries of messages, replies and mentions you haven’t seen in the TTFC app. Emails about your pass still come.</p>
            {error && <p className="att-error"><AlertCircle size={16} aria-hidden="true" /><span>{error}</span></p>}
            <button type="button" className="att-btn un-btn" onClick={() => change(false)} disabled={state === "busy"} aria-busy={state === "busy" || undefined}>
              {state === "busy" ? <Loader2 size={20} className="att-spin" aria-hidden="true" /> : null}Unsubscribe
            </button>
            <a className="att-text-btn" href="/app/">Keep getting them</a>
          </>
        ) : state === "off" ? (
          <>
            <span className="un-ico un-ico--done" aria-hidden="true"><Check size={24} /></span>
            <h1 className="un-title">You’re unsubscribed</h1>
            <p className="un-sub">{email ? `${email} won’t get` : "You won’t get"} “What you missed” emails from TTFC any more. You can switch them back on here or in the app (Profile › Settings › Notification settings).</p>
            <button type="button" className="att-btn-ghost un-btn" onClick={() => change(true)}><BellRing size={17} aria-hidden="true" /> Turn them back on</button>
          </>
        ) : state === "on" ? (
          <>
            <span className="un-ico un-ico--done" aria-hidden="true"><BellRing size={24} /></span>
            <h1 className="un-title">They’re back on</h1>
            <p className="un-sub">You’ll get a short summary when you miss something in the TTFC app: never at night, at most 3 a day.</p>
            <a className="att-back-app" href="/app/">Open the TTFC app</a>
          </>
        ) : (
          <>
            <span className="un-ico" aria-hidden="true"><AlertCircle size={24} /></span>
            <h1 className="un-title">This link didn’t work</h1>
            <p className="un-sub">It may be incomplete or too old. You can turn these emails off in the TTFC app: Profile › Settings › Notification settings.</p>
            <a className="att-back-app" href={SETTINGS}>Open notification settings</a>
          </>
        )}
      </main>

      <footer className="att-foot">
        <p>Questions? <a className="att-link" href={`mailto:${ENQUIRE}`}>{ENQUIRE}</a></p>
      </footer>
    </div>
  );
}

const CSS = `
.un-card { position: relative; z-index: 1; max-width: 520px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 28px 24px; }
.un-ico { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); }
.un-ico--done { background: rgba(60,200,130,0.16); border-color: rgba(120,230,170,0.45); color: #c9f7dc; }
.un-title { margin: 4px 0 0; font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 21px; line-height: 1.25; }
.un-sub { margin: 0; font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.82); }
.un-btn { margin-top: 6px; max-width: 320px; }
`;
