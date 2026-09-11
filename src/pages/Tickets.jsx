import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API } from "../utils/api";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "#f5a623", flexShrink: 0, marginTop: 2 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PriceWithAsterisk({ price, color, fontSize, fontWeight, style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "baseline", gap: 2, ...(style || {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: fontSize || "2.6rem", fontWeight: fontWeight || 900, color: color || "inherit", lineHeight: 1, letterSpacing: "-1px" }}>
        ${typeof price === "number" ? price.toLocaleString() : price}
      </span>
      <span style={{ color: "#f5a623", fontSize: "0.6em", fontWeight: 900, cursor: "help", lineHeight: 1 }}>*</span>
      {hovered && (
        <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.88)", color: "#fff", fontSize: "0.68rem", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, letterSpacing: "0.5px", padding: "8px 14px", borderRadius: 10, whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          Price subject to change
        </span>
      )}
    </span>
  );
}

/* ============================================================
   CONFETTI CANVAS — pure JS, fires when shown on the success screen.
   ============================================================ */
function ConfettiCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);

    const colors = ["#7a3fd1", "#f5a623", "#e91e8c", "#b99eff", "#56b3f5", "#3fd19c", "#ffffff"];
    const particles = [];
    const PARTICLE_COUNT = 180;

    const origins = [
      { x: w * 0.3, y: h * 0.45 },
      { x: w * 0.7, y: h * 0.45 },
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const origin = origins[i % 2];
      const angle = (Math.random() * Math.PI * 2);
      const velocity = Math.random() * 14 + 6;
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.5 ? "rect" : "circle",
        opacity: 1,
        gravity: 0.35,
        drag: 0.985,
      });
    }

    let frameId;
    let elapsed = 0;
    const maxFrames = 240;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      let stillAlive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.rotation += p.rotationSpeed;

        if (elapsed > 90) p.opacity = Math.max(0, p.opacity - 0.012);

        if (p.opacity > 0 && p.y < h + 50) {
          stillAlive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          if (p.shape === "rect") {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      elapsed++;
      if (stillAlive && elapsed < maxFrames) {
        frameId = requestAnimationFrame(draw);
      }
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 100000,
      }}
    />
  );
}

/* ============================================================
   PASS METADATA
   `soldOut: true` force-marks a tier as sold out regardless of
   what the inventory endpoint returns. Flip it back to false to
   reopen sales for that tier.
   ============================================================ */
const PASS_META = {
  connect: {
    label: "Connect Pass",
    tagline: "More than just access to the conference.",
    description: "Designed for attendees who want full access to the main conference and expo floor. Connect with senior leaders, explore the show floor, and build meaningful business relationships across both days.",
    features: ["2x Day Conference Access", "Expo Floor Access", "Networking Breaks"],
    tier: "connect",
    defaultPrice: 599,
    featured: false,
    soldOut: true,
  },
  influence: {
    label: "Influence Pass",
    tagline: "A fuller event experience beyond the conference floor.",
    description: "Built for decision makers, growth leaders, investors, and professionals who want premium daytime access with elevated networking moments — creating space for higher-value conversations and stronger business connections.",
    features: ["2x Day Conference Access", "2x Luncheons", "Expo Floor Access", "Networking Breaks"],
    tier: "influence",
    defaultPrice: 799,
    featured: true,
    soldOut: false,
  },
  power: {
    label: "Power Pass",
    tagline: "The ultimate all-access experience.",
    description: "Built for senior executives, VIP guests, investors, speakers, and leaders who want to experience The Tech Festival Canada at the highest level. With access to every major element of the event, this pass offers the most complete and elevated way to engage with the festival.",
    features: ["2x Day Conference Access", "2x CxO Breakfasts", "2x Luncheons", "1x Gala Dinner & Networking Reception", "1x Awards Night", "Expo Floor Access", "Networking Breaks"],
    tier: "power",
    defaultPrice: 999,
    featured: false,
    soldOut: false,
  },
  apex: {
    label: "Apex Pass",
    tagline: "Everything, plus the meetings you actually came for.",
    description: "Our highest tier. Everything in the Power Pass, plus two business meetings matched for you in advance against your objectives, and preferential seating at every keynote, panel and dinner. Built for those who measure an event by the deals it starts.",
    features: ["2x Pre-Matched Business Meetings", "Preferential Seating", "2x Day Conference Access", "2x CxO Breakfasts", "2x Luncheons", "1x Gala Dinner & Networking Reception", "1x Awards Night", "Expo Floor Access", "Networking Breaks"],
    tier: "apex",
    defaultPrice: 1499,
    featured: false,
    badge: "All Access",
    soldOut: false,
  },
};

