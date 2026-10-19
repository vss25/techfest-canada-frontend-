import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

const API = "https://techfest-canada-backend.onrender.com/api";

export default function CheckIn() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [lastScanned, setLastScanned] = useState("");

  // ================= HANDLE SCAN =================
  const handleScan = async (data) => {
    if (!data) return;

    const ticketId = data[0]?.rawValue || data;

    // prevent duplicate rapid scans
    if (ticketId === lastScanned) return;
    setLastScanned(ticketId);

    try {
      setStatus("checking");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/checkin/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketId }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Check-in failed");

      setResult(json);
      setStatus("success");
    } catch (err) {
      setResult({ error: err.message });
      setStatus("error");
    }
  };

  // ================= RENDER =================
  return (
    <div className="admin-card">
      <h2>QR Check-In Scanner</h2>

      <div className="scanner-wrapper">
        <Scanner
          onScan={handleScan}
          onError={(err) => console.error(err)}
          constraints={{ facingMode: "environment" }}
        />
      </div>

      {/* ================= STATUS PANEL ================= */}
      <div className="checkin-result">
        {status === "idle" && (
          <p className="muted">Scan a ticket QR code</p>
        )}

        {status === "checking" && (
          <p className="muted">Checking ticket…</p>
        )}

        {status === "success" && result && (
          <div className="checkin-success">
            <h3>✅ Check-in Successful</h3>
            <p><strong>Name:</strong> {result.name}</p>
            <p><strong>Ticket:</strong> {result.ticketId}</p>
            {/* One of the four passes; "Speaker" is the person's type (Oct 19 2026). */}
            <p><strong>Pass:</strong> {result.passName || result.ticketType || result.type}{result.speaker ? " · Speaker" : ""}</p>
          </div>
        )}

        {status === "error" && (
          <div className="checkin-error">
            <h3>❌ Invalid Ticket</h3>
            <p>{result?.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
