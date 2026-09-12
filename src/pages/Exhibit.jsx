import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PavilionCard from "../components/PavilionCard";

const API = import.meta.env.VITE_API_URL || "https://techfest-canada-backend.onrender.com/api";

/* ─────────────────────────────────────────────────────────────
   PROMO CODE VALIDATION ENDPOINT

   Point this at whatever the tickets checkout already uses so both
   flows validate against the same route. If the path is wrong the
   modal degrades gracefully: the code is still passed to Stripe and
   enforced server-side, the shopper just doesn't see the discount
   before they click through.
   ───────────────────────────────────────────────────────────── */
const PROMO_VALIDATE_URL = `${API}/promos/validate`;

const BOOTH_TIERS = [
  {
    id: "single",
    title: "Single Booth",
    specs: "10 ft x 10 ft",
    price: "$2,499",
    amount: 2499,
    tagline: "A smart, strategic entry into the market.",
    description: "The Single Booth is ideal for companies that want focused visibility and high value face time without overextending budget. It is perfect for startups, emerging tech companies, niche solution providers, consultancies, and first time exhibitors looking to establish a presence in a serious business environment.",
    whyItWorks: [
      "Strong brand presence at an accessible investment level",
      "Ideal for first time exhibitors and emerging companies",
      "Perfect for lead generation, networking, and market validation",
      "A sharp entry point into Canada's innovation ecosystem"
    ],
    images: ["/booths/single-1.jpg", "/booths/single-2.jpg", "/booths/single-3.jpg"]
  },
  {
    id: "double",
    title: "Double Booth",
    specs: "20 ft x 10 ft",
    price: "$4,499",
    amount: 4499,
    tagline: "More space. More visibility. More commercial opportunity.",
    description: "The Double Booth is built for companies that want to move beyond presence and start making a statement. With added space comes greater flexibility to showcase multiple products, create a stronger visual brand experience, host more conversations, and engage visitors with greater confidence.",
    whyItWorks: [
      "Delivers stronger visibility on the exhibition floor",
      "Creates room for demos, displays, and deeper engagement",
      "Ideal for companies with multiple products or services",
      "Positions your brand as established, credible, and growth ready"
    ],
    images: ["/booths/double-1.jpg", "/booths/double-2.jpg", "/booths/double-3.jpg"]
  },
  {
    id: "triple",
    title: "Triple Booth",
    specs: "30 ft x 10 ft",
    price: "$5,999",
    amount: 5999,
    tagline: "For brands that want to be noticed, remembered, and taken seriously.",
    description: "The Triple Booth is for exhibitors with bigger ambitions and a stronger market story to tell. It gives you the space to create a real destination on the floor rather than just a booth. This is where your brand begins to command attention.\n\nIf your objective is to stand apart from the crowd and present your company as a serious market leader, this is where that begins.",
    whyItWorks: [
      "Builds a commanding and credible show floor presence",
      "Excellent for live demonstrations and multi zone interaction",
      "Supports stronger traffic flow and richer visitor engagement",
      "Ideal for brands looking to signal scale, depth, and leadership"
    ],
    images: ["/booths/triple-1.jpg", "/booths/triple-2.jpg", "/booths/triple-3.jpg"]
  },
  {
    id: "quadruple",
    title: "Quadruple Booth",
    specs: "40 ft x 10 ft",
    price: "$7,499",
    amount: 7499,
    tagline: "Maximum presence for brands that intend to lead the room.",
    description: "The Quadruple Booth is our flagship exhibition option for companies that want scale, authority, and visibility that cannot be ignored. This is for major brands, strategic partners, global companies, ecosystem leaders, and organizations ready to own a significant share of attention at The Tech Festival Canada.\n\nIf you are launching in a major way, building strategic partnerships, attracting enterprise buyers, or reinforcing leadership in your category, the Quadruple Booth gives you the stage to do it with impact.",
    whyItWorks: [
      "Delivers the strongest visual and commercial presence",
      "Ideal for enterprises, anchor exhibitors, and strategic brands",
      "Enables premium experiences, larger teams, and stronger engagement",
      "Best choice for companies looking to dominate attention and drive momentum"
    ],
    images: ["/booths/quad-1.jpg", "/booths/quad-2.jpg", "/booths/quad-3.jpg"]
  }
];

