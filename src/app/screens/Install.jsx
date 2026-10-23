import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Gift } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TopBar } from "../components/ui";
import StoreBadges from "../../components/StoreBadges";
import { useStore } from "../lib/store";
import { pwa } from "../lib/pwa";
import { getAppPage } from "../lib/installPage";
import { refreshSwag, useSwag } from "../lib/swagState";
import { now } from "../lib/time";
import { track } from "../../lib/pwaEvents";
import { SWAG_PAGE, SWAG_THUMB } from "../../lib/swag.js";

/* =========================================================
   /app/install: "Get the TTFC app" (Oct 22 2026, the organiser:
   "Prompt the users to download Android/iOS. Stop prompting people
   to install the web app any longer. However, let the web app be
   active."). lib/installPage.js has the words:
     - the App Store and Google Play badges, this phone's own store
       first and bigger (they open the store app, also from another
       app's browser);
     - on a computer, both badges and a QR code to this page on the
       phone;
     - while the swag giveaway is open, "Download the app to win the
       TTFC swag kit";
     - "Already using TTFC in your browser? You can keep using it
       here" (the web app keeps working at /app).
   No Home Screen steps or videos any more. Opened from the emails
   (…/app/install?utm_…#r=<token>: main.jsx reports the visit), the
   website's "Get the TTFC app" links (/app/?install=1), the sign-in
   screen, Profile › Get the TTFC app and the notification settings.
   On a computer it's shown too (DesktopPages).
========================================================= */

export default function Install() {
  const p = useStore(pwa);
  const [params] = useSearchParams();
  const page = getAppPage({ os: p.os, standalone: p.standalone });
  const opened = useRef(false);
  const swag = useSwag(now().getTime());

  // The launch screen goes as soon as this page is up (it's often the first page someone opens, from an email).
  useEffect(() => {
    const el = document.getElementById("boot-splash");
    if (el && !el.classList.contains("is-done")) {
      el.classList.add("is-done");
      setTimeout(() => { el.remove(); document.documentElement.classList.remove("dark-ground"); }, 300);
    }
  }, []);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("pwa_guide_open", { from: params.get("from") || params.get("utm_campaign") || "app", flow: "stores", device: page.phone ? p.os : "computer" });
    refreshSwag();
  }, [params, page.phone, p.os]);

  return (
    <div className="page page--bare">
      <TopBar title="Get the TTFC app" />
      <main id="main" className="pad install">
        <header className="install-hero">
          <img src="/app/icons/icon-192.png" alt="" width="64" height="64" className="app-icon" />
          <div>
            <h1>Get the TTFC app</h1>
            <p>{page.lead}</p>
          </div>
        </header>

        <section className="install-stores" aria-label="Download the TTFC app">
          <StoreBadges where="install_page" size="lg" />
          {page.search && <p className="install-hint center">{page.search}</p>}
          {page.qr && (
            <div className="install-stores-qr">
              <div className="pass-qr"><QRCodeSVG value={page.qr} size={196} level="M" title="QR code that opens this page on your phone" /></div>
              <p className="install-lead center"><b>On a computer?</b> Scan the code with your phone's camera to get the app there.</p>
              <p className="install-hint center">Or type <b>thetechfestival.com/app/install</b> into your phone's browser.</p>
            </div>
          )}
        </section>

        {swag.stage === "open" && (
          <a className="install-swag pressable" href={SWAG_PAGE} target="_blank" rel="noopener">
            <img src={SWAG_THUMB} alt="" width="600" height="508" decoding="async" />
            <span>
              <b>Download the app to win the TTFC swag kit</b>
              <span><strong>{swag.pitch}.</strong> The top {swag.kits} on the leaderboard at {swag.cutoffShort} win; winners are told at the end of Day 1.</span>
            </span>
            <Gift aria-hidden="true" />
          </a>
        )}

        {page.keep.link ? (
          <Link to="/" className="install-keep pressable" onClick={() => track("pwa_guide_step", { step: "keep-web-app", flow: "stores" })}>
            <span>{page.keep.text}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : <p className="install-hint center">{page.keep.text}</p>}
      </main>
    </div>
  );
}
