import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Clock, Search, X, ChevronDown, Mic, UserCircle2,
  Sparkles, Zap, Shield, Cpu, Leaf, Rocket,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { client, speakerPhotoUrl } from "../utils/sanity";
import useAgenda from "../hooks/useAgenda";
import { FORMAT_MAP } from "../data/sessionFormats";
import {
  DAYS,
  buildSpeakerIndex, matchSpeaker, sessionsForSpeaker,
  slugifyName, getDuration, formatTime12,
} from "../data/agenda";

// ─── Protection ───────────────────────────────────────────────────
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

// ─── Config ───────────────────────────────────────────────────────
const PILLAR_MAP = {
  ai:            { label: "AI / ML",       icon: Sparkles, color: "#b99eff", light: "#7a3fd1" },
  quantum:       { label: "Quantum",        icon: Zap,      color: "#56b3f5", light: "#1878c2" },
  cybersecurity: { label: "Cybersecurity",  icon: Shield,   color: "#f57eb3", light: "#c2287a" },
  robotics:      { label: "Robotics",       icon: Cpu,      color: "#f5a623", light: "#c4780a" },
  climate:       { label: "Climate Tech",   icon: Leaf,     color: "#3fd19c", light: "#1a9e70" },
};

const SECTOR_MAP = {
  fintech:       { label: "Financial Services",      short: "FIN" },
  healthcare:    { label: "Healthcare & Life Sci",   short: "HLT" },
  energy:        { label: "Energy & Infrastructure", short: "ENR" },
  manufacturing: { label: "Manufacturing & Supply",  short: "MFG" },
  public:        { label: "Public Sector & Defence", short: "DEF" },
  startups:      { label: "Startups & Capital",      short: "STP", icon: Rocket },
};

// FORMAT_MAP (colours/labels per session format) lives in src/data/sessionFormats.js — shared with the admin panel.

// Link blue for speaker names — deliberately distinct from the purple accent
const LINK_BLUE      = "#1f6fd0";
const LINK_BLUE_DARK = "#6cbcff";

