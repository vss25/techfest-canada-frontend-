import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, Copy, Download, ExternalLink, Gift, Monitor, PlayCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TopBar, Button, Segmented } from "../components/ui";
import InstallMockup from "../components/InstallMockups";
import { useStore } from "../lib/store";
import { pwa, promptInstall } from "../lib/pwa";
import { iosVersion, inAppName } from "../../lib/pwaPlatform";
import { DEVICES, INSTALL_URL, VIDEOS, defaultDevice, doneFor, pageFor, troubleFor } from "../lib/installPage";
import { refreshSwag, useSwag } from "../lib/swagState";
import { now } from "../lib/time";
import { showAlert } from "../lib/ui";
import { track } from "../../lib/pwaEvents";
import { SWAG_PAGE, SWAG_THUMB } from "../../lib/swag.js";

/* =========================================================
   /app/install: get the TTFC app on your phone (batch 7, Oct 22
   2026: "crystal clear and simple … a more comprehensive video").
   One page, one decision at a time (lib/installPage.js):
     - the device, picked from the phone (iPhone / Android / On a
       computer? with a QR code to this page on the phone);
     - in another app's browser: "Open this page in Safari/Chrome"
       with Copy link, before anything else;
     - at most 3 numbered steps with a picture of what to tap;
     - "Watch the 40-second video" (a real screen recording) with
       what happens in it written out;
     - "Done? Open TTFC from your Home Screen and sign in…";
     - troubleshooting.
   While the swag giveaway is open, a card under the title: "Download
   the app to win the TTFC swag kit" with "Only people using the TTFC
   app can win" (the organiser: "download the app, and then only you
   can get a chance to win this").
   Opens from the website's prompt (/app/?install=1), the emails
   (…/app/install?utm_…#r=<token>: main.jsx reports the visit),
   Profile › Install app and the in-app banners. On a computer it's
   shown too (main.jsx), starting on "On a computer?".
   ?device=iphone|android|computer picks the device; ?find=1 jumps
   to "Done?".
========================================================= */

