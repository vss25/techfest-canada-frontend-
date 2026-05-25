import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.tsx";
import Footer from "../components/Footer";
import {
  Mic, Users, Calendar, Award, Layers,
  X, Search, ChevronDown,
  Sparkles, Zap, Shield, Cpu, Leaf,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import emailjs from "@emailjs/browser";
import { client, urlFor } from "../utils/sanity";
import SpeakerMarquee from "../components/SpeakerMarquee";

// ─── Protection ──────────────────────────────────────────────────
function useProtection() {
  useEffect(() => {
    const noCtx = (e) => e.preventDefault();
    document.addEventListener("contextmenu", noCtx);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", noCtx);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);
}

const STATS = [
  ["1000+", "Attendees"],
  ["100+",  "Speakers"],
  ["2",     "Days"],
  ["5",     "Tech Pillars"],
  ["5",     "Applied Sectors"],
];

// ─── Pillar & Sector maps (TIGHTENED KEYWORDS) ──────────────────
// Rules applied:
//   - No single generic words ("security","automation","privacy","intelligent")
//   - Multi-word phrases preferred ("machine learning" not just "learning")
//   - No words that commonly appear in other pillars' bios
const PILLAR_MAP = {
  ai: {
    label: "AI / ML", icon: Sparkles, color: "#b99eff", light: "#7a3fd1",
    keywords: [
      "artificial intelligence", "machine learning", "deep learning",
      "large language model", "llm", "generative ai", "genai", "gen ai",
      "neural network", "natural language processing", "nlp",
      "computer vision", "data science", "foundation model",
      "gpt", "agentic ai", "ai agent", "ml ops", "mlops",
      "responsible ai", "ai governance", "ai ethics",
      "recommendation engine", "predictive analytics",
      "ai infrastructure", "ai platform",
    ],
  },
  quantum: {
    label: "Quantum", icon: Zap, color: "#56b3f5", light: "#1878c2",
    keywords: [
      "quantum computing", "quantum", "qubit", "superposition",
      "entanglement", "quantum cryptography", "quantum sensing",
      "quantum communication", "quantum hardware", "quantum software",
      "post-quantum", "post quantum",
    ],
  },
  cybersecurity: {
    label: "Cybersecurity", icon: Shield, color: "#f57eb3", light: "#c2287a",
    keywords: [
      "cybersecurity", "cyber security", "infosec", "information security",
      "threat intelligence", "zero trust", "penetration testing",
      "vulnerability management", "security operations center", "soc analyst",
      "ciso", "chief information security", "identity management",
      "ransomware", "malware", "devsecops", "incident response",
      "digital forensics", "network security", "endpoint security",
      "cloud security", "application security", "appsec",
      "data protection", "encryption", "cyber threat", "cyber defense",
      "security architect", "security engineering",
    ],
  },
  robotics: {
    label: "Robotics", icon: Cpu, color: "#f5a623", light: "#c4780a",
    keywords: [
      "robotics", "robot", "autonomous vehicle", "autonomous system",
      "cobot", "collaborative robot", "drone", "uav",
      "humanoid robot", "physical ai", "mechatronics",
      "industrial automation", "robotic process",
      "actuator", "embedded systems", "field robotics",
    ],
  },
  climate: {
    label: "Climate Tech", icon: Leaf, color: "#3fd19c", light: "#1a9e70",
    keywords: [
      "climate tech", "climate technology", "sustainability",
      "sustainable", "renewable energy", "carbon capture",
      "net zero", "net-zero", "esg reporting", "clean energy",
      "cleantech", "clean tech", "decarbonization", "decarbonisation",
      "circular economy", "carbon neutral", "green technology",
      "solar energy", "wind energy", "energy transition",
      "climate change", "environmental technology",
    ],
  },
};

const SECTOR_MAP = {
  fintech: {
    label: "Financial Services", short: "FIN",
    keywords: [
      "fintech", "financial services", "financial technology",
      "banking", "capital markets", "trading platform",
      "wealth management", "asset management", "hedge fund",
      "venture capital", "private equity", "blockchain",
      "cryptocurrency", "defi", "regtech", "insurtech",
      "payment processing", "digital payments",
    ],
  },
  healthcare: {
    label: "Healthcare & Life Sci", short: "HLT",
    keywords: [
      "healthcare", "health tech", "healthtech", "medical device",
      "hospital", "clinical trial", "pharmaceutical", "pharma",
      "biotech", "biotechnology", "life sciences", "drug discovery",
      "patient care", "genomics", "medtech", "telemedicine",
      "therapeutics", "digital health", "health system",
      "public health", "mental health", "oncology", "radiology",
    ],
  },
  energy: {
    label: "Energy & Infrastructure", short: "ENR",
    keywords: [
      "energy sector", "power grid", "utility company", "utilities",
      "oil and gas", "petroleum", "electrification",
      "energy storage", "battery technology", "smart grid",
      "microgrid", "nuclear energy", "hydroelectric",
      "energy infrastructure", "power generation",
    ],
  },
  manufacturing: {
    label: "Manufacturing & Supply", short: "MFG",
    keywords: [
      "manufacturing", "supply chain", "logistics technology",
      "production line", "factory automation", "industrial iot",
      "automotive industry", "aerospace", "warehouse automation",
      "inventory management", "procurement", "industry 4.0",
      "smart factory", "digital twin", "additive manufacturing",
    ],
  },
  public: {
    label: "Public Sector & Defence", short: "DEF",
    keywords: [
      "defence", "defense", "public sector", "military",
      "national security", "government technology", "govtech",
      "federal government", "border security", "emergency management",
      "intelligence community", "armed forces", "law enforcement",
      "public safety", "ministry of defence", "department of defense",
    ],
  },
};

// ─── FIXED: Word-boundary aware matching ─────────────────────────
// Uses regex \b to prevent "security" matching inside "cybersecurity"
function speakerMatchesKeywords(speaker, keywords) {
  var blob = [
    speaker.name || "",
    speaker.title || "",
    speaker.company || "",
    speaker.bio || "",
  ].join(" ").toLowerCase();

  return keywords.some(function (kw) {
    // For multi-word phrases, use simple includes (they're specific enough)
    if (kw.includes(" ")) {
      return blob.includes(kw.toLowerCase());
    }
    // For single words, use word boundary regex to prevent substring matches
    try {
      var re = new RegExp("\\b" + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      return re.test(blob);
    } catch (e) {
      return blob.includes(kw.toLowerCase());
    }
  });
}

// ─── FIXED: Score-based tagging ──────────────────────────────────
// Counts how many keywords match per pillar/sector, returns only
// the top match (not every pillar that has any match at all)
function countMatches(speaker, keywords) {
  var blob = [
    speaker.name || "",
    speaker.title || "",
    speaker.company || "",
    speaker.bio || "",
  ].join(" ").toLowerCase();

  var count = 0;
  keywords.forEach(function (kw) {
    if (kw.includes(" ")) {
      if (blob.includes(kw.toLowerCase())) count++;
    } else {
      try {
        var re = new RegExp("\\b" + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (re.test(blob)) count++;
      } catch (e) {
        if (blob.includes(kw.toLowerCase())) count++;
      }
    }
  });
  return count;
}

function deriveTags(speaker) {
  // Score each pillar and sector
  var pillarScores = Object.entries(PILLAR_MAP).map(function (entry) {
    return { key: entry[0], score: countMatches(speaker, entry[1].keywords) };
  }).filter(function (p) { return p.score > 0; })
    .sort(function (a, b) { return b.score - a.score; });

  var sectorScores = Object.entries(SECTOR_MAP).map(function (entry) {
    return { key: entry[0], score: countMatches(speaker, entry[1].keywords) };
  }).filter(function (s) { return s.score > 0; })
    .sort(function (a, b) { return b.score - a.score; });

  // Only return the top pillar (highest keyword match count)
  // If top two are tied, return both. Otherwise just the best one.
  var pillars = [];
  if (pillarScores.length > 0) {
    pillars.push(pillarScores[0].key);
    if (pillarScores.length > 1 && pillarScores[1].score === pillarScores[0].score) {
      pillars.push(pillarScores[1].key);
    }
  }

  var sectors = [];
  if (sectorScores.length > 0) {
    sectors.push(sectorScores[0].key);
    if (sectorScores.length > 1 && sectorScores[1].score === sectorScores[0].score) {
      sectors.push(sectorScores[1].key);
    }
  }

  return { pillars: pillars, sectors: sectors };
}

var LinkedInIcon = function () {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
};

// ─── Filter Dropdown ─────────────────────────────────────────────
function FilterDropdown({ label, value, options, onSelect, dark, accent, border, inactiveText }) {
  var s1 = useState(false); var open = s1[0]; var setOpen = s1[1];
  var ref = useRef(null);

  useEffect(function () {
    var fn = function (e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return function () { document.removeEventListener("mousedown", fn); };
  }, []);

  var selected = value ? options[value] : null;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={function () { setOpen(!open); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.52rem 1rem", borderRadius: "10px",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
          cursor: "pointer",
          border: "2px solid " + (selected ? accent : border),
          background: selected ? (accent + "18") : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
          color: selected ? accent : inactiveText,
          transition: "all 0.15s", whiteSpace: "nowrap",
        }}>
        {selected
          ? <><span style={{ opacity: 0.5 }}>{label}:</span>&nbsp;{selected.label}</>
          : label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          style={{ display: "flex", alignItems: "center" }}>
          <ChevronDown size={13} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0,
              minWidth: "230px", borderRadius: "12px", zIndex: 9999,
              background: dark ? "#130a2a" : "#fff",
              border: "1.5px solid " + border,
              boxShadow: dark ? "0 16px 48px rgba(0,0,0,0.7)" : "0 8px 32px rgba(0,0,0,0.16)",
              overflow: "hidden",
            }}>
            {selected && (
              <button
                onClick={function () { onSelect(null); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "0.62rem 1rem",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em",
                  cursor: "pointer", background: "none", border: "none",
                  borderBottom: "1px solid " + border,
                  color: dark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                }}>
                <X size={11} /> CLEAR SELECTION
              </button>
            )}
            {Object.entries(options).map(function (entry) {
              var key = entry[0]; var opt = entry[1];
              var isActive = value === key;
              var Icon = opt.icon;
              var iconColor = dark ? (opt.color || accent) : (opt.light || accent);
              return (
                <button
                  key={key}
                  onClick={function () { onSelect(isActive ? null : key); setOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.7rem 1rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
                    cursor: "pointer",
                    background: isActive ? (accent + "18") : "none",
                    border: "none",
                    color: isActive ? accent : (dark ? "rgba(255,255,255,0.82)" : "rgba(13,5,32,0.78)"),
                    display: "flex", alignItems: "center", gap: "0.55rem",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={function (e) { if (!isActive) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = isActive ? (accent + "18") : "none"; }}>
                  {Icon && <Icon size={13} style={{ color: iconColor, flexShrink: 0 }} />}
                  {opt.label}
                  {isActive && <span style={{ marginLeft: "auto", opacity: 0.55 }}>✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Speaker Card ────────────────────────────────────────────────
function SpeakerCard({ speaker, dark, i }) {
  var ref = useRef(null);
  var inView = useInView(ref, { once: true, margin: "-50px" });
  var s1 = useState(false); var hovered = s1[0]; var setHovered = s1[1];

  var imageUrl = speaker.image ? urlFor(speaker.image).width(500).height(500).url() : null;

  var tags = useMemo(function () { return deriveTags(speaker); }, [speaker]);
  var primaryPillar = tags.pillars[0] ? PILLAR_MAP[tags.pillars[0]] : null;
  var primarySector = tags.sectors[0] ? SECTOR_MAP[tags.sectors[0]] : null;

  var accent = primaryPillar
    ? (dark ? primaryPillar.color : primaryPillar.light)
    : (dark ? "#b99eff" : "#7a3fd1");
  var PillarIcon = primaryPillar ? primaryPillar.icon : null;

  var primaryText = dark ? "#ffffff" : "#0d0520";
  var secondaryText = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.65)";
  var mutedText = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.025, type: "spring", damping: 24 }}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
      style={{
        position: "relative", borderRadius: "10px", overflow: "hidden",
        background: dark ? "rgba(255,255,255,0.04)" : "#fff",
        border: dark ? "1px solid rgba(255,255,255,0.11)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: !dark ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <Link to={"/speakers/" + speaker._id} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{
          position: "relative", paddingTop: "100%", overflow: "hidden",
          background: dark ? "#1a0a3e" : "#ede9ff",
        }}>
          {imageUrl ? (
            <img
              src={imageUrl} alt={speaker.name}
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
            background: accent,
            backdropFilter: "blur(6px)",
            color: "#fff",
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
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            gap: "0.4rem", marginBottom: "0.6rem",
          }}>
            {primaryPillar && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                padding: "0.24rem 0.62rem", borderRadius: "5px",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                background: accent + "1c", color: accent,
                border: "1px solid " + accent + "38",
              }}>
                {PillarIcon && <PillarIcon size={11} />}
                {primaryPillar.label}
              </span>
            )}
            {primarySector && (
              <span style={{
                padding: "0.24rem 0.62rem", borderRadius: "5px",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
                color: primaryText,
              }}>
                {primarySector.label}
              </span>
            )}
            {!primaryPillar && !primarySector && (
              <span style={{
                padding: "0.24rem 0.62rem", borderRadius: "5px",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: dark ? "rgba(185,158,255,0.15)" : "rgba(122,63,209,0.10)",
                color: accent,
              }}>
                Speaker
              </span>
            )}
          </div>

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
            <p style={{
              fontSize: "0.82rem", lineHeight: 1.5,
              color: mutedText,
            }}>
              {speaker.company}
            </p>
          )}
        </div>
      </Link>

      {speaker.linkedin && (
        <div style={{ padding: "0 1.4rem 1.1rem" }}>
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
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function Speakers() {
  useProtection();

  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
  var s2 = useState([]); var speakers = s2[0]; var setSpeakers = s2[1];
  var s3 = useState(true); var loading = s3[0]; var setLoading = s3[1];
  var s4 = useState(""); var search = s4[0]; var setSearch = s4[1];
  var s5 = useState(null); var activePillar = s5[0]; var setActivePillar = s5[1];
  var s6 = useState(null); var activeSector = s6[0]; var setActiveSector = s6[1];

  useEffect(function () {
    var check = function () { setDark(document.body.classList.contains("dark-mode")); };
    check();
    var obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    client
      .fetch(
        '*[_type == "speaker"] | order(order asc) { _id, name, title, company, bio, linkedin, image }'
      )
      .then(function (data) { setSpeakers(data); setLoading(false); })
      .catch(function () { setLoading(false); });
  }, []);

  var bg = dark ? "#06020f" : "#f8f7fc";
  var text = dark ? "#ffffff" : "#0d0520";
  var accent = dark ? "#b99eff" : "#7a3fd1";
  var border = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  var inactiveText = dark ? "rgba(255,255,255,0.70)" : "rgba(13,5,32,0.55)";
  var mutedText = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";
  var secondary = dark ? "rgba(255,255,255,0.68)" : "rgba(13,5,32,0.58)";

  // FIXED: Filtering uses the same word-boundary matching
  var filtered = useMemo(function () {
    return speakers.filter(function (s) {
      if (search.trim()) {
        var q = search.toLowerCase();
        var textMatch =
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.company && s.company.toLowerCase().includes(q)) ||
          (s.bio && s.bio.toLowerCase().includes(q));
        if (!textMatch) return false;
      }
      if (activePillar) {
        var pillarKeywords = PILLAR_MAP[activePillar] ? PILLAR_MAP[activePillar].keywords : [];
        if (!speakerMatchesKeywords(s, pillarKeywords)) return false;
      }
      if (activeSector) {
        var sectorKeywords = SECTOR_MAP[activeSector] ? SECTOR_MAP[activeSector].keywords : [];
        if (!speakerMatchesKeywords(s, sectorKeywords)) return false;
      }
      return true;
    });
  }, [speakers, search, activePillar, activeSector]);

  var hasFilters = !!(activePillar || activeSector || search.trim());
  var fp = { dark: dark, accent: accent, border: border, inactiveText: inactiveText };

  var SearchBar = (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.5rem 1rem", borderRadius: "10px",
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      border: "1.5px solid " + border,
      flex: "1 1 160px",
    }}>
      <Search size={14} style={{ color: inactiveText, flexShrink: 0 }} />
      <input
        className="speakers-search-input"
        value={search}
        onChange={function (e) { setSearch(e.target.value); }}
        placeholder="SEARCH SPEAKERS"
        style={{
          background: "transparent", border: "none", outline: "none",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.05em",
          color: text, width: "100%",
        }} />
      {search && (
        <button onClick={function () { setSearch(""); }}
          style={{ lineHeight: 0, background: "none", border: "none", cursor: "pointer", color: inactiveText, flexShrink: 0 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );

  var FilterRow = (
    <>
      <FilterDropdown label="TECH PILLAR" value={activePillar} options={PILLAR_MAP} onSelect={setActivePillar} {...fp} />
      <FilterDropdown label="SECTOR" value={activeSector} options={SECTOR_MAP} onSelect={setActiveSector} {...fp} />
      <AnimatePresence>
        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
            whileTap={{ scale: 0.95 }}
            onClick={function () { setActivePillar(null); setActiveSector(null); setSearch(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.34rem",
              padding: "0.5rem 1rem", borderRadius: "10px",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em",
              cursor: "pointer",
              border: "1.5px solid " + (dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"),
              background: "transparent", color: inactiveText,
            }}>
            <X size={12} /> CLEAR ALL
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <style>{"\
        .speakers-gradient-text {\
          background: linear-gradient(135deg, var(--grad-start, #b99eff), #f5a623);\
          -webkit-background-clip: text;\
          -webkit-text-fill-color: transparent;\
          background-clip: text;\
          color: transparent;\
          display: inline-block;\
        }\
        .speakers-stat-text {\
          font-family: 'Orbitron', sans-serif;\
          font-size: clamp(1.4rem, 2.4vw, 2rem);\
          font-weight: 900;\
          background: linear-gradient(135deg, var(--grad-start, #b99eff), #f5a623);\
          -webkit-background-clip: text;\
          -webkit-text-fill-color: transparent;\
          background-clip: text;\
          color: transparent;\
          display: inline-block;\
        }\
        .speakers-search-input::placeholder {\
          font-family: 'Orbitron', sans-serif;\
          font-size: 0.65rem;\
          letter-spacing: 0.05em;\
          opacity: 0.45;\
        }\
        .desktop-bar-rows  { display: block; }\
        .mobile-search-row { display: none;  }\
        .mobile-scroll-row { display: none;  }\
        @media (max-width: 640px) {\
          .desktop-bar-rows  { display: none  !important; }\
          .mobile-search-row { display: flex  !important; }\
          .mobile-scroll-row { display: flex  !important; }\
        }\
      "}</style>

      <div style={{
        background: bg, minHeight: "100vh", color: text,
        overflowX: "clip", userSelect: "none", fontFamily: "'Inter', sans-serif",
      }}>
        <Navbar />

        {/* HERO */}
        <section style={{
          position: "relative",
          padding: "clamp(120px, 18vw, 180px) 5% clamp(60px, 8vw, 100px)",
          background: dark
            ? "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.14) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(122,63,209,0.07) 0%, transparent 70%)",
        }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <p style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: "0.78rem", fontWeight: 800,
                letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: 18,
              }}>
                TTFC 2026 — Speaker Lineup
              </p>
              <h1 style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
                fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: 22,
              }}>
                Meet Our <span className="speakers-gradient-text" style={{ "--grad-start": accent }}>Speakers</span>
              </h1>
              <p style={{
                fontSize: "clamp(1.05rem, 1.9vw, 1.25rem)",
                color: secondary, lineHeight: 1.75, maxWidth: 620, margin: "0 auto 48px",
              }}>
                Industry leaders, innovators, and pioneers shaping the future of technology in Canada and beyond.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "clamp(1.5rem, 4vw, 3.5rem)", flexWrap: "wrap" }}>
                {STATS.map(function (s, i) {
                  return (
                    <motion.div key={s[1]}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, type: "spring", damping: 20 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                    >
                      <span className="speakers-stat-text" style={{ "--grad-start": accent }}>{s[0]}</span>
                      <span style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.62rem", fontWeight: 700,
                        color: mutedText,
                        textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "0.12rem",
                      }}>{s[1]}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <SpeakerMarquee dark={dark} title="Where our speakers work at" />

        {/* STICKY BAR */}
        <div style={{
          position: "sticky", top: "64px", zIndex: 40,
          background: dark ? "rgba(6,2,15,0.97)" : "rgba(248,247,252,0.97)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid " + border,
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0.8rem 1.5rem 0.85rem" }}>
            <div className="desktop-bar-rows">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                {SearchBar}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
                {FilterRow}
                {hasFilters && (
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em",
                    color: mutedText, marginLeft: "0.25rem",
                  }}>
                    {filtered.length} speaker{filtered.length !== 1 ? "s" : ""} found
                  </span>
                )}
              </div>
            </div>
            <div className="mobile-search-row" style={{ alignItems: "center", gap: "0.5rem" }}>
              {SearchBar}
            </div>
          </div>
        </div>

        <div className="mobile-scroll-row" style={{
          alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
          padding: "0.65rem 1.5rem 0.7rem",
          borderBottom: "1px solid " + border,
          background: dark ? "rgba(6,2,15,0.5)" : "rgba(248,247,252,0.5)",
        }}>
          {FilterRow}
        </div>

        {/* SPEAKER GRID */}
        <main style={{ padding: "2.8rem 0 5rem" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
            <p style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.06em",
              color: mutedText, marginBottom: "1.5rem",
            }}>
              {loading
                ? "Loading speakers..."
                : filtered.length + " speaker" + (filtered.length !== 1 ? "s" : "") + " · TTFC 2026"}
            </p>

            {loading ? (
              <div style={{ textAlign: "center", color: mutedText, padding: 80 }}>Loading speakers...</div>
            ) : filtered.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "5rem 0", gap: "0.9rem",
              }}>
                <Search size={28} style={{ color: dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)" }} />
                <p style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
                  color: inactiveText,
                }}>
                  No speakers match.
                </p>
                <button
                  onClick={function () { setSearch(""); setActivePillar(null); setActiveSector(null); }}
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
                    color: accent, textDecoration: "underline",
                    cursor: "pointer", background: "none", border: "none",
                  }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1.2rem",
              }}>
                {filtered.map(function (speaker, i) {
                  return <SpeakerCard key={speaker._id} speaker={speaker} dark={dark} i={i} />;
                })}
              </div>
            )}

            {!loading && (
              <div style={{
                marginTop: "3.5rem", padding: "2.2rem 2rem", borderRadius: "10px",
                border: "1px solid " + border,
                background: dark
                  ? "linear-gradient(135deg, rgba(185,158,255,0.10) 0%, rgba(245,166,35,0.05) 100%)"
                  : "linear-gradient(135deg, rgba(122,63,209,0.08) 0%, rgba(245,166,35,0.04) 100%)",
                textAlign: "center", position: "relative", overflow: "hidden",
              }}>
                <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>🎤</div>
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "clamp(1rem, 2.4vw, 1.25rem)", fontWeight: 800,
                  letterSpacing: "0.04em", marginBottom: 8, color: text,
                }}>
                  More Speakers Coming Soon
                </div>
                <div style={{ fontSize: "0.88rem", color: mutedText, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                  We're finalizing our lineup. Check back regularly for updates.
                </div>
              </div>
            )}
          </div>
        </main>

        {/* APPLY TO SPEAK */}
        <ApplyToSpeak
          dark={dark} border={border} accent={accent}
          text={text} secondary={secondary} mutedText={mutedText}
        />

        <Footer />
      </div>
    </>
  );
}

/* ── APPLY TO SPEAK ── */
function ApplyToSpeak({ dark, border, accent, text, secondary, mutedText }) {
  var s1 = useState(false); var open = s1[0]; var setOpen = s1[1];
  var s2 = useState({ name: "", email: "", title: "", industry: "", experience: "", linkedin: "" });
  var form = s2[0]; var setForm = s2[1];
  var s3 = useState("idle"); var status = s3[0]; var setStatus = s3[1];

  var handleSubmit = function () {
    if (!form.name || !form.email) return;
    setStatus("loading");
    emailjs.send(
      "service_gy3fvru",
      "template_ufqzzep",
      {
        to_email: "baldeep@thetechfestival.com",
        from_name: form.name,
        from_email: form.email,
        message: "[Speaker Application]\nName: " + form.name + "\nEmail: " + form.email + "\nTitle: " + form.title + "\nIndustry: " + form.industry + "\nExperience: " + form.experience + "\nLinkedIn: " + form.linkedin,
      },
      "gZgYZtLCXPVgUsVj_"
    ).then(function () {
      setStatus("success");
    }).catch(function () {
      setStatus("error");
    });
  };

  var inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
      <div style={{
        padding: "2.8rem 2.4rem", borderRadius: "10px",
        border: "1px solid " + border,
        background: dark ? "rgba(185,158,255,0.06)" : "rgba(122,63,209,0.04)",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 800,
          letterSpacing: "-0.3px", marginBottom: "0.7rem", color: text,
        }}>
          Apply to Speak at TTFC 2026
        </h2>
        <p style={{
          fontSize: "0.95rem", color: secondary,
          maxWidth: 520, margin: "0 auto 1.75rem", lineHeight: 1.7,
        }}>
          Share your expertise with 1000+ attendees. We're looking for forward-thinking leaders in AI, cybersecurity, fintech, and beyond.
        </p>
        <button
          onClick={function () { setOpen(true); }}
          style={{
            padding: "0.75rem 2rem", borderRadius: "9999px",
            background: "transparent", color: accent,
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.1em",
            textTransform: "uppercase", border: "2px solid " + accent,
            cursor: "pointer", transition: "background 0.2s ease, color 0.2s ease",
          }}
          onMouseEnter={function (e) { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}
        >
          Apply Now →
        </button>
      </div>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={function () { setOpen(false); }}>
          <div style={{
            background: dark ? "#110828" : "#fff",
            borderRadius: 12, padding: "2rem",
            maxWidth: 480, width: "100%",
            border: "1px solid " + border, position: "relative",
          }} onClick={function (e) { e.stopPropagation(); }}>
            <button onClick={function () { setOpen(false); }}
              style={{
                position: "absolute", top: 14, right: 14,
                background: "none", border: "none", cursor: "pointer", color: mutedText,
              }}>
              <X size={20} />
            </button>
            <h3 style={{
              fontFamily: "'Orbitron', sans-serif", fontWeight: 800,
              fontSize: "1.15rem", letterSpacing: "0.02em",
              marginBottom: "1.2rem", color: text,
            }}>
              Apply to Speak
            </h3>

            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "1.2rem 0", color: accent }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>✓</div>
                <p style={{ fontWeight: 600 }}>Application submitted! We'll be in touch.</p>
              </div>
            ) : (
              <>
                {[
                  { key: "name", label: "Full Name", placeholder: "Jane Smith" },
                  { key: "email", label: "Email", placeholder: "jane@company.com", type: "email" },
                  { key: "title", label: "Job Title", placeholder: "VP of AI" },
                  { key: "industry", label: "Industry", placeholder: "Artificial Intelligence" },
                  { key: "experience", label: "Speaking Experience", placeholder: "e.g. TEDx, industry panels..." },
                  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
                ].map(function (field) {
                  return (
                    <div key={field.key} style={{ marginBottom: 12 }}>
                      <label style={{
                        display: "block",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: mutedText, marginBottom: 5,
                      }}>
                        {field.label}
                      </label>
                      <input
                        type={field.type || "text"}
                        placeholder={field.placeholder}
                        value={form[field.key]}
                        onChange={function (e) { setForm(function (f) { var n = Object.assign({}, f); n[field.key] = e.target.value; return n; }); }}
                        style={{
                          width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8,
                          border: "1px solid " + border, background: inputBg, color: text,
                          fontSize: "0.88rem", outline: "none", boxSizing: "border-box",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      />
                    </div>
                  );
                })}
                {status === "error" && (
                  <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12 }}>
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  style={{
                    width: "100%", padding: "0.8rem", borderRadius: 8,
                    background: accent, color: "#fff",
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 800, fontSize: "0.72rem",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    border: "none", cursor: "pointer", marginTop: 6,
                    opacity: status === "loading" ? 0.7 : 1,
                  }}
                >
                  {status === "loading" ? "Submitting..." : "Submit Application"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
