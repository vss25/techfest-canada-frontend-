import React, { useEffect, useMemo, useRef, useState } from "react";
import AnnouncedSoon from "./AnnouncedSoon";
import { lifecycleOf } from "../lib/events";
import { fetchTicketTypes, money, multiCheckout, quoteTickets } from "../lib/ticketsApi";

/* =========================================================
   Contextual tickets (Phase 4 + §9 + §10): this block only
   ever sells the event it sits on — its types, its prices,
   its dates, pulled from that event's own records.

   While the event's pricing is unannounced (Sanity flag, and
   the backend quote agrees), it renders AnnouncedSoon: no
   numbers anywhere, the Stay Updated form instead. When
   announced: types with inclusions/exclusions, quantities, a
   promo code, the server's live quote breakdown, then the
   multi-attendee checkout — one named attendee per ticket,
   the invoice to the booker only (the backend's rule).
========================================================= */

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12,
  border: "1.5px solid rgba(127,90,240,0.3)", background: "rgba(255,255,255,0.05)",
  color: "inherit", fontSize: "16px", fontFamily: "inherit",
};
const labelStyle = { display: "grid", gap: 6, fontSize: "0.85rem", fontWeight: 600 };

export default function TicketsBlock({ ev }) {
  const [types, setTypes] = useState(undefined); // undefined = loading, null = unavailable
  const [qty, setQty] = useState({});
  const [promoCode, setPromoCode] = useState("");
  const [quotes, setQuotes] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [booker, setBooker] = useState({ name: "", email: "" });
  const [attendees, setAttendees] = useState({}); // `${typeId}:${i}` -> {firstName,lastName,email,title,company}
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placed, setPlaced] = useState(null);
  const quoteTimer = useRef(null);

  const lifecycle = ev ? lifecycleOf(ev) : "coming-up";
  const announced = !!ev?.pricingAnnounced;

  useEffect(() => {
    if (!ev?.eventKey || !announced || !["coming-up", "live"].includes(lifecycle)) return undefined;
    let live = true;
    fetchTicketTypes(ev.eventKey).then((list) => { if (live) setTypes(list); });
    return () => { live = false; };
  }, [ev?.eventKey, announced, lifecycle]);

  const chosen = useMemo(
    () => (types || []).filter((t) => (qty[t.id] || 0) > 0).map((t) => ({ type: t, quantity: qty[t.id] })),
    [types, qty]
  );
  const totalTickets = chosen.reduce((s, c) => s + c.quantity, 0);

  // Live quote (debounced) whenever the basket or code changes.
  useEffect(() => {
    if (!chosen.length) { setQuotes(null); setQuoteError(""); return undefined; }
    setQuoting(true);
    quoteTimer.current = setTimeout(async () => {
      try {
        const results = [];
        for (const c of chosen) {
          const q = await quoteTickets({ eventKey: ev.eventKey, ticketTypeId: c.type.id, quantity: c.quantity, promoCode: promoCode.trim() || undefined });
          if (q && q.announced === false) { setTypes(null); return; }
          results.push({ type: c.type, quantity: c.quantity, quote: q });
        }
        setQuotes(results);
        setQuoteError("");
      } catch (err) {
        setQuotes(null);
        setQuoteError(err.message || "Couldn't price this order. Please try again.");
      } finally {
        setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(quoteTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.map((c) => `${c.type.id}:${c.quantity}`).join(","), promoCode, ev?.eventKey]);

  if (!ev) return null;

  if (lifecycle === "past") {
    return (
      <AnnouncedSoon eventKey={ev.eventKey} title="This event has ended"
        message="Thank you to everyone who was in the room. The next edition is on its way — leave your email and we'll keep you updated, including when its pricing is announced." />
    );
  }
  if (lifecycle === "just-ended") {
    return (
      <AnnouncedSoon eventKey={ev.eventKey} title="Ticket sales have closed"
        message="This event has just wrapped — thank you to everyone who came. Leave your email and we'll keep you updated about the next edition, including when its pricing is announced." />
    );
  }
  if (!announced || types === null || (types !== undefined && types.length === 0)) {
    return <AnnouncedSoon eventKey={ev.eventKey} />;
  }
  if (types === undefined) {
    return <p aria-busy="true" style={{ opacity: 0.7 }}>Loading tickets…</p>;
  }

  if (placed) {
    return (
      <div style={{ border: "1px solid rgba(47,163,107,0.5)", background: "rgba(47,163,107,0.08)", borderRadius: 24, padding: "clamp(22px,4vw,36px)" }}>
        <h3 style={{ margin: 0, fontFamily: "'Orbitron', sans-serif", fontSize: "1.3rem", fontWeight: 800 }}>You&rsquo;re booked</h3>
        <p style={{ margin: "10px 0 0", lineHeight: 1.65, opacity: 0.9 }}>
          Each attendee has been emailed their own ticket. The invoice went to {booker.email || "the booker"} only.
        </p>
        <p style={{ margin: "14px 0 0", fontSize: "0.92rem", opacity: 0.75 }}>
          Get the TTFC app for your pass, the schedule and live updates —{" "}
          <a href="/app/install?from=tickets" style={{ color: "inherit", fontWeight: 700 }}>download the app</a>.
        </p>
      </div>
    );
  }

  const grandTotal = (quotes || []).reduce((s, r) => s + (Number(r.quote?.totalCents) || 0), 0);
  const setQtyFor = (id, n) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(100, n || 0)) }));
  const setAttendee = (key, field, value) =>
    setAttendees((a) => ({ ...a, [key]: { ...(a[key] || {}), [field]: value } }));

  const submit = async (e) => {
    e.preventDefault();
    if (placing) return;
    setOrderError("");
    if (!totalTickets) { setOrderError("Choose at least one ticket."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booker.email)) { setOrderError("The booker's email is needed for the invoice."); return; }
    const list = [];
    for (const c of chosen) {
      for (let i = 0; i < c.quantity; i++) {
        const a = attendees[`${c.type.id}:${i}`] || {};
        if (!a.firstName || !a.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email || "")) {
          setOrderError(`Every ticket needs its attendee's name and email — check ${c.type.name}, ticket ${i + 1}.`);
          return;
        }
        list.push({ firstName: a.firstName, lastName: a.lastName, email: a.email, title: a.title || undefined, company: a.company || undefined, ticketTypeId: c.type.id });
      }
    }
    setPlacing(true);
    try {
      const res = await multiCheckout({
        eventKey: ev.eventKey,
        booker: { name: booker.name, email: booker.email },
        items: chosen.map((c) => ({ ticketTypeId: c.type.id, quantity: c.quantity })),
        attendees: list,
        promoCode: promoCode.trim() || undefined,
      });
      if (res?.url) { window.location.assign(res.url); return; }
      setPlaced(res || { orderId: true });
    } catch (err) {
      setOrderError(err.message || "Something went wrong placing this order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "grid", gap: 14 }}>
        {types.map((t) => (
          <div key={t.id} style={{ border: "1px solid rgba(127,90,240,0.22)", borderRadius: 18, padding: "18px 20px", background: "rgba(127,90,240,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{t.name}</div>
                {t.description && <div style={{ marginTop: 3, fontSize: "0.9rem", opacity: 0.78 }}>{t.description}</div>}
              </div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800 }}>{money(t.priceCents, t.currency)}</div>
            </div>
            {(t.inclusions.length > 0 || t.exclusions.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", marginTop: 10, fontSize: "0.86rem" }}>
                {t.inclusions.map((x, i) => <span key={`in-${i}`}>✓ {x}</span>)}
                {t.exclusions.map((x, i) => <span key={`ex-${i}`} style={{ opacity: 0.6 }}>✕ {x}</span>)}
              </div>
            )}
            <label style={{ ...labelStyle, marginTop: 14, maxWidth: 180 }}>
              Quantity
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button type="button" aria-label={`One fewer ${t.name}`} onClick={() => setQtyFor(t.id, (qty[t.id] || 0) - 1)}
                  style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid rgba(127,90,240,0.35)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: "1rem" }}>−</button>
                <input type="number" min={0} max={100} value={qty[t.id] || 0} aria-label={`Quantity of ${t.name}`}
                  onChange={(e) => setQtyFor(t.id, Number(e.target.value))}
                  style={{ ...inputStyle, width: 70, textAlign: "center" }} />
                <button type="button" aria-label={`One more ${t.name}`} onClick={() => setQtyFor(t.id, (qty[t.id] || 0) + 1)}
                  style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid rgba(127,90,240,0.35)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: "1rem" }}>+</button>
              </span>
            </label>
          </div>
        ))}
      </div>

      <label style={{ ...labelStyle, maxWidth: 320 }}>
        Promo code (optional)
        <input style={inputStyle} value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Code" autoCapitalize="characters" />
      </label>

      {quoteError && <p role="alert" style={{ margin: 0, color: "#ff9b9b", fontWeight: 600 }}>{quoteError}</p>}
      {quotes && quotes.length > 0 && (
        <div aria-live="polite" style={{ border: "1px dashed rgba(127,90,240,0.35)", borderRadius: 16, padding: "14px 18px", fontSize: "0.92rem", display: "grid", gap: 6 }}>
          {quotes.flatMap((r) => (r.quote?.breakdown || []).map((line, i) => (
            <div key={`${r.type.id}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>{line.label || line.description || r.type.name}</span>
              <span>{money(line.amountCents ?? line.cents ?? 0, r.type.currency)}</span>
            </div>
          )))}
          {quotes.some((r) => Number(r.quote?.freeTickets) > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>Free tickets (offer)</span>
              <span>{quotes.reduce((s, r) => s + (Number(r.quote?.freeTickets) || 0), 0)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontWeight: 800, borderTop: "1px solid rgba(127,90,240,0.25)", paddingTop: 8 }}>
            <span>Total{quoting ? " (updating…)" : ""}</span>
            <span>{money(grandTotal)}</span>
          </div>
        </div>
      )}

      {totalTickets > 0 && (
        <>
          <fieldset style={{ border: "1px solid rgba(127,90,240,0.22)", borderRadius: 18, padding: "18px 20px", display: "grid", gap: 12 }}>
            <legend style={{ fontWeight: 800, padding: "0 8px" }}>Who is booking? (the invoice goes to them)</legend>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <label style={labelStyle}>Booker name
                <input style={inputStyle} value={booker.name} onChange={(e) => setBooker({ ...booker, name: e.target.value })} autoComplete="name" />
              </label>
              <label style={labelStyle}>Booker email
                <input style={inputStyle} type="email" value={booker.email} onChange={(e) => setBooker({ ...booker, email: e.target.value })} autoComplete="email" required />
              </label>
            </div>
          </fieldset>

          {chosen.map((c) => (
            <fieldset key={c.type.id} style={{ border: "1px solid rgba(127,90,240,0.22)", borderRadius: 18, padding: "18px 20px", display: "grid", gap: 16 }}>
              <legend style={{ fontWeight: 800, padding: "0 8px" }}>{c.type.name} — who is each ticket for?</legend>
              {Array.from({ length: c.quantity }, (_, i) => {
                const key = `${c.type.id}:${i}`;
                const a = attendees[key] || {};
                return (
                  <div key={key} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <label style={labelStyle}>First name
                      <input style={inputStyle} value={a.firstName || ""} onChange={(e) => setAttendee(key, "firstName", e.target.value)} required />
                    </label>
                    <label style={labelStyle}>Last name
                      <input style={inputStyle} value={a.lastName || ""} onChange={(e) => setAttendee(key, "lastName", e.target.value)} required />
                    </label>
                    <label style={labelStyle}>Email (their ticket goes here)
                      <input style={inputStyle} type="email" value={a.email || ""} onChange={(e) => setAttendee(key, "email", e.target.value)} required />
                    </label>
                    <label style={labelStyle}>Title (optional)
                      <input style={inputStyle} value={a.title || ""} onChange={(e) => setAttendee(key, "title", e.target.value)} />
                    </label>
                    <label style={labelStyle}>Company (optional)
                      <input style={inputStyle} value={a.company || ""} onChange={(e) => setAttendee(key, "company", e.target.value)} />
                    </label>
                  </div>
                );
              })}
            </fieldset>
          ))}

          {orderError && <p role="alert" style={{ margin: 0, color: "#ff9b9b", fontWeight: 600 }}>{orderError}</p>}
          <button type="submit" disabled={placing}
            style={{ justifySelf: "start", padding: "14px 30px", borderRadius: 999, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f7b733, #f5a623 55%, #e8890c)", color: "#1d1204",
              fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", opacity: placing ? 0.65 : 1 }}>
            {placing ? "Placing order…" : grandTotal > 0 ? `Pay ${money(grandTotal)}` : "Complete order"}
          </button>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
            Prices are confirmed by the server before payment. Each attendee is emailed their own ticket; the invoice goes to the booker only.
          </p>
        </>
      )}
    </form>
  );
}
