import { useState } from "react";
import { get } from "../lib/api";
import { showAlert } from "../lib/ui";
import { desktopKind, detectBrowser, detectOS, isStandalone, safariVersion } from "../../lib/pwaPlatform";

/* =========================================================
   "Add to Apple Wallet" (iOS AddToWalletButton). Safari can't
   take a Bearer fetch into the Wallet sheet, so the button asks
   the backend for the signed pass link (GET /api/wallet/link/:id,
   the same link the ticket email carries) and then opens it:
   Safari sees a .pkpass and shows Apple's own "Add" sheet.
   Shown only where that works: iPhone and iPad (Safari, the
   installed app, Chrome / Edge / Firefox, which all hand passes
   to Wallet) and Safari on a Mac. Never on Android or desktop
   Chrome, or inside other apps' browsers.
========================================================= */

/** This browser hands a .pkpass to Apple Wallet. `?pwa-ua=ios-safari` forces it for QA. */
function canAddToAppleWallet() {
  const os = detectOS();
  const browser = detectBrowser();
  if (os === "ios") return isStandalone() || ["safari", "chrome", "edge", "firefox"].includes(browser);
  if (os === "desktop") return desktopKind() === "mac" && browser === "safari" && safariVersion() > 0;
  return false;
}

/** The badge's own artwork, drawn inline: black, grey hairline, the Wallet icon, "Add to / Apple Wallet". */
function Badge() {
  return (
    <svg viewBox="0 0 220 68" width="220" height="68" aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="218.5" height="66.5" rx="11" fill="#000" stroke="#a6a6a6" strokeWidth="1.5" />
      <g transform="translate(18 15)">
        <rect width="38" height="38" rx="8.5" fill="#1c1c1e" />
        <rect x="5" y="6" width="28" height="14" rx="3" fill="#3a9ae6" />
        <rect x="5" y="10" width="28" height="14" rx="3" fill="#f7b731" />
        <rect x="5" y="14" width="28" height="14" rx="3" fill="#4cbb5e" />
        <rect x="5" y="18" width="28" height="14" rx="3" fill="#ef5b45" />
        <path d="M5 23h9.5c1.3 0 2.2.7 2.8 1.7.6 1 1.4 1.6 2.7 1.6s2.1-.6 2.7-1.6c.6-1 1.5-1.7 2.8-1.7H33v6.5c0 1.7-1.3 3-3 3H8c-1.7 0-3-1.3-3-3V23z" fill="#d9d4cc" />
      </g>
      <text x="68" y="30" fill="#fff" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" fontSize="14" fontWeight="400">Add to</text>
      <text x="67" y="52" fill="#fff" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" fontSize="23" fontWeight="500" letterSpacing="-0.3">Apple Wallet</text>
    </svg>
  );
}

/** The "Add to Apple Wallet" badge for a ticket; renders nothing where Apple Wallet isn't available. */
export default function AppleWalletButton({ ticketId, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [available] = useState(canAddToAppleWallet);
  if (!available || !ticketId) return null;

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await get(`wallet/link/${encodeURIComponent(ticketId)}`);
      if (!url) throw new Error("We couldn't get your pass. Please try again.");
      window.location.href = url;   // Safari opens the .pkpass in Apple's add sheet
    } catch (e) {
      if (e?.status === 503) showAlert("Apple Wallet isn't ready yet", "Apple Wallet passes aren't available just yet. Your pass QR works at the door today.");
      else showAlert("Couldn't add to Apple Wallet", e?.message || "Please try again in a moment.");
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };

  return (
    <button type="button" className={`apple-wallet pressable ${className}`.trim()} onClick={add} disabled={busy}
      aria-label="Add to Apple Wallet" aria-busy={busy || undefined}>
      <Badge />
    </button>
  );
}
