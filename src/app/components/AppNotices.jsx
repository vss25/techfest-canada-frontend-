import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Copy, Download, RefreshCw, X, WifiOff } from "lucide-react";
import { useStore, local } from "../lib/store";
import { pwa, applyUpdate, dismissWelcome, promptInstall } from "../lib/pwa";
import { connectivity } from "../lib/online";
import { flowFor, APP_URL } from "../lib/installFlows";
import { showAlert } from "../lib/ui";
import { Button, IconButton, Sheet } from "./ui";
import StepGlyph from "./StepGlyph";

/* =========================================================
   App-wide notices: "New version available · Reload", the
   offline strip (checked, lib/online.js), the one-time install nudges (Chrome-style
   banner / a short illustrated step list on iPhone, or "Open this page in Safari first"
   inside another app's browser) and the first-launch welcome.
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

/** Chrome / Edge / Samsung: dismissible "Install app" banner. iPhone (any browser) and app browsers: a one-time sheet. */
export function InstallNudges() {
  const p = useStore(pwa);
  const { pathname } = useLocation();
  const [bannerHidden, setBannerHidden] = useState(() => local.get(BANNER_KEY) === "1");
  const sheetCase = p.os === "ios" || (p.os === "android" && p.browser === "inapp");
  const [sheetOpen, setSheetOpen] = useState(() => !p.standalone && !p.installed && sheetCase && local.get(IOS_SHEET_KEY) !== "1");
  const quiet = QUIET.some((re) => re.test(pathname));
  if (p.standalone || p.installed || quiet) return null;

  const closeSheet = () => { local.set(IOS_SHEET_KEY, "1"); setSheetOpen(false); };

  if (sheetCase) {
    // The same steps as the full guide (lib/installFlows.js), for this iOS version and browser.
    const flow = flowFor({ os: p.os, browser: p.browser, canPrompt: false, onAppPage: true });
    const steps = flow.steps.filter((x) => x.id !== "find");
    const elsewhere = flow.kind === "inapp" || flow.kind === "ios-other";
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(APP_URL);
        showAlert("Link copied", `Open ${p.os === "ios" ? "Safari" : "Chrome"}, tap the address bar and paste.`);
      } catch { window.prompt("Copy this link:", APP_URL); }
    };
    return (
      <Sheet open={sheetOpen} onClose={closeSheet} title={elsewhere ? flow.title : "Get the TTFC app"}>
        <div className="sheet-body stack" style={{ alignItems: "center" }}>
          <img src="/app/icons/icon-192.png" alt="" width="64" height="64" className="app-icon" />
          {elsewhere ? (
            <p className="center" style={{ margin: 0 }}>{steps[0]?.lead}</p>
          ) : (
            <>
              <p className="center" style={{ margin: 0 }}>Add TTFC to your Home Screen. It opens like an app, full screen, with your schedule ready offline.</p>
              <ol className="install-steps" aria-label="How to add TTFC to your Home Screen">
                {steps.map((x, i) => (
                  <li key={x.id}>
                    <span className="install-step-glyph"><StepGlyph name={x.glyph} /></span>
                    <span><b className="install-step-n">{i + 1}</b>{x.title}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {elsewhere
            ? <Button variant="primary" size="lg" block icon={Copy} onClick={copy}>Copy link</Button>
            : <Link to="/install?from=ios-sheet" className="btn btn-primary btn-lg btn-block" onClick={closeSheet}>Show me how</Link>}
          <Button block onClick={closeSheet}>Not now</Button>
        </div>
      </Sheet>
    );
  }

  if (!p.canPrompt || bannerHidden) return null;
  const hide = () => { local.set(BANNER_KEY, "1"); setBannerHidden(true); };
  return (
    <div className="pad" style={{ position: "fixed", left: 0, right: 0, bottom: "calc(var(--tab-space) + 8px)", zIndex: 26 }}>
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
