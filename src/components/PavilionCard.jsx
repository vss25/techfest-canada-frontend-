import { motion } from "framer-motion";

/* Promo card for the India Startup Pavilion.
   TWO CTAs:
   - "Start Application" → opens the pavilion form in a new tab
   - "Pay for Approved Application" → opens the deposit page in a new tab */

export default function PavilionCard({ isDark, textMain, textMuted, border, cardBg }) {
  return (
    <section style={{
      padding: "clamp(3rem, 6vw, 5rem) 5%",
      background: isDark ? "rgba(214,48,140,0.03)" : "rgba(214,48,140,0.02)",
      borderTop: "1px solid " + border,
      borderBottom: "1px solid " + border,
    }}>
      <style>{`
        .pavilion-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
        }
        .pavilion-card-cta-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
          min-width: 220px;
        }
        .pavilion-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 24px;
          border-radius: 14px;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .pavilion-cta:hover { transform: translateY(-1px); }
        .pavilion-cta-primary {
          background: #D6308C;
          color: #fff;
          box-shadow: 0 4px 20px rgba(214,48,140,0.3);
        }
        .pavilion-cta-secondary {
          background: transparent;
          border: 1.5px solid rgba(63,209,156,0.45);
          color: ${isDark ? "#3fd19c" : "#2a9968"};
        }
        .pavilion-cta-secondary:hover {
          background: rgba(63,209,156,0.08);
          border-color: rgba(63,209,156,0.7);
        }
        @media (max-width: 768px) {
          .pavilion-card {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
            text-align: left !important;
          }
          .pavilion-card-cta-group {
            width: 100%;
            min-width: 0;
          }
          .pavilion-cta {
            width: 100%;
            white-space: normal !important;
          }
          .pavilion-card-title {
            font-size: 1.4rem !important;
            line-height: 1.2 !important;
          }
          .pavilion-card-desc { font-size: 0.92rem !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="pavilion-card"
          style={{
            background: cardBg,
            border: "1px solid " + border,
            borderRadius: 24,
            padding: "clamp(24px, 4vw, 44px)",
            boxShadow: isDark ? "0 4px 32px rgba(214,48,140,0.08)" : "0 4px 24px rgba(214,48,140,0.05)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-block",
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.35)",
                color: "#f5a623",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem", fontWeight: 800, letterSpacing: "1.2px",
                textTransform: "uppercase", padding: "5px 12px", borderRadius: 999,
                whiteSpace: "nowrap",
              }}>
                Endorsed by Consulate of India
              </span>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1px",
                textTransform: "uppercase", color: textMuted,
                whiteSpace: "nowrap",
              }}>
                Deadline Sept 30, 2026
              </span>
            </div>

            <h2 className="pavilion-card-title" style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.4rem, 3vw, 2.2rem)", fontWeight: 900,
              color: textMain, lineHeight: 1.15, margin: "0 0 14px",
              wordBreak: "break-word",
            }}>
              India Startup Pavilion —{" "}
              <span style={{
                background: "#D6308C",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Subsidised Booths</span>
            </h2>

            <p className="pavilion-card-desc" style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "1rem", color: textMuted,
              lineHeight: 1.7, margin: 0, maxWidth: 640,
            }}>
              Indian-incorporated startups can apply to exhibit inside a dedicated India Country Pavilion, with booth costs subsidised by the Consulate General of India, Toronto. Booths from just <strong style={{ color: "#f5a623" }}>CAD $499</strong>. Rolling approvals — limited spots.
            </p>
          </div>

          {/* CTA group */}
          <div className="pavilion-card-cta-group">
            <a
              href="/exhibit/india-pavilion"
              target="_blank"
              rel="noopener noreferrer"
              className="pavilion-cta pavilion-cta-primary"
            >
              Start Application
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </a>

            <a
              href="/exhibit/india-pavilion/pay"
              target="_blank"
              rel="noopener noreferrer"
              className="pavilion-cta pavilion-cta-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pay for Approved Application
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
