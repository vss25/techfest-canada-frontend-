import { PUBLIC_API } from "../hooks/useSiteSettings";

/* =========================================================
   Phase 4: the public ticketing calls (Phase 2/§9 backend).
   - GET  /api/tickets/types?eventKey=…   the event's ticket types
     (BACKEND FOLLOW-UP: this public list endpoint is the one
     read the §9 backend does not expose yet — quote + checkout
     are live. Until it ships, the tickets block treats a failed
     list call as "not on sale yet" and shows Announced Soon.)
   - POST /api/tickets/quote              live price breakdown
   - POST /api/orders/multi-checkout      multi-attendee order
   All money is integer cents, computed on the server only.
========================================================= */

const base = () => String(PUBLIC_API).replace(/\/+$/, "");

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** The event's ticket types, or null when the list endpoint isn't available yet. */
export async function fetchTicketTypes(eventKey) {
  try {
    const res = await fetch(`${base()}/tickets/types?eventKey=${encodeURIComponent(eventKey)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data) ? data : data?.types || data?.ticketTypes || null;
    if (!Array.isArray(list)) return null;
    return list
      .filter((t) => t && t.active !== false)
      .map((t) => ({
        id: String(t._id || t.id || ""),
        name: t.name || "Ticket",
        description: t.description || "",
        priceCents: Number(t.priceCents ?? t.price ?? 0),
        currency: t.currency || "CAD",
        inclusions: Array.isArray(t.inclusions) ? t.inclusions : [],
        exclusions: Array.isArray(t.exclusions) ? t.exclusions : [],
        capacity: t.capacity ?? null,
      }))
      .filter((t) => t.id);
  } catch {
    return null;
  }
}

/** Live quote for one ticket type. Returns { announced:false } while pricing is unannounced. */
export async function quoteTickets({ eventKey, ticketTypeId, quantity, promoCode }) {
  const res = await fetch(`${base()}/tickets/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventKey, ticketTypeId, quantity, ...(promoCode ? { promoCode } : {}) }),
  });
  return json(res);
}

/** One booker, N named attendees. Resolves { url } (Stripe) or { orderId } ($0 order). */
export async function multiCheckout({ eventKey, booker, items, attendees, promoCode }) {
  const res = await fetch(`${base()}/orders/multi-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventKey, booker, items, attendees, ...(promoCode ? { promoCode } : {}) }),
  });
  return json(res);
}

export const money = (cents, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format((Number(cents) || 0) / 100);
