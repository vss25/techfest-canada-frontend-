import React from "react";

/* Nov 25 2026 (the owner): an event's Speakers section shows a "coming soon" note with a link to the last
   event's speakers until at least SPK_MIN are confirmed; then the real speakers only (3 shows 3, 4 shows 4),
   at most two rows, and when more are confirmed than fit, the last tile of row two is "See all speakers". */
export const SPK_MIN = 3;
export const speakerGrid = (spk, slots, open) => {
  const n = spk ? spk.length : 0;
  if (n < SPK_MIN) return null;
  const more = n > slots;
  const shown = spk.slice(0, more ? slots - 1 : n);
  return { shown, more: more ? { left: n - shown.length, total: n, open } : null };
};
export const speakersSoon = (goPast, small) => ({
  title: "Speakers coming soon",
  text: (<>We're confirming this event's line-up and will announce speakers here soon.{" "}
    <a href="#" className="p-link" onClick={goPast} style={{ fontWeight: 600, color: "#151035", whiteSpace: small ? "normal" : "nowrap" }}>See who spoke at Toronto 2026 →</a></>),
});
