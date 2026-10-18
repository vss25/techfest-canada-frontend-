import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { connectInPerson, social } from "../lib/social";
import { parseQR } from "../lib/qr";
import { showAlert } from "../lib/ui";
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
    if (p.kind === "connect" && !p.userId) { setError(`${p.name} needs the latest TTFC app for in-person connect.`); return; }
    setBusy(true);
    const conn = await connectInPerson(p.userId);
    setBusy(false);
    if (conn) {
      onClose();
      showAlert("Connected in person", `${conn.user?.name || p.name} is now in your network, on both your phones.`);
      onConnected?.();
    } else {
      setError(social.get().lastError || "Couldn't connect. Check your connection and try again.");
    }
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
