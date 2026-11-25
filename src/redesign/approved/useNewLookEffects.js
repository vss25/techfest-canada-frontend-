import { useEffect } from "react";

/* The new look's two page-wide effects (Nov 25 2026):
   - spotlight: a soft pink light follows the pointer across a card (--x / --y on the card under it; newLook.css);
   - reveal: sections rise in as they scroll into view (.nx-reveal on <html> arms it; data-nx-r marks a section
     waiting below the fold, .nx-seen shows it).
   Both are decoration: no pointer, no IntersectionObserver or "reduce motion" = everything simply shows. */
const CARDS = ".nx-card, .nx-pass, .p-card, .nx-stats, .nx-logos";
const REVEAL = ".ap-root .nx-s > .nx-wrap, .ap-root .nl-panel";

export default function useNewLookEffects(on) {
  useEffect(() => {
    if (!on || typeof window === "undefined") return undefined;
    const move = (e) => {
      const card = e.target && e.target.closest ? e.target.closest(CARDS) : null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - r.left}px`);
      card.style.setProperty("--y", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });

    const still = !window.IntersectionObserver || !window.MutationObserver
      || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let io = null;
    let mo = null;
    let timer = 0;
    const root = document.documentElement;
    if (!still) {
      // A section is hidden only once the observer itself has reported it below the fold, so a browser where the
      // observer never runs (a background tab, some crawlers) shows everything as normal.
      io = new IntersectionObserver((entries) => {
        entries.forEach((x) => {
          if (x.isIntersecting) { x.target.classList.add("nx-seen"); io.unobserve(x.target); }
          else if (!x.target.classList.contains("nx-seen")) x.target.dataset.nxR = "1";
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      const scan = () => document.querySelectorAll(REVEAL).forEach((el) => {
        if (el.dataset.nxO) return;
        el.dataset.nxO = "1";
        io.observe(el);
      });
      scan();
      root.classList.add("nx-reveal");
      mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 60); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      document.removeEventListener("pointermove", move);
      if (io) io.disconnect();
      if (mo) mo.disconnect();
      clearTimeout(timer);
      root.classList.remove("nx-reveal");
    };
  }, [on]);
}
