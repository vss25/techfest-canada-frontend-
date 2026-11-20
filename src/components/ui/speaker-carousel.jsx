"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Linkedin, Twitter, Globe } from "lucide-react";

export function SpeakerCarousel({ speakers = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!speakers.length) return null;

  const handleNext = () => setCurrentIndex((i) => (i + 1) % speakers.length);
  const handlePrev = () => setCurrentIndex((i) => (i - 1 + speakers.length) % speakers.length);

  const current = speakers[currentIndex];

  return (
    <div className="w-full max-w-5xl mx-auto px-4">

      {/* ── DESKTOP ── */}
      <div className="hidden md:flex relative items-center gap-0">

        {/* Photo */}
        <div
          style={{
            width: 420, height: 460,
            borderRadius: 28,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 0 0 1px rgba(214,48,140,0.3), 0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(214,48,140,0.15)",
            position: "relative",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={current.imgUrl}
              src={current.imgUrl}
              alt={current.name}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              draggable={false}
            />
          </AnimatePresence>
          {/* Corner accents */}
          <div style={{ position:"absolute", top:12, left:12, width:22, height:22, borderTop:"2px solid #f5a623", borderLeft:"2px solid #f5a623", borderRadius:"4px 0 0 0" }} />
          <div style={{ position:"absolute", top:12, right:12, width:22, height:22, borderTop:"2px solid #f5a623", borderRight:"2px solid #f5a623", borderRadius:"0 4px 0 0" }} />
          <div style={{ position:"absolute", bottom:12, left:12, width:22, height:22, borderBottom:"2px solid #f5a623", borderLeft:"2px solid #f5a623", borderRadius:"0 0 0 4px" }} />
          <div style={{ position:"absolute", bottom:12, right:12, width:22, height:22, borderBottom:"2px solid #f5a623", borderRight:"2px solid #f5a623", borderRadius:"0 0 4px 0" }} />
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.name}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{
              background: "rgba(22,12,45,0.92)",
              border: "1px solid rgba(214,48,140,0.30)",
              borderRadius: 24,
              padding: "40px 40px 36px",
              marginLeft: -64,
              zIndex: 10,
              flex: 1,
              boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 40px rgba(214,48,140,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(214,48,140,0.15)", border: "1px solid rgba(214,48,140,0.30)",
              borderRadius: 999, padding: "4px 14px", marginBottom: 20,
              fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1.2px",
              textTransform: "uppercase", color: "#F06AB0",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#f5a623", boxShadow:"0 0 5px #f5a623" }} />
              Featured Speaker
            </div>

            <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: 6, lineHeight: 1.1, fontFamily: "'Orbitron', sans-serif" }}>
              {current.name}
            </h2>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f5a623", marginBottom: 6 }}>
              {current.role}
            </p>
            <p style={{ fontSize: "0.82rem", color: "rgba(160,130,220,0.85)", marginBottom: 20, letterSpacing: "0.3px" }}>
              {current.company}
            </p>

            {/* Divider */}
            <div style={{ width: 40, height: 2, background: "#D6308C", borderRadius: 2, marginBottom: 20 }} />

            {/* Bio */}
            {current.bio && (
              <p style={{ fontSize: "0.88rem", color: "rgba(200,185,235,0.85)", lineHeight: 1.75, marginBottom: 24 }}>
                {current.bio}
              </p>
            )}

            {/* Topics */}
            {current.topics && current.topics.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {current.topics.map((topic, i) => (
                  <span key={i} style={{
                    background: "rgba(214,48,140,0.12)", border: "1px solid rgba(214,48,140,0.25)",
                    borderRadius: 999, padding: "3px 12px", fontSize: "0.72rem",
                    fontWeight: 600, color: "#c4a8ff", letterSpacing: "0.4px",
                  }}>
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* Social links */}
            <div style={{ display: "flex", gap: 10 }}>
              {current.linkedinUrl && (
                <a href={current.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  style={{ width:40, height:40, borderRadius:"50%", background:"rgba(214,48,140,0.2)", border:"1px solid rgba(214,48,140,0.4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#c4a8ff", transition:"all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(214,48,140,0.45)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(214,48,140,0.2)"}
                >
                  <Linkedin size={16} />
                </a>
              )}
              {current.twitterUrl && (
                <a href={current.twitterUrl} target="_blank" rel="noopener noreferrer"
                  style={{ width:40, height:40, borderRadius:"50%", background:"rgba(214,48,140,0.2)", border:"1px solid rgba(214,48,140,0.4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#c4a8ff", transition:"all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(214,48,140,0.45)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(214,48,140,0.2)"}
                >
                  <Twitter size={16} />
                </a>
              )}
              {current.websiteUrl && (
                <a href={current.websiteUrl} target="_blank" rel="noopener noreferrer"
                  style={{ width:40, height:40, borderRadius:"50%", background:"rgba(214,48,140,0.2)", border:"1px solid rgba(214,48,140,0.4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#c4a8ff", transition:"all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(214,48,140,0.45)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(214,48,140,0.2)"}
                >
                  <Globe size={16} />
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── MOBILE ── */}
      <div className="md:hidden">
        <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "1/1", marginBottom: 20 }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={current.imgUrl}
              src={current.imgUrl}
              alt={current.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={current.name} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", marginBottom: 4 }}>{current.name}</h2>
            <p style={{ fontSize: "0.85rem", color: "#f5a623", marginBottom: 4 }}>{current.role}</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(160,130,220,0.85)", marginBottom: 16 }}>{current.company}</p>
            {current.bio && <p style={{ fontSize: "0.82rem", color: "rgba(200,185,235,0.8)", lineHeight: 1.7, marginBottom: 16 }}>{current.bio}</p>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── NAV DOTS ── */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 32 }}>
        <button onClick={handlePrev} aria-label="Previous"
          style={{ width:44, height:44, borderRadius:"50%", background:"rgba(214,48,140,0.15)", border:"1px solid rgba(214,48,140,0.35)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#c4a8ff" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(214,48,140,0.35)"}
          onMouseLeave={e => e.currentTarget.style.background="rgba(214,48,140,0.15)"}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ display:"flex", gap:8 }}>
          {speakers.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Speaker ${i+1}`}
              style={{ width: i === currentIndex ? 24 : 10, height:10, borderRadius:999, border:"none", cursor:"pointer", transition:"all 0.3s", background: i === currentIndex ? "#f5a623" : "rgba(214,48,140,0.4)" }}
            />
          ))}
        </div>

        <button onClick={handleNext} aria-label="Next"
          style={{ width:44, height:44, borderRadius:"50%", background:"rgba(214,48,140,0.15)", border:"1px solid rgba(214,48,140,0.35)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#c4a8ff" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(214,48,140,0.35)"}
          onMouseLeave={e => e.currentTarget.style.background="rgba(214,48,140,0.15)"}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
