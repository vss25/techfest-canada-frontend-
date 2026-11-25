// src/components/SpeakersCarousel.jsx
// Testimonial-style profile cards — "Our Community"
// Vite + React (no Next.js, no shadcn, no Tailwind).
// framer-motion for animation, CSS variables for light/dark theming.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Github, Twitter, Linkedin, Globe } from "lucide-react";

/* ─────────────────────────────────────────────
   Inline styles using your CSS variables so
   everything respects light / dark mode.
───────────────────────────────────────────── */
const S = {
    section: {
        padding: "110px 0",
    },
    container: {
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 24px",
    },
    title: {
        textAlign: "center",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "clamp(2rem, 4vw, 3.2rem)",
        fontWeight: 900,
        marginBottom: 60,
        lineHeight: 1.1,
        color: "var(--text-main)",
    },
    titleSpan: {
        color: "#f5a623",
    },
    /* ── Desktop card layout ── */
    desktopWrapper: {
        display: "flex",
        alignItems: "center",
        position: "relative",
        maxWidth: 900,
        margin: "0 auto",
    },
    imageBox: {
        width: 420,
        height: 420,
        borderRadius: 28,
        overflow: "hidden",
        flexShrink: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border-main)",
        boxShadow: "var(--shadow-main)",
    },
    image: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    card: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-main)",
        borderRadius: 28,
        padding: "40px 36px",
        marginLeft: -70,
        zIndex: 10,
        flex: 1,
        boxShadow: "var(--shadow-main)",
    },
    speakerName: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "1.4rem",
        fontWeight: 900,
        color: "var(--text-main)",
        marginBottom: 6,
    },
    speakerTitle: {
        fontSize: "0.88rem",
        fontWeight: 700,
        color: "var(--brand-purple)",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    speakerCompany: {
        fontSize: "0.9rem",
        color: "var(--text-muted)",
        marginBottom: 20,
        fontWeight: 500,
    },
    bio: {
        fontSize: "0.97rem",
        color: "var(--text-muted)",
        lineHeight: 1.8,
        marginBottom: 28,
    },
    socialRow: {
        display: "flex",
        gap: 12,
    },
    socialBtn: {
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "var(--text-main)",
        color: "var(--bg-main)",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        textDecoration: "none",
        transition: "transform 0.15s ease, opacity 0.15s ease",
    },
    /* ── Mobile card layout ── */
    mobileWrapper: {
        maxWidth: 400,
        margin: "0 auto",
        textAlign: "center",
    },
    mobileImageBox: {
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 24,
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--border-main)",
        marginBottom: 24,
    },
    mobileCard: {
        padding: "0 8px",
    },
    /* ── Navigation ── */
    navRow: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        marginTop: 40,
    },
    navBtn: {
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "var(--bg-card)",
        border: "1px solid var(--border-main)",
        color: "var(--text-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "var(--shadow-main)",
        transition: "background 0.2s ease",
    },
    dot: (active) => ({
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: active ? "var(--text-main)" : "var(--border-main)",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.2s ease",
    }),
    dotsRow: {
        display: "flex",
        gap: 8,
        alignItems: "center",
    },
};

/* ─────────────────────────────────────────────
   Social link button — only renders if url exists
───────────────────────────────────────────── */
function SocialLink({ href, icon: Icon, label }) {
    if (!href) return null;
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            style={S.socialBtn}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
        >
            <Icon size={18} />
        </a>
    );
}

