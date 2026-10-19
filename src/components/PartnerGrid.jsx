import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Atom, Lock, Settings, Leaf, Heart, Building2, PenTool, Shield, Zap, Users, Star, Info, X, ExternalLink } from "lucide-react";
import { client, urlFor, logoScaleOf } from "../utils/sanity";
import { logoHref } from "../data/logoLinks";
import { FEATURED_GROUP, PILLAR_GROUPS, SECTOR_GROUPS, ECOSYSTEM_GROUP, matrixGroupOf } from "../data/partnerMatrix";
import { WEBSITE_PARTNER_FILTER } from "../data/sponsors";

/**
 * PartnerGrid — pillar × sector matrix
 * ------------------------------------
 * Renders every active Sanity "partner" grouped like the home page's
 * "5 tech pillars × 5 applied sectors": paid partners first, then one row
 * per pillar and per sector, then ecosystem & media. Groups come from
 * src/data/partnerMatrix.js; order inside a group is the admin panel's
 * Display order (ranked by recognition).
 *
 * Props:
 *   - dark   (boolean) — theme flag
 *   - accent (string)  — accent color for hover ring
 */

const ICONS = {
  cpu: Cpu, atom: Atom, lock: Lock, settings: Settings, leaf: Leaf,
  heart: Heart, building: Building2, tool: PenTool, shield: Shield, zap: Zap,
  users: Users, star: Star,
};

function PartnerTile({ partner, i, dark, accentColor }) {
  const hasLogo = !!partner.logo;
  const logoUrl = hasLogo
    ? urlFor(partner.logo).height(Math.round(160 * Math.max(1, logoScaleOf(partner)))).auto("format").url()
    : null;

  const baseShadow = dark
    ? "0 4px 14px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(155,135,245,0.3)"
    : "0 4px 14px rgba(122,63,209,0.08), 0 1px 2px rgba(122,63,209,0.04), inset 0 1px 1px rgba(255,255,255,0.9), 0 0 0 1px rgba(122,63,209,0.15)";

  const hoverShadow = dark
    ? "0 16px 40px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.7), 0 0 0 1px " + accentColor + "80"
    : "0 16px 38px rgba(122,63,209,0.22), 0 4px 8px rgba(122,63,209,0.10), inset 0 1px 1px rgba(255,255,255,1), 0 0 0 1px " + accentColor + "55";

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", e.clientX - rect.left + "px");
    e.currentTarget.style.setProperty("--my", e.clientY - rect.top + "px");
  };

  const inner = hasLogo ? (
    <img
      src={logoUrl}
      alt={partner.name || "Partner logo"}
      loading="lazy"
      style={logoScaleOf(partner) !== 1 ? { "--logo-scale": logoScaleOf(partner) } : undefined}
    />
  ) : (
    <span className="partner-tile-name">{partner.name}</span>
  );

  const href = logoHref(partner);
  const TileMotion = motion[href ? "a" : "div"];
  const linkProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer", "aria-label": partner.name || "Partner" }
    : {};
  return (
    <TileMotion
      {...linkProps}
      className="partner-tile"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      style={{ boxShadow: baseShadow }}
      onMouseMove={onMove}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = hoverShadow; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = baseShadow; }}
    >
      {inner}
    </TileMotion>
  );
}

/** The admin panel's description (Admin › Website content › Sponsors). */
function aboutOf(partner) {
  return typeof partner.description === "string" ? partner.description.trim() : "";
}

/** A Featured Partner: the logo (links to their site) and its name, which opens the description. */
function FeaturedPartner({ partner, i, dark, accentColor, onOpen }) {
  const about = aboutOf(partner);
  return (
    <div className="pm-feat">
      <PartnerTile partner={partner} i={i} dark={dark} accentColor={accentColor} />
      {about ? (
        <button type="button" className="pm-feat-name" aria-haspopup="dialog" onClick={(e) => onOpen(partner, e.currentTarget)}>
          <span>{partner.name}</span>
          <Info size={15} aria-hidden="true" />
        </button>
      ) : (
        <span className="pm-feat-name pm-feat-name--plain">{partner.name}</span>
      )}
    </div>
  );
}

