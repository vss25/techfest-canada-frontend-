import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { isDemoApi } from "../lib/api";
import { demoConnectFromCode, demoKnows } from "../lib/demo";
import { scanWithSharing } from "../lib/myCard";
import { parseQR } from "../lib/qr";
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

  const handle = async (raw) => {
    if (busy || !raw) return;
    const p = parseQR(raw);
    if (!p) { setError("That isn't a TTFC code. Try their connect QR in the TTFC app."); return; }
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
    <Sheet open onClose={onClose} title="Scan a badge">
      <div className="sheet-body stack">
        <div style={{ borderRadius: 18, overflow: "hidden", background: "#000", aspectRatio: "1" }}>
          <Scanner
            onScan={(codes) => handle(codes?.[0]?.rawValue)}
            onError={() => setError("Allow camera access to scan, or ask them to share their code.")}
            formats={["qr_code"]}
            components={{ finder: true }}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        </div>
        {busy && <p className="center small" role="status" style={{ margin: 0 }}>Connecting…</p>}
        {error && <p className="error-text center" role="alert" style={{ margin: 0 }}>{error}</p>}
        <p className="muted small center" style={{ margin: 0 }}>Point your camera at their connect QR. You're connected as "met in person" and you both get each other's card.</p>
      </div>
    </Sheet>
  );
}