// ─── Filter Dropdown ──────────────────────────────────────────────
function FilterDropdown({ label, value, options, onSelect, dark, accent, border, inactiveText }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selected = value ? options[value] : null;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.52rem 1rem", borderRadius: "10px",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
          cursor: "pointer",
          border: `2px solid ${selected ? accent : border}`,
          background: selected ? `${accent}18` : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
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
              border: `1.5px solid ${border}`,
              boxShadow: dark
                ? "0 16px 48px rgba(0,0,0,0.7)"
                : "0 8px 32px rgba(0,0,0,0.16)",
              overflow: "hidden",
            }}>
            {selected && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "0.62rem 1rem",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em",
                  cursor: "pointer", background: "none", border: "none",
                  borderBottom: `1px solid ${border}`,
                  color: dark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                }}>
                <X size={11} /> CLEAR SELECTION
              </button>
            )}
            {Object.entries(options).map(([key, opt]) => {
              const isActive = value === key;
              const Icon = opt.icon;
              const iconColor = dark ? (opt.color ?? accent) : (opt.light ?? accent);
              return (
                <button
                  key={key}
                  onClick={() => { onSelect(isActive ? null : key); setOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.7rem 1rem",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
                    cursor: "pointer",
                    background: isActive ? `${accent}18` : "none",
                    border: "none",
                    color: isActive ? accent : (dark ? "rgba(255,255,255,0.82)" : "rgba(13,5,32,0.78)"),
                    display: "flex", alignItems: "center", gap: "0.55rem",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${accent}18` : "none"; }}>
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

// ─── One speaker chip: photo + linked name ────────────────────────
function SpeakerChip({ person, doc, dark, role }) {
  const [hovered, setHovered] = useState(false);
  const blue = dark ? LINK_BLUE_DARK : LINK_BLUE;
  const mutedText = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";
  const imageUrl = doc ? speakerPhotoUrl(doc.image, 120) : null;
  // Company line: a session-specific org overrides the profile, otherwise use Sanity
  const org = person.org || (doc && doc.company) || null;

  const avatar = (
    <span style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
      background: dark ? "#1a0a3e" : "#ede9ff",
      border: `1.5px solid ${dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)"}`,
    }}>
      {imageUrl
        ? <img src={imageUrl} alt={person.name} loading="lazy" draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
        : <UserCircle2 size={19} style={{ color: mutedText }} />}
    </span>
  );

  const label = (
    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span style={{
        fontSize: "0.86rem", fontWeight: 600, lineHeight: 1.25,
        color: doc ? blue : (dark ? "rgba(255,255,255,0.82)" : "rgba(13,5,32,0.78)"),
        borderBottom: doc ? `2px solid ${hovered ? blue : blue + "70"}` : "none",
        paddingBottom: doc ? 1 : 0,
        transition: "border-color 0.18s ease",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {person.name}{person.tentative ? " *" : ""}
      </span>
      {(org || role === "moderator") && (
        <span style={{
          fontSize: "0.7rem", color: mutedText, lineHeight: 1.3, marginTop: 1,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {role === "moderator" ? (org ? `Moderator · ${org}` : "Moderator") : org}
        </span>
      )}
    </span>
  );

  const inner = (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0, maxWidth: 260 }}
    >
      {avatar}{label}
    </span>
  );

  if (!doc) return inner;

  return (
    <Link
      to={"/speakers/" + slugifyName(doc.name)}
      onClick={(e) => e.stopPropagation()}
      style={{ textDecoration: "none", color: "inherit", minWidth: 0 }}
    >
      {inner}
    </Link>
  );
}

// ─── Session Card ─────────────────────────────────────────────────
function SessionCard({ s, dark, i, speakerIndex, highlight, defaultExpanded }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => { if (defaultExpanded) setExpanded(true); }, [defaultExpanded]);

  const fmtInfo    = FORMAT_MAP[s.format] || FORMAT_MAP.keynote;
  const pillar     = s.pillar ? PILLAR_MAP[s.pillar] : null;
  const sector     = s.sector ? SECTOR_MAP[s.sector] : null;
  const accent     = pillar ? (dark ? pillar.color : pillar.light) : (dark ? "#b99eff" : "#7a3fd1");
  const PillarIcon = pillar ? pillar.icon : null;
  const isBreak    = !!s.isBreak;
  const dur        = getDuration(s.time, s.endTime);

  const primaryText   = dark ? "#ffffff"                : "#0d0520";
  const secondaryText = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.65)";
  const mutedText     = dark ? "rgba(255,255,255,0.48)" : "rgba(13,5,32,0.42)";

  const speakers    = s.speakers || [];
  const hasPeople   = speakers.length > 0 || !!s.moderator;
  const placeholders = s.placeholders || [];

  return (
    <motion.div
      ref={ref}
      id={"session-" + s.id}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.025, type: "spring", damping: 24 }}
      onClick={() => { if (!isBreak) setExpanded(v => !v); }}
      style={{
        position: "relative", borderRadius: "10px", overflow: "hidden",
        cursor: isBreak ? "default" : "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s",
        scrollMarginTop: "150px",
        background: isBreak
          ? (dark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.02)")
          : (dark ? "rgba(255,255,255,0.04)"  : "#fff"),
        border: highlight
          ? `1.5px solid ${accent}`
          : (dark
              ? `1px solid rgba(255,255,255,${isBreak ? "0.05" : "0.11"})`
              : `1px solid rgba(0,0,0,${isBreak ? "0.05" : "0.08"})`),
        boxShadow: highlight
          ? `0 0 0 4px ${accent}22`
          : ((!isBreak && !dark) ? "0 2px 8px rgba(0,0,0,0.06)" : "none"),
      }}
    >
      {!isBreak && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
          background: accent, borderRadius: "10px 0 0 10px",
        }} />
      )}

      <div style={{ padding: isBreak ? "0.9rem 1.2rem" : "1.1rem 1.4rem 1.1rem 1.65rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!isBreak && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem", marginBottom: "0.58rem" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "0.24rem 0.62rem", borderRadius: "5px",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  background: dark ? fmtInfo.bg : fmtInfo.bgL,
                  color: dark ? fmtInfo.tc : fmtInfo.tcL,
                }}>
                  {fmtInfo.label}
                </span>
                {s.featured && (
                  <span style={{
                    padding: "0.24rem 0.62rem", borderRadius: "5px",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    background: `linear-gradient(90deg,${dark ? "#b99eff" : "#7a3fd1"}22,#f5a62322)`,
                    color: dark ? "#b99eff" : "#7a3fd1",
                    border: `1px solid ${dark ? "#b99eff" : "#7a3fd1"}40`,
                  }}>✦ Featured</span>
                )}
                {PillarIcon && pillar && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.24rem 0.62rem", borderRadius: "5px",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                    background: `${accent}1c`, color: accent, border: `1px solid ${accent}38`,
                  }}>
                    <PillarIcon size={11} />{pillar.label}
                  </span>
                )}
                {sector && (
                  <span style={{
                    padding: "0.24rem 0.62rem", borderRadius: "5px",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                    background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
                    color: primaryText,
                  }}>
                    {sector.label}
                  </span>
                )}
              </div>
            )}

            <p style={{
              fontWeight: isBreak ? 500 : 700,
              fontSize: isBreak ? "0.95rem" : "1.06rem",
              lineHeight: 1.42,
              color: isBreak ? mutedText : primaryText,
            }}>
              {s.title}
              {s.titleTbc && (
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: mutedText, marginLeft: 8 }}>
                  (title to be confirmed)
                </span>
              )}
            </p>

            {/* ── Speakers: photo + blue linked name ── */}
            {!isBreak && (
              <div style={{ marginTop: "0.75rem" }}>
                {hasPeople ? (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.85rem 1.4rem" }}>
                    {speakers.map((p, idx) => (
                      <SpeakerChip
                        key={p.name + idx}
                        person={p}
                        doc={matchSpeaker(speakerIndex, p.name)}
                        dark={dark}
                        role="speaker"
                      />
                    ))}
                    {s.moderator && (
                      <SpeakerChip
                        person={s.moderator}
                        doc={matchSpeaker(speakerIndex, s.moderator.name)}
                        dark={dark}
                        role="moderator"
                      />
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.82rem", color: mutedText }}>Speaker: To Be Decided</p>
                )}

                {placeholders.length > 0 && (
                  <p style={{ fontSize: "0.76rem", color: mutedText, marginTop: "0.6rem", fontStyle: "italic" }}>
                    + {placeholders.join(" · ")} — to be confirmed
                  </p>
                )}
                {speakers.some(p => p.tentative) && (
                  <p style={{ fontSize: "0.72rem", color: mutedText, marginTop: "0.4rem" }}>
                    * Participation not yet confirmed
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.22rem", flexShrink: 0 }}>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: "0.94rem", fontWeight: 800,
              color: isBreak ? mutedText : accent,
            }}>{formatTime12(s.time)}</span>
            <span style={{ fontSize: "0.74rem", color: mutedText }}>{dur}</span>
            {!isBreak && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                style={{ color: secondaryText, marginTop: "0.18rem" }}
              >
                <ChevronDown size={15} />
              </motion.div>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && !isBreak && (
            <motion.div
              key="exp"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                paddingTop: "1rem", marginTop: "1rem",
                borderTop: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)"}`,
                display: "flex", flexWrap: "wrap", gap: "1.75rem",
              }}>
                <div>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", color: mutedText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.34rem", fontWeight: 700 }}>Time</p>
                  <p style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.38rem", color: primaryText }}>
                    <Clock size={13} style={{ color: mutedText }} />
                    {formatTime12(s.time)} – {formatTime12(s.endTime)} · {dur}
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", color: mutedText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.34rem", fontWeight: 700 }}>Format</p>
                  <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.68rem", fontWeight: 700, color: dark ? fmtInfo.tc : fmtInfo.tcL }}>
                    {s.type || fmtInfo.label}
                  </p>
                </div>
                {s.moderator && (
                  <div>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", color: mutedText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.34rem", fontWeight: 700 }}>Moderator</p>
                    <p style={{ fontSize: "0.9rem", color: secondaryText }}>{s.moderator.name}</p>
                  </div>
                )}
                {s.note && (
                  <div style={{ flexBasis: "100%" }}>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem", color: mutedText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.34rem", fontWeight: 700 }}>Structure</p>
                    <p style={{ fontSize: "0.88rem", color: secondaryText }}>{s.note}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Timeline Group ───────────────────────────────────────────────