function SponsorDialog({ partner, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  const href = logoHref(partner);
  return (
    <div className="pm-dialog-backdrop" onClick={onClose}>
      <div className="pm-dialog" role="dialog" aria-modal="true" aria-labelledby="pm-dialog-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="pm-dialog-close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <p className="pm-dialog-eyebrow">Featured Partner</p>
        <h3 id="pm-dialog-title" className="pm-dialog-title">{partner.name}</h3>
        <p className="pm-dialog-body">{aboutOf(partner)}</p>
        {href && (
          <a className="pm-dialog-link" href={href} target="_blank" rel="noopener noreferrer">
            Visit website <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

function GroupRow({ group, items, dark, accentColor }) {
  const Icon = ICONS[group.iconName] || Star;
  return (
    <div className="pm-row">
      <div className="pm-row-head">
        <span className="pm-row-icon"><Icon size={20} aria-hidden="true" /></span>
        <h3 className="pm-row-title">{group.title}</h3>
      </div>
      <div className="pm-tiles">
        {items.map((p, i) => <PartnerTile key={p._id} partner={p} i={i} dark={dark} accentColor={accentColor} />)}
      </div>
    </div>
  );
}

function MatrixBlock({ groups, byGroup, dark, accentColor }) {
  const shown = groups.filter((g) => (byGroup[g.key] || []).length > 0);
  if (!shown.length) return null;
  return (
    <section className="pm-block">
      {shown.map((g) => <GroupRow key={g.key} group={g} items={byGroup[g.key]} dark={dark} accentColor={accentColor} />)}
    </section>
  );
}

export default function PartnerGrid({ dark, accent }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  // The Featured Partner whose description is open, and the name button that opened it.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const openAbout = useCallback((partner, el) => { opener.current = el; setOpen(partner); }, []);
  const closeAbout = useCallback(() => { setOpen(null); opener.current?.focus(); }, []);

  useEffect(() => {
    client
      .fetch(`*[_type == "partner" && ${WEBSITE_PARTNER_FILTER}] | order(coalesce(order, 9999) asc, name asc) {
        _id,
        name,
        logo,
        logoScale,
        url,
        matrixGroup,
        description
      }`)
      .then((data) => {
        setPartners(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setPartners([]);
        setLoading(false);
      });
  }, []);

  const mutedText = dark ? "rgba(200,185,255,0.55)" : "rgba(13,5,32,0.45)";
  const accentColor = accent || (dark ? "#b99eff" : "#7a3fd1");

  if (loading || partners.length === 0) {
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
        {loading ? "Loading..." : "Coming soon"}
      </div>
    );
  }

  const byGroup = {};
  partners.forEach((p) => {
    const k = matrixGroupOf(p);
    (byGroup[k] = byGroup[k] || []).push(p);
  });
  const featured = byGroup[FEATURED_GROUP.key] || [];
  const ecosystem = byGroup[ECOSYSTEM_GROUP.key] || [];

  const line = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.12)";
  const iconBg = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.04)";
  const titleColor = dark ? "#ffffff" : "#0d0520";

  return (
    <>
      <style>{`
        .pm-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 5%;
          display: flex;
          flex-direction: column;
          gap: 56px;
        }
        .pm-block + .pm-block { margin-top: -56px; }
        .pm-featured {
          display: grid;
          grid-template-columns: repeat(var(--featured-cols, 4), minmax(0, 1fr));
          gap: 20px;
        }
        .pm-featured .partner-tile { height: 150px; }
        .pm-feat { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 0; }
        .pm-feat > .partner-tile { width: 100%; }
        .pm-feat-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 100%;
          padding: 6px 12px;
          border: 1px solid ${line};
          border-radius: 999px;
          background: ${iconBg};
          color: ${titleColor};
          font-family: 'Montserrat', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .pm-feat-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pm-feat-name svg { flex-shrink: 0; color: ${accentColor}; }
        .pm-feat-name:hover, .pm-feat-name:focus-visible { border-color: ${accentColor}; color: ${accentColor}; }
        .pm-feat-name:focus-visible { outline: 2px solid ${accentColor}; outline-offset: 2px; }
        .pm-feat-name--plain { cursor: default; border-color: transparent; background: none; }
        .pm-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10001; /* above the navbar and the announcement bar */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(8, 3, 22, 0.6);
          backdrop-filter: blur(4px);
        }
        .pm-dialog {
          position: relative;
          width: min(520px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          padding: 28px 28px 24px;
          border-radius: 20px;
          background: ${dark ? "#140b2e" : "#ffffff"};
          border: 1px solid ${line};
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        }
        .pm-dialog-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid ${line};
          border-radius: 50%;
          background: ${iconBg};
          color: ${titleColor};
          cursor: pointer;
        }
        .pm-dialog-eyebrow {
          margin: 0 0 6px;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #f5a623;
        }
        .pm-dialog-title {
          margin: 0 44px 12px 0;
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1.1rem, 2.4vw, 1.35rem);
          font-weight: 800;
          line-height: 1.3;
          color: ${titleColor};
        }
        .pm-dialog-body {
          margin: 0 0 18px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.98rem;
          line-height: 1.7;
          color: ${dark ? "rgba(225,215,255,0.85)" : "rgba(13,5,32,0.75)"};
          white-space: pre-line;
        }
        .pm-dialog-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: ${accentColor};
          text-decoration: none;
        }
        .pm-dialog-link:hover { text-decoration: underline; }
        .pm-featured .partner-tile img { max-height: min(calc(76px * var(--logo-scale, 1)), 100%); }

        .pm-block-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: clamp(0.85rem, 1.5vw, 1.1rem);
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .pm-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

        /* Each pillar/sector: title centred, its logos centred underneath */
        .pm-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 32px 0;
          border-top: 1px solid ${line};
        }
        .pm-row-head { display: flex; align-items: center; justify-content: center; gap: 14px; text-align: center; }
        .pm-row-icon {
          padding: 14px;
          border-radius: 14px;
          display: flex;
          flex-shrink: 0;
          color: #f5a623;
          background: ${iconBg};
          border: 1px solid ${line};
        }
        .pm-row-title {
          margin: 0;
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1rem, 1.5vw, 1.2rem);
          font-weight: 800;
          line-height: 1.3;
          color: ${titleColor};
        }
        .pm-tiles {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
          width: 100%;
        }
        .pm-tiles > .partner-tile { flex: 0 0 180px; }

        .partner-tile {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px;
          height: 100px;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          isolation: isolate;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                      box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .partner-tile::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(122, 63, 209, 0.08) 0%, transparent 40%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: 1;
        }
        .partner-tile img {
          position: relative;
          z-index: 2;
          /* logo size from the admin panel (--logo-scale), never taller than the tile */
          max-height: min(calc(52px * var(--logo-scale, 1)), 100%);
          max-width: min(calc(100% * var(--logo-scale, 1)), 100%);
          width: auto;
          height: auto;
          object-fit: contain;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .partner-tile-name {
          position: relative;
          z-index: 2;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.8rem;
          font-weight: 800;
          color: #0d0520;
          text-align: center;
          letter-spacing: 0.5px;
        }
        @media (hover: hover) and (pointer: fine) {
          .partner-tile:hover::before { opacity: 1; }
          .partner-tile:hover { transform: translateY(-5px); }
          .partner-tile:hover img { transform: scale(1.05); }
        }

        @media (max-width: 900px) {
          .pm-wrap { gap: 44px; padding: 0 4%; }
          .pm-block + .pm-block { margin-top: -44px; }
          .pm-featured { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .pm-featured > .pm-feat:last-child:nth-child(odd) { grid-column: 1 / -1; }
          .pm-feat-name { font-size: 0.78rem; padding: 5px 10px; }
          .pm-featured .partner-tile { height: 110px; }
          .pm-featured .partner-tile img { max-height: min(calc(54px * var(--logo-scale, 1)), 100%); }
          .pm-row { gap: 14px; padding: 24px 0; }
          .pm-row-icon { padding: 10px; border-radius: 12px; }
          .pm-tiles { gap: 10px; }
          .pm-tiles > .partner-tile { flex-basis: 150px; }
          .partner-tile { height: 84px; padding: 12px 14px; border-radius: 14px; }
          .partner-tile img { max-height: min(calc(40px * var(--logo-scale, 1)), 100%); }
        }
        @media (max-width: 480px) {
          .pm-tiles > .partner-tile { flex-basis: calc(50% - 5px); }
          .partner-tile { height: 76px; padding: 10px 12px; border-radius: 12px; }
          .partner-tile img { max-height: min(calc(36px * var(--logo-scale, 1)), 100%); }
        }
      `}</style>

      <div className="pm-wrap">
        {featured.length > 0 && (
          <section>
            <div className="pm-block-label" style={{ justifyContent: "center", marginBottom: 20 }}>
              <span className="pm-dot" style={{ background: "#f5a623", boxShadow: "0 0 6px #f5a623" }} />
              <span style={{ color: "#f5a623" }}>{FEATURED_GROUP.title}</span>
            </div>
            <div className="pm-featured" style={{ "--featured-cols": Math.min(Math.max(featured.length, 1), 5) }}>
              {featured.map((p, i) => <FeaturedPartner key={p._id} partner={p} i={i} dark={dark} accentColor={accentColor} onOpen={openAbout} />)}
            </div>
          </section>
        )}

        <MatrixBlock groups={PILLAR_GROUPS} byGroup={byGroup} dark={dark} accentColor={accentColor} />
        <MatrixBlock groups={SECTOR_GROUPS} byGroup={byGroup} dark={dark} accentColor={accentColor} />

        {ecosystem.length > 0 && (
          <section className="pm-block">
            <GroupRow group={ECOSYSTEM_GROUP} items={ecosystem} dark={dark} accentColor={accentColor} />
          </section>
        )}
      </div>
      {open && <SponsorDialog partner={open} onClose={closeAbout} />}
    </>
  );
}
