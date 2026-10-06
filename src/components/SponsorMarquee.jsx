// components/SponsorMarquee.jsx
// Fetches sponsors from Sanity CMS. Add/remove sponsors in the Sanity Studio
// under the "Sponsor" document type — no code changes needed.

import React, { useEffect, useState } from "react";
import imageUrlBuilder from "@sanity/image-url";
import { client, logoScaleOf } from "../utils/sanity";
import { logoHref } from "../data/logoLinks";

const builder = imageUrlBuilder(client);
const urlFor = (source) => builder.image(source);

// ─── GROQ query ───────────────────────────────────────────────────────────────
const SPONSORS_QUERY = `
  *[_type == "sponsor" && active == true] | order(order asc) {
    _id,
    name,
    logo,
    logoScale,
    url,
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SponsorMarquee({ dark, title }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .fetch(SPONSORS_QUERY)
      .then((data) => {
        setSponsors(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch sponsors:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  const bg = dark ? "#0c0816" : "rgba(122,63,209,0.02)";
  const border = dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.08)";
  const fade = dark ? "#0c0816" : "#ffffff";

  // Double the list so the CSS marquee loops seamlessly.
  const items = [...sponsors, ...sponsors];

  if (loading) {
    return (
      <section
        style={{
          background: bg,
          borderTop: "1px solid " + border,
          borderBottom: "1px solid " + border,
          padding: "32px 0 28px",
          textAlign: "center",
        }}
      >
        <p style={{ opacity: 0.5, fontFamily: "'Orbitron',sans-serif", fontSize: "0.6rem" }}>
          Loading sponsors…
        </p>
      </section>
    );
  }

  if (error || sponsors.length === 0) {
    return null;
  }

  var displayTitle = title || "Our team includes alumni from";

  return (
    <section
      style={{
        background: bg,
        borderTop: "1px solid " + border,
        borderBottom: "1px solid " + border,
        padding: "32px 0 28px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: marquee-scroll 32s linear infinite;
          gap: 12px;
          padding: 4px 8px;
        }
        /* Only pause on devices with a real pointer (mouse). Tapping on
           touchscreens fires a synthetic hover that would freeze the marquee. */
        @media (hover: hover) and (pointer: fine) {
          .marquee-track:hover { animation-play-state: paused; }
        }
        .marquee-item {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 32px;
          min-height: 64px;
          flex-shrink: 0;
          background: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .marquee-item:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(155,135,245,0.3);
            transform: translateY(-2px);
          }
        }
        .marquee-item img {
          height: calc(36px * var(--logo-scale, 1));
          width: auto;
          max-width: calc(160px * var(--logo-scale, 1));
          object-fit: contain;
          opacity: 1;
          transition: opacity 0.25s ease;
        }
        .marquee-item img[data-name="Temasek"]    { height: calc(17px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="Amazon"]     { height: calc(26px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="DHL"]        { height: calc(52px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="Constellar"] { height: calc(44px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="Ford"]       { height: calc(44px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="KPMG"]       { height: calc(40px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="Accenture"]  { height: calc(26px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="Cvent"]      { height: calc(26px * var(--logo-scale, 1)); }
        .marquee-item img[data-name="VMware"]     { height: calc(48px * var(--logo-scale, 1)); }
      `}</style>

      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
          fontFamily: "'Orbitron',sans-serif",
          fontSize: "0.72rem",
          fontWeight: 900,
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          color: dark ? "rgba(200,185,255,0.75)" : "rgba(13,5,32,0.65)",
        }}
      >
        {displayTitle}
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to right, ${fade}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to left, ${fade}, transparent)`, zIndex: 2, pointerEvents: "none" }} />

        <div className="marquee-track">
          {items.map((sponsor, i) => {
            const scale = logoScaleOf(sponsor);
            const logoUrl = urlFor(sponsor.logo).height(Math.round(80 * Math.max(1, scale))).auto("format").url();

            const img = (
              <img
                src={logoUrl}
                alt={sponsor.name}
                title={sponsor.name}
                data-name={sponsor.name}
                style={scale !== 1 ? { "--logo-scale": scale } : undefined}
                loading="lazy"
              />
            );

            return (
              <div key={`${sponsor._id}-${i}`} className="marquee-item">
                {logoHref(sponsor) ? (
                  <a
                    href={logoHref(sponsor)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sponsor.name}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
