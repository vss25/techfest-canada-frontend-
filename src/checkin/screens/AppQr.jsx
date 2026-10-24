import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { remember } from "../lib/device.js";
import { LOBBY_QR_URL, QR_COLLAPSED_KEY, QR_FULL_MS, qrCollapsed, qrPlacement, qrSize } from "../lib/appQr.js";

/* LOBBY: "Get the TTFC app" (lib/appQr.js). A QR code beside the lobby's list (an iPad, a laptop) or a small chip (a
   phone), never over the search, the results or the buttons, never taking the focus (the search keeps the keyboard).
   Tap the code: full screen for scanning; any tap or key closes it, and it closes by itself after 20 s. */

/** Keeps the search's focus (and the on-screen keyboard) when the card's own buttons are tapped. */
const keepFocus = (e) => e.preventDefault();

function Code({ size }) {
  return <QRCodeSVG value={LOBBY_QR_URL} size={size} level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#000000" title="QR code: get the TTFC app" />;
}

/** The window's size, following rotation and split view. */
function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

export default function AppQr({ searching = false }) {
  const { width, height } = useViewport();
  const place = qrPlacement(width);
  const [collapsed, setCollapsed] = useState(() => qrCollapsed(remember.get(QR_COLLAPSED_KEY, null), width));
  const [full, setFull] = useState(false);
  const setFold = (v) => { setCollapsed(v); remember.set(QR_COLLAPSED_KEY, v ? "1" : "0"); };
  // Beside the list it stays in view below the sticky header (whatever its height: a banner, the keyboard).
  const [top, setTop] = useState(12);
  useEffect(() => {
    if (place !== "side") return undefined;
    const h = document.querySelector(".ci-header");
    if (!h) return undefined;
    const on = () => setTop(Math.round(h.getBoundingClientRect().height) + 12);
    on();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(on) : null;
    ro?.observe(h);
    return () => ro?.disconnect();
  }, [place]);

  // Full screen: closes on any tap (the overlay), any key (the key still reaches the search) and after 20 s.
  useEffect(() => {
    if (!full) return undefined;
    const t = setTimeout(() => setFull(false), QR_FULL_MS);
    const key = () => setFull(false);
    document.addEventListener("keydown", key, true);
    return () => { clearTimeout(t); document.removeEventListener("keydown", key, true); };
  }, [full]);

  // A phone shows nothing while a search has results (they need the room); the chip is back once the search clears.
  if (place === "inline" && searching) return full ? <Full onClose={() => setFull(false)} /> : null;
  const size = qrSize(width, height);
  return (
    <>
      <aside className={`ci-appqr is-${place}${collapsed ? " is-collapsed" : ""}`} aria-label="Get the TTFC app" data-qr-value={LOBBY_QR_URL} style={place === "side" ? { top } : undefined}>
        {collapsed ? (
          <button type="button" className="ci-appqr-chip" onPointerDown={keepFocus} onClick={() => setFold(false)} aria-expanded="false">
            <QrGlyph /> App QR
          </button>
        ) : (
          <div className="ci-appqr-card">
            <button type="button" className="ci-appqr-code" onPointerDown={keepFocus} onClick={() => setFull(true)} aria-label="Show the app QR code full screen" style={{ width: size, height: size }}>
              <Code size={size} />
            </button>
            <p className="ci-appqr-title">Get the TTFC app</p>
            <p className="ci-appqr-sub">Scan with your phone camera</p>
            <p className="ci-appqr-stores">App Store · Google Play</p>
            <button type="button" className="ci-appqr-hide" onPointerDown={keepFocus} onClick={() => setFold(true)} aria-expanded="true">Hide</button>
          </div>
        )}
      </aside>
      {full && <Full onClose={() => setFull(false)} />}
    </>
  );
}

/** The code full screen, for scanning from further away: any tap closes it. */
function Full({ onClose }) {
  const size = typeof window === "undefined" ? 480 : Math.round(Math.max(200, Math.min(window.innerWidth * 0.82, (window.visualViewport?.height || window.innerHeight) * 0.66, 720)));
  return (
    <div className="ci-appqr-full" role="dialog" aria-label="Get the TTFC app: scan with your phone camera" onClick={onClose} onPointerDown={keepFocus}>
      <div className="ci-appqr-full-card">
        <Code size={size} />
        <p className="ci-appqr-full-title">Get the TTFC app</p>
        <p className="ci-appqr-full-sub">Scan with your phone camera · App Store · Google Play</p>
        <p className="ci-appqr-full-hint">Tap anywhere to close</p>
      </div>
    </div>
  );
}

function QrGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm9-2h2v2h-2zm2 2h2v2h-2zm2-2h3v2h-3zm-4 4h2v2h-2zm4 0h3v4h-2v-2h-1zm-4 2h2v2h-2z" />
    </svg>
  );
}
