import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Clock, Mic, Users } from 'lucide-react';
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer";
import { client, speakerPhotoUrl } from "../utils/sanity";
import useAgenda from "../hooks/useAgenda";
import {
  sessionsForSpeaker, roleInSession, nameKeys, slugifyName,
  DAYS, formatTime12, getDuration,
} from "../data/agenda";

var SPEAKER_QUERY = function() {
  return '*[_type == "speaker"] { _id, name, title, company, bio, linkedin, image }';
};

function LinkedInIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
}

/** true when two spellings refer to the same person */
function sameName(a, b) {
  var ka = new Set(nameKeys(a));
  return nameKeys(b).some(function (k) { return ka.has(k); });
}

/* ─────────────────────────────────────────────────────────────
   One session row inside the "Speaking At" card.
   Clicking it opens that session on the Agenda page.
   ───────────────────────────────────────────────────────────── */
function SessionRow({ session, speakerName, dark, accent, textMain, textMid, textSoft, cardBdr }) {
  var role = roleInSession(session, speakerName);
  var others = (session.speakers || [])
    .filter(function (p) { return !sameName(p.name, speakerName); })
    .map(function (p) { return p.name; });

  return (
    <Link
      to={"/agenda?session=" + session.id}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 16,
          padding: "14px 16px", borderRadius: 14,
          border: "1px solid transparent",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={function (e) {
          e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.04)";
          e.currentTarget.style.borderColor = cardBdr;
        }}
        onMouseLeave={function (e) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accent + "18", border: "1px solid " + accent + "30",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Mic size={18} style={{ color: accent }} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Day / type / role chips */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800,
              letterSpacing: "1px", textTransform: "uppercase",
              padding: "3px 9px", borderRadius: 6,
              background: accent + "1c", color: accent, border: "1px solid " + accent + "38",
            }}>
              {DAYS[session.day].label} · {DAYS[session.day].date}
            </span>
            {session.type && (
              <span style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800,
                letterSpacing: "1px", textTransform: "uppercase",
                padding: "3px 9px", borderRadius: 6,
                background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                color: textMid,
              }}>
                {session.type}
              </span>
            )}
            {role === "moderator" && (
              <span style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800,
                letterSpacing: "1px", textTransform: "uppercase",
                padding: "3px 9px", borderRadius: 6,
                background: dark ? "rgba(245,166,35,0.16)" : "rgba(196,120,10,0.12)",
                color: dark ? "#f5a623" : "#c4780a",
              }}>
                Moderating
              </span>
            )}
          </div>

          <p style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: "0.88rem", fontWeight: 800,
            color: textMain, marginBottom: 8, lineHeight: 1.45,
          }}>
            {session.title}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Clock size={13} style={{ color: textSoft }} />
              <span style={{ fontSize: "0.82rem", color: textMid }}>
                {formatTime12(session.time)} – {formatTime12(session.endTime)} · {getDuration(session.time, session.endTime)}
              </span>
            </span>
            {others.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <Users size={13} style={{ color: textSoft }} />
                <span style={{
                  fontSize: "0.82rem", color: textMid,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340,
                }}>
                  with {others.join(", ")}
                </span>
              </span>
            )}
          </div>

          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
            fontFamily: "'Orbitron',sans-serif", fontSize: "0.6rem", fontWeight: 800,
            letterSpacing: "1px", textTransform: "uppercase", color: accent,
          }}>
            View in full agenda <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SpeakerProfile() {
  var params = useParams();
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState(null); var speaker = s2[0]; var setSpeaker = s2[1];
  var s3 = useState(true); var loading = s3[0]; var setLoading = s3[1];
  var s4 = useState(null); var error = s4[0]; var setError = s4[1];

  useEffect(function() {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function() { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function() { obs.disconnect(); };
  }, []);

  useEffect(function() {
    if (!params.slug) return;
    setLoading(true);
    client.fetch(SPEAKER_QUERY())
      .then(function(speakers) {
        var speaker = speakers.find(function(s) {
          var speakerSlug = s.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          return speakerSlug === params.slug;
        });
        if (speaker) { setSpeaker(speaker); }
        else { setError("Speaker not found."); }
        setLoading(false);
      })
      .catch(function(err) {
        console.error("Error fetching speaker:", err);
        setError("Failed to load speaker.");
        setLoading(false);
      });
  }, [params.slug]);

  // Sessions for this person — live agenda from the CMS (falls back to src/data/agenda.js)
  var agenda = useAgenda().sessions;
  var mySessions = useMemo(function () {
    return speaker ? sessionsForSpeaker(speaker.name, agenda) : [];
  }, [speaker, agenda]);

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMid = dark ? "rgba(220,210,255,0.75)" : "rgba(13,5,32,0.60)";
  var textSoft = dark ? "rgba(200,185,255,0.45)" : "rgba(13,5,32,0.35)";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var cardBg = dark ? "rgba(255,255,255,0.04)" : "rgba(122,63,209,0.03)";
  var cardBdr = dark ? "rgba(155,135,245,0.18)" : "rgba(122,63,209,0.12)";

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: "100vh", color: textMain }}>
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center", opacity: 0.4 }}>
            <div style={{ fontSize: "2rem", animation: "sp-spin 1s linear infinite", marginBottom: 12 }}>⟳</div>
            <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", letterSpacing: "2px" }}>Loading speaker...</p>
          </div>
        </div>
        <style>{`@keyframes sp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !speaker) {
    return (
      <div style={{ background: bg, minHeight: "100vh", color: textMain }}>
        <Navbar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
          <p style={{ fontSize: "1.2rem", color: textMid }}>{error || "Speaker not found."}</p>
          <Link to="/speakers" style={{ color: accent, fontFamily: "'Orbitron',sans-serif", fontSize: "0.8rem", fontWeight: 700 }}>← Back to Speakers</Link>
        </div>
        <Footer />
      </div>
    );
  }

  var imgUrl = speakerPhotoUrl(speaker.image, 600);

  // Date line: exact day when all their sessions fall on one day
  var dayNums = mySessions.map(function (s) { return s.day; });
  var uniqueDays = Array.from(new Set(dayNums));
  var dateLabel = uniqueDays.length === 1
    ? DAYS[uniqueDays[0]].longDate
    : "October 26–27, 2026";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sp-profile-grid { display: grid; grid-template-columns: 380px 1fr; gap: clamp(40px, 5vw, 72px); align-items: start; }
        @media(max-width: 900px) { .sp-profile-grid { grid-template-columns: 1fr; gap: 32px; } .sp-img-col { max-width: 320px; margin: 0 auto; } }
        @media(max-width: 600px) { .sp-img-col { max-width: 260px; } }
        .sp-img-hover-wrap {
          position: relative; border-radius: 24px; overflow: hidden;
          aspect-ratio: 1/1;
        }
        .sp-img-hover-wrap img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.6s ease;
        }
        .sp-img-hover-wrap:hover img {
          transform: scale(1.05);
          filter: brightness(1.08) contrast(1.05) saturate(1.1);
        }
        .sp-img-glow {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(ellipse at 50% 60%, rgba(122,63,209,0.40) 0%, rgba(185,158,255,0.12) 45%, transparent 70%);
          opacity: 0; transition: opacity 0.5s ease; mix-blend-mode: screen;
        }
        .sp-img-hover-wrap:hover .sp-img-glow { opacity: 1; }
      `}} />
      <Navbar />

      {/* Hero area with gradient */}
      <div style={{ position: "relative", paddingTop: "clamp(100px, 14vw, 140px)", paddingBottom: "3rem", background: dark ? "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(122,63,209,0.12) 0%, transparent 70%)" : "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(122,63,209,0.06) 0%, transparent 70%)" }}>

        {/* Back button */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 5% 2rem" }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/speakers" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: accent, fontFamily: "'Orbitron',sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", padding: "8px 18px", borderRadius: 999, border: "1.5px solid " + cardBdr, transition: "all 0.2s ease" }}
              onMouseEnter={function(e) { e.currentTarget.style.background = accent + "18"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={14} /> All Speakers
            </Link>
          </motion.div>
        </div>

        {/* Profile grid */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 5%" }}>
          <div className="sp-profile-grid">

            {/* Image column */}
            <motion.div className="sp-img-col" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="sp-img-hover-wrap" style={{ border: "1px solid " + cardBdr, boxShadow: dark ? "0 16px 60px rgba(122,63,209,0.15)" : "0 16px 60px rgba(122,63,209,0.08)" }}>
                {imgUrl ? (
                  <img src={imgUrl} alt={speaker.name} onError={function(e) { e.target.style.display = "none"; }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: dark ? "#120a22" : "#ede8f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mic size={48} style={{ opacity: 0.15 }} />
                  </div>
                )}
                <div className="sp-img-glow" />
              </div>

              {/* LinkedIn under photo */}
              {speaker.linkedin && (
                <a href={speaker.linkedin} target="_blank" rel="noreferrer" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 16, padding: "12px 20px", borderRadius: 12,
                  background: "#0A66C2", color: "#ffffff", textDecoration: "none",
                  fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.3px",
                  transition: "background 0.2s ease",
                }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = "#004182"; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = "#0A66C2"; }}
                >
                  <LinkedInIcon /> View on LinkedIn
                </a>
              )}
            </motion.div>

            {/* Info column */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: textSoft, marginBottom: 12 }}>TTFC 2026 Speaker</p>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900, color: textMain, lineHeight: 1.1, marginBottom: 12, textTransform: "uppercase", letterSpacing: "-0.5px" }}>{speaker.name}</h1>
              <p style={{ fontSize: "clamp(1rem, 1.8vw, 1.2rem)", fontWeight: 600, color: textMain, marginBottom: 4, lineHeight: 1.4 }}>{speaker.title}</p>
              <p style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", fontWeight: 700, color: accent, marginBottom: 32, lineHeight: 1.3 }}>{speaker.company}</p>

              {/* Divider */}
              <div style={{ width: 60, height: 3, borderRadius: 3, background: "linear-gradient(90deg,#7a3fd1,#f5a623)", marginBottom: 28 }} />

              {/* Bio */}
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: textSoft, marginBottom: 14 }}>About</p>
                <p style={{ fontSize: "1.05rem", color: textMid, lineHeight: 1.85, textAlign: "justify", hyphens: "auto" }}>{speaker.bio}</p>
              </div>

              {/* ── SPEAKING AT — real sessions from src/data/agenda.js ── */}
              <div style={{ background: cardBg, border: "1px solid " + cardBdr, borderRadius: 20, padding: "28px 32px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: textSoft }}>Speaking At</p>
                  {mySessions.length > 0 && (
                    <span style={{
                      fontFamily: "'Orbitron',sans-serif", fontSize: "0.58rem", fontWeight: 800,
                      letterSpacing: "1px", padding: "3px 9px", borderRadius: 999,
                      background: accent + "20", color: accent,
                    }}>
                      {mySessions.length} SESSION{mySessions.length !== 1 ? "S" : ""}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {mySessions.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "0 -16px" }}>
                      {mySessions.map(function (session) {
                        return (
                          <SessionRow
                            key={session.id}
                            session={session}
                            speakerName={speaker.name}
                            dark={dark}
                            accent={accent}
                            textMain={textMain}
                            textMid={textMid}
                            textSoft={textSoft}
                            cardBdr={cardBdr}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: accent + "18", border: "1px solid " + accent + "30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mic size={18} style={{ color: accent }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "0.88rem", fontWeight: 800, color: textMain, marginBottom: 6 }}>Session To Be Announced</p>
                        <p style={{ fontSize: "0.88rem", color: textMid, lineHeight: 1.6 }}>This speaker's session topic and time slot will be confirmed closer to the event. Check back soon for updates.</p>
                      </div>
                    </div>
                  )}

                  <div style={{ height: 1, background: dark ? "rgba(155,135,245,0.10)" : "rgba(122,63,209,0.08)" }} />

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Calendar size={14} style={{ color: textSoft }} />
                      <span style={{ fontSize: "0.82rem", color: textMid }}>{dateLabel}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={14} style={{ color: textSoft }} />
                      <span style={{ fontSize: "0.82rem", color: textMid }}>Westin Harbour Castle, Toronto</span>
                    </div>
                    {mySessions.length === 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={14} style={{ color: textSoft }} />
                        <span style={{ fontSize: "0.82rem", color: textMid }}>Time TBD</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <Link to="/tickets" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12,
                  background: "linear-gradient(135deg,#7a3fd1,#f5a623)", color: "#ffffff", textDecoration: "none",
                  fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase",
                }}>Get Your Pass</Link>
                <Link
                  to={mySessions.length > 0 ? "/agenda?speaker=" + slugifyName(speaker.name) : "/agenda"}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12,
                    border: "1.5px solid " + cardBdr, color: textMain, textDecoration: "none", background: "transparent",
                    fontFamily: "'Orbitron',sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase",
                    transition: "border-color 0.2s ease",
                  }}
                  onMouseEnter={function(e) { e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={function(e) { e.currentTarget.style.borderColor = cardBdr; }}
                >
                  {mySessions.length > 0 ? "Their Sessions" : "View Full Agenda"}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div style={{ height: "4rem" }} />
      <Footer />
    </div>
  );
}
