import { useState } from "react";
import { X } from "lucide-react";
import StoreBadges from "../../components/StoreBadges";
import { storeNames } from "../../lib/appStores";
import { detectOS } from "../../lib/pwaPlatform";
import { track } from "../../lib/pwaEvents";
import { IconButton } from "./ui";

/* =========================================================
   "The TTFC app is here" at the top of Home (Oct 22 2026, the
   organiser: "Make sure to push this app notification on the web
   app home page … Prompt the users to download Android/iOS"): the
   App Store and Google Play badges, this phone's own store first
   (StoreBadges). A card on the page, nothing is sent to anyone.
   × hides it on this device for 7 days (localStorage; a blocked
   storage just shows it again next time). Nothing when neither
   store link is set (lib/appStores.js).
========================================================= */

const KEY = "ttfc.getApp.hiddenUntil";
const HIDE_MS = 7 * 24 * 3600 * 1000;

function hiddenNow() {
  try { return Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { return false; }
}

export default function GetAppCard() {
  const [hidden, setHidden] = useState(hiddenNow);
  const names = storeNames(undefined, detectOS());
  if (hidden || !names) return null;
  const hide = () => {
    try { localStorage.setItem(KEY, String(Date.now() + HIDE_MS)); } catch { /* storage blocked: hidden for this visit only */ }
    track("pwa_store_card_dismiss", { where: "home" });
    setHidden(true);
  };
  return (
    <section className="get-app-card" aria-labelledby="get-app-h">
      <div className="get-app-head">
        <img src="/app/icons/icon-96.png" alt="" width="48" height="48" className="app-icon" />
        <div>
          <b id="get-app-h">The TTFC app is here</b>
          <p>Download it on {names} for the best experience.</p>
        </div>
      </div>
      <StoreBadges where="home_card" size="sm" align="start" />
      <IconButton icon={X} label="Hide for a week" small className="get-app-x" onClick={hide} />
    </section>
  );
}
