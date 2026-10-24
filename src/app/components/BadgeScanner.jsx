import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { isDemoApi } from "../lib/api";
import { demoConnectFromCode, demoKnows } from "../lib/demo";
import { scanPassWithSharing, scanWithSharing } from "../lib/myCard";
import { parseQR } from "../lib/qr";
import { scanAction } from "../lib/scanAction";
import { Camera } from "lucide-react";
import { Sheet } from "./ui";

/* =========================================================
   Scan someone's connect QR or ENTRY QR (iOS BadgeScannerView;
   "one QR for everything", Oct 24 2026): either connects you
   "met in person" on both sides straight away, after "Share your
   contact details" (lib/scanAction.js). The web app has no staff
   check-in from a scan, so everyone connects. Uses the camera
   scanner the admin check-in already uses (loaded only when
   someone opens it).
========================================================= */

export default function BadgeScanner({ onClose, onConnected }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  const handle = async (raw) => {
    if (busy || !raw) return;
    const a = scanAction(raw, { demo: isDemoApi(), knows: demoKnows });
    if (a.type === "invalid" || a.type === "oldApp") { setError(a.error); return; }
    if (a.type === "session") { onClose(); navigate(`/session/${encodeURIComponent(a.id)}/live`); return; }
    // Pick what to share ("Share your contact details"), then connect in person (lib/myCard.js).
    setBusy(true);
    onClose();
    if (a.type === "pass") {
      if (await scanPassWithSharing(a.ticketId)) onConnected?.();
      return;
    }
    if (await scanWithSharing({ userId: a.userId, name: a.name, connectLocal: a.local ? (share) => demoConnectFromCode(parseQR(raw), share) : null })) onConnected?.();
  };

  return (
    <Sheet open onClose={onClose} title="Scan" actions={{ left: <span />, right: <button type="button" className="link-btn sheet-cancel" onClick={onClose}>Cancel</button> }}>
      <div className="sheet-body stack">
        <div className="scan-view">
          {denied ? (
            <div className="scan-denied">
              <Camera aria-hidden="true" />
              <b>Camera access is off</b>
              <span>Allow the camera for this site in your browser's settings to scan QR codes.</span>
            </div>
          ) : (
            <Scanner
              onScan={(codes) => handle(codes?.[0]?.rawValue)}
              onError={() => setDenied(true)}
              formats={["qr_code"]}
              components={{ finder: true }}
              styles={{ container: { width: "100%", height: "100%" } }}
            />
          )}
          <div className="scan-caption" role={error ? "alert" : undefined}>
            <b className={error ? "scan-error" : undefined}>{busy ? "Connecting…" : error || "Point at a TTFC badge, pass or session QR"}</b>
            <span>Connect QR or pass → connect in person · Session → join the poll</span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
