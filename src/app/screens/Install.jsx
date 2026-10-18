import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Copy, Download, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TopBar, Button } from "../components/ui";
import InstallMockup, { GuideClip } from "../components/InstallMockups";
import { useStore } from "../lib/store";
import { pwa, promptInstall } from "../lib/pwa";
import { flowFor, APP_URL } from "../lib/installFlows";
import { showAlert } from "../lib/ui";
import { track } from "../../lib/pwaEvents";

/* =========================================================
   The install guide: big numbered steps with a picture of
   exactly where to tap, for every phone and browser. Opens from
   the website's prompt (/app/?install=1), Profile › Install app
   and the in-app banners. The last step shows how to find the
   app afterwards ("Can't find the app?" jumps straight there).
========================================================= */

export default function Install() {
  const p = useStore(pwa);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const flow = useMemo(() => flowFor({ os: p.os, browser: p.browser, canPrompt: p.canPrompt, onAppPage: true }), [p.os, p.browser, p.canPrompt]);
  const firstOpen = flow.steps.findIndex((s) => !s.done);
  const startAtFind = params.get("find") === "1";
  const [index, setIndex] = useState(() => {
    if (startAtFind) return Math.max(0, flow.steps.findIndex((s) => s.id === "find"));
    return Math.max(0, firstOpen);
  });
  const [installing, setInstalling] = useState(false);
  const opened = useRef(false);
  const step = flow.steps[Math.min(index, flow.steps.length - 1)];

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("pwa_guide_open", { from: params.get("from") || "app", flow: flow.kind });
  }, [params, flow.kind]);

  useEffect(() => {
    track("pwa_guide_step", { step: index + 1, flow: flow.kind });
  }, [index, flow.kind]);

  const go = (i) => {
    setIndex(Math.max(0, Math.min(flow.steps.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const findIndex = flow.steps.findIndex((s) => s.id === "find");

  const install = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      if (findIndex >= 0) go(findIndex);
      showAlert("Installing the TTFC app", "It'll be on your Home screen in a moment.");
    } else if (outcome === "unavailable") {
      showAlert("Use your browser's menu", "Tap ⋮ (or ≡) and choose Install app or Add to Home screen.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      showAlert("Link copied", "Open your browser, tap the address bar and paste.");
    } catch {
      window.prompt("Copy this link:", APP_URL);
    }
  };

  if (p.standalone) {
    return (
      <div className="page page--bare">
        <TopBar title="The TTFC app" />
        <div className="pad stack-lg mt-16 guide">
          <div className="row"><img src="/app/icons/icon-192.png" alt="" width="64" height="64" className="app-icon" /><h2>You're in the TTFC app</h2></div>
          <p className="lead">Next time, open it from the TTFC icon on your Home Screen.</p>
          <InstallMockup name={p.os === "android" ? "home-android" : "home-ios"} />
          <p className="hint">{p.os === "android" ? "Not on your Home screen? Swipe up for all apps and search for TTFC." : "Can't see it? Swipe down on the Home Screen and type TTFC in Search."}</p>
          <Button variant="primary" size="lg" block onClick={() => navigate("/")}>Go to the app</Button>
        </div>
      </div>
    );
  }

  const last = index === flow.steps.length - 1;
  return (
    <div className="page page--bare">
      <TopBar title={flow.title} />
      <main id="main" className="pad mt-16 guide" aria-live="polite">
        {flow.steps.length > 1 && (
          <>
            <div className="guide-progress" aria-hidden="true">
              {flow.steps.map((s, i) => <i key={s.id} className={i <= index ? "on" : ""} />)}
            </div>
            <div className="guide-step-label">Step {index + 1} of {flow.steps.length}</div>
          </>
        )}
        <h2>{step.title}</h2>
        {step.showIcon && (
          <div className="row" style={{ justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <img src="/app/icons/icon-192.png" alt="The TTFC app icon" width="96" height="96" className="app-icon" />
            <span className="bold">TTFC</span>
          </div>
        )}
        <p className="lead">{step.lead}</p>
        {step.clip ? <GuideClip name={step.clip} label={`Screen recording: ${step.title}`} /> : <InstallMockup name={step.mock} item={step.item} />}
        {step.hint && <p className="hint">{step.hint}</p>}

        {step.action === "install-prompt" && (
          <Button variant="primary" size="lg" block icon={Download} loading={installing} onClick={install}>Install app</Button>
        )}
        {step.action === "copy-link" && (
          <Button variant="primary" size="lg" block icon={Copy} onClick={copy}>Copy link</Button>
        )}
        {step.qr && (
          <div className="card center stack" style={{ alignItems: "center" }}>
            <div className="pass-qr"><QRCodeSVG value={APP_URL} size={168} level="M" /></div>
            <span className="small muted">Scan with your phone's camera</span>
          </div>
        )}

        <div className="guide-nav">
          {index > 0 && <Button size="lg" onClick={() => go(index - 1)}>Back</Button>}
          {!last && (
            <Button variant={step.action ? undefined : "primary"} size="lg" icon={Check} onClick={() => go(index + 1)}>
              {step.done ? "Next" : "Done, next step"}
            </Button>
          )}
          {last && <Button variant="primary" size="lg" onClick={() => navigate("/")}>Finish</Button>}
        </div>

        {findIndex >= 0 && index !== findIndex && (
          <button type="button" className="link-btn" onClick={() => go(findIndex)} style={{ alignSelf: "center" }}>
            <Search aria-hidden="true" style={{ width: 15, height: 15, verticalAlign: "-2px", marginRight: 4 }} />
            Already installed? Can't find the app?
          </button>
        )}
      </main>
    </div>
  );
}
