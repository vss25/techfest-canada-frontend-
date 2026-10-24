import { createStore, local } from "./store";

/* This device joined the TTFC 2027 waitlist (Oct 24 2026): Home's "Stay updated for TTFC 2027" card and the one at
   the end of the Schedule then say "You're on the TTFC 2027 waitlist" instead of asking again. The Stay updated
   screen always has the form, so someone else on the same phone can still join. localStorage only (never sent). */

const KEY = "ttfc.stay.joined";

export const stayJoined = createStore({ joined: local.get(KEY) === "1" });

export function markStayJoined() {
  local.set(KEY, "1");
  stayJoined.set({ joined: true });
}