/* ─────────────────────────────────────────────
   Main SpeakersCarousel component — "Our Community"

   Props:
     speakers[]  — each item: { name, title, company, image,
                                bio?, github?, twitter?, linkedin?, website? }
     titleLead   — first word of the heading  (default "Our")
     titleAccent — highlighted word           (default "Community")
     autoPlayMs  — 0 / undefined disables autoplay
───────────────────────────────────────────── */
export default function SpeakersCarousel({
    speakers,
    titleLead = "Our",
    titleAccent = "Community",
    autoPlayMs = 0,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    );

    // Track viewport width (this was a useState() by mistake before — must be useEffect)
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const total = speakers ? speakers.length : 0;

    // Keep the index valid if the list shrinks
    useEffect(() => {
        if (total > 0 && currentIndex > total - 1) setCurrentIndex(0);
    }, [total, currentIndex]);

    // Optional autoplay
    useEffect(() => {
        if (!autoPlayMs || total < 2) return;
        const id = setInterval(() => {
            setCurrentIndex((i) => (i + 1) % total);
        }, autoPlayMs);
        return () => clearInterval(id);
    }, [autoPlayMs, total]);

    if (!speakers || total === 0) return null;

    const speaker = speakers[Math.min(currentIndex, total - 1)];

    const handleNext = () => setCurrentIndex((i) => (i + 1) % total);
    const handlePrevious = () => setCurrentIndex((i) => (i - 1 + total) % total);

    const cardContent = (mobile = false) => (
        <AnimatePresence mode="wait">
            <motion.div
                key={speaker.name + currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                style={mobile ? S.mobileCard : {}}
            >
                {/* Position badge */}
                <div style={{
                    display: "inline-block",
                    background: "#D6308C",
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                    marginBottom: 14,
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: "0.5px",
                }}>
                    #{currentIndex + 1} of {total}
                </div>

                <h3 style={S.speakerName}>{speaker.name}</h3>
                <p style={S.speakerTitle}>{speaker.title}</p>
                <p style={S.speakerCompany}>{speaker.company}</p>

                {speaker.bio && (
                    <p style={S.bio}>{speaker.bio}</p>
                )}

                {/* Social links */}
                <div style={{ ...S.socialRow, justifyContent: mobile ? "center" : "flex-start" }}>
                    <SocialLink href={speaker.linkedin} icon={Linkedin} label="LinkedIn" />
                    <SocialLink href={speaker.twitter} icon={Twitter} label="Twitter" />
                    <SocialLink href={speaker.github} icon={Github} label="GitHub" />
                    <SocialLink href={speaker.website} icon={Globe} label="Website" />
                </div>
            </motion.div>
        </AnimatePresence>
    );

    const imageBlock = (mobile = false) => (
        <div style={mobile ? S.mobileImageBox : S.imageBox}>
            <AnimatePresence mode="wait">
                <motion.img
                    key={speaker.image + currentIndex}
                    src={speaker.image}
                    alt={speaker.name}
                    style={S.image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    draggable={false}
                />
            </AnimatePresence>
        </div>
    );

    return (
        <section style={S.section}>
            <div style={S.container}>
                <h2 style={S.title}>
                    {titleLead} <span style={S.titleSpan}>{titleAccent}</span>
                </h2>

                {/* ── Desktop layout ── */}
                {!isMobile && (
                    <div style={S.desktopWrapper}>
                        {imageBlock(false)}
                        <div style={S.card}>
                            {cardContent(false)}
                        </div>
                    </div>
                )}

                {/* ── Mobile layout ── */}
                {isMobile && (
                    <div style={S.mobileWrapper}>
                        {imageBlock(true)}
                        {cardContent(true)}
                    </div>
                )}

                {/* ── Navigation: prev / dots / next ── */}
                <div style={S.navRow}>
                    <button
                        onClick={handlePrevious}
                        aria-label="Previous person"
                        style={S.navBtn}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#D6308C"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "transparent"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.color = "var(--text-main)"; e.currentTarget.style.borderColor = "var(--border-main)"; }}
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <div style={S.dotsRow}>
                        {speakers.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                aria-label={`Go to person ${i + 1}`}
                                style={S.dot(i === currentIndex)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        aria-label="Next person"
                        style={S.navBtn}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#D6308C"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "transparent"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.color = "var(--text-main)"; e.currentTarget.style.borderColor = "var(--border-main)"; }}
                    >
                        <ChevronRight size={22} />
                    </button>
                </div>
            </div>
        </section>
    );
}
