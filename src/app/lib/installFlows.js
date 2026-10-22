import { desktopKind, inAppName, iosVersion, isChromium, safariVersion } from "../../lib/pwaPlatform.js";

/* =========================================================
   Step-by-step "install the app" instructions for every phone
   and browser, written for someone who has never installed a
   web app. Each step names a mockup (InstallMockups.jsx) that
   shows exactly where to tap. Opening a menu and choosing the
   item in it is one step, with the two taps numbered 1 and 2.
========================================================= */

export const APP_URL = "https://www.thetechfestival.com/app/?install=1";

const FIND_IOS = {
  id: "find", mock: "home-ios", title: "Find the TTFC app",
  lead: "Look for this icon on your Home Screen. Tap it to open the app.",
  hint: "It lands in the next free spot, often on your last Home Screen page (swipe left to get there). Or swipe down on the Home Screen and type TTFC in Search.",
  showIcon: true,
};
const FIND_ANDROID = {
  id: "find", mock: "home-android", title: "Find the TTFC app",
  lead: "Look for this icon on your Home screen. Tap it to open the app.",
  hint: "Not there? Swipe up to open the app drawer and search for TTFC.",
  showIcon: true,
};

const openAppPage = (onAppPage) => (onAppPage ? [] : [{
  id: "open", mock: "open", title: "Open the app page",
  lead: "First, open the TTFC app page in this browser.",
  hint: "The button below opens it. The guide carries on there.",
  action: "open-app-page",
}]);

/*
 * iPhone Safari's Share button moved twice (Oct 22 2026, Apple's iPhone User Guide for iOS 26 and 27):
 *  • iOS 18 and earlier: Share (a square with an arrow) in the toolbar, at the bottom (top on iPad).
 *  • iOS 26, Compact tabs (the default): ••• next to the address bar, then Share. Bottom / Top tabs: Share
 *    in the toolbar. The Share sheet may hide Add to Home Screen under View More. (Recorded in the iOS 26.5
 *    simulator: public/app/guide/ios26-*.)
 *  • iOS 27, Compact tabs: the ••• button became the Tabs button; Share is in the page menu, the ≡ button
 *    at the left end of the address bar (or touch and hold the address bar). Bottom / Top tabs: Share in the
 *    toolbar.
 * Safari 26+ says "OS 18_x" in its user agent; its Version/ token is the real iOS version (pwaPlatform.js).
 * The steps name each button by how it looks and say what to do if the layout differs, rather than
 * pointing at a fixed corner of the screen.
 */
const ADD_STEP = (iv) => ({
  id: "add", mock: "ios26-viewmore-add", clip: iv >= 26 && iv < 27 ? "ios26-add" : undefined, glyph: "plus",
  title: "Tap Add to Home Screen, then Add",
  lead: "In the Share sheet, tap Add to Home Screen, then Add. Not showing? Tap View More (a round button with a down arrow) or scroll down the list.",
  hint: "Leave Open as Web App switched on. Still not there? Tap Edit Actions at the bottom of the list. Or you may be in another app's browser: open this page in Safari.",
});

function iosSafariShare(iv) {
  if (iv >= 27) {
    return {
      id: "share", mock: "ios27-menu-share", glyph: "lines", title: "Tap ≡ then Share",
      lead: "Tap the ≡ button (three lines) at the left end of the address bar, then tap Share in the menu.",
      hint: "See a Share button (a square with an arrow) in the toolbar? Tap that instead. You can also touch and hold the address bar, then tap Share.",
    };
  }
  if (iv >= 26) {
    return {
      id: "share", mock: "ios26-more-share", clip: "ios26-share", glyph: "dots", title: "Tap ••• then Share",
      lead: "Tap the ••• button next to the address bar, then tap Share at the top of the menu.",
      hint: "See a Share button (a square with an arrow) in the toolbar? Tap that instead.",
    };
  }
  if (iv > 0) {
    return {
      id: "share", mock: "ios-share-add", glyph: "share", title: "Tap Share, then Add to Home Screen",
      lead: "Tap the Share button (a square with an arrow) in Safari's toolbar: at the bottom of the screen on iPhone, at the top on iPad. Scroll down, tap Add to Home Screen, then tap Add.",
      hint: "Don't see the toolbar? Tap the bottom of the screen. Add to Home Screen is below Copy and Add Bookmark, with a square and a + sign.",
      oneStep: true,
    };
  }
  // Version unknown: every layout in one step.
  return {
    id: "share", mock: "ios-share-add", glyph: "share", title: "Tap Share",
    lead: "Tap the Share button (a square with an arrow). No Share button? Tap ••• next to the address bar, or ≡ at the left end of it, then Share.",
    hint: "Don't see the toolbar? Tap the bottom of the screen.",
  };
}

