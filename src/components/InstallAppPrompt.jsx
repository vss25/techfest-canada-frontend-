import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { detectOS, isForcedPlatform, isMobileDevice, isStandalone, markInstalled, markedInstalled } from "../lib/pwaPlatform";
import { track } from "../lib/pwaEvents";

// Computers only (it carries the QR code library): phones never download it.
const PhoneAppPanel = lazy(() => import("./PhoneAppPanel"));

/* =========================================================
   "Get the TTFC app" for website visitors (App.jsx loads this
   outside the installed app). Shown once per browser session
   after 5 s of visible time (counted across page views), only
   when staff switch it on (App content › flag.pwaPrompt) or
   with ?pwa-preview=1.
   • Phones and tablets: a bottom sheet; "Show me how" opens
     /app/?install=1, where the step-by-step guide (and Chrome's
     own install prompt) takes over, so installs land on /app/.
   • Computers: the web app is phone-only, so "Get the TTFC app
     on your phone": a QR code to /app on the phone plus the
     store badges (PhoneAppPanel). No desktop install.
   "Not now" (or Escape / the backdrop) snoozes it for 7 days.
========================================================= */

const API = import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
const FLAG_KEY = "ttfc.pwa.promptFlag";
const PREVIEW_KEY = "ttfc.pwa.preview";
const SEEN_KEY = "ttfc.pwa.promptSeen";
const VISIBLE_KEY = "ttfc.pwa.visibleMs";
const SNOOZE_KEY = "ttfc.pwa.snoozeUntil";
const SNOOZE_MS = 7 * 24 * 3600 * 1000;
const DELAY_MS = 5000;

/** Never interrupt staff, payments, sign-in links or forms, or the app itself. */
const BLOCKED = [/^\/admin/, /checkout/, /\/pay(\/|$)/, /^\/app-login/, /^\/reset-password/, /^\/auth-success/, /^\/rsvp/, /^\/complete-profile/, /^\/kyc/, /^\/app(\/|$)/];

const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* blocked */ } },
};
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
};

function previewForced() {
  try {
    if (new URLSearchParams(window.location.search).get("pwa-preview") === "1") ss.set(PREVIEW_KEY, "1");
  } catch { /* ignore */ }
  return ss.get(PREVIEW_KEY) === "1";
}

/** flag.pwaPrompt from the public app content, once per session. Missing = off. */
async function promptSwitchOn() {
  const cached = ss.get(FLAG_KEY);
  if (cached !== null) return cached === "1";
  try {
    const res = await fetch(`${API}/app/content`);
    const data = res.ok ? await res.json() : {};
    const v = data?.["flag.pwaPrompt"];
    const on = v === true || v === "true";
    ss.set(FLAG_KEY, on ? "1" : "0");
    return on;
  } catch {
    return false; // not cached: asked again on the next page load
  }
}

