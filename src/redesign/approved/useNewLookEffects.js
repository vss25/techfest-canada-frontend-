import { useEffect } from "react";

/* The new look's page-wide motion (Nov 25 2026, the owner: "I need scroll animations"):
   - spotlight: a soft pink light follows the pointer across a card (--x / --y on the card under it);
   - reveal: headings, cards, photos, numbers and logos come in one after another as they scroll into view
     (data-nx-r marks a piece waiting below the fold, .nx-seen brings it in; newLook.css has the moves);
   - drift: photos move a little slower than the page (the CSS `translate` property, so hover zooms still work);
   - progress: a thin pink line along the top shows how far down the page you are.
   All decoration, and fail-safe: a piece is hidden only after the observer itself reports it below the fold, so
   a browser where the observer never runs shows everything. Nothing moves with "reduce motion". */
const CARDS = ".nx-card, .nx-pass, .p-card, .nx-stats, .nx-logos";
const REVEAL = [
  ".nx-head", ".nx-two > div", ".nx-card", ".nx-pass", ".nx-stats > div", ".nx-logos > div", ".nx-gal img", ".nx-tabs",
  ".nl-panel", ".nx-prof > *", "main .p-card", "main section h2:not(.nx-h2)",
].map((s) => `.ap-root ${s}`).join(", ");
const DRIFT = ".ap-root .nx-media img, .ap-root .nx-hero > img, .ap-root .nx-gal img";

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

    const still = !window.IntersectionObserver || !window.MutationObserver || !window.requestAnimationFrame
      || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still) return () => document.removeEventListener("pointermove", move);

    const root = document.documentElement;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

    // ---- reveal ----
    const io = new IntersectionObserver((entries) => {
      entries.forEach((x) => {
        const el = x.target;
        if (x.isIntersecting) {
          io.unobserve(el);
          if (!el.dataset.nxR) return;            // it was on screen from the start: leave it alone
          el.classList.add("nx-seen");
          // Once it has arrived, hand its transitions back (hover lifts must not inherit the entrance delay).
          later(() => { el.style.transitionDelay = ""; delete el.dataset.nxR; el.classList.remove("nx-seen"); }, 1400);
        } else if (!el.dataset.nxR) {
          // Pieces in a row come in one after another.
          const i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
          el.style.transitionDelay = `${Math.min(i, 7) * 80}ms`;
          el.dataset.nxR = "1";
        }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    const scan = () => document.querySelectorAll(REVEAL).forEach((el) => {
      if (el.dataset.nxO) return;
      el.dataset.nxO = "1";
      io.observe(el);
    });

    // ---- drift + progress ----
    const bar = document.createElement("div");
    bar.className = "nx-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let raf = 0;
    let scroller = null;
    const frame = () => {
      raf = 0;
      const el = scroller && scroller !== document ? scroller : document.scrollingElement || root;
      const max = el.scrollHeight - el.clientHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, el.scrollTop / max) : 0})`;
      const vh = window.innerHeight;
      document.querySelectorAll(DRIFT).forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const k = (r.top + r.height / 2 - vh / 2) / vh;       // -0.5 … 0.5 across the screen
        img.style.translate = `0 ${(k * -34).toFixed(1)}px`;
      });
    };
    const onScroll = (e) => {
      const t = e.target;
      // The page itself, or the phone layout's own scroller.
      if (t !== document && !(t.classList && t.classList.contains("m-scroll"))) return;
      scroller = t;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    scan();
    frame();
    root.classList.add("nx-reveal");
    let timer = 0;
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { scan(); if (!raf) raf = requestAnimationFrame(frame); }, 80); });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("scroll", onScroll, { capture: true });
      io.disconnect();
      mo.disconnect();
      clearTimeout(timer);
      timers.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
      bar.remove();
      root.classList.remove("nx-reveal");
      document.querySelectorAll("[data-nx-r]").forEach((el) => { delete el.dataset.nxR; el.style.transitionDelay = ""; });
    };
  }, [on]);
}
