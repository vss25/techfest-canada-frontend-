import { desktopKind, iosVersion, isChromium, safariVersion } from "../../lib/pwaPlatform";

/* =========================================================
   Step-by-step "install the app" instructions for every phone
   and browser, written for someone who has never installed a
   web app. Each step names a mockup (InstallMockups.jsx) that
   shows exactly where to tap.
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

const openAppPage = (onAppPage) => ({
  id: "open", mock: "open", title: "Open the app page", done: onAppPage,
  lead: onAppPage ? "You're on the app page. That's the right place." : "First, open the TTFC app page in this browser.",
  hint: onAppPage ? "Keep this page open for the next steps." : "The button below opens it. The guide carries on there.",
  action: onAppPage ? null : "open-app-page",
});

/**
 * flowFor({ os, browser, canPrompt, onAppPage }) → { kind, title, steps[] }
 * step: { id, title, lead, hint?, mock, action?, done?, showIcon? }
 */
export function flowFor({ os, browser, canPrompt, onAppPage = true }) {
  const iv = iosVersion();

  if (browser === "inapp") {
    const ios = os === "ios";
    return {
      kind: "inapp",
      title: "Open this page in " + (ios ? "Safari" : "Chrome"),
      steps: [
        {
          id: "menu", mock: ios ? "inapp-ios" : "inapp-android", title: `Tap the ${ios ? "•••" : "⋮"} menu`,
          lead: "You're in another app's built-in browser, which can't install apps.",
          hint: `Look for ${ios ? "•••" : "⋮"} (three dots), usually at the top right or bottom right of the screen, and tap it.`,
        },
        {
          id: "browser", mock: ios ? "inapp-ios-menu" : "inapp-android-menu", title: `Tap "Open in ${ios ? "Safari" : "browser"}"`,
          lead: `Choose Open in ${ios ? "Safari" : "Chrome"} (it may say Open in browser or Open in system browser).`,
          hint: `No menu? Copy the link below, then open ${ios ? "Safari" : "Chrome"} and paste it into the address bar.`,
          action: "copy-link",
        },
        {
          id: "continue", mock: "open", title: "Carry on in the browser",
          lead: "The page opens with this guide, ready for the next step.", hint: "It only takes about 30 seconds from there.",
        },
      ],
    };
  }

  if (os === "ios") {
    if (browser === "safari") {
      return {
        kind: "ios-safari",
        title: "Add TTFC to your Home Screen",
        steps: [
          openAppPage(onAppPage),
          {
            id: "share", mock: iv >= 26 ? "ios26-more" : "ios-share", title: "Tap the Share button",
            lead: iv >= 26
              ? "At the bottom right of the screen, tap the ••• button, then tap Share at the top of the menu."
              : "At the bottom of the screen, tap the Share button: a square with an arrow pointing up.",
            hint: iv >= 26
              ? "Already see a Share button (a square with an arrow pointing up)? Tap that instead."
              : "Don't see it? Tap the bottom of the screen to show the toolbar. If you see ••• instead, tap it, then Share.",
          },
          iv >= 26 ? {
            id: "add", mock: "ios26-sheet", title: "Tap \"Add to Home Screen\"",
            lead: "Tap View More (the round button with a down arrow), then tap Add to Home Screen. It has a square with a + sign.",
            hint: "Already see Add to Home Screen in the list? Tap it straight away.",
          } : {
            id: "add", mock: "ios-sheet", title: "Tap \"Add to Home Screen\"",
            lead: "Scroll down the list and tap Add to Home Screen. It has a square with a + sign.",
            hint: "It's below Copy and Add Bookmark. Keep scrolling if you don't see it.",
          },
          {
            id: "confirm", mock: "ios-add", title: "Tap \"Add\"",
            lead: "If you see Open as Web App, leave it switched on. Then tap Add at the top right.",
            hint: "The name says TTFC. You can keep it as it is.",
          },
          FIND_IOS,
        ],
      };
    }
    if ((browser === "chrome" || browser === "edge") && iv >= 16.4) {
      const name = browser === "chrome" ? "Chrome" : "Edge";
      return {
        kind: `ios-${browser}`,
        title: "Add TTFC to your Home Screen",
        steps: [
          openAppPage(onAppPage),
          {
            id: "share", mock: browser === "chrome" ? "ios-chrome-share" : "ios-edge-share", title: "Tap the Share button",
            lead: browser === "chrome" ? "In the address bar at the top, tap the Share icon (a square with an arrow pointing up)." : "Tap the Share icon (a square with an arrow pointing up) in Edge's toolbar.",
            hint: `In ${name}, it may sit under the ••• menu instead. Tap ••• and then Share.`,
          },
          {
            id: "add", mock: "ios-sheet", title: "Tap \"Add to Home Screen\"",
            lead: "Scroll down the list and tap Add to Home Screen. It has a square with a + sign.",
            hint: "Keep scrolling if you don't see it straight away.",
          },
          { id: "confirm", mock: "ios-add", title: "Tap \"Add\"", lead: "Tap Add at the top right.", hint: "The name says TTFC. You can keep it as it is." },
          FIND_IOS,
        ],
      };
    }
    return {
      kind: "ios-other",
      title: "Open this page in Safari",
      steps: [
        {
          id: "safari", mock: "copy", title: "Open the app page in Safari",
          lead: "This browser can't add apps to your Home Screen. Safari can.",
          hint: "Copy the link, open Safari (the blue compass icon), tap the address bar and paste it.",
          action: "copy-link",
        },
        { id: "continue", mock: "open", title: "Carry on in Safari", lead: "The page opens with this guide, ready for the next step.", hint: "It only takes about 30 seconds from there." },
      ],
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
    if (browser === "firefox") {
      return {
        kind: "android-firefox",
        title: "Install the TTFC app",
        steps: [
          openAppPage(onAppPage),
          { id: "menu", mock: "android-menu-dots", title: "Tap the ⋮ menu", lead: "Tap ⋮ (three dots), at the top right or bottom right of the screen.", hint: "It's next to the address bar." },
          { id: "add", mock: "android-menu-install", title: "Tap \"Install\"", lead: "In the menu, tap Install (or Add to Home screen).", hint: "Scroll the menu if you don't see it." },
          { id: "confirm", mock: "android-dialog", title: "Tap \"Add\" or \"Install\"", lead: "Confirm in the box that pops up.", hint: "Your phone may ask to add it automatically. Say yes." },
          FIND_ANDROID,
        ],
      };
    }
    if (browser === "chrome" || browser === "edge" || browser === "samsung") {
      const samsung = browser === "samsung";
      return {
        kind: `android-${browser}`,
        title: "Install the TTFC app",
        steps: [
          openAppPage(onAppPage),
          {
            id: "menu", mock: samsung ? "android-menu-samsung" : "android-menu-dots",
            title: samsung ? "Tap the ≡ menu" : browser === "edge" ? "Tap the ••• menu" : "Tap the ⋮ menu",
            lead: samsung ? "Tap ≡ (three lines) at the bottom right of the screen." : browser === "edge" ? "Tap ••• at the bottom of the screen." : "Tap ⋮ (three dots) at the top right, next to the address bar.",
            hint: "Can't see it? Scroll up a little so the toolbar comes back.",
          },
          {
            id: "add", mock: "android-menu-install", title: "Tap \"Install app\"",
            lead: samsung ? "Tap Add page to, then Home screen (or Install app if you see it)." : "Tap Install app. On some phones it says Add to Home screen.",
            hint: "Scroll the menu if you don't see it.",
          },
          { id: "confirm", mock: "android-dialog", title: "Tap \"Install\"", lead: "Tap Install (or Add) in the box that pops up.", hint: "If your phone asks to add it to the Home screen, tap Add." },
          FIND_ANDROID,
        ],
      };
    }
    return {
      kind: "android-other",
      title: "Open this page in Chrome",
      steps: [
        { id: "chrome", mock: "copy", title: "Open the app page in Chrome", lead: "This browser may not install apps. Chrome can.", hint: "Copy the link, open Chrome, tap the address bar and paste it.", action: "copy-link" },
        { id: "continue", mock: "open", title: "Carry on in Chrome", lead: "The page opens with this guide, ready for the next step.", hint: "" },
      ],
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
          ? { id: "menu", mock: "edge-menu", title: "Open Edge's ••• menu", lead: "Click ••• at the top right, then Apps, then Install this site as an app.", hint: "Or click the install icon (a box with a +) at the right of the address bar." }
          : { id: "menu", mock: "desktop", title: "Click the install icon", lead: "At the right of the address bar, click the install icon (a screen with a down arrow).", hint: "Don't see it? Click ⋮ at the top right, then Cast, save and share, then Install page as app." },
        { id: "confirm", mock: "desktop-dialog", title: "Click \"Install\"", lead: "Click Install in the box that appears.", hint: "TTFC opens in its own window straight away." },
        FIND_DESKTOP,
      ],
    };
  }
  if (browser === "safari" && mac && safariVersion() >= 17) {
    return {
      kind: "desktop-safari",
      title: "Add TTFC to your Dock",
      steps: [
        { id: "file", mock: "mac-file-menu", title: "File › Add to Dock", lead: "In the menu bar at the top of the screen, click File, then Add to Dock.", hint: "Or click the Share button in Safari's toolbar, then Add to Dock." },
        { id: "confirm", mock: "mac-add-dock", title: "Click \"Add\"", lead: "Keep the name TTFC and click Add.", hint: "TTFC opens in its own window, separate from Safari." },
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
