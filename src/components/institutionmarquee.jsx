import React, { useEffect, useMemo, useState } from "react";
import { client, urlFor } from "../utils/sanity";


const INSTITUTIONS_QUERY = `
  *[_type == "institutionMarquee" && active == true] | order(order asc) {
    _id,
    name,
    logo,
    url
  }
`;

const EMPTY_CELLS = Array.from({ length: 10 }, (_, idx) => ({
  _id: `empty-${idx}`,
  name: "",
  logo: null,
  url: "",
}));

export default function InstitutionMarquee({ dark, title }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch(INSTITUTIONS_QUERY)
      .then((data) => {
        setInstitutions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setInstitutions([]);
        setLoading(false);
      });
  }, []);

  const bg = dark ? "#0c0816" : "rgba(122,63,209,0.02)";
  const border = dark ? "rgba(155,135,245,0.08)" : "rgba(122,63,209,0.08)";
  const fade = dark ? "#0c0816" : "#ffffff";
  const displayTitle = title || "Institutions involved";

  const marqueeItems = useMemo(() => {
    const source = institutions.length > 0 ? institutions : EMPTY_CELLS;
    return [...source, ...source];
  }, [institutions]);

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
        @keyframes institutions-marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .institutions-marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: institutions-marquee-scroll 32s linear infinite;
          gap: 12px;
          padding: 4px 8px;
        }
        @media (hover: hover) and (pointer: fine) {
          .institutions-marquee-track:hover { animation-play-state: paused; }
        }
        .institutions-marquee-item {
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
          .institutions-marquee-item:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(155,135,245,0.3);
            transform: translateY(-2px);
          }
        }
        .institutions-marquee-item img {
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
        {loading ? "Loading institutions..." : displayTitle}
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

        <div className="institutions-marquee-track">
          {marqueeItems.map((institution, i) => {
            const hasLogo = !!institution.logo;
            const logoUrl = hasLogo ? urlFor(institution.logo).height(80).auto("format").url() : null;
            const imgNode = hasLogo ? (
              <img src={logoUrl} alt={institution.name || "Institution logo"} loading="lazy" />
            ) : null;

            return (
              <div key={`${institution._id}-${i}`} className="institutions-marquee-item">
                {institution.url && imgNode ? (
                  <a
                    href={institution.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={institution.name || "Institution"}
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
