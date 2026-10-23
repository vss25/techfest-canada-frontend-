import { useCallback, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ADMIN_API, adminFetch } from "../admin/api";
import { avatarSrc, cardFrom, checkinTime, initialsOf } from "../lib/checkinCard";

/* Door check-in (Admin › Event day › Check-in). Every scan (camera or a typed ticket ID) goes to
   POST /api/checkin/scan and its answer replaces the card at once: the pass's colour band (VIP gold, Media dark
   blue, Speaker red, Staff purple, Volunteer orange, any other pass green; the server picks it), the person's photo
   (initials on the band's colour while it loads or when there's none), name, title · company, the pass, the meals
   it includes and whether they were checked in now or before (amber). Helpers in src/lib/checkinCard.js. */

const ORIGIN = ADMIN_API.replace(/\/api\/?$/, "");

export default function CheckIn() {
  const [card, setCard] = useState(null);          // the last scan's card; the next scan replaces it
  const [checking, setChecking] = useState("");    // the ticket ID being checked
  const [typed, setTyped] = useState("");
  const lastScanned = useRef("");
  const latest = useRef(0);

  // ================= CHECK IN =================
  const checkIn = useCallback(async (raw, { camera = true } = {}) => {
    const ticketId = String(raw || "").trim();
    if (!ticketId) return null;

    // prevent duplicate rapid scans (a typed ID always goes through)
    if (camera && ticketId === lastScanned.current) return null;
    lastScanned.current = ticketId;

    const mine = ++latest.current;
    setChecking(ticketId);
    let status = 0;
    let body = null;
    try {
      body = await adminFetch("/checkin/scan", { method: "POST", body: { ticketId } });
      status = 200;
    } catch (err) {
      status = err?.status || 0;
      body = err?.data || { error: err?.message || "Check-in failed" };
    }
    if (mine !== latest.current) return null;   // a newer scan has answered since
    setCard({ ...cardFrom({ status, body, ticketId }), scan: mine });
    setChecking("");
    return status;
  }, []);

  // ================= HANDLE SCAN =================
  const handleScan = (data) => {
    if (!data) return;
    const ticketId = data[0]?.rawValue || data;
    checkIn(ticketId);
  };

  const submitTyped = async (e) => {
    e.preventDefault();
    const status = await checkIn(typed, { camera: false });
    if (status === 200) setTyped("");
  };

  // ================= RENDER =================
  return (
    <div className="admin-card ci-page">
      <div className="ci-layout">
        <div className="ci-scan">
          <h2>QR Check-In Scanner</h2>

          <div className="scanner-wrapper">
            <Scanner
              onScan={handleScan}
              onError={(err) => console.error(err)}
              constraints={{ facingMode: "environment" }}
            />
          </div>
        </div>

        {/* ================= RESULT CARD ================= */}
        <div className="ci-result" aria-live="polite">
          {checking ? (
            <div className="ci-placeholder" role="status">
              <Loader2 className="ci-spin" aria-hidden="true" />
              <span>Checking ticket <code>{checking}</code>…</span>
            </div>
          ) : card ? (
            <ResultCard key={card.scan} card={card} />
          ) : (
            <div className="ci-placeholder">
              <span>Scan a ticket QR code. The person's pass colour, photo and pass show here.</span>
            </div>
          )}
        </div>

        {/* No QR (a dead phone, a crumpled print-out): the ticket ID from their email or PDF. */}
        <form className="ci-manual" onSubmit={submitTyped}>
          <label htmlFor="ci-ticket-id">No QR code? Type the ticket ID</label>
          <div className="ci-manual-row">
            <input
              id="ci-ticket-id"
              className="admin-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="e.g. 3f9a1c2b7d4e"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button type="submit" className="btn-primary" disabled={!typed.trim() || !!checking}>Check in</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PROBLEM = {
  not_found: { title: "Not found", text: "No TTFC ticket has this ID. Check the ID, or send them to the registration desk." },
  invalid: { title: "Invalid", text: "That isn't a ticket ID." },
  error: { title: "Couldn't check in", text: "Nothing was checked in. Try again." },
};

function ResultCard({ card }) {
  if (card.outcome !== "checked_in" && card.outcome !== "already") {
    const p = PROBLEM[card.outcome] || PROBLEM.error;
    return (
      <article className="ci-card ci-problem" role="alert">
        <div className="ci-problem-head">
          <XCircle aria-hidden="true" />
          <span>{p.title}</span>
        </div>
        <p className="ci-problem-text">{card.outcome === "error" && card.message ? card.message : p.text}</p>
        {card.ticketId && <p className="ci-ticket">Ticket <code>{card.ticketId}</code></p>}
      </article>
    );
  }

  const { badge } = card;
  const already = card.outcome === "already";
  const time = checkinTime(card.at);
  const job = [card.title, card.company].filter(Boolean).join(" · ");
  return (
    <article className="ci-card" aria-label={`${badge.label}: ${card.name || "no name"}`}>
      <div className="ci-band" style={{ background: badge.bg, color: badge.text }}>
        <span className="ci-band-label">{badge.label}</span>
      </div>

      <div className={`ci-state ${already ? "is-already" : "is-in"}`}>
        {already ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <span>{already ? `Already checked in${time ? ` at ${time}` : ""}` : "Checked in now"}</span>
      </div>

      <div className="ci-body">
        <Photo url={card.avatarUrl} name={card.name} badge={badge} />
        <div className="ci-who">
          <p className="ci-name">{card.name || "No name on this pass"}</p>
          {job && <p className="ci-job">{job}</p>}
          {card.passName && <span className="ci-pass">{card.passName}</span>}
        </div>
      </div>

      {card.meals && (
        <div className="ci-meals">
          {card.meals.length ? (
            <>
              <span className="ci-meals-label">Includes</span>
              {card.meals.map((m) => <span key={m} className="ci-meal">{m}</span>)}
            </>
          ) : (
            <span className="ci-meals-none">Conference only: no meals or evening events</span>
          )}
        </div>
      )}

      <p className="ci-ticket">Ticket <code>{card.ticketId}</code>{!already && time ? ` · ${time}` : ""}</p>
    </article>
  );
}

/** Their photo, large and round; their initials on the band's colour underneath (no photo, still loading, or broken). */
function Photo({ url, name, badge }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? "" : avatarSrc(url, ORIGIN);
  return (
    <div className="ci-photo" style={{ background: badge.bg, color: badge.text, borderColor: badge.bg }}>
      <span aria-hidden="true">{initialsOf(name)}</span>
      {src && <img src={src} alt={name ? `Photo of ${name}` : "Photo"} decoding="async" onError={() => setFailed(true)} />}
    </div>
  );
}
