"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────
   STRATEGIC TAXONOMY
   Each pillar / sector now carries its sub-items. To add or remove
   nodes later, just edit these two arrays — the ring geometry and
   connection graph rebuild themselves.
───────────────────────────────────────────────────────────────── */

const PILLARS = [
  {
    id: "ai",
    label: "AI",
    fullLabel: "Artificial Intelligence",
    subItems: [
      "Machine Learning",
      "Deep Learning",
      "Generative AI & LLMs",
      "Computer Vision",
      "Natural Language Processing",
      "Foundation Models",
      "Agentic AI",
    ],
  },
  {
    id: "ai-gov",
    label: "AI Gov",
    fullLabel: "AI Governance & Compliance",
    subItems: [
      "Responsible AI",
      "Ethics & Bias Mitigation",
      "Regulation & Policy",
      "Certification & Audit",
      "Risk Management",
      "Standards & Frameworks",
      "Trustworthy AI",
    ],
  },
  {
    id: "quantum",
    label: "Quantum",
    fullLabel: "Quantum Technologies",
    subItems: [
      "Quantum Computing",
      "Quantum Cryptography",
      "Post-Quantum Security",
      "Quantum Sensing",
      "Quantum Networking",
      "Quantum Hardware",
    ],
  },
  {
    id: "cyber",
    label: "Cyber",
    fullLabel: "Cybersecurity",
    subItems: [
      "Zero Trust Architecture",
      "Threat Intelligence",
      "Cloud Security",
      "Identity & Access",
      "DevSecOps",
      "Incident Response",
      "Application Security",
    ],
  },
  {
    id: "robotics",
    label: "Robotics",
    fullLabel: "Robotics & Physical AI",
    subItems: [
      "Humanoid Robotics",
      "Autonomous Systems",
      "Drones & UAVs",
      "Collaborative Robots",
      "Industrial Automation",
      "Embedded Systems",
    ],
  },
  {
    id: "blockchain",
    label: "Blockchain",
    fullLabel: "Blockchain & Web3",
    subItems: [
      "Distributed Ledger",
      "Smart Contracts",
      "Tokenization",
      "Decentralized Finance",
      "Digital Assets",
      "Web3 Infrastructure",
    ],
  },
  {
    id: "trust",
    label: "DigitalTrust",
    fullLabel: "Digital Trust & Identity",
    subItems: [
      "Identity Management",
      "Privacy Engineering",
      "Authentication",
      "Data Protection",
      "Encryption",
      "Verifiable Credentials",
    ],
  },
];

