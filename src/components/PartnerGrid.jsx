import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { client, urlFor } from "../utils/sanity";

/**
 * PartnerGrid — premium edition
 * -----------------------------
 * Same Sanity contract as before. Renders partners as a clean 3-column grid
 * (collapses to 2 on tablet, 1 on mobile) with cinematic tile materials:
 * mouse-following sheen, depth shadows, and a smooth hover lift.
 */
export default function PartnerGrid({ category, dark, accent }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = `*[_type == "partner" && category == "${category}" && active == true] | order(order asc) {
      _id,
      name,
      logo,
      url
    }`;

    client
      .fetch(query)
      .then((data) => {
        setPartners(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setPartners([]);
        setLoading(false);
      });
  }, [category]);

  const mutedText = dark ? "rgba(200,185,255,0.55)" : "rgba(13,5,32,0.45)";
  const accentColor = accent || (dark ? "#b99eff" : "#7a3fd1");

  if (loading) {
    return (
      <div
        style={{
          padding: "60px 5%",
          textAlign: "center",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: mutedText,
        }}
      >
        Loading...
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div
        style={{
          padding: "60px 5%",
          textAlign: "center",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          color: mutedText,
        }}
      >
        Coming soon
      </div>
    );
  }

  return (
    <>
      <style>{`
        .partner-grid-wrap {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          padding: 12px 5% 0;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .partner-grid-wrap {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 12px 4% 0;
          }
        }
        @media (max-width: 480px) {
          .partner-grid-wrap {
            /* Keep 2 columns on phones — 1 column wastes too much space */
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 12px 4% 0;
          }
        }

        .partner-tile {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 32px;
          height: 140px;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          text-decoration: none;
          isolation: isolate;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                      box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* Mouse-following sheen — premium card material */
        .partner-tile::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            600px circle at var(--mx, 50%) var(--my, 50%),
            rgba(122, 63, 209, 0.08) 0%,
            transparent 40%
          );
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: 1;
        }

        @media (hover: hover) and (pointer: fine) {
          .partner-tile:hover::before { opacity: 1; }
          .partner-tile:hover {
            transform: translateY(-6px);
          }
        }

        .partner-tile img {
          position: relative;
          z-index: 2;
          max-height: 70px;
          max-width: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }

        @media (hover: hover) and (pointer: fine) {
          .partner-tile:hover img {
            transform: scale(1.05);
          }
        }

        /* ─── MOBILE TILE SIZING ─── */
        @media (max-width: 900px) {
          .partner-tile {
            height: 92px;
            padding: 14px 16px;
            border-radius: 14px;
          }
          .partner-tile img {
            max-height: 44px;
          }
        }
        @media (max-width: 480px) {
          .partner-tile {
            height: 80px;
            padding: 12px 14px;
            border-radius: 12px;
          }
          .partner-tile img {
            max-height: 38px;
          }
        }
      `}</style>

      <div className="partner-grid-wrap">
        {partners.map((partner, i) => {
          const hasLogo = !!partner.logo;
          const logoUrl = hasLogo
            ? urlFor(partner.logo).height(140).auto("format").url()
            : null;

          // Premium depth shadow — multi-layer for tactile feel
          const baseShadow = dark
            ? "0 4px 14px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(155,135,245,0.3)"
            : "0 4px 14px rgba(122,63,209,0.08), 0 1px 2px rgba(122,63,209,0.04), inset 0 1px 1px rgba(255,255,255,0.9), 0 0 0 1px rgba(122,63,209,0.15)";

          const hoverShadow = dark
            ? "0 16px 40px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.7), 0 0 0 1px " + accentColor + "80"
            : "0 16px 38px rgba(122,63,209,0.22), 0 4px 8px rgba(122,63,209,0.10), inset 0 1px 1px rgba(255,255,255,1), 0 0 0 1px " + accentColor + "55";

          const onMove = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            e.currentTarget.style.setProperty("--mx", mx + "px");
            e.currentTarget.style.setProperty("--my", my + "px");
          };

          const onEnter = (e) => {
            e.currentTarget.style.boxShadow = hoverShadow;
          };
          const onLeave = (e) => {
            e.currentTarget.style.boxShadow = baseShadow;
          };

          const inner = hasLogo ? (
            <img
              src={logoUrl}
              alt={partner.name || "Partner logo"}
              loading="lazy"
            />
          ) : (
            <span
              style={{
                position: "relative",
                zIndex: 2,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "#0d0520",
                textAlign: "center",
                letterSpacing: "0.5px",
              }}
            >
              {partner.name}
            </span>
          );

          const TileMotion = motion[partner.url ? "a" : "div"];
          const linkProps = partner.url
            ? {
                href: partner.url,
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-label": partner.name || "Partner",
              }
            : {};

          return (
            <TileMotion
              key={partner._id}
              {...linkProps}
              className="partner-tile"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ boxShadow: baseShadow }}
              onMouseMove={onMove}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {inner}
            </TileMotion>
          );
        })}
      </div>
    </>
  );
}
