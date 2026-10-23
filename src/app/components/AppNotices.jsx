import { RefreshCw, WifiOff } from "lucide-react";
import { useStore } from "../lib/store";
import { pwa, applyUpdate, dismissWelcome } from "../lib/pwa";
import { connectivity } from "../lib/online";
import { Button } from "./ui";

/* =========================================================
   App-wide notices: "New version available · Reload", the
   offline strip (checked, lib/online.js) and the first-launch
   welcome. The web app's install nudges (the Chrome-style
   "Install" banner and the iPhone "Add to Home Screen" sheet)
   are gone since Oct 22 2026 (the organiser: "Stop prompting
   people to install the web app any longer"): Home's "The TTFC
   app is here" card (GetAppCard) points to the App Store and
   Google Play instead.
========================================================= */

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