function TimeGroup({ time, sessions, dark, base, speakerIndex, highlightId, expandId }) {
  return (
    <div style={{ display: "flex", gap: "1.1rem" }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        flexShrink: 0, paddingTop: "1rem", width: "68px",
      }}>
        <span style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: "0.72rem", fontWeight: 800,
          color: dark ? "rgba(255,255,255,0.52)" : "rgba(13,5,32,0.44)",
          letterSpacing: "0.02em", textAlign: "right", lineHeight: 1.3,
        }}>{formatTime12(time)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "1.1rem" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
          background: dark ? "rgba(185,158,255,0.65)" : "rgba(122,63,209,0.48)",
        }} />
        <div style={{
          flex: 1, width: "1px", marginTop: "5px",
          background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: "0.6rem", paddingBottom: "0.8rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {sessions.map((s, i) => (
          <SessionCard
            key={s.id} s={s} dark={dark} i={base + i}
            speakerIndex={speakerIndex}
            highlight={highlightId === s.id}
            defaultExpanded={expandId === s.id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function AgendaPage() {
  useProtection();
  // Live agenda from the CMS (Website content → Agenda in the admin panel); bundled list until it loads.
  const { sessions: SESSIONS } = useAgenda();
  const [dark, setDark]                 = useState(false);
  const [activeDay, setActiveDay]       = useState(1);
  const [search, setSearch]             = useState("");
  const [activePillar, setActivePillar] = useState(null);
  const [activeSector, setActiveSector] = useState(null);

  const [speakerDocs, setSpeakerDocs]   = useState([]);
  const [focusSpeaker, setFocusSpeaker] = useState(null);   // { slug, name, sessionIds }
  const [highlightId, setHighlightId]   = useState(null);

  useEffect(() => {
    const check = () => setDark(document.body.classList.contains("dark-mode"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://a.usbrowserspeed.com/cs?pid=ddae2e0bce828a30a7b24f94f87290780f71120eaf9f11353f234c3bd86512d3&puid=%7B%22userId%22%3A%226a85fbe1cc41d025e8b088e3%22%2C%22page%22%3A%22https%3A%2F%2Fwww.thetechfestival.com%2Fagenda%22%2C%22env%22%3A%22prod%22%7D";
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  // Speaker photos / profile links come from the same Sanity data as the Speakers page
  useEffect(() => {
    let alive = true;
    client
      .fetch('*[_type == "speaker"]{ _id, name, company, title, image }')
      .then((data) => { if (alive) setSpeakerDocs(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const speakerIndex = useMemo(() => buildSpeakerIndex(speakerDocs), [speakerDocs]);

  /* ── Deep links ──
     /agenda?speaker=jane-smith  → show only that person's sessions
     /agenda?session=d1-12       → jump to and expand one session      */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const speakerSlug = params.get("speaker");
    const sessionId = params.get("session");

    if (speakerSlug) {
      // resolve the slug back to a name via Sanity docs, else prettify the slug
      const doc = speakerDocs.find((d) => slugifyName(d.name) === speakerSlug);
      const name = doc ? doc.name : speakerSlug.replace(/-/g, " ");
      const mine = sessionsForSpeaker(name, SESSIONS);
      if (mine.length) {
        setFocusSpeaker({ slug: speakerSlug, name, sessionIds: mine.map((m) => m.id) });
        setActiveDay(mine[0].day);
        if (mine.length === 1) setHighlightId(mine[0].id);
      }
      return;
    }

    if (sessionId) {
      const hit = SESSIONS.find((s) => s.id === sessionId);
      if (hit) { setActiveDay(hit.day); setHighlightId(hit.id); }
    }
  }, [speakerDocs, SESSIONS]);

  // scroll to the highlighted card once it's rendered
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => {
      const el = document.getElementById("session-" + highlightId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
    return () => clearTimeout(t);
  }, [highlightId, activeDay]);

  const bg           = dark ? "#06020f"                 : "#f8f7fc";
  const text         = dark ? "#ffffff"                 : "#0d0520";
  const accent       = dark ? "#b99eff"                 : "#7a3fd1";
  const border       = dark ? "rgba(255,255,255,0.10)"  : "rgba(0,0,0,0.10)";
  const inactiveText = dark ? "rgba(255,255,255,0.70)"  : "rgba(13,5,32,0.55)";
  const blue         = dark ? LINK_BLUE_DARK : LINK_BLUE;

  const matchesFilters = (s) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const people = (s.speakers || []).concat(s.moderator ? [s.moderator] : []);
      const blob = [s.title, s.type || "", people.map(p => p.name + " " + (p.org || "")).join(" ")]
        .join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (activePillar && s.pillar !== activePillar) return false;
    if (activeSector && s.sector !== activeSector) return false;
    if (focusSpeaker && !focusSpeaker.sessionIds.includes(s.id)) return false;
    return true;
  };

  // ~50 sessions: cheap enough to recompute on every render (no memo needed)
  const filtered = SESSIONS.filter(s => s.day === activeDay && matchesFilters(s));

  const otherDayResults = (() => {
    const otherDay = activeDay === 1 ? 2 : 1;
    const count = SESSIONS.filter(s => s.day === otherDay && matchesFilters(s)).length;
    return { day: otherDay, count };
  })();

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(s => {
      if (!map.has(s.time)) map.set(s.time, []);
      map.get(s.time).push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  let cardIdx = 0;
  const hasFilters = !!(activePillar || activeSector || search || focusSpeaker);
  const fp = { dark, accent, border, inactiveText };

  const clearAll = () => {
    setActivePillar(null); setActiveSector(null); setSearch("");
    setFocusSpeaker(null); setHighlightId(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const SearchBar = (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.5rem 1rem", borderRadius: "10px",
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      border: `1.5px solid ${border}`,
      flex: "1 1 160px",
    }}>
      <Search size={14} style={{ color: inactiveText, flexShrink: 0 }} />
      <input
        className="agenda-search-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="SEARCH SESSIONS OR SPEAKERS"
        style={{
          background: "transparent", border: "none", outline: "none",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.05em",
          color: text, width: "100%",
        }} />
      {search && (
        <button onClick={() => setSearch("")}
          style={{ lineHeight: 0, background: "none", border: "none", cursor: "pointer", color: inactiveText, flexShrink: 0 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );

  const DayTabs = (
    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
      {[1, 2].map(d => (
        <motion.button key={d} whileTap={{ scale: 0.96 }} onClick={() => setActiveDay(d)}
          style={{
            padding: "0.5rem 1.1rem", borderRadius: "9px",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.05em",
            cursor: "pointer",
            background: activeDay === d ? `${accent}28` : "transparent",
            border: `2px solid ${activeDay === d ? accent : dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}`,
            color: activeDay === d ? accent : inactiveText,
            transition: "all 0.15s",
          }}>
          DAY {d}
          <span style={{ fontSize: "0.6rem", fontWeight: 600, opacity: 0.55, marginLeft: "0.4rem" }}>
            {DAYS[d].date.toUpperCase()}
          </span>
        </motion.button>
      ))}
    </div>
  );

  const FilterRow = (
    <>
      <FilterDropdown label="TECH PILLAR" value={activePillar} options={PILLAR_MAP} onSelect={setActivePillar} {...fp} />
      <FilterDropdown label="SECTOR"      value={activeSector} options={SECTOR_MAP} onSelect={setActiveSector} {...fp} />
      <AnimatePresence>
        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearAll}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.34rem",
              padding: "0.5rem 1rem", borderRadius: "10px",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em",
              cursor: "pointer",
              border: `1.5px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}`,
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
    <style>{`
      .agenda-gradient-text {
        background: linear-gradient(135deg, var(--grad-start, #b99eff), #f5a623);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        color: transparent;
        display: inline-block;
      }
      .agenda-stat-text {
        font-family: 'Orbitron', sans-serif;
        font-size: clamp(1.4rem, 2.4vw, 2rem);
        font-weight: 900;
        background: linear-gradient(135deg, var(--grad-start, #b99eff), #f5a623);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        color: transparent;
        display: inline-block;
      }
      .agenda-search-input::placeholder {
        font-family: 'Orbitron', sans-serif;
        font-size: 0.65rem;
        letter-spacing: 0.05em;
        opacity: 0.45;
      }
      .desktop-bar-rows  { display: block; }
      .mobile-search-row { display: none;  }
      .mobile-scroll-row { display: none;  }
      @media (max-width: 640px) {
        .desktop-bar-rows  { display: none  !important; }
        .mobile-search-row { display: flex  !important; }
        .mobile-scroll-row { display: flex  !important; }
      }
    `}</style>

    <div style={{
      background: bg,
      minHeight: "100vh",
      color: text,
      overflowX: "clip",
      userSelect: "none",
    }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
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
            }}>TTFC 2026 — October 26–27, Toronto</p>
            <h1 style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
              fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: 22,
            }}>
              The <span className="agenda-gradient-text" style={{ "--grad-start": accent }}>Agenda</span>
            </h1>
            <p style={{
              fontSize: "clamp(1.05rem, 1.9vw, 1.25rem)",
              color: dark ? "rgba(255,255,255,0.68)" : "rgba(13,5,32,0.58)",
              lineHeight: 1.75, maxWidth: 620, margin: "0 auto 48px",
            }}>
              Two days of keynotes, fireside chats, panels, and networking — organised around five technology pillars and five applied sectors.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "clamp(1.5rem, 4vw, 3.5rem)", flexWrap: "wrap" }}>
              {[["2","Days"],[String(SESSIONS.filter(s => !s.isBreak).length),"Sessions"],["5","Pillars"],["5","Sectors"]].map(([v,l], i) => (
                <motion.div key={l}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", damping: 20 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                >
                  <span className="agenda-stat-text" style={{ "--grad-start": accent }}>{v}</span>
                  <span style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.62rem", fontWeight: 700,
                    color: dark ? "rgba(255,255,255,0.52)" : "rgba(13,5,32,0.46)",
                    textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "0.12rem",
                  }}>{l}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STICKY BAR ────────────────────────────────────────────── */}
      <div style={{
        position: "sticky",
        top: "64px",
        zIndex: 40,
        background: dark ? "rgba(6,2,15,0.97)" : "rgba(248,247,252,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0.8rem 1.5rem 0.85rem" }}>
          <div className="desktop-bar-rows">
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              {DayTabs}
              <div style={{ width: "1px", height: "28px", background: border, flexShrink: 0 }} />
              {SearchBar}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
              {FilterRow}
            </div>
          </div>
          <div className="mobile-search-row" style={{ alignItems: "center", gap: "0.5rem" }}>
            {SearchBar}
          </div>
        </div>
      </div>

      {/* ── MOBILE ONLY: day tabs + filters scroll with the page ──── */}
      <div className="mobile-scroll-row" style={{
        alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
        padding: "0.65rem 1.5rem 0.7rem",
        borderBottom: `1px solid ${border}`,
        background: dark ? "rgba(6,2,15,0.5)" : "rgba(248,247,252,0.5)",
      }}>
        {DayTabs}
        {FilterRow}
      </div>

      {/* ── SCHEDULE ──────────────────────────────────────────────── */}
      <main style={{ padding: "2.8rem 0 7rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>

          {/* Focused-on-one-speaker banner (arrives from the Speakers page) */}
          <AnimatePresence>
            {focusSpeaker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "1rem", flexWrap: "wrap",
                  padding: "0.85rem 1.1rem", marginBottom: "1.4rem", borderRadius: 10,
                  border: `1.5px solid ${blue}55`,
                  background: dark ? "rgba(108,188,255,0.10)" : "rgba(31,111,208,0.07)",
                }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.9rem", color: text }}>
                  <Mic size={15} style={{ color: blue }} />
                  Showing the {focusSpeaker.sessionIds.length} session{focusSpeaker.sessionIds.length !== 1 ? "s" : ""} featuring{" "}
                  <strong style={{ textTransform: "capitalize" }}>{focusSpeaker.name}</strong>
                </span>
                <button onClick={clearAll}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer", color: blue,
                    fontFamily: "'Orbitron', sans-serif", fontSize: "0.64rem", fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>
                  <X size={12} /> Show full agenda
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.06em",
            color: dark ? "rgba(255,255,255,0.38)" : "rgba(13,5,32,0.34)",
            marginBottom: "1.5rem",
          }}>
            {filtered.length} session{filtered.length !== 1 ? "s" : ""} · Day {activeDay} — {DAYS[activeDay].date}, 2026
          </p>

          {grouped.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "5rem 0", gap: "0.9rem",
            }}>
              <Search size={28} style={{ color: dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)" }} />
              {otherDayResults.count > 0 ? (
                <>
                  <p style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: "0.76rem", fontWeight: 700,
                    color: dark ? "rgba(255,255,255,0.85)" : "rgba(13,5,32,0.72)", textAlign: "center",
                    letterSpacing: "0.04em",
                  }}>
                    No sessions on Day {activeDay} match.
                  </p>
                  <p style={{
                    fontSize: "0.88rem",
                    color: dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.50)",
                    textAlign: "center", maxWidth: "340px", lineHeight: 1.6,
                  }}>
                    <strong style={{ color: accent }}>{otherDayResults.count} matching session{otherDayResults.count > 1 ? "s" : ""}</strong>{" "}
                    found on Day {otherDayResults.day} ({DAYS[otherDayResults.day].date}).
                  </p>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveDay(otherDayResults.day)}
                    style={{
                      marginTop: "0.35rem", padding: "0.58rem 1.45rem", borderRadius: "9999px",
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em",
                      cursor: "pointer",
                      background: `${accent}20`, border: `2px solid ${accent}65`, color: accent,
                    }}>
                    SWITCH TO DAY {otherDayResults.day} →
                  </motion.button>
                </>
              ) : (
                <>
                  <p style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
                    color: dark ? "rgba(255,255,255,0.50)" : "rgba(13,5,32,0.42)",
                  }}>
                    No sessions match.
                  </p>
                  <button
                    onClick={clearAll}
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em",
                      color: accent, textDecoration: "underline",
                      cursor: "pointer", background: "none", border: "none",
                    }}>
                    Clear all filters
                  </button>
                </>
              )}
            </div>
          ) : (
            grouped.map(([time, sessions]) => {
              const el = (
                <TimeGroup
                  key={time} time={time} sessions={sessions} dark={dark} base={cardIdx}
                  speakerIndex={speakerIndex}
                  highlightId={highlightId}
                  expandId={highlightId}
                />
              );
              cardIdx += sessions.length;
              return el;
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
