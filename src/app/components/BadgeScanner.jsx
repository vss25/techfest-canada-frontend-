import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { isDemoApi } from "../lib/api";
import { demoConnectFromCode, demoKnows } from "../lib/demo";
import { scanWithSharing } from "../lib/myCard";
import { parseQR } from "../lib/qr";
import { Camera } from "lucide-react";
import { Sheet } from "./ui";

/* =========================================================
   Scan someone's connect QR (iOS BadgeScannerView): the scan
   connects you "met in person" on both sides straight away.
   Uses the camera scanner the admin check-in already uses
   (loaded only when someone opens it).
========================================================= */

export default function BadgeScanner({ onClose, onConnected }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  const handle = async (raw) => {
    if (busy || !raw) return;
    const p = parseQR(raw);
    if (!p) { setError("That's not a TTFC code."); return; }
    if (p.kind === "session") { onClose(); navigate(`/session/${encodeURIComponent(p.id)}/live`); return; }
    if (p.kind === "pass") { setError("That's a door pass. Ask for their connect QR (Profile › Connect QR)."); return; }
    // Demo mode keeps codes it can't look up (no user id, or someone outside the demo) on this device.
    const local = isDemoApi() && (!p.userId || !demoKnows(p.userId));
    if (p.kind === "connect" && !p.userId && !local) { setError(`${p.name} needs the latest TTFC app for in-person connect.`); return; }
    // Pick what to share ("Share your contact details"), then connect in person (lib/myCard.js).
    setBusy(true);
    onClose();
    if (await scanWithSharing({ userId: local ? "" : p.userId, name: p.name, connectLocal: local ? (share) => demoConnectFromCode(p, share) : null })) onConnected?.();
  };

  return (
    <Sheet open onClose={onClose} title="Scan" actions={{ left: <span />, right: <button type="button" className="link-btn sheet-cancel" onClick={onClose}>Cancel</button> }}>
      <div className="sheet-body stack">
        <div className="scan-view">
          {denied ? (
            <div className="scan-denied">
              <Camera aria-hidden="true" />
              <b>Camera access is off</b>
              <span>Allow the camera for this site in your browser's settings to scan badges.</span>
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
            <span>Badge → instant in-person connection · Pass → verify · Session → join the poll</span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
