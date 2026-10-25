import { useCallback, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { ADMIN_API, adminFetch } from "../admin/api";
import { PRACTICE_TEXT, avatarSrc, cardFrom, checkinTime, initialsOf, isAppQr } from "../lib/checkinCard";

/* Door check-in (Admin › Event day › Check-in). Every scan (camera or a typed ticket ID) goes to
   POST /api/checkin/scan and its answer replaces the card at once: the pass's colour band (VIP gold, Media dark
   blue, Speaker red, Staff purple, Volunteer orange, any other pass green; the server picks it; the pass's name small
   beside any other word, "Media · Connect Pass"), the person's photo
   (initials on the band's colour while it loads or when there's none), name, title · company, the pass, the meals
   it includes and whether they were checked in now or before (amber). On a day that isn't Day 1 / Day 2 the server
   checks nothing in (Oct 24 2026): the same card with a neutral "Practice scan" banner, and whether their pass was
   collected before. Someone's networking QR (the apps' "My QR", Oct 24 2026) checks in their pass the same way (with
   a line saying which pass when they hold several); when it can't, the server's words ("That's their networking QR.
   Ask for the entry pass QR…"), never the code's text as a ticket. Helpers in src/lib/checkinCard.js. */

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
              <span>{isAppQr(checking) ? "Checking their networking QR…" : <>Checking ticket <code>{checking}</code>…</>}</span>
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
  // Someone's networking QR (the apps' "My QR"): the server's message is shown when it sends one.
  networking_qr: { title: "Networking QR", text: "That's their networking QR. Ask for the entry pass QR (app › Pass, or the email/PDF)." },
  bad_qr: { title: "Invalid QR code", text: "That QR code isn't valid. Ask for the entry pass QR (app › Pass, or the email/PDF)." },
  no_pass: { title: "No pass", text: "That's their networking QR, and there's no TTFC pass on their account. Send them to the registration desk." },
  invalid: { title: "Invalid", text: "That isn't a ticket ID." },
  error: { title: "Couldn't check in", text: "Nothing was checked in. Try again." },
};

const QR_PROBLEMS = new Set(["networking_qr", "bad_qr", "no_pass"]);

function ResultCard({ card }) {
  if (card.outcome !== "checked_in" && card.outcome !== "already" && card.outcome !== "practice") {
    const p = PROBLEM[card.outcome] || PROBLEM.error;
    return (
      <article className="ci-card ci-problem" role="alert">
        <div className="ci-problem-head">
          <XCircle aria-hidden="true" />
          <span>{p.title}</span>
        </div>
        <p className="ci-problem-text">{(card.outcome === "error" || QR_PROBLEMS.has(card.outcome)) && card.message ? card.message : p.text}</p>
        {card.ticketId && <p className="ci-ticket">Ticket <code>{card.ticketId}</code></p>}
      </article>
    );
  }

  const { badge } = card;
  const already = card.outcome === "already";
  // Not an event day: nothing was checked in (neutral, not an error); the card as on the day.
  const practice = card.outcome === "practice";
  const time = checkinTime(card.at);
  const job = [card.title, card.company].filter(Boolean).join(" · ");
  return (
    <article className="ci-card" aria-label={`${practice ? "Practice scan. " : ""}${badge.label}: ${card.name || "no name"}`}>
      <div className="ci-band" style={{ background: badge.bg, color: badge.text }}>
        <span className="ci-band-label">{badge.label}</span>
        {/* The pass's name, small, beside any other word: "Media · Connect Pass" (Oct 23 2026). */}
        {card.bandSub && <span className="ci-band-pass">· {card.bandSub}</span>}
      </div>

      <div className={`ci-state ${practice ? "is-practice" : already ? "is-already" : "is-in"}`}>
        {practice ? <Info aria-hidden="true" /> : already ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <span>
          {practice ? PRACTICE_TEXT : already ? `Already checked in${time ? ` at ${time}` : ""}` : "Checked in now"}
          {practice && card.collectedBefore && (
            <span className="ci-state-sub">Their pass was already collected{time ? ` (${time})` : ""}</span>
          )}
          {card.note && <span className="ci-state-sub">{card.note}</span>}
        </span>
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

      <p className="ci-ticket">Ticket <code>{card.ticketId}</code>{!already && !practice && time ? ` · ${time}` : ""}</p>
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
