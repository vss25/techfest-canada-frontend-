// src/components/CommunityCarousel.jsx
// "2026 Speakers" — horizontal card carousel built from the same Sanity
// speaker data and card design used on the Speakers page.
// Vite + React, framer-motion, no Tailwind. Respects light / dark mode.
//
// NOTE: category pills (AI / ML, Robotics, …) were removed at the client's
// request, so this component no longer needs the pillar/sector keyword maps.

import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, ChevronLeft, ChevronRight } from "lucide-react";
import { client, speakerPhotoUrl } from "../utils/sanity";
import useAgenda from "../hooks/useAgenda";
import { sessionsForSpeaker, slugifyName, formatTime12, DAYS } from "../data/agenda";

var LinkedInIcon = function () {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
};

/* ─── Card (same design language as the Speakers page grid) ─── */
function CommunityCard({ speaker, dark }) {
  var s1 = useState(false); var hovered = s1[0]; var setHovered = s1[1];

  var imageUrl = speakerPhotoUrl(speaker.image, 500);
  var agenda = useAgenda().sessions;
  var mySessions = useMemo(function () { return sessionsForSpeaker(speaker.name, agenda); }, [speaker.name, agenda]);
  var firstSession = mySessions[0] || null;

  var accent = dark ? "#b99eff" : "#7a3fd1";
  var primaryText = dark ? "#ffffff" : "#0d0520";
  var secondaryText = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.65)";
  var mutedText = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";

  return (
    <div
      className="community-card"
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
      style={{
        position: "relative", borderRadius: "10px", overflow: "hidden",
        background: dark ? "rgba(255,255,255,0.04)" : "#fff",
        border: dark ? "1px solid rgba(255,255,255,0.11)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: !dark ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        display: "flex", flexDirection: "column",
        scrollSnapAlign: "start",
      }}
    >
      <Link
        to={"/speakers/" + slugifyName(speaker.name)}
        style={{ display: "flex", flexDirection: "column", flex: 1, textDecoration: "none", color: "inherit" }}
      >
        <div style={{
          position: "relative", paddingTop: "100%", overflow: "hidden",
          background: dark ? "#1a0a3e" : "#ede9ff",
        }}>
          {imageUrl ? (
            <img
              src={imageUrl} alt={speaker.name} loading="lazy" draggable={false}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center top",
                transition: "transform 0.6s ease, filter 0.4s ease",
                transform: hovered ? "scale(1.05)" : "scale(1)",
                filter: hovered ? "brightness(1.05) saturate(1.08)" : "brightness(0.96) saturate(1.02)",
              }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: accent, opacity: 0.3,
            }}>
              <Mic size={52} />
            </div>
          )}

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
            background: "linear-gradient(to top, rgba(10,3,26,0.92) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />

          <div style={{
            position: "absolute", bottom: 14, left: "50%",
            transform: "translateX(-50%) translateY(" + (hovered ? 0 : 6) + "px)",
            background: accent, backdropFilter: "blur(6px)", color: "#fff",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em",
            padding: "6px 16px", borderRadius: 999,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s ease, transform 0.3s ease",
            whiteSpace: "nowrap", textTransform: "uppercase",
            boxShadow: "0 6px 20px " + accent + "55",
            pointerEvents: "none",
          }}>
            View Profile →
          </div>
        </div>

        <div style={{ padding: "1.1rem 1.4rem" }}>
          <p style={{
            fontWeight: 700, fontSize: "1.06rem", lineHeight: 1.35,
            color: primaryText, marginBottom: "0.35rem",
          }}>
            {speaker.name}
          </p>

          {speaker.title && (
            <p style={{
              fontSize: "0.84rem", lineHeight: 1.5,
              color: secondaryText, marginBottom: "0.5rem",
            }}>
              {speaker.title}
            </p>
          )}

          {speaker.company && (
            <p style={{ fontSize: "0.82rem", lineHeight: 1.5, color: mutedText }}>
              {speaker.company}
            </p>
          )}

          {firstSession && (
            <p style={{
              fontSize: "0.76rem", lineHeight: 1.45, color: mutedText,
              marginTop: "0.7rem", paddingTop: "0.7rem",
              borderTop: "1px dashed " + (dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)"),
            }}>
              <span style={{ fontWeight: 700, color: secondaryText }}>
                {DAYS[firstSession.day].label} · {formatTime12(firstSession.time)}
              </span>
              {" — "}{firstSession.title}
            </p>
          )}
        </div>
      </Link>

      {speaker.linkedin && (
        <div style={{ padding: "0 1.4rem 1.1rem", marginTop: "auto" }}>
          <a
            href={speaker.linkedin} target="_blank" rel="noopener noreferrer"
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "9px 0", borderRadius: 8,
              background: "#0A66C2", color: "#fff",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
              textDecoration: "none", textTransform: "uppercase",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.background = "#004182"; }}
            onMouseLeave={function (e) { e.currentTarget.style.background = "#0A66C2"; }}
          >
            <LinkedInIcon />
            View on LinkedIn
          </a>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   2026 SPEAKERS carousel

   Props:
     dark      — boolean, from the Home page theme observer
     limit     — max cards to pull into the rail (default 14)
     showAllTo — route for the "See all" link (default "/speakers")
