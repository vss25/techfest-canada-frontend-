import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import NewsletterBar from "../components/NewsletterBar";

const MotionDiv = motion.div;

const POINTS = [
  { title: "One day", body: "A single, tightly run day — keynotes, roundtables and curated introductions." },
  { title: "Focused", body: "Each Briefing goes deep on one theme instead of covering everything." },
  { title: "Intimate", body: "Smaller rooms, real conversations and time to meet the people who matter." },
  { title: "Across Canada", body: "Bringing the spirit of the Toronto festival to cities coast to coast." },
];

export default function Briefings() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.body.classList.contains("dark-mode"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const bg = dark ? "#06020f" : "#faf9ff";
  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMid = dark ? "rgba(220,210,255,0.82)" : "rgba(13,5,32,0.68)";
  const cardBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const cardBdr = dark ? "rgba(155,135,245,0.15)" : "rgba(122,63,209,0.12)";
  const accent = dark ? "#b99eff" : "#7a3fd1";

  const scrollToNotify = (e) => {
    e.preventDefault();
    document.getElementById("notify")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ background: bg, color: textMain, minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      <section style={{ position: "relative", padding: "clamp(150px,18vw,200px) 6% clamp(60px,8vw,96px)", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,70,143,0.22), transparent 65%)", pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", bottom: -200, left: -160, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(122,63,209,0.20), transparent 65%)", pointerEvents: "none" }} />

        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
          style={{ position: "relative", maxWidth: 860, margin: "0 auto", textAlign: "center" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 999, border: "1px solid " + (dark ? "rgba(245,166,35,0.45)" : "rgba(245,166,35,0.6)"), background: dark ? "rgba(245,166,35,0.10)" : "rgba(245,166,35,0.12)", color: dark ? "#ffc56b" : "#b86e00", fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "#f5a623" }} />
            Coming soon
          </span>

          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2.4rem, 7vw, 4.4rem)", fontWeight: 900, margin: "26px 0 0", lineHeight: 1.05, letterSpacing: "1px", background: "linear-gradient(135deg, #d9468f 0%, #7a3fd1 50%, #f5a623 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
            Briefings
          </h1>

          <p style={{ margin: "26px auto 0", maxWidth: 680, fontSize: "clamp(1rem, 2vw, 1.15rem)", lineHeight: 1.75, color: textMid }}>
            TTFC Briefings are one-day micro-events — like the main festival in Toronto, but focused and intimate —
            coming to other cities across Canada.
          </p>

          <a
            href="#notify"
            onClick={scrollToNotify}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 34, padding: "13px 28px", borderRadius: 50, background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#ffffff", textDecoration: "none", fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", boxShadow: "0 8px 24px rgba(245,166,35,0.25)" }}
          >
            Get notified →
          </a>
        </MotionDiv>
      </section>

      <section style={{ padding: "0 6% clamp(64px,8vw,100px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {POINTS.map((p, i) => (
            <MotionDiv
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              style={{ background: cardBg, border: "1px solid " + cardBdr, borderRadius: 20, padding: "26px 24px", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(122,63,209,0.06)" }}
            >
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: accent, marginBottom: 10, letterSpacing: "0.5px" }}>{p.title}</div>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.65, color: textMid }}>{p.body}</p>
            </MotionDiv>
          ))}
        </div>
      </section>

      <div id="notify" style={{ scrollMarginTop: 120 }}>
        <NewsletterBar dark={dark} />
      </div>

      <Footer />
    </div>
  );
}
