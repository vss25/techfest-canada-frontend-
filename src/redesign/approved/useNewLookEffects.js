import { useEffect } from "react";

/* The new look's page-wide motion (Nov 25 2026, the owner: "I need scroll animations"):
   - spotlight: a soft pink light follows the pointer across a card (--x / --y on the card under it);
   - reveal: headings, cards, photos, numbers and logos come in one after another as they scroll into view
     (data-nx-r marks a piece waiting below the fold, .nx-seen brings it in; newLook.css has the moves);
   - drift: photos move a little slower than the page (the CSS `translate` property, so hover zooms still work);
   - progress: a thin pink line along the top shows how far down the page you are;
   - banners: their words ease away as they scroll off, and a giant outlined word slides behind each title.
   All decoration, and fail-safe: a piece is hidden only after the observer itself reports it below the fold, so
   a browser where the observer never runs shows everything. Nothing moves with "reduce motion". */
const CARDS = ".nx-card, .nx-pass, .p-card, .nx-stats, .nx-logos";
const REVEAL = [
  ".nx-head", ".nx-two > div", ".nx-card", ".nx-pass", ".nx-stats > div", ".nx-logo-run", ".nx-gal img", ".nx-tabs", ".nx-it",
  ".nl-panel", ".nx-prof > *", "main .p-card", "main section h2:not(.nx-h2)",
  // The older sections (every page): their content blocks, and on phones each piece of a section.
  "main > section:not([class]):not([data-dark]) > div", "main > section[data-dark]:not([class]):not(:first-child) > div",
].map((s) => `.ap-root ${s}`).concat([".ap-phone .ap-root main > section:not([class]) > *"]).join(", ");
const HERO = ".ap-root .nl-hero > .p-in, .ap-root .nl-hero > .m-in, .ap-root .nl-evhero > .p-in, .ap-root .nl-evhero > .m-in, .ap-root .nx-hero-in";
const GHOST = ".ap-root .nx-ghost-word";
const DRIFT = ".ap-root .nx-media img, .ap-root .nx-hero > img, .ap-root .nx-gal img";

/* "You're here" in the footer (Nov 26 2026, the owner: "Home page doesn't have you are here"). The boards mark an
   event's own page; this marks every other page: the footer link for the page being read gets aria-current, which
   newLook.css shows in pink with a "You're here" tag. Matched by the link's words, so it follows the boards. */
const FOOT_HERE = [
  [/^\/$/, "Home"], [/\/agenda$/, "Agenda"], [/^\/speakers(\/|$)/, "Speakers"], [/\/speakers$/, "Speakers"], [/^\/awards/, "Awards"],
  [/^\/partners/, "Partners"], [/^\/exhibitors/, "Exhibitors"], [/^\/about/, "About us"], [/^\/news/, "Newsroom"], [/^\/faqs?/, "FAQs"],
  [/^\/contact/, "Contact"], [/^\/exhibit$/, "Exhibit"], [/^\/(partner|sponsor)$/, "Partner with us"], [/^\/speak$/, "Apply to speak"],
  [/^\/media/, "Media accreditation"], [/^\/volunteer/, "Volunteer"], [/^\/highlights/, "Past events"],
  // An event's own page (Nov 27 2026, the owner: the Montreal page marked Vancouver; the board had Vancouver written in).
  [/^\/vancouver\/\d+\/briefing$/, "Vancouver City Briefing"], [/^\/montreal\/\d+\/briefing$/, "Montreal City Briefing"],
  [/^\/calgary\/\d+\/briefing$/, "Calgary City Briefing"], [/^\/toronto\/\d+\/briefing$/, "Toronto City Briefing"],
  [/^\/ottawa\/\d+\/briefing$/, "Ottawa City Briefing"], [/^\/toronto\/\d+\/national-festival$/, "Toronto Flagship"],
];
function markFooter() {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  const hit = FOOT_HERE.find(([re]) => re.test(path));
  const want = hit ? hit[1] : "";
  document.querySelectorAll(".ap-root footer a").forEach((a) => {
    const is = !!want && a.textContent.trim() === want;
    if (is) { if (a.getAttribute("aria-current") !== "page") { a.setAttribute("aria-current", "page"); a.classList.add("nl-here"); } }
    else if (a.classList.contains("nl-here")) { a.removeAttribute("aria-current"); a.classList.remove("nl-here"); }
  });
}

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
    markFooter();
    if (still) return () => document.removeEventListener("pointermove", move);

    const root = document.documentElement;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

    // ---- reveal ----
    // Every piece that starts below the fold is hidden straight away and brought in when it scrolls into view.
    // Fail-safe: if the observer hasn't reported anything shortly after it was given work (a background tab, a
    // crawler), everything is shown and the effect switches itself off.
    let alive = false;      // the observer has called back at least once
    let dead = false;       // switched off: show everything
    const show = (el) => {
      el.classList.add("nx-seen");
      // Once it has arrived, hand its transitions back (hover lifts must not inherit the entrance delay).
      later(() => { el.style.transitionDelay = ""; delete el.dataset.nxR; el.classList.remove("nx-seen"); }, 1700);
    };
    const io = new IntersectionObserver((entries) => {
      alive = true;
      entries.forEach((x) => {
        if (!x.isIntersecting) return;
        io.unobserve(x.target);
        if (x.target.dataset.nxR) show(x.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    const scan = () => {
      markFooter();
      if (dead) return;
      const vh = window.innerHeight;
      let added = false;
      document.querySelectorAll(REVEAL).forEach((el) => {
        if (el.dataset.nxO) return;
        el.dataset.nxO = "1";
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 || !r.height) return;       // on screen already (or not laid out): leave it alone
        // Pieces in a row come in one after another.
        const i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.transitionDelay = `${Math.min(i, 7) * 90}ms`;
        el.dataset.nxR = "1";
        io.observe(el);
        added = true;
      });
      if (added && !alive) {
        later(() => {
          if (alive) return;
          dead = true;
          document.querySelectorAll("[data-nx-r]").forEach((el) => { delete el.dataset.nxR; el.style.transitionDelay = ""; });
        }, 2500);
      }
    };

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
      // The banner's words ease away as it scrolls off; the giant words behind the titles slide sideways.
      document.querySelectorAll(HERO).forEach((box) => {
        const r = box.parentElement.getBoundingClientRect();
        const gone = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8)));
        box.style.setProperty("--hy", `${(gone * 70).toFixed(1)}px`);
        box.style.setProperty("--ho", (1 - gone).toFixed(2));
      });
      document.querySelectorAll(GHOST).forEach((w) => {
        const r = w.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        w.style.setProperty("--gx", `${(((vh - r.top) / vh) * 160 - 60).toFixed(1)}px`);
      });
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
