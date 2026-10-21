/* =========================================================
   Read receipts on your own 1:1 messages (WhatsApp-style,
   the same on iOS and Android): one grey tick = sent, two grey
   = delivered (their app fetched it), two blue = read (they
   opened the chat). A message held for review shows a clock
   and no ticks; a rejected one shows nothing.
   Tests: node --test src/app/lib/receipts.test.mjs
========================================================= */

/** WhatsApp's read blue: legible on the dark purple ground. */
export const READ_BLUE = "#53BDEB";

export const RECEIPT_LABEL = { held: "Waiting for review", sent: "Sent", delivered: "Delivered", read: "Read" };

/** A message (thread item, send response or chat-list lastMessage) → "held" | "sent" | "delivered" | "read" | null. */
export function receiptOf(m) {
  if (!m || !m.sentByMe) return null;
  if (m.status === "held" || m.status === "pending") return "held";
  if (m.status && m.status !== "approved") return null;
  if (m.readAt) return "read";
  if (m.deliveredAt) return "delivered";
  return "sent";
}
