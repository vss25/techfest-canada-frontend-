import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { isStandalone, markInstalled, markedInstalled } from "../lib/pwaPlatform";
import { track } from "../lib/pwaEvents";

/* =========================================================
   "Get the TTFC app" bottom sheet for phone visitors on the
   marketing site. Loaded only on phones (App.jsx), shown only
   when staff switch it on (App content › flag.pwaPrompt) or
   with ?pwa-preview=1. "Show me how" opens /app/?install=1,
   where the step-by-step guide takes over.
========================================================= */

const API = import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
const FLAG_KEY = "ttfc.pwa.promptFlag";
const PREVIEW_KEY = "ttfc.pwa.preview";
const SEEN_KEY = "ttfc.pwa.promptSeen";
const SNOOZE_KEY = "ttfc.pwa.snoozeUntil";
const SNOOZE_MS = 7 * 24 * 3600 * 1000;

/** Never interrupt staff, payments, sign-in links or forms. */
const BLOCKED = [/^\/admin/, /^\/admin-login/, /checkout/, /\/pay(\/|$)/, /^\/app-login/, /^\/reset-password/, /^\/auth-success/, /^\/rsvp/, /^\/complete-profile/, /^\/kyc/, /^\/app(\/|$)/];

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
    return false; // not cached: try again next page load
  }
}

export default function InstallAppPrompt() {
  const { pathname } = useLocation();
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const preview = useRef(previewForced());
  const start = useRef(0);
  const scrolled = useRef(false);

  // Switch + "already installed" / snooze checks, once.
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

  // After a short delay or the first scroll, once the cookie banner is answered.
  useEffect(() => {
    if (!eligible || open) return undefined;
    const blocked = BLOCKED.some((re) => re.test(pathname.toLowerCase()));
    if (blocked) return undefined;
    if (!start.current) start.current = Date.now();
    const onScroll = () => { if (window.scrollY > 160) scrolled.current = true; };
    window.addEventListener("scroll", onScroll, { passive: true });
    const tick = setInterval(() => {
      const waited = Date.now() - start.current;
      const ready = preview.current ? waited > 1200 : (waited > 9000 || (scrolled.current && waited > 2500));
      const consentAnswered = preview.current || ls.get("tfc_cookie_consent") !== null;
      if (ready && consentAnswered) {
        clearInterval(tick);
        ss.set(SEEN_KEY, "1");
        setOpen(true);
        track("pwa_prompt_shown", { page: pathname });
      }
    }, 700);
    return () => { clearInterval(tick); window.removeEventListener("scroll", onScroll); };
  }, [eligible, open, pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      ls.set(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      track("pwa_prompt_dismissed", { reason: "not_now" });
      setOpen(false);
      setEligible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const link = { background: "none", border: 0, color: "rgba(255,255,255,0.82)", font: `600 15px/1.2 ${font}`, minHeight: 44, padding: "0 10px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: font }}>
      <style>{"@keyframes ttfcSheetIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion: reduce){.ttfc-sheet{animation:none!important}}"}</style>
      <div onClick={notNow} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.55)" }} />
      <section
        className="ttfc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttfc-install-title"
        style={{
          position: "relative", width: "100%", maxWidth: 520, boxSizing: "border-box",
          padding: "22px 20px calc(18px + env(safe-area-inset-bottom))", borderRadius: "24px 24px 0 0",
          background: "radial-gradient(120% 90% at 100% 0%, rgba(139,82,224,0.45), transparent 60%), #160d34",
          color: "#fff", boxShadow: "0 -12px 40px rgba(0,0,0,0.45)", animation: "ttfcSheetIn .28s ease-out",
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
