"use client";

import { useRef, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────────────────────────────────
// TTFC INNOVATION FRAMEWORK — 9 Tech Pillars × 11 Applied Sectors
// Exported so the Home page can render matching accordions/dropdowns.
// ──────────────────────────────────────────────────────────────────────────

export const TECH_PILLARS = [
  {
    id: "ai",
    shortLabel: "AI",
    title: "AI, Augmented Intelligence & Autonomous Systems",
    subsections: [
      "Generative AI and foundation models",
      "Enterprise AI deployment and governance",
      "Autonomous decision systems",
      "Human–AI collaboration",
      "Ethical AI and trust frameworks",
    ],
  },
  {
    id: "quantum",
    shortLabel: "Quantum",
    title: "Quantum Technologies",
    subsections: [
      "Quantum computing hardware and algorithms",
      "Quantum communications and encryption",
      "Post-quantum cryptography",
      "Quantum sensing and detection",
      "Commercialization pathways",
    ],
  },
  {
    id: "cyber",
    shortLabel: "Cyber",
    title: "Cybersecurity & Digital Trust",
    subsections: [
      "Zero trust architectures",
      "Threat intelligence and cyber defence",
      "Identity and access management",
      "Critical infrastructure protection",
      "AI-driven cyber defence",
    ],
  },
  {
    id: "robotics",
    shortLabel: "Robotics",
    title: "Robotics & Intelligent Automation",
    subsections: [
      "Industrial robotics",
      "Autonomous vehicles and drones",
      "Smart manufacturing systems",
      "Robotic process automation",
      "Human–machine interfaces",
    ],
  },
  {
    id: "cleantech",
    shortLabel: "CleanTech",
    title: "Sustainability & Clean Technology",
    subsections: [
      "Carbon capture and climate tech",
      "Smart energy systems",
      "ESG data and reporting platforms",
      "Circular economy technologies",
      "Green infrastructure innovation",
    ],
  },
  {
    id: "cloud",
    shortLabel: "Cloud",
    title: "Data Infrastructure & Cloud Ecosystems",
    subsections: [
      "Cloud computing and hyperscale systems",
      "Data lakes and real-time analytics",
      "Edge computing and distributed systems",
      "Data governance and sovereignty",
      "Digital twin environments",
    ],
  },
  {
    id: "connect",
    shortLabel: "Connect",
    title: "Advanced Connectivity & Communications",
    subsections: [
      "5G and next-generation networks",
      "Satellite communications and space-based internet",
      "Internet of Things ecosystems",
      "Secure communications platforms",
      "Network resilience and redundancy",
    ],
  },
  {
    id: "human",
    shortLabel: "Human+",
    title: "Human Augmentation & Future Interfaces",
    subsections: [
      "Wearable technologies",
      "Brain–computer interfaces",
      "Extended reality and spatial computing",
      "Biometric systems",
      "Digital identity and human enhancement",
    ],
  },
  {
    id: "aigov",
    shortLabel: "AI Gov",
    title: "AI Governance & Compliance",
    subsections: [
      "AI policy, regulation and global standards",
      "Ethical AI and responsible deployment",
      "AI risk management and assurance",
      "Data governance, privacy and sovereignty",
      "Certification, compliance and trust frameworks",
    ],
  },
];

export const APPLIED_SECTORS = [
  {
    id: "health",
    shortLabel: "Health",
    title: "Healthcare & Life Sciences",
    subsections: [
      "Precision medicine",
      "AI diagnostics and imaging",
      "Digital health platforms",
      "Biotech innovation",
      "Public health systems",
    ],
  },
  {
    id: "finance",
    shortLabel: "Finance",
    title: "Banking, Financial Services & Fintech",
    subsections: [
      "Digital banking and neobanks",
      "Blockchain and digital assets",
      "Fraud detection and risk systems",
      "Regulatory technology",
      "Payment innovation",
    ],
  },
  {
    id: "supply",
    shortLabel: "Supply",
    title: "Supply Chain, Manufacturing & Infrastructure",
    subsections: [
      "Smart factories and Industry 4.0",
      "Logistics optimization",
      "Digital supply networks",
      "Infrastructure resilience",
      "Construction technology",
    ],
  },
  {
    id: "defence",
    shortLabel: "Defence",
    title: "Defence & Public Safety",
    subsections: [
      "Cyber defence and cyber readiness",
      "Intelligence systems",
      "Surveillance and situational awareness",
      "Emergency response technologies",
      "National security infrastructure",
    ],
  },
  {
    id: "energy",
    shortLabel: "Energy",
    title: "Energy & Utilities",
    subsections: [
      "Smart grids and grid security",
      "Renewable energy technologies",
      "Energy storage solutions",
      "Nuclear innovation and SMRs",
      "Energy trading systems",
    ],
  },
  {
    id: "cities",
    shortLabel: "Cities",
    title: "Smart Cities & Green Tech",
    subsections: [
      "Urban digital infrastructure",
      "Smart mobility integration",
      "Sustainable urban planning",
      "Climate monitoring systems",
      "Green building technologies",
    ],
  },
  {
    id: "mobility",
    shortLabel: "Mobility",
    title: "Transportation, Aerospace & Mobility",
    subsections: [
      "Autonomous transportation",
      "Aviation innovation",
      "Urban mobility systems",
      "Drone logistics",
      "Space-enabled transportation",
    ],
  },
  {
    id: "education",
    shortLabel: "Edu",
    title: "Education, Workforce & Digital Society",
    subsections: [
      "Future of work and skills development",
      "Cyber education pipelines",
      "EdTech platforms",
      "Digital inclusion",
      "Workforce transformation",
    ],
  },
  {
    id: "space",
    shortLabel: "Space",
    title: "Aerospace, Space & Defence Systems",
    subsections: [
      "Satellite systems and space infrastructure",
      "Space commercialization",
      "Defence aerospace platforms",
      "Orbital security",
      "Advanced propulsion and systems",
    ],
  },
  {
    id: "resilience",
    shortLabel: "Resilience",
    title: "Emergency Response & Disaster Resilience",
    subsections: [
      "Crisis response systems",
      "Disaster prediction and early warning",
      "Climate resilience technologies",
      "Search and rescue innovation",
      "Continuity and recovery systems",
    ],
  },
  {
    id: "govproc",
    shortLabel: "Gov",
    title: "Government, Defence & Strategic Procurement",
    subsections: [
      "Public sector technology procurement",
      "Defence acquisition and modernization",
      "Sovereign tech strategies",
      "Public–private partnerships",
      "Compliance and governance frameworks",
    ],
  },
];

// ── Build node positions on globe ─────────────────────────────────────────
// 9 pillars on the upper ring (lat +35); 11 sectors on the lower ring
// (lat -35), offset by half-step to interleave so labels don't stack.
const P_COUNT = TECH_PILLARS.length;   // 9
const S_COUNT = APPLIED_SECTORS.length; // 11

const TECH_NODES = [
  ...TECH_PILLARS.map((p, i) => ({
    id: p.id,
    type: "pillar",
    shortLabel: p.shortLabel,
    lat: 35,
    lng: -180 + (i * 360) / P_COUNT,
  })),
  ...APPLIED_SECTORS.map((s, i) => ({
    id: s.id,
    type: "sector",
    shortLabel: s.shortLabel,
    lat: -35,
    lng: -180 + 180 / S_COUNT + (i * 360) / S_COUNT,
  })),
];

// ── Build connections ─────────────────────────────────────────────────────
const CONNECTIONS = [];

// Pillar ring
for (let i = 0; i < P_COUNT; i++) {
  const a = TECH_NODES[i];
  const b = TECH_NODES[(i + 1) % P_COUNT];
  CONNECTIONS.push({ from: [a.lat, a.lng], to: [b.lat, b.lng] });
}
// Sector ring
for (let i = 0; i < S_COUNT; i++) {
  const a = TECH_NODES[P_COUNT + i];
  const b = TECH_NODES[P_COUNT + ((i + 1) % S_COUNT)];
  CONNECTIONS.push({ from: [a.lat, a.lng], to: [b.lat, b.lng] });
}
// Each pillar → its 2 nearest sectors (by longitude)
for (let i = 0; i < P_COUNT; i++) {
  const p = TECH_NODES[i];
  const dists = APPLIED_SECTORS.map((_, j) => {
    const s = TECH_NODES[P_COUNT + j];
    let d = Math.abs(p.lng - s.lng);
    if (d > 180) d = 360 - d;
    return { idx: j, d };
  });
  dists.sort((a, b) => a.d - b.d);
  for (let k = 0; k < 2; k++) {
    const s = TECH_NODES[P_COUNT + dists[k].idx];
    CONNECTIONS.push({ from: [p.lat, p.lng], to: [s.lat, s.lng] });
  }
}

// ── Math helpers ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
export function InteractiveGlobe({
  className = "",
  size = 460,
  isDarkMode = true,
  autoRotateSpeed = 0.0018,
  selectedId = null,
  onNodeClick = null,
}) {
  const canvasRef        = useRef(null);
  const rotYRef          = useRef(0.3);
  const rotXRef          = useRef(0.15);
  const dragRef          = useRef({ active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0, hasMoved: false });
  const animRef          = useRef(0);
  const timeRef          = useRef(0);
  const dotsRef          = useRef([]);
  const nodePositionsRef = useRef([]); // {node, sx, sy, visible}
  const selectedRef      = useRef(selectedId);

  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const cx     = w / 2;
    const cy     = h / 2;
    const radius = Math.min(w, h) * 0.40;
    const fov    = 600;

    if (!dragRef.current.active) rotYRef.current += autoRotateSpeed;
    timeRef.current += 0.012;
    const t  = timeRef.current;
    const ry = rotYRef.current;
    const rx = rotXRef.current;

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

    // Connections + travelling beads
    for (const conn of CONNECTIONS) {
      let [x1, y1, z1] = latLngToXYZ(conn.from[0], conn.from[1], radius);
      let [x2, y2, z2] = latLngToXYZ(conn.to[0],   conn.to[1],   radius);
      [x1, y1, z1] = rotateX(x1, y1, z1, rx); [x1, y1, z1] = rotateY(x1, y1, z1, ry);
      [x2, y2, z2] = rotateX(x2, y2, z2, rx); [x2, y2, z2] = rotateY(x2, y2, z2, ry);
      if (z1 > radius * 0.3 && z2 > radius * 0.3) continue;

      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);
      const mX = (x1 + x2) / 2, mY = (y1 + y2) / 2, mZ = (z1 + z2) / 2;
      const mLen = Math.sqrt(mX*mX + mY*mY + mZ*mZ);
      const ah = radius * 1.22;
      const [scx, scy] = project((mX/mLen)*ah, (mY/mLen)*ah, (mZ/mLen)*ah, cx, cy, fov);

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(scx, scy, sx2, sy2);
      ctx.strokeStyle = isDarkMode ? "rgba(160,100,255,0.22)" : "rgba(122,63,209,0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const tp = (Math.sin(t * 1.1 + conn.from[0] * 0.12 + conn.from[1] * 0.03) + 1) / 2;
      const bx = (1-tp)*(1-tp)*sx1 + 2*(1-tp)*tp*scx + tp*tp*sx2;
      const by = (1-tp)*(1-tp)*sy1 + 2*(1-tp)*tp*scy + tp*tp*sy2;
      ctx.beginPath(); ctx.arc(bx, by, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? "rgba(245,166,35,0.85)" : "rgba(200,120,0,0.8)";
      ctx.fill();
      const bGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 5);
      bGlow.addColorStop(0, "rgba(245,166,35,0.32)");
      bGlow.addColorStop(1, "rgba(245,166,35,0)");
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fillStyle = bGlow; ctx.fill();
    }

    // Nodes (cache screen positions for click hit-testing)
    const positions = [];
    const sel = selectedRef.current;

    for (const node of TECH_NODES) {
      let [x, y, z] = latLngToXYZ(node.lat, node.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      const visible = z <= radius * 0.1;
      if (!visible) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      positions.push({ id: node.id, sx, sy });

      const isPillar = node.type === "pillar";
      const isSelected = node.id === sel;
      const pulse = Math.sin(t * 2.2 + node.lng * 0.05) * 0.5 + 0.5;
      const rA = (isSelected ? 0.7 : 0.20) + pulse * 0.25;

      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(sx, sy, (isSelected ? 9 : 6) + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = isPillar
        ? `rgba(245,166,35,${rA})`
        : `rgba(160,80,255,${rA})`;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Mid ring
      ctx.beginPath();
      ctx.arc(sx, sy, (isSelected ? 7 : 4) + pulse * 2, 0, Math.PI * 2);
      ctx.strokeStyle = isPillar
        ? `rgba(245,166,35,${rA + 0.2})`
        : `rgba(160,100,255,${rA + 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Core dot
      const coreR = isSelected ? (isPillar ? 6 : 5) : (isPillar ? 4.5 : 3.5);
      const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR + 1);
      if (isPillar) {
        cg.addColorStop(0, "rgba(255,230,120,1)");
        cg.addColorStop(1, "rgba(245,166,35,0.95)");
      } else {
        cg.addColorStop(0, "rgba(210,170,255,1)");
        cg.addColorStop(1, "rgba(140,80,230,0.95)");
      }
      ctx.beginPath();
      ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();

      // Label
      if (node.shortLabel) {
        const label = node.shortLabel;
        ctx.font = `${isPillar ? "bold " : ""}10px monospace`;
        const tw = ctx.measureText(label).width;
        const lx = sx + 10, ly = sy + 4;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx - 3, ly - 11, tw + 6, 14, 3);
        else                ctx.rect(lx - 3, ly - 11, tw + 6, 14);
        ctx.fillStyle = isSelected
          ? (isDarkMode ? "rgba(40,20,70,0.92)" : "rgba(255,250,235,0.92)")
          : (isDarkMode ? "rgba(10,5,25,0.65)"  : "rgba(255,255,255,0.70)");
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = isPillar ? "rgba(245,166,35,0.9)" : "rgba(160,100,255,0.9)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fillStyle = isPillar
          ? "rgba(255,195,60,1)"
          : (isDarkMode ? "rgba(200,160,255,1)" : "rgba(110,55,200,1)");
        ctx.fillText(label, lx, ly);
      }
    }
    nodePositionsRef.current = positions;

    animRef.current = requestAnimationFrame(draw);
  }, [isDarkMode, autoRotateSpeed]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── Pointer handling: distinguishes drag from click for hit-testing ────
  const onPointerDown = useCallback((e) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotYRef.current,
      startRotX: rotXRef.current,
      hasMoved: false,
    };
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.hasMoved = true;
    rotYRef.current = dragRef.current.startRotY + dx * 0.005;
    rotXRef.current = Math.max(-1, Math.min(1, dragRef.current.startRotX + dy * 0.005));
  }, []);

  const onPointerUp = useCallback((e) => {
    const wasClick = !dragRef.current.hasMoved;
    dragRef.current.active = false;

    if (wasClick && onNodeClick) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      let best = null;
      let bestDist = 22 * 22; // 22px tap radius
      for (const p of nodePositionsRef.current) {
        const dx = px - p.sx;
        const dy = py - p.sy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) { bestDist = d2; best = p; }
      }
      if (best) onNodeClick(best.id);
    }
  }, [onNodeClick]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, cursor: "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