const SECTORS = [
  {
    id: "healthcare",
    label: "Healthcare",
    fullLabel: "Healthcare & Life Sciences",
    subItems: [
      "MedTech & Devices",
      "Biotech & Pharma",
      "Digital Health",
      "Telemedicine",
      "Genomics",
      "Clinical AI",
      "Mental Health Tech",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    fullLabel: "Financial Services",
    subItems: [
      "FinTech",
      "Capital Markets",
      "InsurTech",
      "Digital Payments",
      "WealthTech",
      "RegTech",
      "Banking Infrastructure",
    ],
  },
  {
    id: "defence",
    label: "Defence",
    fullLabel: "Public Sector & Defence",
    subItems: [
      "National Security",
      "GovTech",
      "Military Systems",
      "Strategic Procurement",
      "Border & Public Safety",
      "Intelligence Tech",
    ],
  },
  {
    id: "energy",
    label: "Energy",
    fullLabel: "Energy & Infrastructure",
    subItems: [
      "Renewables",
      "Smart Grid",
      "Energy Storage",
      "Nuclear & SMR",
      "Hydrogen Economy",
      "Grid Modernization",
    ],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    fullLabel: "Manufacturing & Supply Chain",
    subItems: [
      "Industry 4.0",
      "Smart Factory",
      "Supply Chain Tech",
      "Additive Manufacturing",
      "Digital Twin",
      "Industrial IoT",
    ],
  },
  {
    id: "aerospace",
    label: "Aerospace",
    fullLabel: "Aerospace & Space Systems",
    subItems: [
      "Space Systems",
      "Satellite Tech",
      "Earth Observation",
      "Launch Infrastructure",
      "Aviation Technology",
      "Defence Aerospace",
    ],
  },
  {
    id: "smart-cities",
    label: "SmartCities",
    fullLabel: "Smart Cities & Green Tech",
    subItems: [
      "Urban IoT",
      "Smart Mobility",
      "Sustainable Infrastructure",
      "Climate Tech",
      "Public Transportation",
      "Green Buildings",
    ],
  },
  {
    id: "resilience",
    label: "Resilience",
    fullLabel: "Disaster Resilience & Public Safety",
    subItems: [
      "Emergency Management",
      "Climate Adaptation",
      "Crisis Response Tech",
      "Risk Modeling",
      "Public Safety Systems",
      "Critical Infrastructure",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────
   Build node positions on the globe.
   Pillars: top ring at lat +35, evenly spaced around the globe.
   Sectors: bottom ring at lat -35, offset half a step to interleave.
───────────────────────────────────────────────────────────────── */

const PILLAR_STEP = 360 / PILLARS.length;
const SECTOR_STEP = 360 / SECTORS.length;
const SECTOR_OFFSET = SECTOR_STEP / 2;

const TECH_NODES = [
  ...PILLARS.map((p, i) => ({
    ...p,
    lat: 35,
    lng: -180 + i * PILLAR_STEP,
    type: "pillar",
  })),
  ...SECTORS.map((s, i) => ({
    ...s,
    lat: -35,
    lng: -180 + SECTOR_OFFSET + i * SECTOR_STEP,
    type: "sector",
  })),
];

/* ─────────────────────────────────────────────────────────────────
   Build connections dynamically:
   • Ring connections within each layer (pillars-to-pillars, sectors-to-sectors)
   • Each pillar links to its 2 angularly-nearest sectors
───────────────────────────────────────────────────────────────── */

function angularDistance(a, b) {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

const CONNECTIONS = (() => {
  const conns = [];
  // Pillar ring
  for (let i = 0; i < PILLARS.length; i++) {
    const a = TECH_NODES[i];
    const b = TECH_NODES[(i + 1) % PILLARS.length];
    conns.push({ from: [a.lat, a.lng], to: [b.lat, b.lng] });
  }
  // Sector ring
  for (let i = 0; i < SECTORS.length; i++) {
    const a = TECH_NODES[PILLARS.length + i];
    const b = TECH_NODES[PILLARS.length + ((i + 1) % SECTORS.length)];
    conns.push({ from: [a.lat, a.lng], to: [b.lat, b.lng] });
  }
  // Each pillar → 2 nearest sectors
  for (let pi = 0; pi < PILLARS.length; pi++) {
    const pillar = TECH_NODES[pi];
    const distances = SECTORS.map((_, si) => {
      const sector = TECH_NODES[PILLARS.length + si];
      return { si, diff: angularDistance(pillar.lng, sector.lng) };
    }).sort((a, b) => a.diff - b.diff);
    for (let k = 0; k < 2; k++) {
      const sector = TECH_NODES[PILLARS.length + distances[k].si];
      conns.push({ from: [pillar.lat, pillar.lng], to: [sector.lat, sector.lng] });
    }
  }
  return conns;
})();

/* ─────────────────────────────────────────────────────────────────
   3D math helpers
───────────────────────────────────────────────────────────────── */

function latLngToXYZ(lat, lng, r) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}
function rotateY(x, y, z, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, y, -x * s + z * c]; }
function rotateX(x, y, z, a) { const c = Math.cos(a), s = Math.sin(a); return [x, y * c - z * s, y * s + z * c]; }
function project(x, y, z, cx, cy, fov) { const sc = fov / (fov + z); return [x * sc + cx, y * sc + cy]; }

/* ─────────────────────────────────────────────────────────────────
   Main globe component
───────────────────────────────────────────────────────────────── */

export function InteractiveGlobe({
  className = "",
  size = 460,
  isDarkMode = true,
  autoRotateSpeed = 0.0018,
}) {
  const canvasRef = useRef(null);
  const rotYRef = useRef(0.3);
  const rotXRef = useRef(0.15);
  const dragRef = useRef({
    active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0, moved: false,
  });
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const dotsRef = useRef([]);
  // Updated each frame — maps node id → screen position + visibility
  const nodePositionsRef = useRef(new Map());

  const [selected, setSelected] = useState(null); // { node, x, y } | null

  // Pause auto-rotation while a dropdown is open
  const effectiveRotateSpeed = selected ? 0 : autoRotateSpeed;

  // Generate Fibonacci dot lattice once
  useEffect(() => {
    const dots = [], N = 1400, gr = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < N; i++) {
      const theta = (2 * Math.PI * i) / gr;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
      dots.push([Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)]);
    }
    dotsRef.current = dots;
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.40;
    const fov = 600;

    if (!dragRef.current.active) rotYRef.current += effectiveRotateSpeed;
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
      let [x2, y2, z2] = latLngToXYZ(conn.to[0], conn.to[1], radius);
      [x1, y1, z1] = rotateX(x1, y1, z1, rx); [x1, y1, z1] = rotateY(x1, y1, z1, ry);
      [x2, y2, z2] = rotateX(x2, y2, z2, rx); [x2, y2, z2] = rotateY(x2, y2, z2, ry);
      if (z1 > radius * 0.3 && z2 > radius * 0.3) continue;
      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);
      const mX = (x1 + x2) / 2, mY = (y1 + y2) / 2, mZ = (z1 + z2) / 2;
      const mLen = Math.sqrt(mX * mX + mY * mY + mZ * mZ);
      const ah = radius * 1.22;
      const [scx, scy] = project((mX / mLen) * ah, (mY / mLen) * ah, (mZ / mLen) * ah, cx, cy, fov);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(scx, scy, sx2, sy2);
      ctx.strokeStyle = isDarkMode ? "rgba(160,100,255,0.30)" : "rgba(122,63,209,0.22)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Travelling bead
      const tp = (Math.sin(t * 1.1 + conn.from[0] * 0.12 + conn.from[1] * 0.03) + 1) / 2;
      const bx = (1 - tp) * (1 - tp) * sx1 + 2 * (1 - tp) * tp * scx + tp * tp * sx2;
      const by = (1 - tp) * (1 - tp) * sy1 + 2 * (1 - tp) * tp * scy + tp * tp * sy2;
      ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? "rgba(245,166,35,0.9)" : "rgba(200,120,0,0.85)";
      ctx.fill();
      const bGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
      bGlow.addColorStop(0, "rgba(245,166,35,0.35)");
      bGlow.addColorStop(1, "rgba(245,166,35,0)");
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = bGlow; ctx.fill();
    }

    // Nodes — and snapshot their positions for hit-testing
    const positions = new Map();
    for (const node of TECH_NODES) {
      let [x, y, z] = latLngToXYZ(node.lat, node.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      const visible = z <= radius * 0.1;
      if (!visible) {
        positions.set(node.id, { sx: 0, sy: 0, visible: false, node });
        continue;
      }
      const [sx, sy] = project(x, y, z, cx, cy, fov);
      positions.set(node.id, { sx, sy, visible: true, node });

      const isPillar = node.type === "pillar";
      const isSelected = selected && selected.node.id === node.id;
      const pulse = Math.sin(t * 2.2 + node.lng * 0.05) * 0.5 + 0.5;
      const rA = 0.20 + pulse * 0.25;

      // Outer pulse ring — brighter & larger when selected
      ctx.beginPath();
      ctx.arc(sx, sy, (isSelected ? 10 : 6) + pulse * (isSelected ? 8 : 6), 0, Math.PI * 2);
      ctx.strokeStyle = isPillar
        ? `rgba(245,166,35,${isSelected ? Math.min(1, rA + 0.45) : rA})`
        : `rgba(160,80,255,${isSelected ? Math.min(1, rA + 0.45) : rA})`;
      ctx.lineWidth = isSelected ? 1.6 : 1;
      ctx.stroke();

      // Mid ring
      ctx.beginPath();
      ctx.arc(sx, sy, (isSelected ? 6 : 4) + pulse * 2, 0, Math.PI * 2);
      ctx.strokeStyle = isPillar
        ? `rgba(245,166,35,${rA + 0.2})`
        : `rgba(160,100,255,${rA + 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Core dot with glow
      const coreR = isSelected ? (isPillar ? 6 : 5) : (isPillar ? 4.5 : 3.5);
      const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR + 1);
      if (isPillar) {
        cg.addColorStop(0, "rgba(255,230,120,1)");
        cg.addColorStop(1, "rgba(245,166,35,0.9)");
      } else {
        cg.addColorStop(0, "rgba(210,170,255,1)");
        cg.addColorStop(1, "rgba(140,80,230,0.9)");
      }
      ctx.beginPath();
      ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();

      // Label pill
      if (node.label) {
        const label = node.label;
        ctx.font = `${isPillar ? "bold " : ""}10px monospace`;
        const tw = ctx.measureText(label).width;
        const lx = sx + 10, ly = sy + 4;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx - 3, ly - 11, tw + 6, 14, 3);
        else ctx.rect(lx - 3, ly - 11, tw + 6, 14);
        ctx.fillStyle = isSelected
          ? (isPillar ? "rgba(245,166,35,0.18)" : "rgba(140,80,230,0.18)")
          : (isDarkMode ? "rgba(10,5,25,0.65)" : "rgba(255,255,255,0.70)");
        ctx.fill();

        ctx.fillStyle = isPillar
          ? "rgba(255,195,60,1)"
          : isDarkMode ? "rgba(200,160,255,1)" : "rgba(110,55,200,1)";
        ctx.fillText(label, lx, ly);
      }
    }
    nodePositionsRef.current = positions;

    animRef.current = requestAnimationFrame(draw);
  }, [isDarkMode, effectiveRotateSpeed, selected]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* Pointer handlers */
  const onPointerDown = useCallback((e) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotYRef.current,
      startRotX: rotXRef.current,
    };
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      dragRef.current.moved = true;
      // Close any open dropdown the moment the user starts rotating
      if (selected) setSelected(null);
    }
    if (dragRef.current.moved) {
      rotYRef.current = dragRef.current.startRotY + dx * 0.005;
      rotXRef.current = Math.max(
        -1,
        Math.min(1, dragRef.current.startRotX + dy * 0.005)
      );
    }
  }, [selected]);

  const onPointerUp = useCallback((e) => {
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    if (wasDrag) return;
    // Treat as a click — hit-test
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let closest = null, closestDist = 18;
    nodePositionsRef.current.forEach((p) => {
      if (!p.visible) return;
      const dx = p.sx - x, dy = p.sy - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) { closest = p; closestDist = d; }
    });

    if (closest) {
      setSelected({ node: closest.node, x: closest.sx, y: closest.sy });
    } else {
      setSelected(null);
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
      }}
    >
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: size, height: size, cursor: selected ? "default" : "grab", display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {selected && (
        <NodeDropdown
          node={selected.node}
          anchorX={selected.x}
          anchorY={selected.y}
          containerSize={size}
          isDarkMode={isDarkMode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Floating dropdown panel
   Auto-flips to the left if the node sits near the right edge,
   and clamps vertically to stay inside the container.
───────────────────────────────────────────────────────────────── */

function NodeDropdown({ node, anchorX, anchorY, containerSize, isDarkMode, onClose }) {
  const PANEL_W = 240;
  const PANEL_MAX_H = Math.min(360, containerSize - 40);

  // Horizontal placement: prefer right of node, flip left if no room
  const offset = 18;
  const placeRight = anchorX + offset + PANEL_W < containerSize - 8;
  const left = placeRight ? anchorX + offset : Math.max(8, anchorX - offset - PANEL_W);

  // Vertical placement: center on node, clamp inside container
  let top = anchorY - 40;
  top = Math.max(8, Math.min(top, containerSize - PANEL_MAX_H - 8));

  const isPillar = node.type === "pillar";
  const accent = isPillar ? "#f5a623" : "#a878ff";
  const accentSoft = isPillar ? "rgba(245,166,35,0.18)" : "rgba(168,120,255,0.20)";
  const accentBorder = isPillar ? "rgba(245,166,35,0.42)" : "rgba(168,120,255,0.42)";

  const panelBg = isDarkMode
    ? "rgba(14,7,34,0.92)"
    : "rgba(255,255,255,0.96)";
  const panelBorder = isDarkMode
    ? "rgba(255,255,255,0.10)"
    : "rgba(0,0,0,0.10)";
  const headerText = isDarkMode ? "#ffffff" : "#0d0520";
  const itemText = isDarkMode ? "rgba(255,255,255,0.82)" : "rgba(13,5,32,0.78)";
  const mutedText = isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(13,5,32,0.45)";

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top,
        left,
        width: PANEL_W,
        maxHeight: PANEL_MAX_H,
        background: panelBg,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${panelBorder}`,
        borderLeft: `2px solid ${accent}`,
        borderRadius: 10,
        boxShadow: isDarkMode
          ? "0 12px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
          : "0 12px 36px rgba(122,63,209,0.18)",
        overflow: "hidden",
        zIndex: 20,
        animation: "ttfc-globe-pop 0.18s ease-out",
      }}
    >
      <style>{`
        @keyframes ttfc-globe-pop {
          from { opacity: 0; transform: scale(0.94) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ttfc-globe-item:hover { background: ${accentSoft} !important; }
        .ttfc-globe-close:hover { background: ${accentSoft} !important; color: ${accent} !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "12px 14px 10px", position: "relative" }}>
        <div
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            background: accentSoft,
            color: accent,
            border: `1px solid ${accentBorder}`,
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {isPillar ? "Tech Pillar" : "Applied Sector"}
        </div>
        <div
          style={{
            color: headerText,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            paddingRight: 24,
          }}
        >
          {node.fullLabel}
        </div>
        <button
          aria-label="Close"
          className="ttfc-globe-close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "none",
            background: "transparent",
            color: mutedText,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${accent}55, transparent)`,
          margin: "0 14px",
        }}
      />

      {/* Sub-items */}
      <div
        style={{
          padding: "8px 6px 10px",
          maxHeight: PANEL_MAX_H - 80,
          overflowY: "auto",
        }}
      >
        {node.subItems.map((item, i) => (
          <div
            key={item}
            className="ttfc-globe-item"
            style={{
              padding: "7px 10px",
              borderRadius: 5,
              color: itemText,
              fontFamily: "monospace",
              fontSize: 11.5,
              lineHeight: 1.4,
              cursor: "default",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background 0.12s",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: accent,
                flexShrink: 0,
                opacity: 0.7,
              }}
            />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
