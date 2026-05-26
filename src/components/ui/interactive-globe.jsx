"use client";

import { useRef, useEffect, useCallback } from "react";

// ── EVENLY SPACED RINGS (no geographic clustering) ─────────────────────────
// 5 Pillars: lat +35, every 72° of longitude
// 5 Sectors: lat -35, offset by 36° so they interleave
const makePillar = (i, label) => ({ lat: 35,  lng: -180 + i * 72,       shortLabel: label, type: "pillar" });
const makeSector = (i, label) => ({ lat: -35, lng: -180 + 36 + i * 72,  shortLabel: label, type: "sector" });

const TECH_NODES = [
  makePillar(0, "AI"),
  makePillar(1, "Quantum"),
  makePillar(2, "Cyber"),
  makePillar(3, "Robotics"),
  makePillar(4, "DigitalTrust"),
  makeSector(0, "Healthcare"),
  makeSector(1, "Finance"),
  makeSector(2, "Defence"),
  makeSector(3, "Energy"),
  makeSector(4, "Manufacturing"),
];

// Connect each pillar to its nearest two sectors + ring connections
const CONNECTIONS = [
  // Pillar ring
  { from: [35, -180],      to: [35, -108] },
  { from: [35, -108],      to: [35, -36]  },
  { from: [35, -36],       to: [35,  36]  },
  { from: [35,  36],       to: [35, 108]  },
  { from: [35, 108],       to: [35, 180]  },
  // Sector ring
  { from: [-35, -144],     to: [-35, -72]  },
  { from: [-35, -72],      to: [-35,   0]  },
  { from: [-35,   0],      to: [-35,  72]  },
  { from: [-35,  72],      to: [-35, 144]  },
  { from: [-35, 144],      to: [-35, -144] },
  // Pillar ↔ Sector verticals (each pillar connects to adjacent sectors)
  { from: [35, -180],      to: [-35, -144] },
  { from: [35, -180],      to: [-35, -72]  },
  { from: [35, -108],      to: [-35, -144] },
  { from: [35, -108],      to: [-35, -72]  },
  { from: [35, -36],       to: [-35, -72]  },
  { from: [35, -36],       to: [-35,   0]  },
  { from: [35,  36],       to: [-35,   0]  },
  { from: [35,  36],       to: [-35,  72]  },
  { from: [35, 108],       to: [-35,  72]  },
  { from: [35, 108],       to: [-35, 144]  },
];

function latLngToXYZ(lat, lng, r) {
  const phi   = ((90 - lat)  * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
  ];
}
function rotateY(x, y, z, a) { const c=Math.cos(a),s=Math.sin(a); return [x*c+z*s, y, -x*s+z*c]; }
function rotateX(x, y, z, a) { const c=Math.cos(a),s=Math.sin(a); return [x, y*c-z*s, y*s+z*c]; }
function project(x, y, z, cx, cy, fov) { const sc=fov/(fov+z); return [x*sc+cx, y*sc+cy]; }

