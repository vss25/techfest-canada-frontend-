import { flowFor } from "./installFlows.js";
import { PLAY_STORE_URL } from "../../lib/appStores.js";

/* =========================================================
   /app/install, "crystal clear and simple" (batch 7, Oct 22 2026,
   the organiser: "the instructions need to be crystal clear and
   simple; there needs to be a more comprehensive video"). One
   decision at a time:
     1. the device (iPhone / Android / On a computer?), picked from
        the phone itself and changeable;
     2. in another app's browser (Instagram, LinkedIn, Gmail…):
        "Open this page in Safari / Chrome" first, with Copy link;
     3. at most 3 numbered steps, each with a picture of exactly
        what to tap (lib/installFlows.js: iOS 27 / 26 / older
        Safari, Chrome, Samsung Internet…);
     4. the 40-second screen recording, with its transcript;
     5. "Done? Open TTFC from your Home Screen and sign in";
     6. troubleshooting.
   The app invite and swag emails use the same step wording.
   Pure: node --test src/app/lib/installPage.test.mjs.
========================================================= */

export const INSTALL_URL = "https://www.thetechfestival.com/app/install";
/** The phone switch; "On a computer?" is a link under it (screens/Install.jsx). */
export const DEVICES = [
  { value: "iphone", label: "iPhone" },
  { value: "android", label: "Android" },
];
const KNOWN = ["iphone", "android", "computer"];

/** The device to start on: this phone's, or the computer view. `?device=` wins. */
export function defaultDevice(os, asked = "") {
  if (KNOWN.includes(asked)) return asked;
  return os === "ios" ? "iphone" : os === "android" ? "android" : "computer";
}

/**
 * The page for a device: { inapp: { target, app, steps… } | null, steps (≤ 3), kind }.
 * On the phone itself the real browser and iOS version decide; for the other device (or on a computer) the
 * usual browser: Safari on the latest iOS 26, Chrome on Android.
 */
export function pageFor(device, { os, browser, canPrompt, iv, app }) {
  const here = (device === "iphone" && os === "ios") || (device === "android" && os === "android");
  const phoneOs = device === "iphone" ? "ios" : "android";
  const usual = device === "iphone" ? "safari" : "chrome";
  let b = here ? browser : usual;
  let inapp = null;
  // Another app's browser (or a browser that can't install): open this page in Safari / Chrome first.
  const cant = here && (b === "inapp" || b === "other" || (device === "iphone" && b === "firefox"));
  if (cant) {
    const f = flowFor({ os: phoneOs, browser: b === "inapp" ? "inapp" : "other", canPrompt: false, iv: iv || 26, app: app || "" });
    inapp = {
      target: device === "iphone" ? "Safari" : "Chrome",
      app: b === "inapp" ? app || "" : "",
      title: `Open this page in ${device === "iphone" ? "Safari" : "Chrome"}`,
      lead: f.steps[0]?.lead || "",
      hint: f.steps[0]?.hint || "",
      mock: f.steps[0]?.mock || "copy",
    };
    b = usual;
  }
  const flow = flowFor({ os: phoneOs, browser: b, canPrompt: here && !cant ? !!canPrompt : false, onAppPage: true, iv: here && iv ? iv : 26, app: "" });
  const steps = flow.steps.filter((s) => s.id !== "find" && s.id !== "open").slice(0, 3);
  return { kind: flow.kind, inapp, steps };
}

/**
 * The screen recordings (public/app/guide/, recorded Oct 22 2026 on thetechfestival.com: an iPhone 17 simulator with
 * iOS 26.5 Safari, and a Pixel 8 emulator with Android 16 Chrome; captions and tap circles burned in, no sound).
 * `transcript`: what happens, in order, at the time it happens in the video.
 */