const money = (n) =>
  "$" + Number(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function BoothGallery({ images, isDark, border, cardBg }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef(null);

  function startTimer() {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(function () {
      setActive(function (prev) { return (prev + 1) % images.length; });
    }, 3500);
  }

  useEffect(function () {
    startTimer();
    return function () { clearInterval(intervalRef.current); };
  }, []);

  function handleDot(i) {
    setActive(i);
    startTimer();
  }

  return (
    <div style={{
      borderRadius: 24, overflow: "hidden", aspectRatio: "4/3",
      border: "1px solid " + border, background: cardBg, position: "relative"
    }}>
      <AnimatePresence mode="sync">
        {images.map(function (src, i) {
          return i === active ? (
            <motion.img
              key={src} src={src} alt={"Booth view " + (i + 1)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 2 }}
              onError={function (e) { e.target.style.display = "none"; }}
            />
          ) : null;
        })}
      </AnimatePresence>

      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 5,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        padding: "4px 10px", borderRadius: 6,
        fontSize: "0.58rem", fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
        letterSpacing: "1px", textTransform: "uppercase",
        color: "rgba(255,255,255,0.65)", pointerEvents: "none",
      }}>For reference only</div>

      <div style={{
        position: "absolute", bottom: 14, left: 0, right: 0, zIndex: 5,
        display: "flex", justifyContent: "center", gap: 8,
      }}>
        {images.map(function (_, i) {
          return (
            <button key={i} onClick={function () { handleDot(i); }} style={{
              width: i === active ? 22 : 8, height: 8, borderRadius: 999,
              border: "none", cursor: "pointer",
              background: i === active ? "#f5a623" : "rgba(255,255,255,0.45)",
              transition: "all 0.3s ease", padding: 0,
            }} />
          );
        })}
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 60, zIndex: 3,
        background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
        pointerEvents: "none", borderRadius: "0 0 24px 24px",
      }} />
    </div>
  );
}