/**
 * flowFor({ os, browser, canPrompt, onAppPage }) → { kind, title, steps[] }
 * step: { id, title, lead, hint?, mock, clip?, item?, action?, secondary?, showIcon?, glyph? }
 * As few steps as the browser allows: opening a menu and choosing the item
 * in it is one step, and so is the confirmation when it follows straight on.
 * `clip` is a short screen recording of the real thing (public/app/guide/).
 * `glyph` is the small picture beside the step in the short list (InstallNudges).
 * `iv` / `app` override the detected iOS version / in-app browser name (tests).
 */
export function flowFor({ os, browser, canPrompt, onAppPage = true, iv = iosVersion(), app = inAppName() }) {
  if (browser === "inapp") {
    const ios = os === "ios";
    const target = ios ? "Safari" : "Chrome";
    const where = app ? `${app}'s built-in browser` : "another app's built-in browser";
    return {
      kind: "inapp",
      title: `Open this page in ${target} first`,
      steps: [{
        id: "menu", mock: ios ? "inapp-ios-open" : "inapp-android-open", glyph: ios ? "dots" : "kebab",
        title: `Tap ${ios ? "•••" : "⋮"} then Open in ${target}`,
        lead: `You're in ${where}, which can't add apps to your Home ${ios ? "Screen" : "screen"}. Tap ${ios ? "•••" : "⋮"} (top or bottom right), then Open in ${target} or Open in browser.`,
        hint: `No such option? Copy the link and paste it into ${target}'s address bar. This guide carries on there.`,
        action: "copy-link",
      }],
    };
  }

  if (os === "ios") {
    if (browser === "safari") {
      const share = iosSafariShare(iv);
      return {
        kind: "ios-safari",
        title: "Add TTFC to your Home Screen",
        steps: [
          ...openAppPage(onAppPage),
          share,
          ...(share.oneStep ? [] : [ADD_STEP(iv)]),
          FIND_IOS,
        ],
      };
    }
    // Chrome and Edge on iOS 16.4+ can add web apps from their own Share menu; Safari always can.
    if ((browser === "chrome" || browser === "edge") && iv >= 16.4) {
      const name = browser === "chrome" ? "Chrome" : "Edge";
      return {
        kind: `ios-${browser}`,
        title: "Add TTFC to your Home Screen",
        steps: [
          ...openAppPage(onAppPage),
          {
            id: "share", mock: browser === "chrome" ? "ios-chrome-share-add" : "ios-edge-share-add", glyph: "share",
            title: "Tap Share, then Add to Home Screen",
            lead: (browser === "chrome" ? "In Chrome, tap the Share icon (a square with an arrow) in the address bar" : "In Edge's toolbar, tap the Share icon (a square with an arrow)") + ". Scroll down, tap Add to Home Screen, then tap Add.",
            hint: `In ${name}, Share may sit under the ••• menu instead. Not in the list? Open this page in Safari: copy the link and paste it into Safari's address bar.`,
            secondary: "copy-link",
          },
          FIND_IOS,
        ],
      };
    }
    return {
      kind: "ios-other",
      title: "Open this page in Safari first",
      steps: [{
        id: "safari", mock: "copy", glyph: "safari", title: "Open the app page in Safari",
        lead: "This browser can't add apps to your Home Screen. Safari can. Copy the link, then open it in Safari: this guide carries on there.",
        hint: "Open Safari (the blue compass icon), tap the address bar and paste the link.",
        action: "copy-link",
      }],
    };
  }

  if (os === "android") {
    if (canPrompt) {
      return {
        kind: "android-prompt",
        title: "Install the TTFC app",
        steps: [
          { id: "install", mock: "android-dialog", title: "Tap \"Install app\"", lead: "Tap the big button below, then tap Install in the box that pops up.", hint: "It's free and takes a few seconds. No app store needed.", action: "install-prompt" },
          FIND_ANDROID,
        ],
      };
    }
    if (browser === "chrome") {
      return {
        kind: "android-chrome",
        title: "Install the TTFC app",
        steps: [
          ...openAppPage(onAppPage),
          {
            id: "menu", mock: "android-dots-install", item: "Add to Home screen", clip: "android-menu", title: "Tap ⋮ then Add to Home screen",
            lead: "Tap ⋮ (three dots) at the top right, next to the address bar, then Add to Home screen. On some phones it says Install app.",
            hint: "Can't see the toolbar? Scroll up a little so it comes back.",
          },
          {
            id: "confirm", mock: "android-dialog", clip: "android-install", title: "Tap Install, then Install",
            lead: "Choose Install, then tap Install in the box that pops up. If your phone asks, tap Add to home screen.",
            hint: "It's free and takes a few seconds. No app store needed.",
          },
          FIND_ANDROID,
        ],
      };
    }
    if (browser === "firefox" || browser === "edge" || browser === "samsung") {
      const samsung = browser === "samsung", firefox = browser === "firefox";
      return {
        kind: `android-${browser}`,
        title: "Install the TTFC app",
        steps: [
          ...openAppPage(onAppPage),
          {
            id: "menu",
            mock: samsung ? "android-samsung-install" : firefox ? "android-dots-install" : "android-edge-install",
            item: firefox ? "Install" : undefined,
            title: samsung ? "Tap ≡ then Add page to" : firefox ? "Tap ⋮ then Install" : "Tap ••• then Install app",
            lead: samsung
              ? "Tap ≡ (three lines) at the bottom right, then Add page to, then Home screen (or Install app if you see it)."
              : firefox
                ? "Tap ⋮ (three dots, next to the address bar), then Install (or Add to Home screen) in the menu."
                : "Tap ••• at the bottom of the screen, then Install app (on some phones: Add to phone).",
            hint: "Can't see the toolbar? Scroll up a little so it comes back. Scroll the menu if you don't see the item.",
          },
          { id: "confirm", mock: "android-dialog", title: "Tap \"Install\"", lead: "Tap Install (or Add) in the box that pops up.", hint: "If your phone asks to add it to the Home screen, tap Add." },
          FIND_ANDROID,
        ],
      };
    }
    return {
      kind: "android-other",
      title: "Open this page in Chrome",
      steps: [{ id: "chrome", mock: "copy", title: "Open the app page in Chrome", lead: "This browser may not install apps. Chrome can. Copy the link, then open it in Chrome: this guide carries on there.", hint: "Open Chrome, tap the address bar and paste the link.", action: "copy-link" }],
    };
  }

  // Computers (installs land on /app/, so the app opens in its own window).
  const mac = desktopKind() === "mac";
  const FIND_DESKTOP = mac
    ? { id: "find", mock: "mac-dock", title: "Find the TTFC app", showIcon: true,
        lead: "Look for this icon in your Dock. Click it to open TTFC in its own window.",
        hint: "Not in the Dock? Open Launchpad or the Applications folder, or press Command + Space and type TTFC." }
    : { id: "find", mock: "win-start", title: "Find the TTFC app", showIcon: true,
        lead: "Open the Start menu and type TTFC. Click it to open the app in its own window.",
        hint: "To keep it handy, right-click TTFC in the Start menu and choose Pin to taskbar." };
  const edge = browser === "edge";
  if (canPrompt) {
    return {
      kind: "desktop-prompt",
      title: "Install the TTFC app",
      steps: [
        { id: "install", mock: "desktop-dialog", title: "Click \"Install app\"", lead: "Click Install app below, then Install in the box your browser shows.", hint: "On your phone instead? Scan the code below.", action: "install-prompt", qr: true },
        FIND_DESKTOP,
      ],
    };
  }
  if (isChromium()) {
    return {
      kind: edge ? "desktop-edge" : "desktop-chromium",
      title: "Install the TTFC app",
      steps: [
        edge
          ? { id: "menu", mock: "edge-menu", title: "Click ••• then Install this site as an app", lead: "Click ••• at the top right, then Apps, then Install this site as an app. Then click Install in the box that appears.", hint: "Or click the install icon (a box with a +) at the right of the address bar." }
          : { id: "menu", mock: "desktop-install-combo", title: "Click the install icon then Install", lead: "At the right of the address bar, click the install icon (a screen with a down arrow), then click Install in the box that appears.", hint: "Don't see the icon? Click ⋮ at the top right, then Cast, save and share, then Install page as app." },
        FIND_DESKTOP,
      ],
    };
  }
  if (browser === "safari" && mac && safariVersion() >= 17) {
    return {
      kind: "desktop-safari",
      title: "Add TTFC to your Dock",
      steps: [
        { id: "file", mock: "mac-file-menu", title: "Click File then Add to Dock", lead: "In the menu bar at the top of the screen, click File, then Add to Dock, then click Add.", hint: "Or click the Share button in Safari's toolbar, then Add to Dock. Keep the name TTFC." },
        FIND_DESKTOP,
      ],
    };
  }
  return {
    kind: "desktop-other",
    title: "Get the TTFC app on your phone",
    steps: [{ id: "phone", mock: "desktop", title: "Scan with your phone", lead: "Point your phone's camera at the code to open the app page, then follow the steps there.", hint: "This browser can't install apps. Chrome, Edge or Safari on a Mac can.", qr: true }],
  };
}
