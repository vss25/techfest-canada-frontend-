/* =========================================================
   A small confetti burst on a canvas (Oct 26 2026), for the swag
   kit winners card (components/SwagWinners.jsx). No library: one
   fixed full-screen canvas that ignores taps and screen readers,
   a few seconds of paper in the brand colours falling with a
   little drag, then it removes itself. Nothing at all with
   Reduce Motion, or where there's no canvas.
   confettiBurst({ big }) → a function that stops it early.
========================================================= */

const COLORS = ["#7a3fd1", "#b99eff", "#f5a623", "#d9468f", "#ffd27a", "#ffffff", "#2fa36b"];

export function prefersReducedMotion() {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** One burst. `big`: more paper from both sides as well (a winner's own). */
export function confettiBurst({ big = false, duration = big ? 3800 : 2600 } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined" || prefersReducedMotion()) return () => {};
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return () => {};
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "2147483000" });
  document.body.appendChild(canvas);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.scale(dpr, dpr);

  const parts = [];
  const shoot = (n, x, y, angle, spread, speed) => {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.55 + Math.random() * 0.6);
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: 6 + Math.random() * 6, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() < 0.25, wobble: Math.random() * Math.PI * 2,
      });
    }
  };
  const scale = Math.min(1.2, Math.max(0.7, w / 420));
  shoot(big ? 130 : 90, w / 2, h * 0.32, -Math.PI / 2, Math.PI * 0.9, 13 * scale);
  if (big) {
    shoot(70, 0, h * 0.62, -Math.PI / 3, Math.PI / 4, 16 * scale);
    shoot(70, w, h * 0.62, (-2 * Math.PI) / 3, Math.PI / 4, 16 * scale);
  }

  let raf = 0;
  let last = 0;
  const start = performance.now();
  const stop = () => { cancelAnimationFrame(raf); canvas.remove(); };
  const frame = (t) => {
    const elapsed = t - start;
    const dt = Math.min(2.5, last ? (t - last) / 16.67 : 1);
    last = t;
    ctx.clearRect(0, 0, w, h);
    const fade = elapsed > duration - 700 ? Math.max(0, (duration - elapsed) / 700) : 1;
    ctx.globalAlpha = fade;
    for (const p of parts) {
      p.vx *= 0.986 ** dt;
      p.vy = p.vy * 0.986 ** dt + 0.32 * dt;
      p.wobble += 0.12 * dt;
      p.x += (p.vx + Math.sin(p.wobble) * 0.6) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 20) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, Math.max(1.5, (p.size / 2) * Math.abs(Math.cos(p.rot * 1.7))));
      ctx.restore();
    }
    if (elapsed < duration) raf = requestAnimationFrame(frame);
    else stop();
  };
  raf = requestAnimationFrame(frame);
  return stop;
}
