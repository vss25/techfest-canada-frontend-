import { post } from "./api";
import { tierName } from "./config";
import { demoConnectFromCode } from "./demo";
import { scanPassWithSharing, scanWithSharing } from "./myCard";
import { parseQR } from "./qr";
import { checkinBody, checkinDisplay, checkinQuestion } from "./scanAction";
import { alertDialog, chooseDialog } from "./ui";

/* =========================================================
   Staff and volunteers scanning a TTFC code (Oct 24 2026, the
   organiser: "for staff it should default to checkin"; "make sure
   there is one and only code"): an entry QR or an older networking
   QR from a screenshot asks "Check in …?" first (Check in, the
   default · Share contact instead · Cancel; lib/scanAction.js
   checkinQuestion). Check in sends the scanned text to POST
   /checkin/scan (a networking QR whole: the server finds that
   person's pass, or answers code "networking_qr") and shows the
   answer (checkinDisplay). Share contact instead runs the attendee
   flow: the share sheet, then connected. Runs after the scanner
   sheet has closed (components/BadgeScanner.jsx).
========================================================= */

/** Staff: ask, then check in (or share contacts instead). Runs after the scanner has closed. */
export async function staffScan(a, raw, { onConnected }) {
  const q = checkinQuestion(a);
  const pick = await chooseDialog({ title: q.title, message: q.message, options: q.options });
  if (pick === "share") {
    if (a.type === "confirmPass") { if (await scanPassWithSharing(a.ticketId)) onConnected?.(); return; }
    const c = a.share;
    if (c.type === "oldApp") { await alertDialog({ title: "Can't connect", message: c.error }); return; }
    if (await scanWithSharing({ userId: c.userId, name: c.name, connectLocal: c.local ? (share) => demoConnectFromCode(parseQR(raw), share) : null })) onConnected?.();
    return;
  }
  if (pick !== "checkin") return;
  let status = 200;
  let data = null;
  try { data = await post("checkin/scan", checkinBody(a)); } catch (e) { status = Number(e?.status) || 0; data = e?.data || { error: e?.message }; }
  const scanned = a.type === "confirmConnect" ? `${a.name}'s networking QR` : a.ticketId;
  const d = checkinDisplay(status, data, scanned, { tierName });
  await alertDialog({ title: d.title, message: d.message });
}