export default function InstallAppPrompt() {
  const { pathname } = useLocation();
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const preview = useRef(previewForced());
  // A computer (?pwa-ua=desktop-… previews it on a phone; ?pwa-ua=ios-safari etc. the phone sheet on a computer).
  const [isDesktop] = useState(() => (isForcedPlatform() ? detectOS() === "desktop" : !isMobileDevice()));

  // Switch + "already installed" / snooze / once-per-session checks.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (isStandalone()) return;
      if (!preview.current) {
        if (markedInstalled()) return;
        if (Number(ls.get(SNOOZE_KEY) || 0) > Date.now()) return;
        if (ss.get(SEEN_KEY)) return;
        if (!(await promptSwitchOn())) return;
      }
      if (alive) setEligible(true);
    })();
    return () => { alive = false; };
  }, []);

  // 5 s of visible time this session, across page views; paused while the tab is hidden.
  useEffect(() => {
    if (!eligible || open) return undefined;
    if (BLOCKED.some((re) => re.test(pathname.toLowerCase()))) return undefined;
    const need = preview.current ? 1200 : DELAY_MS;
    let last = Date.now();
    const tick = setInterval(() => {
      const t = Date.now();
      const visible = document.visibilityState === "visible";
      const total = Number(ss.get(VISIBLE_KEY) || 0) + (visible ? Math.min(t - last, 1000) : 0);
      last = t;
      ss.set(VISIBLE_KEY, String(total));
      if (total >= need) {
        clearInterval(tick);
        ss.set(SEEN_KEY, "1");
        setOpen(true);
        track("pwa_prompt_shown", { page: pathname, layout: isDesktop ? "desktop-qr" : "phone" });
      }
    }, 250);
    return () => clearInterval(tick);
  }, [eligible, open, pathname, isDesktop]);

  useEffect(() => {
    if (!open || isDesktop) return undefined; // the desktop panel handles Escape itself
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      ls.set(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      track("pwa_prompt_dismissed", { reason: "not_now" });
      setOpen(false);
      setEligible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isDesktop]);

  if (!open) return null;

  const close = () => { setOpen(false); setEligible(false); };
  const notNow = () => {
    ls.set(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    track("pwa_prompt_dismissed", { reason: "not_now" });
    close();
  };
  const already = () => {
    markInstalled();
    track("pwa_prompt_dismissed", { reason: "already_installed" });
    close();
  };
  const showMe = () => {
    ss.set(SEEN_KEY, "1");
    window.location.assign("/app/?install=1&from=prompt");
  };

  if (isDesktop) {
    return (
      <Suspense fallback={null}>
        <PhoneAppPanel where="prompt" onDismiss={notNow}
          actions={[{ label: "Not now", onClick: notNow }, { label: "I already have the app", onClick: already }]} />
      </Suspense>
    );
  }

  const font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const link = { background: "none", border: 0, color: "rgba(255,255,255,0.82)", font: `600 15px/1.2 ${font}`, minHeight: 44, padding: "0 10px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
  const panel = { width: "100%", maxWidth: 520, padding: "22px 20px calc(18px + env(safe-area-inset-bottom))", borderRadius: "24px 24px 0 0", boxShadow: "0 -12px 40px rgba(0,0,0,0.45)" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: font }}>
      <style>{"@keyframes ttfcSheetIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion: reduce){.ttfc-sheet{animation:none!important}}.ttfc-sheet button:focus-visible{outline:2.5px solid #fff;outline-offset:2px}"}</style>
      <div onClick={notNow} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.55)" }} />
      <section
        className="ttfc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttfc-install-title"
        style={{
          position: "relative", boxSizing: "border-box", color: "#fff", animation: "ttfcSheetIn .28s ease-out",
          background: "radial-gradient(120% 90% at 100% 0%, rgba(139,82,224,0.45), transparent 60%), #160d34", ...panel,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <img src="/app/icons/icon-192.png" width="64" height="64" alt="TTFC app icon" style={{ borderRadius: 15, flex: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }} />
          <div>
            <h2 id="ttfc-install-title" style={{ margin: 0, font: `700 20px/1.25 ${font}` }}>Get the TTFC app</h2>
            <p style={{ margin: "4px 0 0", font: `400 16px/1.4 ${font}`, color: "rgba(219,206,255,0.85)" }}>
              Get the festival app: schedule, live polls, chat.
            </p>
          </div>
        </div>
        <p style={{ margin: "14px 0 18px", font: `400 15px/1.45 ${font}`, color: "rgba(219,206,255,0.78)" }}>
          Free, no app store needed. It takes about 30 seconds and we'll show you every tap.
        </p>
        <button
          type="button"
          onClick={showMe}
          autoFocus
          style={{ width: "100%", minHeight: 56, border: 0, borderRadius: 14, background: "#8B52E0", color: "#fff", font: `700 18px/1 ${font}`, cursor: "pointer" }}
        >
          Show me how
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          <button type="button" onClick={notNow} style={link}>Not now</button>
          <button type="button" onClick={already} style={link}>I've already installed it</button>
        </div>
      </section>
    </div>
  );
}
