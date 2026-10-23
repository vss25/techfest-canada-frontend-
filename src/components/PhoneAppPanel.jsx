import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import StoreBadges from "./StoreBadges";
import { phoneAppUrl } from "../lib/appStores";

/* =========================================================
   "Get the TTFC app on your phone" for computers: the App Store
   and Google Play badges, and a QR code to /app/install on the
   phone, which puts that phone's own store first (Oct 22 2026:
   the store apps, never the web app's Home Screen install).
   Shown by the 5-second prompt (InstallAppPrompt), the menu's
   "Get the TTFC app" card on a computer (Navbar) and the
   homepage's "Get the TTFC app" section (GetAppSection).
   `actions` = [{ label, onClick }] under the panel; Escape and
   the backdrop call onDismiss.
========================================================= */

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function PhoneAppPanel({ onDismiss, actions = [], where = "prompt" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const link = { background: "none", border: 0, color: "rgba(255,255,255,0.82)", font: `600 15px/1.2 ${FONT}`, minHeight: 44, padding: "0 10px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <style>{"@keyframes ttfcSheetIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion: reduce){.ttfc-sheet{animation:none!important}}.ttfc-sheet button:focus-visible,.ttfc-sheet a:focus-visible{outline:2.5px solid #fff;outline-offset:2px}"}</style>
      <div onClick={onDismiss} aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.55)" }} />
      <section
        className="ttfc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttfc-phone-title"
        style={{
          position: "relative", boxSizing: "border-box", color: "#fff", animation: "ttfcSheetIn .28s ease-out", textAlign: "center",
          width: "min(420px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)", overflowY: "auto", padding: "26px 24px 16px", borderRadius: 22,
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)", background: "radial-gradient(120% 90% at 100% 0%, rgba(139,82,224,0.45), transparent 60%), #160d34",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
          <img src="/app/icons/icon-192.png" width="48" height="48" alt="" style={{ borderRadius: 12, flex: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }} />
          <h2 id="ttfc-phone-title" style={{ margin: 0, font: `700 20px/1.25 ${FONT}`, textAlign: "left" }}>Get the TTFC app on your phone</h2>
        </div>
        <p style={{ margin: "10px 0 0", font: `400 15px/1.45 ${FONT}`, color: "rgba(219,206,255,0.82)" }}>Free on the App Store and Google Play. Your pass, the schedule, live polls and chat.</p>
        <div style={{ background: "#fff", borderRadius: 16, padding: 14, margin: "16px auto 8px", width: "fit-content" }}>
          <QRCodeSVG value={phoneAppUrl()} size={176} level="M" title="QR code that opens the TTFC app's App Store and Google Play links on your phone" />
        </div>
        <p style={{ margin: "0 0 16px", font: `600 15px/1.4 ${FONT}` }}>Scan with your phone's camera to get the app</p>
        <StoreBadges where={where} />
        <div style={{ display: "flex", justifyContent: actions.length > 1 ? "space-between" : "center", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {actions.map((a, i) => <button key={a.label} type="button" onClick={a.onClick} autoFocus={i === 0} style={link}>{a.label}</button>)}
        </div>
      </section>
    </div>
  );
}
