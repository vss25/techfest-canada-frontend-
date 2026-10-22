import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, RefreshCw, Share, X, WifiOff } from "lucide-react";
import { useStore, local } from "../lib/store";
import { pwa, applyUpdate, dismissWelcome, promptInstall } from "../lib/pwa";
import { connectivity } from "../lib/online";
import { Button, IconButton, Sheet } from "./ui";

/* =========================================================
   App-wide notices: "New version available · Reload", the
   offline strip (checked, lib/online.js), the one-time install nudges (Chrome-style
   banner / iPhone Safari sheet) and the first-launch welcome.
   Install nudges never show inside the installed app.
========================================================= */

const IOS_SHEET_KEY = "ttfc.pwa.iosSheetShown";
const BANNER_KEY = "ttfc.pwa.bannerDismissed";
const QUIET = [/^\/install/, /^\/chat\//, /^\/group\//, /^\/session\/[^/]+\/live/];

export function UpdatePrompt() {
  const { updateReady } = useStore(pwa);
  if (!updateReady) return null;
  return (
    <div className="toast-wrap" style={{ zIndex: 80 }}>
      <div className="toast" role="alert">
        <RefreshCw aria-hidden="true" style={{ width: 20, height: 20, color: "var(--pur-alt)", flex: "none" }} />
        <div style={{ flex: 1 }}><b>New version available</b><p>Reload to get the latest TTFC app.</p></div>
        <Button variant="primary" size="sm" onClick={applyUpdate}>Reload</Button>
      </div>
    </div>
  );
}

/** Only once a real request has failed (lib/online.js), never on navigator.onLine alone. */
export function OfflineBar() {
  const { offline } = useStore(connectivity);
  if (!offline) return null;
  return (
    <div className="offline-bar" role="status" style={{ paddingTop: "calc(6px + var(--safe-top))" }}>
      <WifiOff aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: "-2px", marginRight: 6 }} />
      You're offline. The schedule still works; chats and the feed will catch up when you're back.
    </div>
  );
}

/** Chrome / Edge / Samsung: dismissible "Install app" banner. iPhone Safari: a one-time sheet. */
export function InstallNudges() {
  const p = useStore(pwa);
  const { pathname } = useLocation();
  const [bannerHidden, setBannerHidden] = useState(() => local.get(BANNER_KEY) === "1");
  const [iosOpen, setIosOpen] = useState(() => !p.standalone && !p.installed && p.os === "ios" && p.browser === "safari" && local.get(IOS_SHEET_KEY) !== "1");
  const quiet = QUIET.some((re) => re.test(pathname));
  if (p.standalone || p.installed || quiet) return null;

  const closeIos = () => { local.set(IOS_SHEET_KEY, "1"); setIosOpen(false); };

  if (p.os === "ios" && p.browser === "safari") {
    return (
      <Sheet open={iosOpen} onClose={closeIos} title="Get the TTFC app">
        <div className="sheet-body stack" style={{ textAlign: "center", alignItems: "center" }}>
          <img src="/app/icons/icon-192.png" alt="" width="72" height="72" className="app-icon" />
          <p style={{ fontSize: 18, margin: 0 }}>
            Add TTFC to your Home Screen: tap <Share aria-label="Share" style={{ width: 18, height: 18, verticalAlign: "-3px", color: "#0a84ff" }} /> Share, then <b>Add to Home Screen</b>.
          </p>
          <p className="muted small" style={{ margin: 0 }}>It opens like an app, full screen, with your schedule ready offline.</p>
          <Link to="/install?from=ios-sheet" className="btn btn-primary btn-lg btn-block" onClick={closeIos}>Show me how</Link>
          <Button block onClick={closeIos}>Not now</Button>
        </div>
      </Sheet>
    );
  }

  if (!p.canPrompt || bannerHidden) return null;
  const hide = () => { local.set(BANNER_KEY, "1"); setBannerHidden(true); };
  return (
    <div className="pad" style={{ position: "fixed", left: 0, right: 0, bottom: "calc(var(--tab-space) + 10px)", zIndex: 26 }}>
      <div className="banner column" role="region" aria-label="Install the app" style={{ maxWidth: 608 }}>
        <img src="/app/icons/icon-96.png" alt="" width="40" height="40" className="app-icon" />
        <div style={{ flex: 1, minWidth: 0 }}><b>Install the TTFC app</b><p>Full screen, quick to open, schedule offline.</p></div>
        <button type="button" className="btn" onClick={() => promptInstall()}><Download aria-hidden="true" />Install</button>
        <IconButton icon={X} label="Dismiss" small onClick={hide} />
      </div>
    </div>
  );
}

/** First launch from the Home Screen. */
export function WelcomeCard() {
  const { welcome, os } = useStore(pwa);
  if (!welcome) return null;
  return (
    <div className="welcome-card" role="status">
      <img src="/app/icons/icon-96.png" alt="" width="48" height="48" className="app-icon" />
      <div style={{ flex: 1 }}>
        <b>You're in the TTFC app.</b>
        <div className="small muted">Next time, open it from the TTFC icon on your Home {os === "android" ? "screen" : "Screen"}.</div>
      </div>
      <Button size="sm" variant="primary" onClick={dismissWelcome}>Got it</Button>
    </div>
  );
}
