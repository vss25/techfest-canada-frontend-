import React, { useEffect, useMemo, useState } from "react";
import { client, urlFor } from "../utils/sanity";

const EMPTY_CELLS = Array.from({ length: 10 }, (_, idx) => ({
  _id: `empty-${idx}`,
  name: "",
  logo: null,
  url: "",
}));

export default function PartnerMarquee({ category, title, dark }) {
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

  const bg = dark ? "#0c0816" : "rgba(122,63,209,0.02)";
  const border = dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.08)";
  const fade = dark ? "#0c0816" : "#ffffff";

  const marqueeItems = useMemo(() => {
    const source = partners.length > 0 ? partners : EMPTY_CELLS;
    return [...source, ...source];
  }, [partners]);

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
        @keyframes partner-marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .partner-marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: partner-marquee-scroll 32s linear infinite;
          gap: 12px;
          padding: 4px 8px;
        }
        @media (hover: hover) and (pointer: fine) {
          .partner-marquee-track:hover { animation-play-state: paused; }
        }
        .partner-marquee-item {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 32px;
          height: 64px;
          flex-shrink: 0;
          background: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
          min-width: 170px;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .partner-marquee-item:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(155,135,245,0.3);
            transform: translateY(-2px);
          }
        }
        .partner-marquee-item img {
          height: 36px;
          width: auto;
          max-width: 160px;
          object-fit: contain;
        }
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
        {loading ? "Loading..." : title}
      </div>

      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 120,
            background: `linear-gradient(to right, ${fade}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 120,
            background: `linear-gradient(to left, ${fade}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        <div className="partner-marquee-track">
          {marqueeItems.map((partner, i) => {
            const hasLogo = !!partner.logo;
            const logoUrl = hasLogo ? urlFor(partner.logo).height(80).auto("format").url() : null;
            const imgNode = hasLogo ? (
              <img src={logoUrl} alt={partner.name || "Partner logo"} loading="lazy" />
            ) : null;

            return (
              <div key={`${partner._id}-${i}`} className="partner-marquee-item">
                {partner.url && imgNode ? (
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={partner.name || "Partner"}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    {imgNode}
                  </a>
                ) : (
                  imgNode
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