function PassCard({ meta, inventoryItem, onPurchase, dark, inventoryLoaded }) {
  const [hovered, setHovered] = useState(false);

  const price = inventoryItem?.price ?? meta.defaultPrice;
  const remaining = inventoryItem ? Math.max(inventoryItem.total - inventoryItem.sold, 0) : null;
  // Hard flag in PASS_META wins over inventory
  const soldOut = meta.soldOut === true || (remaining !== null && remaining <= 0);

  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.65)" : "rgba(13,5,32,0.68)";
  const textLight = dark ? "rgba(255,255,255,0.40)" : "rgba(13,5,32,0.45)";
  const cardBg = dark ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" : "#ffffff";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(122,63,209,0.14)";

  return (
    <div data-pass-card onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position:"relative", flex:"1 1 240px", maxWidth:318, minWidth:236, alignSelf:"stretch", borderRadius:20, padding:"32px 26px 28px", display:"flex", flexDirection:"column", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", background: meta.featured?(dark?"linear-gradient(135deg, rgba(122,63,209,0.28) 0%, rgba(245,166,35,0.12) 100%)":"linear-gradient(135deg, rgba(122,63,209,0.12) 0%, rgba(245,166,35,0.08) 100%)"):cardBg, border: meta.featured?(dark?"1px solid rgba(122,63,209,0.55)":"1px solid rgba(122,63,209,0.40)"):cardBorder, boxShadow: meta.featured?(dark?"0 8px 48px rgba(122,63,209,0.25)":"0 8px 32px rgba(122,63,209,0.18)"):(dark?"0 4px 32px rgba(0,0,0,0.35)":"0 4px 24px rgba(122,63,209,0.08)"), transform: meta.featured?"scale(1.04)":(hovered && !soldOut)?"scale(1.02)":"scale(1)", transition:"transform 0.25s ease, box-shadow 0.25s ease", zIndex: meta.featured?2:1, opacity: soldOut?0.82:1 }}>

      {meta.featured && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(90deg, #7a3fd1, #f5a623)", color:"white", fontSize:"0.62rem", fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"5px 16px", borderRadius:999, whiteSpace:"nowrap", fontFamily:"'Orbitron', sans-serif" }}>Most Popular</div>}

      {meta.badge && !meta.featured && !soldOut && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background: dark?"linear-gradient(90deg, #4b1d8f, #b8860b)":"linear-gradient(90deg, #3d1580, #c4780a)", color:"white", fontSize:"0.62rem", fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"5px 16px", borderRadius:999, whiteSpace:"nowrap", fontFamily:"'Orbitron', sans-serif" }}>{meta.badge}</div>}

      {soldOut && !meta.featured && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background: dark?"rgba(255,255,255,0.14)":"rgba(13,5,32,0.72)", color: dark?"rgba(255,255,255,0.85)":"#ffffff", fontSize:"0.62rem", fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"5px 16px", borderRadius:999, whiteSpace:"nowrap", fontFamily:"'Orbitron', sans-serif", border: dark?"1px solid rgba(255,255,255,0.18)":"none" }}>Sold Out</div>}

      <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.72rem", letterSpacing:"1.5px", textTransform:"uppercase", color: meta.featured?(dark?"#f5a623":"#d98a14"):(dark?"rgba(160,100,255,0.85)":"#7a3fd1"), marginBottom:8 }}>{meta.label}</div>

      <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:2, minHeight:"2.6rem" }}>
        {inventoryLoaded ? (
          <>
            <PriceWithAsterisk price={price} color={textMain} fontSize="2.6rem" fontWeight={900} />
            <span style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.95rem", fontWeight:800, color:textLight, letterSpacing:"1px", textTransform:"uppercase" }}>CAD</span>
          </>
        ) : (
          <div aria-label="Loading price" style={{ width:160, height:"2.4rem", borderRadius:8, background: dark?"linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))":"linear-gradient(90deg, rgba(122,63,209,0.05), rgba(122,63,209,0.12), rgba(122,63,209,0.05))", backgroundSize:"200% 100%", animation:"ttfcShimmer 1.4s ease-in-out infinite" }} />
        )}
      </div>

      <p style={{ fontSize:"0.62rem", fontWeight:600, color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.38)", letterSpacing:"0.3px", marginBottom:4 }}>+13% HST</p>

      <div style={{ width:"100%", height:1, background: dark?"linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 50%,transparent)":"linear-gradient(90deg,transparent,rgba(122,63,209,0.18) 50%,transparent)", margin:"14px 0 16px" }} />

      <p style={{ fontSize:"0.82rem", fontWeight:600, color:textMain, marginBottom:8, lineHeight:1.5, textAlign:"justify" }}>{meta.tagline}</p>
      <p style={{ fontSize:"0.76rem", color:textMuted, lineHeight:1.65, marginBottom:18, textAlign:"justify", hyphens:"auto" }}>{meta.description}</p>

      <div style={{ fontSize:"0.66rem", fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:textLight, marginBottom:10 }}>Includes</div>
      <ul style={{ listStyle:"none", padding:0, margin:"0 0 auto", display:"flex", flexDirection:"column", gap:8 }}>{meta.features.map(f => <li key={f} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:"0.78rem", color:textMuted, lineHeight:1.4 }}><CheckIcon />{f}</li>)}</ul>

      <button disabled={soldOut} onClick={() => !soldOut && onPurchase(meta.tier)}
        style={{ marginTop:24, width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor: soldOut?"not-allowed":"pointer", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.68rem", letterSpacing:"1px", textTransform:"uppercase", color: soldOut?(dark?"rgba(255,255,255,0.3)":"rgba(13,5,32,0.3)"):"white", background: soldOut?(dark?"rgba(255,255,255,0.05)":"rgba(13,5,32,0.05)"):meta.featured?"linear-gradient(135deg, #7a3fd1, #f5a623)":(dark?"rgba(122,63,209,0.35)":"#7a3fd1"), boxShadow: soldOut||!meta.featured?"none":"0 4px 20px rgba(122,63,209,0.4)", transition:"all 0.2s" }}
        onMouseEnter={(e) => { if (!soldOut && !meta.featured) e.currentTarget.style.background = dark?"rgba(122,63,209,0.55)":"#6330b3"; }}
        onMouseLeave={(e) => { if (!soldOut && !meta.featured) e.currentTarget.style.background = dark?"rgba(122,63,209,0.35)":"#7a3fd1"; }}>
        {soldOut ? "Sold Out" : "Get Your Pass"}
      </button>
    </div>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [dark, setDark] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const passes = ["connect","influence","power","apex"];
  const passLabels = { connect:"Connect", influence:"Influence", power:"Power", apex:"Apex" };

  /* ── Mobile swipe rail ── */
  const railRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  const cardStep = () => {
    const el = railRef.current;
    if (!el) return 0;
    const first = el.querySelector("[data-pass-card]");
    if (!first) return 0;
    return first.getBoundingClientRect().width + 14; // card width + rail gap
  };

  const goToCard = (i, smooth = true) => {
    const el = railRef.current;
    const step = cardStep();
    if (!el || !step) return;
    el.scrollTo({ left: i * step, behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const step = cardStep();
      if (!step) return;
      const i = Math.round(el.scrollLeft / step);
      setActiveCard(Math.min(passes.length - 1, Math.max(0, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // On mobile, open on the first pass that's actually purchasable
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth > 768) return;
    const firstAvailable = passes.findIndex((p) => !PASS_META[p].soldOut);
    if (firstAvailable > 0) {
      const t = setTimeout(() => { goToCard(firstAvailable, false); setActiveCard(firstAvailable); }, 60);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => { setDark(document.body.classList.contains("dark-mode")); const obs = new MutationObserver(() => setDark(document.body.classList.contains("dark-mode"))); obs.observe(document.body, { attributes:true, attributeFilter:["class"] }); return () => obs.disconnect(); }, []);

  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("success") === "true") { setShowSuccessModal(true); window.history.replaceState(null, "", window.location.pathname); } }, []);

  useEffect(() => { const load = async () => { try { const res = await fetch(API+"/admin/inventory/public"); const data = await res.json(); setInventory(Array.isArray(data)?data:[]); } catch(err) { console.error("Inventory fetch failed", err); } finally { setInventoryLoaded(true); } }; load(); }, []);

  const getTier = (tier) => inventory.find((i) => i.tier === tier) || null;

  // Navigate to full-page checkout (no more modal!)
  const handlePurchase = (tier) => {
    if (PASS_META[tier]?.soldOut) return;   // belt-and-braces: never route a sold-out tier
    navigate(`/tickets/checkout?tier=${tier}`);
  };

  const allFeatures = ["2x Day Conference Access","Expo Floor Access","Networking Breaks","2x CxO Breakfasts","2x Luncheons","1x Gala Dinner & Networking Reception","1x Awards Night","Preferential Seating","2x Pre-Matched Business Meetings"];
  const passFeatureMap = {
    //          conf   expo   break  cxo    lunch  gala   awards seating meetings
    connect:   [true,  true,  true,  false, false, false, false, false,  false],
    influence: [true,  true,  true,  false, true,  false, false, false,  false],
    power:     [true,  true,  true,  true,  true,  true,  true,  false,  false],
    apex:      [true,  true,  true,  true,  true,  true,  true,  true,   true ],
  };

  const bg = dark ? "#06020f" : "#ffffff";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.68)";

  return (
    <><Navbar />
      <style>{`
        @keyframes ttfcShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Desktop: unchanged flex row */
        .pass-rail {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          align-items: stretch;
          padding: 0 24px 80px;
          max-width: 1340px;
          margin: 0 auto;
        }
        .pass-dots { display: none; }
        .pass-swipe-hint { display: none; }

        /* Mobile: one-card-at-a-time swipe rail */
        @media (max-width: 768px) {
          .pass-rail {
            flex-wrap: nowrap;
            justify-content: flex-start;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-padding: 0 8vw;
            gap: 14px;
            padding: 24px 8vw 14px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .pass-rail::-webkit-scrollbar { display: none; }
          .pass-rail > [data-pass-card] {
            flex: 0 0 84vw !important;
            min-width: 84vw !important;
            max-width: 84vw !important;
            align-self: stretch !important;
            transform: none !important;
            scroll-snap-align: center;
          }
          .pass-dots {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            padding: 0 24px 10px;
          }
          .pass-swipe-hint {
            display: block;
            text-align: center;
            padding: 0 24px 70px;
          }
        }
      `}</style>
      <div style={{ minHeight:"100vh", background:bg, color:textMain, position:"relative", transition:"background 0.3s ease" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background: dark?"radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(245,166,35,0.06) 0%, transparent 70%)":"radial-gradient(ellipse 60% 50% at 20% 30%, rgba(122,63,209,0.05) 0%, transparent 70%)" }} />
        <div style={{ position:"relative", zIndex:1, paddingBottom:"1px" }}>

          <div style={{ textAlign:"center", padding:"100px 24px 60px", maxWidth:780, margin:"0 auto" }}>
            <h1 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"clamp(2rem, 5vw, 3.2rem)", letterSpacing:"-1px", lineHeight:1.15, marginBottom:20, color:textMain }}>Choose Your Pass</h1>
            <p style={{ fontSize:"1rem", color:textMuted, lineHeight:1.75, textAlign:"justify", hyphens:"auto" }}>Whether you are coming to learn, connect, explore partnerships, or experience the event at the highest level, The Tech Festival Canada offers a pass designed for every kind of delegate.</p>
          </div>

          <div ref={railRef} className="pass-rail">
            {passes.map(key => <PassCard key={key} meta={PASS_META[key]} inventoryItem={getTier(key)} onPurchase={handlePurchase} dark={dark} inventoryLoaded={inventoryLoaded} />)}
          </div>

          {/* Mobile-only: dots + swipe hint */}
          <div className="pass-dots">
            {passes.map((p, i) => (
              <button
                key={p}
                onClick={() => { goToCard(i); setActiveCard(i); }}
                aria-label={`Show ${passLabels[p]} Pass`}
                style={{
                  width: i === activeCard ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === activeCard
                    ? "linear-gradient(90deg, #7a3fd1, #f5a623)"
                    : (dark ? "rgba(255,255,255,0.20)" : "rgba(13,5,32,0.18)"),
                  transition: "width 0.25s ease, background 0.25s ease",
                }}
              />
            ))}
          </div>
          <div className="pass-swipe-hint">
            <span style={{ fontFamily:"'Orbitron', sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"1.4px", textTransform:"uppercase", color: dark?"rgba(255,255,255,0.32)":"rgba(13,5,32,0.35)" }}>
              Swipe to compare passes
            </span>
          </div>

          <div style={{ maxWidth:900, margin:"0 auto 80px", padding:"0 24px" }}>
            <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"1rem", letterSpacing:"1px", textTransform:"uppercase", color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.40)", textAlign:"center", marginBottom:28 }}>Pass Comparison</h2>
            <div style={{ backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", background: dark?"rgba(255,255,255,0.04)":"rgba(122,63,209,0.03)", border: dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(122,63,209,0.10)", borderRadius:20, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ minWidth:660 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1.6fr repeat(4, 1fr)", borderBottom: dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(122,63,209,0.10)", padding:"14px 24px" }}>
                  <div style={{ fontSize:"0.7rem", color:textMuted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", display:"flex", alignItems:"center" }}>Feature</div>
                  {passes.map(p => (
                    <div key={p} style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.62rem", letterSpacing:"0.8px", textTransform:"uppercase", color: p==="influence"?(dark?"#f5a623":"#d98a14"):textMuted, opacity: PASS_META[p].soldOut?0.55:1 }}>
                      {passLabels[p]}
                      {PASS_META[p].soldOut && <span style={{ fontSize:"0.52rem", fontWeight:700, letterSpacing:"0.6px", marginTop:3, color: dark?"rgba(255,255,255,0.35)":"rgba(13,5,32,0.38)" }}>Sold Out</span>}
                    </div>
                  ))}
                </div>
                {allFeatures.map((feature, fi) => (
                  <div key={feature} style={{ display:"grid", gridTemplateColumns:"1.6fr repeat(4, 1fr)", padding:"13px 24px", borderBottom: fi<allFeatures.length-1?(dark?"1px solid rgba(255,255,255,0.05)":"1px solid rgba(122,63,209,0.05)"):"none", background: fi%2===0?(dark?"rgba(255,255,255,0.01)":"rgba(122,63,209,0.02)"):"transparent" }}>
                    <div style={{ fontSize:"0.78rem", color: dark?"rgba(255,255,255,0.65)":"rgba(13,5,32,0.80)", display:"flex", alignItems:"center" }}>{feature}</div>
                    {passes.map(p => <div key={p} style={{ display:"flex", alignItems:"center", justifyContent:"center", opacity: PASS_META[p].soldOut?0.55:1 }}>{passFeatureMap[p][fi] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark?"#f5a623":"#d98a14"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : <span style={{ color: dark?"rgba(255,255,255,0.15)":"rgba(13,5,32,0.15)", fontSize:"1rem", lineHeight:1 }}>&mdash;</span>}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ maxWidth:760, margin:"0 auto 120px", padding:"0 24px", textAlign:"center" }}>
            <div style={{ backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", background: dark?"linear-gradient(135deg, rgba(122,63,209,0.12) 0%, rgba(245,166,35,0.06) 100%)":"linear-gradient(135deg, rgba(122,63,209,0.07) 0%, rgba(245,166,35,0.04) 100%)", border: dark?"1px solid rgba(122,63,209,0.25)":"1px solid rgba(122,63,209,0.14)", borderRadius:24, padding:"48px 40px" }}>
              <div style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:800, fontSize:"0.65rem", letterSpacing:"1.5px", textTransform:"uppercase", color: dark?"#f5a623":"#d98a14", marginBottom:14 }}>Why Upgrade Your Pass</div>
              <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"clamp(1.3rem, 3vw, 1.9rem)", letterSpacing:"-0.5px", color:textMain, marginBottom:20, lineHeight:1.2 }}>Every Level Unlocks<br /><span style={{ color: dark?"#f5a623":"#d98a14" }}>More Opportunity</span></h2>
              <p style={{ fontSize:"0.88rem", color:textMuted, lineHeight:1.8, textAlign:"justify", hyphens:"auto" }}>Each pass level is designed to unlock a deeper layer of value. As you move up, the experience becomes more curated, more exclusive, and more relationship driven.</p>
            </div>
          </div>

          <Footer />
        </div>

        {showSuccessModal && (
          <>
            <ConfettiCanvas />
            <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"24px", width:"100%", maxWidth:"460px", background: dark?"#120a22":"#ffffff", padding:"48px 32px", borderRadius:"24px", border: dark?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(122,63,209,0.1)", boxShadow: "0 30px 80px rgba(122,63,209,0.35)", animation: "ttfcSuccessIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <style>{`@keyframes ttfcSuccessIn { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
                <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg, #7a3fd1, #f5a623)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 12px 32px rgba(122,63,209,0.4)" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div style={{ textAlign:"center", color:textMain }}>
                  <h2 style={{ fontFamily:"'Orbitron', sans-serif", fontWeight:900, fontSize:"1.9rem", margin:"0 0 12px 0", letterSpacing:"-0.5px" }}>
                    <span style={{ backgroundImage:"linear-gradient(135deg, #7a3fd1, #f5a623)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", color:"transparent" }}>You're In!</span>
                  </h2>
                  <p style={{ opacity:0.85, margin:0, fontSize:"1.05rem", lineHeight:1.6, fontWeight:500 }}>Thank you for your purchase.</p>
                  <p style={{ opacity:0.65, marginTop:"8px", fontSize:"0.9rem", lineHeight:1.55 }}>Check your email for the invoice and your QR code pass. See you in Toronto.</p>
                </div>
                <button onClick={() => { setShowSuccessModal(false); navigate("/"); }}
                  style={{ background:"linear-gradient(135deg, #7a3fd1, #f5a623)", border:"none", color:"white", padding:"16px 32px", borderRadius:"12px", cursor:"pointer", fontFamily:"'Orbitron', sans-serif", textTransform:"uppercase", fontSize:"0.78rem", letterSpacing:"1.5px", fontWeight:800, width:"100%", boxShadow:"0 8px 24px rgba(122,63,209,0.4)" }}>
                  Back to Home
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