export default function Exhibit() {
  const [isDark, setIsDark] = useState(true);
  const [selectedBooth, setSelectedBooth] = useState(null);   // enquire modal
  const [checkoutBooth, setCheckoutBooth] = useState(null);   // promo + pay modal

  useEffect(() => {
    setIsDark(document.body.classList.contains("dark-mode"));
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* Creates the Stripe session. `promoCode` is optional — the server
     is the authority on whether it's valid and what it's worth. */
  const startCheckout = async (tierId, promoCode) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/payments/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({
        type: "booth",
        tier: `booth-${tierId}`,
        ...(promoCode ? { promoCode, promo_code: promoCode, code: promoCode } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout failed");
    window.location.href = data.url;
  };

  const bg        = isDark ? "#07030f"                : "#f4f0ff";
  const textMain  = isDark ? "#ffffff"                : "#0f0520";
  const textMuted = isDark ? "rgba(200,180,255,0.8)"  : "rgba(60,30,110,0.85)";
  const cardBg    = isDark ? "rgba(255,255,255,0.03)" : "rgba(122,63,209,0.04)";
  const border    = isDark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.18)";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style>{`
        @media (max-width: 900px) {
          .exhibit-row { grid-template-columns: 1fr !important; gap: 40px !important; }
          .bottom-cta-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .cta-row { flex-direction: column !important; align-items: stretch !important; }
          .cta-row a { width: 100% !important; text-align: center !important; justify-content: center !important; }
          .promo-row { flex-direction: column !important; }
          .promo-row button { width: 100% !important; }
        }
        :root {
          --aurora-white: #ffffff;
          --aurora-black: #06020f;
          --aurora-transparent: transparent;
          --aurora-purple: #7a3fd1;
          --aurora-violet: #9b57e8;
          --aurora-lilac: #c4a0f5;
          --aurora-orange: #f5a623;
          --aurora-amber: #f7c15e;
        }
        @keyframes aurora-flow {
          from { background-position: 50% 50%, 50% 50%; }
          to   { background-position: 350% 50%, 350% 50%; }
        }
        .aurora-layer {
          position: absolute; inset: -10px; pointer-events: none;
          will-change: transform; background-size: 300%, 200%;
          background-position: 50% 50%; filter: blur(10px); opacity: 0.50;
        }
        .aurora-layer--dark {
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, var(--aurora-transparent) 70%);
        }
        .aurora-layer--dark::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(100deg, var(--aurora-black) 0%, var(--aurora-black) 7%, var(--aurora-transparent) 10%, var(--aurora-transparent) 12%, var(--aurora-black) 16%),
            repeating-linear-gradient(100deg, var(--aurora-purple) 10%, var(--aurora-lilac) 15%, var(--aurora-orange) 20%, var(--aurora-amber) 25%, var(--aurora-violet) 30%);
          background-size: 200%, 100%; background-attachment: fixed;
          animation: aurora-flow 60s linear infinite; mix-blend-mode: difference;
        }
      `}</style>

      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
        overflow: "hidden", background: isDark ? "#06020f" : "#f4f0ff",
        paddingTop: "clamp(120px, 15vw, 160px)", paddingBottom: "20px"
      }}>
        <img src="/exhibit-hero-bg.png" alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          opacity: isDark ? 0.18 : 0.12, pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1 }}>
          <div className={isDark ? "aurora-layer aurora-layer--dark" : "aurora-layer aurora-layer--light"} />
        </div>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
          background: isDark
            ? "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #06020f 100%)"
            : "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #f4f0ff 100%)",
        }} />
        <motion.div
          style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 5%", maxWidth: 900, margin: "0 auto" }}
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
        >
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(3rem, 7vw, 5rem)",
            fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.5px", color: textMain
          }}>
            Exhibit{" "}
            <span style={{
              background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>With Us</span>
          </h1>
          <p style={{ fontSize: "clamp(1.1rem, 2vw, 1.3rem)", color: textMuted, lineHeight: 1.7, maxWidth: 780, margin: "0 auto", fontWeight: 500 }}>
            Put your brand at the centre of Canada's most important technology conversations.
          </p>
        </motion.div>
      </section>

      {/* ═══════════ INTRO ═══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}
        style={{ padding: "20px 5% 80px", maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 10 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: "1.1rem", color: textMuted, lineHeight: 1.8, textAlign: "justify" }}>
          <p>
            Exhibiting here is not just about taking space on a show floor. It is about claiming visibility in front of a high value audience that matters. It is about creating direct conversations, building market credibility, launching solutions, generating qualified leads, and positioning your company as a serious player in the future of technology.
          </p>
        </div>
      </motion.section>

      {/* ═══════════ BOOTH TIERS ═══════════ */}
      <div style={{ paddingBottom: "80px" }}>
        {BOOTH_TIERS.map((tier, index) => (
          <BoothRow
            key={tier.id} tier={tier} isDark={isDark}
            textMain={textMain} textMuted={textMuted} border={border} cardBg={cardBg}
            index={index}
            onOpenModal={() => setSelectedBooth(tier)}
            onPurchase={() => setCheckoutBooth(tier)}
          />
        ))}
      </div>

      {/* ═══════════ INDIA PAVILION PROMO CARD ═══════════ */}
      <PavilionCard
        isDark={isDark}
        textMain={textMain}
        textMuted={textMuted}
        border={border}
        cardBg={cardBg}
      />

      {/* ═══════════ CLOSING ARGUMENT ═══════════ */}
      <section style={{ padding: "60px 5% 100px", maxWidth: 900, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2rem", fontWeight: 900, marginBottom: 16, color: textMain }}>
            Secure Your <GradientSpan>Booth</GradientSpan>
          </h2>
          <p style={{ fontSize: "1.05rem", color: textMuted, lineHeight: 1.8, textAlign: "justify" }}>
            Prime exhibition spaces are limited and high visibility locations will be allocated on a first come first served basis. If your company is ready to be seen by the right audience, build strategic relationships, and stand out at one of Canada's most ambitious technology platforms, now is the time to reserve your space.
          </p>
        </motion.div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{ padding: "0 5% 120px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}
          className="bottom-cta-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: 28, overflow: "hidden", border: "1px solid " + border, background: cardBg, minHeight: 400 }}
        >
          <div style={{
            position: "relative", background: "#120a22",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", minHeight: 300,
          }}>
            <img
              src="/Tech_Festival_Canada_Logo_Dark_Transparent.png"
              alt="The Tech Festival Canada"
              style={{ width: "65%", maxWidth: 300, height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 40px rgba(122,63,209,0.25))" }}
            />
            <div style={{ position: "absolute", width: "70%", height: "70%", borderRadius: "50%", background: "radial-gradient(circle, rgba(122,63,209,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
          </div>
          <div style={{ padding: "clamp(40px, 6vw, 64px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 900, lineHeight: 1.2, marginBottom: 20, color: textMain }}>
              Ready to <GradientSpan>secure your space?</GradientSpan>
            </h2>
            <p style={{ color: textMuted, lineHeight: 1.7, fontSize: "1.1rem", marginBottom: 36, maxWidth: 480 }}>
              Join the ecosystem of innovators and leaders. Partner with us or secure your delegate pass today.
            </p>
            <div className="cta-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <motion.a href="/sponsor" className="btn-outline" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none", letterSpacing: "0.5px", transition: "all 0.25s ease" }}
              >Partner With Us</motion.a>
              <motion.a href="/tickets" className="btn-primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 14, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}
              >Get Your Pass</motion.a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ ENQUIRE MODAL ═══════════ */}
      <AnimatePresence>
        {selectedBooth && (
          <EnquireModal
            booth={selectedBooth}
            onClose={() => setSelectedBooth(null)}
            isDark={isDark} textMain={textMain} border={border} cardBg={cardBg}
          />
        )}
      </AnimatePresence>

      {/* ═══════════ PROMO + CHECKOUT MODAL ═══════════ */}
      <AnimatePresence>
        {checkoutBooth && (
          <CheckoutModal
            booth={checkoutBooth}
            onClose={() => setCheckoutBooth(null)}
            onCheckout={startCheckout}
            isDark={isDark} textMain={textMain} textMuted={textMuted} border={border}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOOTH ROW
   ═══════════════════════════════════════════════════════ */
function BoothRow({ tier, isDark, textMain, textMuted, border, cardBg, index, onOpenModal, onPurchase }) {
  const hasBg = index % 2 === 0;

  return (
    <section style={{
      padding: "clamp(60px, 8vw, 100px) 5%",
      background: hasBg ? (isDark ? "rgba(122,63,209,0.03)" : "rgba(122,63,209,0.02)") : "transparent",
      borderTop: hasBg ? "1px solid " + border : "none",
      borderBottom: hasBg ? "1px solid " + border : "none",
    }}>
      <div className="exhibit-row" style={{
        maxWidth: 1300, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "clamp(40px, 6vw, 80px)", alignItems: "center",
      }}>
        <motion.div
          initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }} transition={{ type: "spring", bounce: 0.2, duration: 1.2 }}
        >
          <BoothGallery images={tier.images} isDark={isDark} border={border} cardBg={cardBg} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }} transition={{ type: "spring", bounce: 0.2, duration: 1.2, delay: 0.2 }}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: textMain, lineHeight: 1.1 }}>
              {tier.title}
            </h2>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1.1rem", color: textMuted, marginBottom: 4 }}>{tier.specs}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.4rem", fontWeight: 800, color: isDark ? "#f5a623" : "#d98a14" }}>{tier.price}</div>
            </div>
          </div>

          <p style={{ fontSize: "1.2rem", fontWeight: 700, color: textMain, marginBottom: 24, lineHeight: 1.5 }}>{tier.tagline}</p>

          <div style={{ fontSize: "1.05rem", color: textMuted, lineHeight: 1.7, marginBottom: 32, textAlign: "justify", whiteSpace: "pre-line" }}>
            {tier.description}
          </div>

          <div style={{ background: cardBg, border: "1px solid " + border, borderRadius: 16, padding: "24px 32px" }}>
            <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.1rem", fontWeight: 800, color: textMain, marginBottom: 20 }}>Why this works</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tier.whyItWorks.map((point, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5a623", flexShrink: 0, marginTop: 8 }} />
                  <span style={{ fontSize: "1rem", color: textMuted, lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onPurchase}
            style={{ display: "inline-block", textAlign: "center", marginTop: 32, padding: "16px 32px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "1px", textTransform: "uppercase" }}
          >
            Buy Now
          </motion.button>

          <p style={{ marginTop: 10, textAlign: "center", fontSize: "0.78rem", color: textMuted, opacity: 0.85 }}>
            Have a promo code? Apply it at the next step.
          </p>

          <motion.button
            onClick={onOpenModal}
            className="btn-outline"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: "inline-block", textAlign: "center", marginTop: 12, padding: "14px 32px", borderRadius: 12, background: "transparent", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.82rem", letterSpacing: "1px", textTransform: "uppercase", border: "1.5px solid " + (isDark ? "rgba(155,135,245,0.25)" : "rgba(122,63,209,0.20)"), color: isDark ? "rgba(185,158,255,0.75)" : "#7a3fd1", transition: "all 0.2s ease" }}
          >
            Enquire Now
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   CHECKOUT MODAL — promo code, then Stripe

   The server remains the authority on whether a code is valid and
   what it's worth. This only previews the discount so the shopper
   knows what they're paying before being sent to Stripe.
   ═══════════════════════════════════════════════════════ */
function CheckoutModal({ booth, onClose, onCheckout, isDark, textMain, textMuted, border }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);     // { code, discount }
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");         // couldn't verify, still sending
  const [paying, setPaying] = useState(false);

  const panel = isDark ? "#120a22" : "#ffffff";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  /* Booth prices are tax-EXCLUSIVE — Stripe adds 13% HST on top of the
     discounted subtotal, so this summary mirrors the same maths. */
  const HST_RATE = 0.13;
  const discountAmt = applied ? Math.round(booth.amount * (applied.discount / 100) * 100) / 100 : 0;
  const subtotal = booth.amount - discountAmt;
  const hstAmt = Math.round(subtotal * HST_RATE * 100) / 100;
  const total = subtotal + hstAmt;

  const applyCode = async () => {
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) { setError("Enter a promo code."); return; }

    setChecking(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch(PROMO_VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, tier: `booth-${booth.id}`, type: "booth" }),
      });

      // No validation route deployed yet — let Stripe decide.
      if (res.status === 404 || res.status === 405) {
        setApplied({ code: clean, discount: 0 });
        setNotice("Code saved. It will be applied at payment.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.valid === false || data.error) {
        setError(data.error || "That code isn't valid for this booth.");
        setApplied(null);
        return;
      }

      const pct = Number(data.discount ?? data.percentOff ?? data.percent_off);
      if (!pct || isNaN(pct)) {
        setApplied({ code: clean, discount: 0 });
        setNotice("Code saved. It will be applied at payment.");
        return;
      }

      setApplied({ code: data.code || clean, discount: pct });
    } catch (err) {
      // Network/CORS — don't block the sale
      setApplied({ code: clean, discount: 0 });
      setNotice("Code saved. It will be applied at payment.");
    } finally {
      setChecking(false);
    }
  };

  const proceed = async () => {
    setPaying(true);
    setError("");
    try {
      await onCheckout(booth.id, applied ? applied.code : undefined);
    } catch (err) {
      setError(err.message || "Checkout failed. Please try again.");
      setPaying(false);
    }
  };

  const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.95rem" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: "24px"
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ background: panel, width: "100%", maxWidth: 480, borderRadius: 20, padding: 32, position: "relative", border: "1px solid " + border, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%",
            background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            border: isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.12)",
            color: textMain, fontSize: "1.1rem", lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.3rem", fontWeight: 800, color: textMain, marginBottom: 6, paddingRight: 40 }}>
          {booth.title}
        </h3>
        <p style={{ fontSize: "0.88rem", color: textMuted, marginBottom: 24 }}>
          {booth.specs} · Exhibition space at TTFC 2026
        </p>

        {/* ---- promo input ---- */}
        <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>
          Promo code
        </label>
        <div className="promo-row" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
            placeholder="e.g. LAUNCH25"
            spellCheck={false}
            disabled={!!applied}
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 10,
              border: "1px solid " + border, background: inputBg, color: textMain,
              fontWeight: 700, fontSize: "0.95rem", letterSpacing: "1.5px", textTransform: "uppercase",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              opacity: applied ? 0.6 : 1,
            }}
          />
          {applied ? (
            <button
              onClick={() => { setApplied(null); setCode(""); setNotice(""); }}
              style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid " + border, background: "transparent", color: textMuted, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}
            >Remove</button>
          ) : (
            <button
              onClick={applyCode}
              disabled={checking}
              style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.5px", textTransform: "uppercase", cursor: checking ? "not-allowed" : "pointer", opacity: checking ? 0.6 : 1, whiteSpace: "nowrap" }}
            >{checking ? "Checking…" : "Apply"}</button>
          )}
        </div>

        {error && <p style={{ fontSize: "0.8rem", color: "#e05555", fontWeight: 600, marginBottom: 12 }}>{error}</p>}
        {notice && <p style={{ fontSize: "0.8rem", color: isDark ? "#f0b57a" : "#a8600a", fontWeight: 600, marginBottom: 12 }}>{notice}</p>}
        {applied && applied.discount > 0 && (
          <p style={{ fontSize: "0.8rem", color: "#3fb968", fontWeight: 700, marginBottom: 12 }}>
            {applied.code} applied — {applied.discount}% off
          </p>
        )}

        {/* ---- totals ---- */}
        <div style={{ borderTop: "1px solid " + border, marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...rowStyle, color: textMuted }}>
            <span>Booth</span><span>{money(booth.amount)}</span>
          </div>
          {applied && applied.discount > 0 && (
            <div style={{ ...rowStyle, color: "#3fb968" }}>
              <span>Discount ({applied.discount}%)</span><span>−{money(discountAmt)}</span>
            </div>
          )}
          <div style={{ ...rowStyle, color: textMuted }}>
            <span>HST (13%)</span><span>{money(hstAmt)}</span>
          </div>
          <div style={{ ...rowStyle, color: textMain, fontWeight: 800, fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            <span>Total</span><span>{money(total)} CAD</span>
          </div>
          <p style={{ fontSize: "0.72rem", color: textMuted }}>
            Booth prices exclude tax. 13% HST is added at checkout.
          </p>
        </div>

        <button
          onClick={proceed}
          disabled={paying}
          style={{
            width: "100%", marginTop: 22, padding: "15px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#fff",
            fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.85rem",
            letterSpacing: "1px", textTransform: "uppercase",
            cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.7 : 1,
            boxShadow: "0 4px 16px rgba(122,63,209,0.3)",
          }}
        >
          {paying ? "Redirecting…" : "Continue to Payment"}
        </button>

        <p style={{ marginTop: 12, textAlign: "center", fontSize: "0.72rem", color: textMuted }}>
          Secure payment via Stripe. Prices in CAD.
        </p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ENQUIRE MODAL
   ═══════════════════════════════════════════════════════ */
function EnquireModal({ booth, onClose, isDark, textMain, border }) {
  const [status, setStatus] = useState("");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", message: "" });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_gy3fvru", template_id: "template_ufqzzep", user_id: "gZgYZtLCXPVgUsVj_",
          template_params: {
            to_email: "baldeep@thetechfestival.com",
            from_name: `${formData.firstName} ${formData.lastName}`,
            from_email: formData.email,
            message: `[Booth Enquiry: ${booth.title} — ${booth.specs}]\n\n${formData.message || "No additional message."}`,
          },
        }),
      });
      if (res.ok || res.status === 200) {
        setStatus("Success! We will be in touch shortly.");
        setTimeout(() => { onClose(); }, 2500);
      } else {
        setStatus("Error — please try again.");
      }
    } catch {
      setStatus("Error — please try again.");
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: "8px",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    border: "1px solid " + border, color: textMain, fontSize: "0.95rem",
    outline: "none", marginBottom: "16px", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: "24px"
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ background: isDark ? "#120a22" : "#ffffff", width: "100%", maxWidth: "500px", borderRadius: "20px", padding: "32px", position: "relative", border: "1px solid " + border, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            width: 32, height: 32, borderRadius: "50%",
            background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            border: isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.12)",
            color: isDark ? "#ffffff" : "#0f0520",
            fontSize: "1.1rem", lineHeight: 1, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.15)"}
          onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
        >✕</button>

        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.4rem", fontWeight: 800, color: textMain, marginBottom: "8px", paddingRight: 40 }}>
          Enquire about <GradientSpan>{booth.specs}</GradientSpan>
        </h3>
        <p style={{ fontSize: "0.9rem", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", marginBottom: "24px" }}>
          Leave your details below and our partnership team will reach out.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "16px" }}>
            <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required style={inputStyle} />
            <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required style={inputStyle} />
          </div>
          <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required style={inputStyle} />
          <textarea name="message" placeholder="Optional: Tell us a bit about your goals" rows="4" value={formData.message} onChange={handleChange} style={{ ...inputStyle, resize: "none" }} />
          <button
            type="submit" disabled={status === "Sending..."}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              cursor: status === "Sending..." ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.9rem",
              textTransform: "uppercase", letterSpacing: "1px",
              background: status === "Success! We will be in touch shortly." ? "#2e9e54" : "linear-gradient(135deg, #7a3fd1, #f5a623)",
              color: "#ffffff", opacity: status === "Sending..." ? 0.7 : 1,
            }}
          >
            {status || "Submit Enquiry"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function GradientSpan({ children }) {
  return (
    <span style={{
      background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    }}>{children}</span>
  );
}
