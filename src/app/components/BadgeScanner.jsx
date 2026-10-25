import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { isDemoApi } from "../lib/api";
import { auth } from "../lib/auth";
import { demoConnectFromCode, demoKnows } from "../lib/demo";
import { scanPassWithSharing, scanWithSharing } from "../lib/myCard";
import { parseQR } from "../lib/qr";
import { scanAction, staffScanner } from "../lib/scanAction";
import { staffScan } from "../lib/staffScan";
import { Camera } from "lucide-react";
import { Sheet } from "./ui";

/* =========================================================
   Scan someone's TTFC code (iOS BadgeScannerView; "one QR for
   everything", Oct 24 2026): their entry QR, or an older
   networking QR from a screenshot. Attendees: "Share your contact
   details", then connected "met in person" on both sides
   (lib/scanAction.js). Staff and volunteers: "Check in …?" first
   (Check in · Share contact instead · Cancel); Check in calls
   POST /checkin/scan and shows its answer. Uses the camera
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
    const a = scanAction(raw, { demo: isDemoApi(), knows: demoKnows, staff: staffScanner(auth.get()) });
    if (a.type === "invalid" || a.type === "oldApp") { setError(a.error); return; }
    if (a.type === "session") { onClose(); navigate(`/session/${encodeURIComponent(a.id)}/live`); return; }
    if (a.type === "confirmPass" || a.type === "confirmConnect") { onClose(); staffScan(a, raw, { onConnected }); return; }
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
            <b className={error ? "scan-error" : undefined}>{busy ? "Connecting…" : error || "Point at someone's TTFC code or a session QR"}</b>
            <span>TTFC code → connect in person · Session → join the poll</span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
