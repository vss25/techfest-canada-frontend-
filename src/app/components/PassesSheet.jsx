import { CheckCircle2, ChevronRight, ExternalLink, Info, Ticket } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, signOut } from "../lib/auth";
import { content, flag, text } from "../lib/content";
import { PASSES, checkoutHref, closePasses, inventory, isGuest, openPasses, passesSheet, priced, trackCheckout } from "../lib/passes";
import { DoneButton, Sheet } from "./ui";

/* =========================================================
   The passes, for guests (iOS TicketsView, titled "Passes"):
   one card per pass with its live price and inclusions, and its
   own "Continue on thetechfestival.com" button to the website's
   checkout for that pass. Sold out passes (Connect) are shown
   dimmed at the end; "Sales paused" when staff close sales.
   Opened with openPasses() in lib/passes.js; mounted once in App.
========================================================= */

const money = (n) => `$${Number(n).toLocaleString("en-CA")}`;

/** "Get your pass" for guests: the card on Home and on the guest Profile tab. */
export function GetPassCard({ where }) {
  const a = useStore(auth);
  if (!isGuest(a)) return null;
  return (
    <button type="button" className="get-pass pressable" onClick={() => openPasses(where)}>
      <span className="get-pass-row">
        <span className="get-pass-ico" aria-hidden="true"><Ticket /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b>Get your pass</b>
          <span className="get-pass-text">Two days of keynotes, the expo floor and the people you came to meet. Oct 26–27, Toronto.</span>
        </span>
      </span>
      <span className="btn btn-primary">See passes<ChevronRight aria-hidden="true" /></span>
    </button>
  );
}

export default function PassesSheet() {
  const sheet = useStore(passesSheet);
  const inv = useStore(inventory);
  const a = useStore(auth);
  const ct = useStore(content);
  if (!sheet.open || !isGuest(a)) return null;

  const salesOpen = flag(ct, "site.ticket_sales_open", true);
  const pausedNote = text(ct, "site.ticket_sales_message", "Ticket sales are paused right now. Please check back soon.");
  const passes = PASSES.map((p) => priced(p, inv.items));
  // Passes on sale first, sold out after (the website's order otherwise).
  const ordered = [...passes.filter((p) => !p.soldOut), ...passes.filter((p) => p.soldOut)];
  const loading = inv.items === null;

  return (
    <Sheet open onClose={closePasses} title="Passes" full actions={{ right: <DoneButton onClick={closePasses} /> }}>
      <div className="sheet-scroll passes">
        <header className="passes-head">
          <p className="eyebrow">Choose your pass</p>
          <h3>A pass for every kind of delegate.</h3>
          <p className="muted">Oct 26–27, The Westin Harbour Castle, Toronto. Pick the pass that fits, then finish on thetechfestival.com.</p>
          <span className="passes-live"><i className={loading || inv.failed ? "" : "on"} aria-hidden="true" />{loading ? "Loading live prices…" : inv.failed ? "Prices in CAD · tax extra" : "Live prices · tax extra"}</span>
        </header>

        {!salesOpen && <div className="note note--gold" role="status">{pausedNote}</div>}

        {ordered.map((p) => (
          <section key={p.tier} className={p.soldOut ? "buy-card is-sold" : "buy-card"} aria-label={p.name}>
            <div className="buy-card-top">
              <span className="buy-kind">Full event</span>
              {p.soldOut ? <span className="buy-pill buy-pill--sold">Sold out</span> : p.popular ? <span className="buy-pill">Most popular</span> : null}
            </div>
            <h4 className="buy-name">{p.name}</h4>
            <div className="buy-price">
              <b className="figure">{money(p.price)}</b><span>CAD</span>
              <span className="buy-tax">+ 13% HST · {money(Math.round(p.price * 1.13))} total</span>
            </div>
            <p className="buy-tagline">{p.tagline}</p>
            <ul className="buy-features">
              {p.features.map((f) => <li key={f}><CheckCircle2 aria-hidden="true" />{f}</li>)}
            </ul>
            {p.soldOut || !salesOpen ? (
              <button type="button" className="btn btn-lg btn-block" disabled>{p.soldOut ? "Sold out" : "Sales paused"}</button>
            ) : (
              <a className="btn btn-primary btn-lg btn-block" href={checkoutHref(p.tier)} target="_blank" rel="noopener" onClick={() => trackCheckout(p)}>
                Continue on thetechfestival.com<ExternalLink aria-hidden="true" />
              </a>
            )}
          </section>
        ))}

        <div className="passes-foot">
          <p><Info aria-hidden="true" />All prices are in CAD, plus 13% HST. Checkout is on thetechfestival.com, handled securely by Stripe.</p>
          <p>Already have a pass? <button type="button" className="link-btn" onClick={() => { closePasses(); signOut(); }}>Sign in</button></p>
        </div>
      </div>
    </Sheet>
  );
}
