import { useEffect, useState } from "react";
import { TopBar } from "../components/ui";
import StoreBadges from "../../components/StoreBadges";
import { detectOS } from "../../lib/pwaPlatform";
import { RATE_TEXT, rateTarget, storeParam } from "../../lib/rate";

/* =========================================================
   /app/rate: "Rate the app" in the web app (Oct 27 2026), the same
   as the website's /rate: a phone goes straight to its store's
   review page (app/index.html does it before the app loads; this is
   the fallback), ?store=ios|android picks one, anything else shows
   both store badges and neutral words. Open to everyone, signed out
   too. src/lib/rate.js.
========================================================= */

export default function Rate() {
  const [target] = useState(() => rateTarget(detectOS(), storeParam(window.location.search)));
  useEffect(() => { if (target) window.location.replace(target); }, [target]);
  return (
    <div className="page">
      <TopBar title="Rate the TTFC app" />
      <main id="main" className="pad stack" style={{ paddingTop: 24, textAlign: "center", alignItems: "center" }}>
        <img src="/app/icons/icon-192.png" alt="" width="72" height="72" className="app-icon" style={{ margin: "0 auto" }} />
        {target ? (
          <>
            <p className="muted" role="status" style={{ margin: 0 }}>Opening the store…</p>
            <a href={target} className="btn btn-primary">Open the store</a>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>{RATE_TEXT}</p>
            <StoreBadges where="app_rate" os="desktop" />
          </>
        )}
      </main>
    </div>
  );
}