export function InteractiveGlobe({ className = "", size = 460, isDarkMode = true, autoRotateSpeed = 0.0018 }) {
  const canvasRef = useRef(null);
  const rotYRef   = useRef(0.3);
  const rotXRef   = useRef(0.15);
  const dragRef   = useRef({ active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0 });
  const animRef   = useRef(0);
  const timeRef   = useRef(0);
  const dotsRef   = useRef([]);

  useEffect(() => {
    const dots = [], N = 1400, gr = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < N; i++) {
      const theta = (2 * Math.PI * i) / gr;
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / N);
      dots.push([Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)]);
    }
    dotsRef.current = dots;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.clientWidth;
    const h   = canvas.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.40;
    const fov = 600;

    if (!dragRef.current.active) rotYRef.current += autoRotateSpeed;
    timeRef.current += 0.012;
    const t = timeRef.current, ry = rotYRef.current, rx = rotXRef.current;

    ctx.clearRect(0, 0, w, h);

    // Ambient glow
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.6);
    glowGrad.addColorStop(0, isDarkMode ? "rgba(122,63,209,0.07)" : "rgba(122,63,209,0.04)");
    glowGrad.addColorStop(1, "rgba(122,63,209,0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Globe outline
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isDarkMode ? "rgba(122,63,209,0.12)" : "rgba(122,63,209,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dot lattice
    for (const d of dotsRef.current) {
      let [x, y, z] = [d[0] * radius, d[1] * radius, d[2] * radius];
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      if (z > 0) continue;
      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const alpha = Math.max(0.08, 1 - (z + radius) / (2 * radius));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9 + alpha * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode
        ? `rgba(160,120,255,${(alpha * 0.5).toFixed(2)})`
        : `rgba(122,63,209,${(alpha * 0.32).toFixed(2)})`;
      ctx.fill();
    }

    // Connections
    for (const conn of CONNECTIONS) {
      let [x1, y1, z1] = latLngToXYZ(conn.from[0], conn.from[1], radius);
      let [x2, y2, z2] = latLngToXYZ(conn.to[0],   conn.to[1],   radius);
      [x1, y1, z1] = rotateX(x1, y1, z1, rx); [x1, y1, z1] = rotateY(x1, y1, z1, ry);
      [x2, y2, z2] = rotateX(x2, y2, z2, rx); [x2, y2, z2] = rotateY(x2, y2, z2, ry);
      if (z1 > radius * 0.3 && z2 > radius * 0.3) continue;
      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);
      const mX=(x1+x2)/2, mY=(y1+y2)/2, mZ=(z1+z2)/2;
      const mLen = Math.sqrt(mX*mX + mY*mY + mZ*mZ);
      const ah = radius * 1.22;
      const [scx, scy] = project((mX/mLen)*ah, (mY/mLen)*ah, (mZ/mLen)*ah, cx, cy, fov);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(scx, scy, sx2, sy2);
      ctx.strokeStyle = isDarkMode ? "rgba(160,100,255,0.30)" : "rgba(122,63,209,0.22)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Travelling bead
      const tp = (Math.sin(t * 1.1 + conn.from[0] * 0.12 + conn.from[1] * 0.03) + 1) / 2;
      const bx = (1-tp)*(1-tp)*sx1 + 2*(1-tp)*tp*scx + tp*tp*sx2;
      const by = (1-tp)*(1-tp)*sy1 + 2*(1-tp)*tp*scy + tp*tp*sy2;
      ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? "rgba(245,166,35,0.9)" : "rgba(200,120,0,0.85)";
      ctx.fill();
      const bGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
      bGlow.addColorStop(0, "rgba(245,166,35,0.35)");
      bGlow.addColorStop(1, "rgba(245,166,35,0)");
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = bGlow; ctx.fill();
    }

    // Nodes
    for (const node of TECH_NODES) {
      let [x, y, z] = latLngToXYZ(node.lat, node.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      if (z > radius * 0.1) continue;
      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const isPillar = node.type === "pillar";
      const pulse = Math.sin(t * 2.2 + node.lng * 0.05) * 0.5 + 0.5;
      const rA = 0.20 + pulse * 0.25;

      // Outer pulse ring
      ctx.beginPath(); ctx.arc(sx, sy, 6 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = isPillar ? `rgba(245,166,35,${rA})` : `rgba(160,80,255,${rA})`;
      ctx.lineWidth = 1; ctx.stroke();

      // Mid ring
      ctx.beginPath(); ctx.arc(sx, sy, 4 + pulse * 2, 0, Math.PI * 2);
      ctx.strokeStyle = isPillar ? `rgba(245,166,35,${rA+0.2})` : `rgba(160,100,255,${rA+0.2})`;
      ctx.lineWidth = 0.8; ctx.stroke();

      // Core dot with glow
      const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, isPillar ? 5 : 4);
      if (isPillar) {
        cg.addColorStop(0, "rgba(255,230,120,1)");
        cg.addColorStop(1, "rgba(245,166,35,0.9)");
      } else {
        cg.addColorStop(0, "rgba(210,170,255,1)");
        cg.addColorStop(1, "rgba(140,80,230,0.9)");
      }
      ctx.beginPath(); ctx.arc(sx, sy, isPillar ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // Label with background pill for readability
      if (node.shortLabel) {
        const label = node.shortLabel;
        ctx.font = `${isPillar ? "bold " : ""}10px monospace`;
        const tw = ctx.measureText(label).width;
        const lx = sx + 10, ly = sy + 4;

        // Pill background
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(lx - 3, ly - 11, tw + 6, 14, 3)
          : ctx.rect(lx - 3, ly - 11, tw + 6, 14);
        ctx.fillStyle = isDarkMode ? "rgba(10,5,25,0.65)" : "rgba(255,255,255,0.70)";
        ctx.fill();

        // Label text
        ctx.fillStyle = isPillar
          ? "rgba(255,195,60,1)"
          : isDarkMode ? "rgba(200,160,255,1)" : "rgba(110,55,200,1)";
        ctx.fillText(label, lx, ly);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [isDarkMode, autoRotateSpeed]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const onPointerDown = useCallback((e) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startRotY: rotYRef.current, startRotX: rotXRef.current };
    e.target.setPointerCapture(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    rotYRef.current = dragRef.current.startRotY + (e.clientX - dragRef.current.startX) * 0.005;
    rotXRef.current = Math.max(-1, Math.min(1, dragRef.current.startRotX + (e.clientY - dragRef.current.startY) * 0.005));
  }, []);
  const onPointerUp = useCallback(() => { dragRef.current.active = false; }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
