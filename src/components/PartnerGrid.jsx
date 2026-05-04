import React, { useEffect, useState } from "react";
import { client, urlFor } from "../utils/sanity";

/**
 * PartnerGrid
 * -----------
 * Renders Sanity "partner" documents for a given category as a responsive
 * static grid of logo tiles. Uses the EXACT same query as PartnerMarquee
 * so the CMS contract is identical — only the presentation differs.
 *
 * Props:
 *   - category (string)  required — Sanity `category` value to filter by
 *   - dark     (boolean) optional — theme flag for tile styling
 *   - emptyMessage (string) optional — shown when no partners are found
 */
export default function PartnerGrid({ category, dark, emptyMessage }) {
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

  // Tile styling — purple outline in BOTH modes for visual consistency.
  // Dark mode gets a slightly stronger purple so it reads against the
  // deeper shadow underneath.
  const tileBg = "#ffffff";
  const tileBorder = dark
    ? "rgba(155,135,245,0.35)"  // purple, slightly stronger so it shows on dark bg
    : "rgba(122,63,209,0.18)";  // purple, gentle on white bg
  const tileShadow = dark
    ? "0 2px 12px rgba(0,0,0,0.35)"
    : "0 2px 10px rgba(122,63,209,0.08)";
  const tileShadowHover = dark
    ? "0 6px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(155,135,245,0.55)"
    : "0 6px 22px rgba(122,63,209,0.18), 0 0 0 1px rgba(122,63,209,0.35)";
  const mutedText = dark ? "rgba(200,185,255,0.55)" : "rgba(13,5,32,0.45)";

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 5%",
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
          padding: "40px 5%",
          textAlign: "center",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          color: mutedText,
        }}
      >
        {emptyMessage || "Coming soon"}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .partner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          padding: 8px 5% 0;
          max-width: 1400px;
          margin: 0 auto;
        }
        .partner-grid-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px 24px;
          height: 110px;
          background: #ffffff;
          border-radius: 14px;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
          text-decoration: none;
        }
        @media (hover: hover) and (pointer: fine) {
          .partner-grid-tile:hover {
            transform: translateY(-3px);
          }
        }
        .partner-grid-tile img {
          max-height: 60px;
          max-width: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        @media (max-width: 640px) {
          .partner-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .partner-grid-tile {
            height: 90px;
            padding: 14px 18px;
          }
          .partner-grid-tile img {
            max-height: 48px;
          }
        }
      `}</style>

      <div className="partner-grid">
        {partners.map((partner) => {
          const hasLogo = !!partner.logo;
          const logoUrl = hasLogo
            ? urlFor(partner.logo).height(120).auto("format").url()
            : null;

          const tileStyle = {
            background: tileBg,
            border: "1px solid " + tileBorder,
            boxShadow: tileShadow,
          };

          const onHoverIn = (e) => {
            e.currentTarget.style.boxShadow = tileShadowHover;
          };
          const onHoverOut = (e) => {
            e.currentTarget.style.boxShadow = tileShadow;
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
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "#0d0520",
                textAlign: "center",
              }}
            >
              {partner.name}
            </span>
          );

          if (partner.url) {
            return (
              <a
                key={partner._id}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={partner.name || "Partner"}
                className="partner-grid-tile"
                style={tileStyle}
                onMouseEnter={onHoverIn}
                onMouseLeave={onHoverOut}
              >
                {inner}
              </a>
            );
          }

          return (
            <div
              key={partner._id}
              className="partner-grid-tile"
              style={tileStyle}
              onMouseEnter={onHoverIn}
              onMouseLeave={onHoverOut}
            >
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
