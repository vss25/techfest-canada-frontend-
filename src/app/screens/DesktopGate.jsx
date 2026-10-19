import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Ticket } from "lucide-react";
import StoreBadges from "../../components/StoreBadges";
import { phoneAppUrl } from "../../lib/appStores";
import { isStandalone } from "../../lib/pwaPlatform";
import { track } from "../../lib/pwaEvents";

/* =========================================================
   /app on a computer (lib/desktopGate.js decides): the app is
   made for phones, so this page hands over to the phone. A QR
   code to the same screen on the phone (/app/session/x stays
   /app/session/x), the store badges, and the way back to the
   website and to the passes. In the app's launch-screen look.
========================================================= */

let tracked = false;

export default function DesktopGate() {
  const path = window.location.pathname;
  // /app/?install=1 (the website's "Get the TTFC app" links) opens the install guide on the phone too.
  const install = new URLSearchParams(window.location.search).get("install") === "1";
  const installed = isStandalone();
  // Inside an installed desktop app window, the website opens in the browser.
  const out = installed ? { target: "_blank", rel: "noopener noreferrer" } : {};

  useEffect(() => {
    const el = document.getElementById("boot-splash");
    if (el) { el.classList.add("is-done"); setTimeout(() => el.remove(), 300); }
    if (!tracked) { tracked = true; track("pwa_desktop_gate", { path: path.slice(0, 120) }); }
  }, [path]);

  return (
    <div className="desk-gate">
      <div className="auth-backdrop" aria-hidden="true" />
      <main id="main" className="desk-gate-inner">
        <section className="desk-gate-text">
          <img src="/app/brand/logo.webp" alt="The Tech Festival Canada" className="desk-gate-logo" width="870" height="429" decoding="async" />
          <h1>TTFC is made for your phone</h1>
          <p className="desk-gate-lead">Your pass, the schedule, live polls and chat go with you around the festival. Open the app on your phone or tablet.</p>
          <StoreBadges where="desktop_gate" style={{ justifyContent: "flex-start" }} />
          <nav className="desk-gate-links" aria-label="The website">
            <a href="/" {...out} onClick={() => track("pwa_desktop_gate_link", { to: "website" })}><ArrowLeft aria-hidden="true" />Back to thetechfestival.com</a>
            <a href="/tickets" {...out} onClick={() => track("pwa_desktop_gate_link", { to: "tickets" })}><Ticket aria-hidden="true" />Get your pass</a>
          </nav>
        </section>
        <section className="desk-gate-qr" aria-label="Open the app on your phone">
          <div className="desk-gate-code">
            <QRCodeSVG value={phoneAppUrl(path, { install })} size={208} level="M" title="QR code that opens this page of the TTFC app on your phone" />
          </div>
          <p>Scan with your phone's camera</p>
        </section>
      </main>
    </div>
  );
}
