/* =========================================================
   Keeping the docked tab bar on the bottom edge (Oct 21 2026;
   the organiser: "applying filters on the Network page makes
   the bottom navigation float on screen").
   • iOS Safari and the Home Screen app: once the keyboard or a
     <select> picker (Network's Industry / Tech filters) closes,
     WebKit can leave position:fixed bars where the shrunken
     viewport put them until the next scroll. When focus leaves
     a field (or the visual viewport changes size), we nudge the
     scroll by a pixel and back on the next frame, so the bars
     are laid out against the full viewport again.
   • Sheets lock the page with overflow:hidden on <html>, not
     the body (counted, so a dialog over a sheet doesn't unlock
     it), and put the scroll back when the last one closes.
========================================================= */

let locks = 0;
let savedY = 0;

/** Re-lays out the fixed bars: back to `y` (default: where the page is) by way of a 1px move, a frame apart
    (one frame can't show it; two scrolls in the same frame may be merged into none). */
export function settle(y) {
  requestAnimationFrame(() => {
    const top = y ?? window.scrollY;
    const x = window.scrollX;
    window.scrollTo(x, top > 0 ? top - 1 : 1);
    requestAnimationFrame(() => window.scrollTo(x, top));
  });
}

/** Locks page scrolling while a sheet is open; returns the unlock (safe to call twice). */
export function lockScroll() {
  if (locks++ === 0) {
    savedY = window.scrollY;
    document.documentElement.classList.add("scroll-locked");
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    locks = Math.max(0, locks - 1);
    if (locks) return;
    document.documentElement.classList.remove("scroll-locked");
    settle(savedY);
  };
}

const isField = (el) => !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Once, at start-up (main.jsx). Never during a scroll (a scrollTo would stop iOS's momentum), and the browser
    toolbar growing or shrinking (Safari's own resize while you scroll) isn't the keyboard going away. */
export function installViewportFix() {
  const vv = window.visualViewport;
  let timer = 0;
  let lastScroll = 0;
  let lastH = vv ? vv.height : window.innerHeight;
  window.addEventListener("scroll", () => { lastScroll = Date.now(); }, { passive: true });
  const check = (tries = 3) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isField(document.activeElement) || locks) return; // still typing or picking, or a sheet is up
      if ((vv?.scale || 1) > 1.01) return; // pinch-zoomed: leave the page where it is
      if (Date.now() - lastScroll < 200) { if (tries > 1) check(tries - 1); return; }
      settle();
    }, 160);
  };
  document.addEventListener("focusout", () => check());
  // A filter picked: let the picker go (iOS can keep the <select> focused), then lay out again.
  document.addEventListener("change", (e) => { if (e.target instanceof HTMLSelectElement) { e.target.blur(); check(); } }, true);
  vv?.addEventListener("resize", () => {
    const grew = vv.height - lastH > 120; // the keyboard or a picker went away
    lastH = vv.height;
    if (grew) check();
  });
  window.addEventListener("orientationchange", () => check());
  window.addEventListener("pageshow", () => check());
}