export default function Install() {
  const p = useStore(pwa);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const device = defaultDevice(p.os, params.get("device") || "");
  const page = useMemo(() => pageFor(device, { os: p.os, browser: p.browser, canPrompt: p.canPrompt, iv: iosVersion(), app: inAppName() }),
    [device, p.os, p.browser, p.canPrompt]);
  const [installing, setInstalling] = useState(false);
  const opened = useRef(false);
  const doneRef = useRef(null);
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
    track("pwa_guide_open", { from: params.get("from") || params.get("utm_campaign") || "app", flow: page.kind, device });
    refreshSwag();
  }, [params, page.kind, device]);

  // "Can't find the app?" links (?find=1): straight to the last part.
  useEffect(() => {
    if (params.get("find") === "1") doneRef.current?.scrollIntoView({ block: "start" });
  }, [params]);

  const pick = (v) => {
    const next = new URLSearchParams(params);
    next.set("device", v);
    next.delete("find");
    setParams(next, { replace: true });
    track("pwa_guide_step", { step: `device-${v}`, flow: page.kind });
  };

  const install = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      doneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      showAlert("Installing the TTFC app", "It'll be on your Home screen in a moment.");
    } else if (outcome === "unavailable") {
      showAlert("Use your browser's menu", "Tap ⋮ and choose Install app or Add to Home screen.");
    }
  };

  const copy = async () => {
    track("pwa_guide_step", { step: "copy-link", flow: page.kind });
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
      showAlert("Link copied", `Open ${device === "iphone" ? "Safari" : "Chrome"}, tap the address bar, paste and go.`);
    } catch {
      window.prompt("Copy this link:", INSTALL_URL);
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

  const done = doneFor(device);
  const video = VIDEOS[device];
  return (
    <div className="page page--bare">
      <TopBar title="Get the TTFC app" />
      <main id="main" className="pad install">
        <header className="install-hero">
          <img src="/app/icons/icon-192.png" alt="" width="64" height="64" className="app-icon" />
          <div>
            <h1>Get the TTFC app</h1>
            <p>Free, about a minute, no app store needed. Your pass, the schedule, live polls and chat on your phone.</p>
          </div>
        </header>

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

        <section aria-labelledby="device-h" className="install-device">
          <h2 id="device-h" className="install-q">Which phone do you have?</h2>
          <Segmented capsule label="Your phone" value={device} onChange={pick} options={DEVICES} />
          {device !== "computer" && (
            <button type="button" className="link-btn install-computer-link" onClick={() => pick("computer")}>
              <Monitor aria-hidden="true" />On a computer? Get a code to scan with your phone
            </button>
          )}
        </section>

        {device === "computer" ? <ComputerPanel onPick={pick} /> : (
          <>
            {page.inapp && (
              <section className="install-first" aria-labelledby="first-h">
                <span className="install-first-tag">First</span>
                <h2 id="first-h">{page.inapp.title}</h2>
                <p className="install-lead">{page.inapp.lead}</p>
                <InstallMockup name={page.inapp.mock} />
                <Button variant="primary" size="lg" block icon={Copy} onClick={copy}>Copy link</Button>
                <p className="install-hint">Then open {page.inapp.target}, tap the address bar, paste and go. The steps below carry on there.</p>
              </section>
            )}

            <section aria-labelledby="steps-h">
              <h2 id="steps-h" className="install-q">{page.inapp ? `Then, in ${page.inapp.target}:` : device === "iphone" ? "In Safari, do this:" : "In Chrome, do this:"}</h2>
              <ol className="install-list">
                {page.steps.map((s, i) => (
                  <li key={s.id} className="install-step">
                    <div className="install-step-head">
                      <span className="install-num" aria-hidden="true">{i + 1}</span>
                      <h3><span className="sr-only">Step {i + 1}: </span>{s.title}</h3>
                    </div>
                    <p className="install-lead">{s.lead}</p>
                    <InstallMockup name={s.mock} item={s.item} />
                    {s.action === "install-prompt" && (
                      <Button variant="primary" size="lg" block icon={Download} loading={installing} onClick={install}>Install app</Button>
                    )}
                    {s.hint && <p className="install-hint">{s.hint}</p>}
                  </li>
                ))}
              </ol>
            </section>

            {video && <VideoCard video={video} device={device} />}

            <section ref={doneRef} className="install-done" aria-labelledby="done-h">
              <span className="install-done-ico" aria-hidden="true"><Check /></span>
              <h2 id="done-h">{done.title}</h2>
              <InstallMockup name={done.mock} />
              <ul className="install-expect">
                {done.expect.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <p className="install-hint">{done.find}</p>
            </section>

            <Troubleshooting device={device} />
          </>
        )}

      </main>
    </div>
  );
}

/** "Watch the 40-second video" (35 on Android): tap to play (muted, inline), with what happens in it written out underneath. */
function VideoCard({ video, device }) {
  const started = useRef(false);
  return (
    <section className="install-video" aria-labelledby="video-h">
      <h2 id="video-h" className="install-q"><PlayCircle aria-hidden="true" />Watch the {video.seconds}-second video</h2>
      <div className="install-video-frame">
        <video key={video.src} src={video.src} poster={video.poster} width={video.width} height={video.height} controls muted playsInline
          preload="none" aria-label={video.label} disablePictureInPicture
          onPlay={() => { if (!started.current) { started.current = true; track("pwa_guide_step", { step: `video-${device}`, flow: "video" }); } }} />
      </div>
      <h3 className="install-transcript-h">What happens in the video</h3>
      <ol className="install-transcript">
        {video.transcript.map(([t, line]) => <li key={t}><span className="figure">{t}</span><span>{line}</span></li>)}
      </ol>
    </section>
  );
}

/** On a computer: the QR code to this page on the phone, or read the steps for a phone. */
function ComputerPanel({ onPick }) {
  const url = `${INSTALL_URL}?source=desktop-qr`;
  return (
    <section className="install-computer" aria-labelledby="computer-h">
      <h2 id="computer-h">The TTFC app is for your phone</h2>
      <p className="install-lead">Point your phone's camera at the code. This page opens there, with the steps for your phone.</p>
      <div className="pass-qr"><QRCodeSVG value={url} size={196} level="M" title="QR code that opens this page on your phone" /></div>
      <p className="install-hint center">Or type <b>thetechfestival.com/app/install</b> into your phone's browser.</p>
      <div className="install-computer-btns">
        <Button size="lg" onClick={() => onPick("iphone")}>See the iPhone steps</Button>
        <Button size="lg" onClick={() => onPick("android")}>See the Android steps</Button>
      </div>
    </section>
  );
}

function Troubleshooting({ device }) {
  return (
    <section aria-labelledby="trouble-h" className="install-trouble">
      <h2 id="trouble-h" className="install-q">Something not working?</h2>
      {troubleFor(device).map(([q, a, link]) => (
        <details key={q} className="install-faq">
          <summary>{q}<ChevronDown aria-hidden="true" /></summary>
          <p>{a}</p>
          {link && <a className="install-faq-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink aria-hidden="true" /></a>}
        </details>
      ))}
    </section>
  );
}