export const VIDEOS = {
  iphone: {
    src: "/app/guide/install-iphone.mp4", poster: "/app/guide/install-iphone.jpg", width: 450, height: 978, seconds: 40,
    label: "Screen recording: adding the TTFC app to an iPhone's Home Screen in Safari",
    transcript: [
      ["0:00", "Open thetechfestival.com/app/install in Safari."],
      ["0:04", "Tap ••• next to the address bar."],
      ["0:06", "Tap Share."],
      ["0:11", "Tap View More (the round button with a down arrow)."],
      ["0:16", "Tap Add to Home Screen."],
      ["0:22", "Leave Open as Web App on and tap Add."],
      ["0:26", "TTFC is on your Home Screen. Tap it."],
      ["0:32", "TTFC opens on the sign-in screen. Sign in with your email or pass ID."],
    ],
  },
  android: {
    src: "/app/guide/install-android.mp4", poster: "/app/guide/install-android.jpg", width: 450, height: 998, seconds: 35,
    label: "Screen recording: installing the TTFC app on Android in Chrome",
    transcript: [
      ["0:00", "Open thetechfestival.com/app/install in Chrome."],
      ["0:03", "Tap ⋮ (three dots) at the top right."],
      ["0:06", "Tap Add to Home screen (on some phones: Install app)."],
      ["0:10", "Tap Install."],
      ["0:13", "Tap Install again."],
      ["0:16", "If your phone asks, tap Add to home screen."],
      ["0:20", "TTFC is on your Home screen. Tap it."],
      ["0:25", "TTFC opens on the sign-in screen. Sign in with your email or pass ID."],
    ],
  },
};

/** "Done?": what to expect once the icon is there (same words on both phones). */
export function doneFor(device) {
  const home = device === "android" ? "Home screen" : "Home Screen";
  return {
    title: `Done? Open TTFC from your ${home} and sign in with your pass ID or email`,
    mock: device === "android" ? "home-android" : "home-ios",
    expect: [
      "TTFC opens full screen, without the browser's address bar, on the sign-in screen.",
      "Tap Email me a sign-in link and use the email on your pass: we email you a 6-digit code. Or tap Sign in with pass ID and type the last name and pass ID from your pass email.",
      `You stay signed in. Next time, just tap the TTFC icon on your ${home}.`,
    ],
    find: device === "android"
      ? "Can't see the icon? Swipe up to open all your apps and search for TTFC."
      : "Can't see the icon? It's often on your last Home Screen page. Or swipe down on the Home Screen and type TTFC.",
  };
}

/** Troubleshooting for the device: [question, answer, link?] (link: { href, label }). */
export function troubleFor(device) {
  if (device === "android") {
    return [
      ["“Install app” or “Add to Home screen”: which one?", "Either. Chrome shows Install app on most phones and Add to Home screen on some; both put TTFC on your Home screen. If it asks Install or Create shortcut, choose Install."],
      ["There's no Install app or Add to Home screen in the menu", "Scroll the ⋮ menu down a little. Still not there? You may be in another app's browser (Instagram, LinkedIn, Gmail…): copy the link and open it in Chrome. Updating Chrome from the Play Store helps too."],
      ["I'm in an Incognito tab", "Apps can't be installed from Incognito. Open a normal Chrome tab, go to thetechfestival.com/app/install and try again."],
      ["I already added it", "Look for the TTFC icon on your Home screens, or swipe up to see all apps and search for TTFC. Opening it there is all you need."],
      ["I'd rather use Google Play", "TTFC is on Google Play too. Sign in the same way, with your email or pass ID.", { href: PLAY_STORE_URL, label: "Get TTFC on Google Play" }],
    ];
  }
  return [
    ["There's no Add to Home Screen", "In the Share sheet, tap View More (a round button with a down arrow) or scroll down the list. Still missing? Tap Edit Actions at the bottom and add it. Make sure you're in Safari: in another app's browser (Instagram, LinkedIn, Gmail…), copy the link and open it in Safari."],
    ["I can't find the ••• or Share button", "On iOS 26, ••• is next to the address bar. On iOS 27, tap ≡ at the left end of the address bar, or touch and hold the address bar. On iOS 18 and earlier, Share (a square with an arrow) is in the toolbar at the bottom; tap the bottom of the screen if you can't see it."],
    ["I'm using Private Browsing", "Switch to a normal tab first: tap the tabs button, then swipe to your tab groups and pick one that isn't Private. Then open thetechfestival.com/app/install again."],
    ["It opens in Safari, not full screen", "When you add it, leave Open as Web App switched on. To fix it: touch and hold the TTFC icon, tap Remove App, then add it again from Safari."],
    ["I already added it", "Look on your last Home Screen page, or swipe down on the Home Screen and type TTFC. Opening it there is all you need."],
  ];
}