───────────────────────────────────────────── */
export default function CommunityCarousel({ dark, limit = 14, showAllTo = "/speakers" }) {
  var s1 = useState([]);    var people = s1[0];   var setPeople = s1[1];
  var s2 = useState(true);  var loading = s2[0];  var setLoading = s2[1];
  var s3 = useState(false); var atStart = s3[0];  var setAtStart = s3[1];
  var s4 = useState(false); var atEnd = s4[0];    var setAtEnd = s4[1];

  var railRef = useRef(null);

  useEffect(function () {
    var alive = true;
    client
      .fetch('*[_type == "speaker"] | order(order asc, coalesce(rowPosition, 9999) asc) { _id, name, title, company, bio, linkedin, image, rowPosition }')
      .then(function (data) {
        if (!alive) return;
        setPeople(Array.isArray(data) ? data.slice(0, limit) : []);
        setLoading(false);
      })
      .catch(function () { if (alive) setLoading(false); });
    return function () { alive = false; };
  }, [limit]);

  function syncEdges() {
    var el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(function () {
    var el = railRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return function () {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [people.length]);

  function scrollByPage(dir) {
    var el = railRef.current;
    if (!el) return;
    var card = el.querySelector(".community-card");
    var step = card ? card.getBoundingClientRect().width + 19.2 : el.clientWidth * 0.8;
    var pages = Math.max(1, Math.floor(el.clientWidth / step));
    el.scrollBy({ left: dir * step * pages, behavior: "smooth" });
  }

  if (loading || people.length === 0) return null;

  var text = dark ? "#ffffff" : "#0d0520";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var border = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  var mutedText = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";

  var navBtn = function (disabled) {
    return {
      width: 40, height: 40, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid " + border,
      background: dark ? "rgba(255,255,255,0.05)" : "#fff",
      color: disabled ? mutedText : text,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
      transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
      flexShrink: 0,
    };
  };

  return (
    <section id="speakers-2026" style={{ padding: "clamp(2.5rem, 5vw, 4rem) 0 clamp(3rem, 6vw, 4.5rem)" }}>
      <style>{"\
        .community-rail {\
          display: grid;\
          grid-auto-flow: column;\
          grid-auto-columns: 288px;\
          gap: 1.2rem;\
          overflow-x: auto;\
          scroll-snap-type: x mandatory;\
          scroll-padding-left: 1.5rem;\
          padding: 0.5rem 1.5rem 1.2rem;\
          -webkit-overflow-scrolling: touch;\
          scrollbar-width: none;\
        }\
        .community-rail::-webkit-scrollbar { display: none; }\
        @media (max-width: 640px) {\
          .community-rail { grid-auto-columns: 78vw; }\
          .community-nav { display: none !important; }\
        }\
        .community-gradient-text {\
          background: linear-gradient(135deg, var(--grad-start, #b99eff), #f5a623);\
          -webkit-background-clip: text;\
          -webkit-text-fill-color: transparent;\
          background-clip: text;\
          color: transparent;\
          display: inline-block;\
        }\
      "}</style>

      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", damping: 22, stiffness: 120 }}
          style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.6rem",
          }}
        >
          <div>
            <h2 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
              fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: text,
            }}>
              2026 <span className="community-gradient-text" style={{ "--grad-start": accent }}>Speakers</span>
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              to={showAllTo}
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: accent, textDecoration: "none",
                borderBottom: "1.5px solid " + accent + "55", paddingBottom: 2,
                whiteSpace: "nowrap",
              }}
            >
              See all speakers →
            </Link>

            <div className="community-nav" style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={function () { scrollByPage(-1); }} disabled={atStart}
                aria-label="Scroll left" style={navBtn(atStart)}>
                <ChevronLeft size={19} />
              </button>
              <button onClick={function () { scrollByPage(1); }} disabled={atEnd}
                aria-label="Scroll right" style={navBtn(atEnd)}>
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ position: "relative", maxWidth: 1260, margin: "0 auto" }}>
        <div ref={railRef} className="community-rail">
          {people.map(function (p) {
            return <CommunityCard key={p._id} speaker={p} dark={dark} />;
          })}
        </div>

        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: 40, pointerEvents: "none",
          background: "linear-gradient(to right, " + (dark ? "#06020f" : "#ffffff") + ", transparent)",
          opacity: atStart ? 0 : 1, transition: "opacity 0.25s ease",
        }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, right: 0, width: 40, pointerEvents: "none",
          background: "linear-gradient(to left, " + (dark ? "#06020f" : "#ffffff") + ", transparent)",
          opacity: atEnd ? 0 : 1, transition: "opacity 0.25s ease",
        }} />
      </div>
    </section>
  );
}
