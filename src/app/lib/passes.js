import { API } from "./config";
import { createStore } from "./store";
import { auth, signOut } from "./auth";
import { showAlert } from "./ui";
import { track } from "../../lib/pwaEvents";

/* =========================================================
   "Get your pass" for guests, who may be thinking of buying:
   the passes sheet (components/PassesSheet.jsx, mounted once in
   App) and its live prices. Opened from the Home card, the guest
   Profile tab and the "See passes" button on locked actions.
   • The same passes, defaults and sold-out flag as the website's
     Tickets page (src/pages/Tickets.jsx PASS_META), with the
     inclusions worded as the iOS pass picker (MockData.ticketTiers).
   • Connect is sold out. The Speaker Pass is internal: never listed.
   • Live prices from the public GET /admin/inventory/public (what the
     website uses); the Tickets page defaults until it answers.
   • Buying happens on thetechfestival.com: /tickets/checkout?tier=…&from=app
   • No discounts, promotions or countdowns (the organiser, Oct 18).
   • Guests only: signed-in pass holders never see any of this.
========================================================= */

export const PASSES = [
  {
    tier: "connect", name: "Connect Pass", defaultPrice: 749, soldOut: true,
    tagline: "More than just access to the conference.",
    features: ["2× Day Conference Access", "Expo Floor Access", "Networking Breaks"],
  },
  {
    tier: "influence", name: "Influence Pass", defaultPrice: 849, popular: true,
    tagline: "A fuller event experience beyond the conference floor.",
    features: ["2× Day Conference Access", "2× Luncheons", "Expo Floor Access", "Networking Breaks"],
  },
  {
    tier: "power", name: "Power Pass", defaultPrice: 999,
    tagline: "The conference by day, the Gala and Awards by night.",
    features: ["Everything in Influence, plus:", "1× Gala Dinner & Networking Reception", "1× Awards Night"],
  },
  {
    tier: "apex", name: "Apex Pass", defaultPrice: 1499,
    tagline: "Everything, plus the meetings you actually came for.",
    features: ["Everything in Power, plus:", "2× Pre-Matched Business Meetings", "2× CxO Breakfasts", "Preferential Seating", "Private Scotch & Cocktail Lounge (19+)"],
  },
];

/** Where the website's checkout for one pass starts (same origin as /app). `from=app` tells the team's
    "New ticket" email the buyer came from the web app (src/lib/purchaseSource.js). */
export const checkoutHref = (tier) => `/tickets/checkout?tier=${encodeURIComponent(tier)}&from=app`;

export const passesSheet = createStore({ open: false, where: "" });
export const inventory = createStore({ items: null, at: 0, failed: false });

export const isGuest = (s = auth.get()) => s.mode === "guest";

async function refreshInventory() {
  if (inventory.get().items && Date.now() - inventory.get().at < 60000) return;
  try {
    const res = await fetch(`${API}/admin/inventory/public`, { headers: { Accept: "application/json" } });
    const data = res.ok ? await res.json() : null;
    if (Array.isArray(data)) inventory.set({ items: data, at: Date.now(), failed: false });
    else if (!inventory.get().items?.length) inventory.set({ items: [], at: 0, failed: true });
  } catch {
    if (!inventory.get().items?.length) inventory.set({ items: [], at: 0, failed: true }); // the defaults stand
  }
}

/** One pass with its price now: { …pass, price, soldOut, live }. */
export function priced(pass, items = inventory.get().items) {
  const row = Array.isArray(items) ? items.find((i) => i.tier === pass.tier && !i.archived) : null;
  const price = Number(row?.price) > 0 ? Number(row.price) : pass.defaultPrice;
  const remaining = row ? Math.max(Number(row.total || 0) - Number(row.sold || 0), 0) : null;
  return { ...pass, price, live: !!row, soldOut: pass.soldOut === true || (remaining !== null && remaining <= 0) };
}

/** Opens the passes sheet (guests only). `where`: home | profile | locked | session … */
export function openPasses(where = "app") {
  if (!isGuest()) return;
  passesSheet.set({ open: true, where });
  track("guest_buy_open", { where });
  refreshInventory();
}

export const closePasses = () => passesSheet.set({ open: false });

/** "Continue on thetechfestival.com" on one pass. */
export function trackCheckout(pass) {
  track("guest_buy_checkout", { tier: pass.tier, price: pass.price, where: passesSheet.get().where || "app" });
}

/** Only ticket holders can sign in, so a locked action says so (the organiser, Oct 19). */
export const LOCKED_MESSAGE = "Have a pass? Sign in. Or see the passes.";

/** A locked action for guests ("Get a pass to …"): the toast, with "See passes" and "Sign in" (✕ = not now). */
export function guestAlert(title, where = "locked", message = LOCKED_MESSAGE) {
  const actions = isGuest() ? [{ label: "See passes", run: () => openPasses(where) }, { label: "Sign in", run: () => signOut() }] : [];
  showAlert(title, message, { ms: 8000, actions });
}
