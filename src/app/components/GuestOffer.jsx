import { useEffect, useRef, useState } from "react";
import { Check, Copy, Tag } from "lucide-react";
import { track } from "../../lib/pwaEvents";
import { session } from "../lib/store";
import { deadlineLabels, offerUrl, useGuestOffer } from "../lib/offer";
import { parts, twoDigits } from "../lib/time";
import { Sheet } from "./ui";

/* =========================================================
   The guest ticket offer: a one-time pop-up per session and
   a slim banner on Home and Schedule. The countdown is the
   real deadline; there's no scarcity or viewer count.
========================================================= */

const MODAL_KEY = "ttfc.offer.modalShown";
const BANNER_KEY = "ttfc.offer.bannerShown";

function openOffer(code, where) {
  track("offer_click", { where, code });
  window.open(offerUrl(code), "_blank", "noopener");
}

function Countdown({ left, big }) {
  const p = parts(Math.max(0, left));
  const units = [[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  return (
    <div className={big ? "offer-count offer-count--big" : "offer-count"} role="timer"
      aria-label={`${p.d} days, ${p.h} hours, ${p.m} minutes left`}>
      {units.map(([v, l]) => <span key={l} className="unit" aria-hidden="true"><b>{twoDigits(v)}</b><small>{l}</small></span>)}
    </div>
  );
}

export function OfferModal() {
  const { show, cfg, now, left } = useGuestOffer();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  // Once per session, about 2 s after the first screen (and not over another sheet).
  useEffect(() => {
    if (!show || session.get(MODAL_KEY)) return undefined;
    let tries = 0;
    const attempt = () => {
      if (document.querySelector(".sheet") && tries++ < 10) { timer.current = setTimeout(attempt, 2000); return; }
      session.set(MODAL_KEY, "1");
      setOpen(true);
      track("offer_shown", { where: "modal", code: cfg.code });
    };
    timer.current = setTimeout(attempt, 2000);
    return () => clearTimeout(timer.current);
  }, [show, cfg.code]);

  if (!open || !show) return null;
  const d = deadlineLabels(cfg.ends, now);
  const close = () => { track("offer_dismissed", { where: "modal", code: cfg.code }); setOpen(false); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(cfg.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the code is on screen to type */ }
  };
  return (
    <Sheet open onClose={close} labelledBy="offer-h">
      <div className="sheet-body offer">
        <span className="offer-eyebrow"><Tag aria-hidden="true" />Guest offer</span>
        <h2 id="offer-h">{cfg.discount}% off your pass, {d.lastDay ? "until tonight" : `until ${d.weekday}`}</h2>
        <p className="offer-sub">On {cfg.passes} passes. Ends {d.lastDay ? "tonight" : d.date} at {d.time} Toronto time.</p>
        <Countdown left={left} big />
        <div className="offer-code">
          <span><small>Code</small><b>{cfg.code}</b></span>
          <button type="button" className="offer-copy pressable" onClick={copy} aria-label={copied ? "Code copied" : `Copy the code ${cfg.code}`}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block pressable" onClick={() => { openOffer(cfg.code, "modal"); setOpen(false); }} autoFocus>
          Get {cfg.discount}% off
        </button>
        <button type="button" className="offer-later" onClick={close}>Maybe later</button>
      </div>
    </Sheet>
  );
}

export function OfferBanner({ wrap }) {
  const { show, cfg, now, left } = useGuestOffer();
  useEffect(() => {
    if (!show || session.get(BANNER_KEY)) return;
    session.set(BANNER_KEY, "1");
    track("offer_shown", { where: "banner", code: cfg.code });
  }, [show, cfg.code]);
  if (!show) return null;
  const d = deadlineLabels(cfg.ends, now);
  const p = parts(Math.max(0, left));
  const clock = `${p.d > 0 ? `${p.d}d ` : ""}${twoDigits(p.h)}:${twoDigits(p.m)}:${twoDigits(p.s)}`;
  const bar = (
    <button type="button" className={d.lastDay ? "offer-bar offer-bar--last pressable" : "offer-bar pressable"} onClick={() => openOffer(cfg.code, "banner")}>
      <Tag aria-hidden="true" className="offer-bar-ico" />
      <span className="offer-bar-text">
        {d.lastDay ? <b>Last day: {cfg.discount}% off ends tonight at {d.time}</b> : <b>{cfg.discount}% off passes with {cfg.code}</b>}
        <span className="figure" aria-label={`${p.d} days ${p.h} hours ${p.m} minutes left`}>{clock} left</span>
      </span>
      <span className="offer-bar-cta">Get {cfg.discount}% off</span>
    </button>
  );
  return wrap ? <div className={wrap}>{bar}</div> : bar;
}
