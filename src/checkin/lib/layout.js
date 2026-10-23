/* =========================================================
   TTFC Check-in: layouts by screen width
   ---------------------------------------------------------
   One app in a browser tab or installed, on phones, iPads (portrait,
   landscape, split view) and laptops. The organiser: "this should work
   on mobile browser, ipad, phone, laptop".
     phone   < 640 px   one column; the pass desk's two lists are tabs
                        ("On the way up" / "Checked in"); counters scroll
     tablet  640–1099   two columns where a station has two lists
     laptop  ≥ 1100     two columns, wider cards, counters in one row,
                        keyboard shortcuts shown
   Never wider than the screen: no sideways scrolling down to 320 px.
   Pure; node --test src/checkin/lib/layout.test.mjs
========================================================= */

export const BREAKPOINTS = Object.freeze({ tablet: 640, laptop: 1100 });

/** → { kind: "phone" | "tablet" | "laptop", columns: 1 | 2, deskTabs: bool, cardSize: "m" | "l" | "xl" } */
export function layoutFor(width, height = 800) {
  const w = Math.max(0, Number(width) || 0);
  if (w < BREAKPOINTS.tablet) return { kind: "phone", columns: 1, deskTabs: true, cardSize: "m", short: height < 560 };
  if (w < BREAKPOINTS.laptop) return { kind: "tablet", columns: 2, deskTabs: false, cardSize: w >= 800 ? "l" : "m", short: height < 560 };
  return { kind: "laptop", columns: 2, deskTabs: false, cardSize: w >= 1400 ? "xl" : "l", short: height < 560 };
}

/** Is a key press something to type into the search (a letter, digit or the like, no modifier)? */
export function isTypingKey(e) {
  if (!e || e.metaKey || e.ctrlKey || e.altKey) return false;
  return typeof e.key === "string" && e.key.length === 1 && /[\p{L}\p{N}@.' -]/u.test(e.key);
}
