import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AboutUs from "../components/AboutUs";
import { useEffect, useState, useRef } from "react";
import InquiryModal from "../components/InquiryModal";
import PostPurchaseModal from "../components/PostPurchaseModal";
import OnboardingSurvey from "../components/OnboardingSurvey";
import { motion, useInView } from "framer-motion";
import SponsorMarquee from "../components/SponsorMarquee";
import NewsletterBar from "../components/NewsletterBar";
import CommunityCarousel from "../components/CommunityCarousel";
import SpeakerMarquee from "../components/SpeakerMarquee";
import GetAppSection from "../components/GetAppSection";
import useSiteSettings from "../hooks/useSiteSettings";
import { HERO_POSTER, heroStillOnly, siteFileUrl } from "../lib/siteFiles";
import { Link } from "react-router-dom";
import { STAY_UPDATED_PATH, eventOver } from "../lib/eventOver";

var containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.3 },
  },
};

var itemBlur = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 22 },
  visible: {
    opacity: 1, filter: "blur(0px)", y: 0,
    transition: { type: "spring", bounce: 0.3, duration: 1.5 },
  },
};

function TextReveal(props) {
  var text = props.text;
  var colors = props.colors || [];
  var style = props.style || {};
  var delay = props.delay || 0;
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-60px" });
  var words = text.split(" ");
  return (
    <motion.h2
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.14, delayChildren: delay } },
      }}
      style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "0.18em", flexWrap: "wrap", ...style }}
    >
      {words.map(function (word, i) {
        return (
          <motion.span key={i}
            variants={{
              hidden: { opacity: 0, y: 50, filter: "blur(16px)", scale: 0.8 },
              visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { type: "spring", damping: 14, stiffness: 100, duration: 1 } },
            }}
            style={{ display: "inline-block", color: colors[i] || "inherit", willChange: "transform, opacity, filter" }}
          >{word}</motion.span>
        );
      })}
    </motion.h2>
  );
}

function DividerReveal(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
      style={{ width: 120, height: 3, borderRadius: 2, background: "linear-gradient(90deg, " + props.accent + ", var(--brand-orange, #f5a623))", margin: "2rem auto 2.5rem", transformOrigin: "center" }}
    />
  );
}

function SubtitleReveal(props) {
  var site = useSiteSettings();
  var tagline = site["site.hero_tagline"];   // set in the admin panel; empty = built-in text
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.p ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.4, delay: 0.5 }}
      className="hero-sub"
      style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.3rem)", lineHeight: 1.85, fontWeight: 400, maxWidth: 920, color: props.textMid, textAlign: "justify", hyphens: "auto", marginBottom: "3rem" }}
    >
      {tagline || <>
      Canada's first-of-its-kind, deal-making platform where
      innovators, buyers, and policymakers turn emerging tech into real partnerships,
      pilots, and contracts, not just conversations. Expect a never-seen-before concentration of
      senior decision-makers from enterprise and critical sectors, alongside government,
      associations, media, and leading research institutions.
      </>}
    </motion.p>
  );
}

function CTAReveal(props) {
  var ref = useRef(null);
  var isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", bounce: 0.2, duration: 1.2, delay: 0.6 }}
      className="hero-ctas-wrap"
      style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}
    >
      <motion.a href="/tickets" className="btn-primary"
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 14, textDecoration: "none", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "1.2px", textTransform: "uppercase" }}
      >
        Get Your Pass
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </motion.a>
      <motion.a href="/sponsor#compare-packages" className="btn-outline"
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none" }}
      >
        Partner With Us
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
      </motion.a>
    </motion.div>
  );
}

/* The hero's background. Phones, tablets, data saver and reduced motion get the still frame
   (hero-poster.jpg, the video's first frame) and no <video> element at all, so the 26 MB video
   is never requested there. Desktops get the looping video with the same frame as its poster.
   The video comes from the uploaded copy (site.hero_video_url) once the site settings arrive,
   or the website's own after 4 s without them; until then the poster shows. */
var HERO_FILL = { position: "absolute", top: "50%", left: "50%", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", transform: "translate(-50%, -50%)", objectFit: "cover" };

function HeroBackground() {
  var stillOnly = useState(heroStillOnly)[0];
  var site = useSiteSettings();
  const [waited, setWaited] = useState(false);

  useEffect(function () {
    if (stillOnly || site.loaded) return undefined;
    var t = setTimeout(function () { setWaited(true); }, 4000);
    return function () { clearTimeout(t); };
  }, [stillOnly, site.loaded]);

  var videoSrc = !stillOnly && (site.loaded || waited) ? siteFileUrl(site, "heroVideo") : "";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
      {videoSrc ? (
        <video key={videoSrc} autoPlay muted loop playsInline poster={HERO_POSTER} src={videoSrc} style={HERO_FILL} />
      ) : (
        <img src={HERO_POSTER} alt="" width={2214} height={1080} fetchPriority="high" decoding="async" style={HERO_FILL} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(6,2,15,0.65)" }} />
    </div>
  );
}

/* Sleek rounded pill widget — sits directly beneath the logo, over the video.
   Venue is folded into the pill itself, right of a divider. */
/* TTFC 2026 is over (Oct 29 2026, the organiser: "On the hero of the home page, put a note similar to the one on the
   app: TTFC is now over, stay updated for 2027"): after the last session (src/lib/eventOver.js) the hero shows this
   note in place of "Register Now", in the app's words (its Home banner, home.announcement). */
function SeeYouIn2027() {
  return (
    <motion.div
      variants={itemBlur}
      role="status"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "22px 26px 24px", borderRadius: 22,
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.20)", backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)", boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
        color: "#ffffff", width: "100%", maxWidth: 520,
      }}
    >
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "1.8px", textTransform: "uppercase", color: "#f5a623" }}>
        TTFC 2026 has ended
      </span>
      <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.65, color: "rgba(255,255,255,0.86)" }}>
        Thank you for being part of it! See you in 2027. See what&rsquo;s coming and register your interest.
      </p>
      <Link
        to={STAY_UPDATED_PATH}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10, marginTop: 4, padding: "13px 26px", borderRadius: 999,
          background: "linear-gradient(135deg, #7a3fd1, #f5a623)", color: "#ffffff", textDecoration: "none",
          fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.82rem", letterSpacing: "1.2px", textTransform: "uppercase",
          boxShadow: "0 8px 24px rgba(122,63,209,0.4)", maxWidth: "100%",
        }}
      >
        Stay updated for 2027
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </motion.div>
  );
}

function RegisterWidget() {
  return (
    <motion.a
      href="/tickets"
      variants={itemBlur}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 32px 14px 14px",
        borderRadius: 999,
        textDecoration: "none",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        color: "#ffffff",
        cursor: "pointer",
        maxWidth: "92vw",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7a3fd1, #f5a623)",
          flexShrink: 0,
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10a2 2 0 0 0 2 2v2a2 2 0 0 1-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 1 0-4V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2z" />
        </svg>
      </span>
      <span
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 800,
          fontSize: "1rem",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Register Now
      </span>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: -4 }}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </motion.a>
  );
}

export default function Home() {
  var s1 = useState(false); var inquiryOpen = s1[0];        var setInquiryOpen = s1[1];
  var s2 = useState(false); var surveyOpen = s2[0];         var setSurveyOpen = s2[1];
  var s3 = useState("");    var surveyName = s3[0];         var setSurveyName = s3[1];
  var s4 = useState(false); var purchaseOpen = s4[0];       var setPurchaseOpen = s4[1];
  var s5 = useState("");    var purchaseTicketType = s5[0]; var setPurchaseTicketType = s5[1];
  var s6 = useState(false); var dark = s6[0];               var setDark = s6[1];

  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  useEffect(function () {
    function h(e) { setSurveyName(e.detail && e.detail.name ? e.detail.name : ""); setSurveyOpen(true); }
    window.addEventListener("showSurvey", h);
    return function () { window.removeEventListener("showSurvey", h); };
  }, []);

  useEffect(function () {
    function h(e) { setPurchaseTicketType(e.detail && e.detail.ticketType ? e.detail.ticketType : "Delegate Pass"); setPurchaseOpen(true); }
    window.addEventListener("purchaseComplete", h);
    return function () { window.removeEventListener("purchaseComplete", h); };
  }, []);

  var bg       = dark ? "#06020f"                : "#ffffff";
  var textMain = dark ? "#ffffff"                : "#0d0520";
  var textMid  = dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.78)";
  var accent   = dark ? "#b99eff"                : "#7a3fd1";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textMain, overflowX: "hidden", width: "100%", position: "relative" }}>
      <style>{`
        .tfc-navbar-wrap { border-bottom: none !important; box-shadow: none !important; }
        @media (max-width: 640px) {
          .hero-ctas-wrap { flex-direction: column !important; width: 100% !important; }
          .hero-cta-solid, .hero-cta-ghost { width: 100% !important; justify-content: center !important; }
          .hero-sub { text-align: left !important; max-width: 100% !important; }
        }
        @media (min-width: 641px) {
          .hero-sub { max-width: 920px !important; width: 100% !important; }
        }
        /* Enlarge the "Our Community" title rendered by SpeakerMarquee */
        .community-marquee h1,
        .community-marquee h2,
        .community-marquee h3,
        .community-marquee h4,
        .community-marquee p {
          font-size: clamp(1.6rem, 4vw, 2.9rem) !important;
          font-weight: 800 !important;
          letter-spacing: 0.26em !important;
          line-height: 1.25 !important;
        }
      `}</style>

      <Navbar />

      {/* HERO UPPER — always dark regardless of theme */}
      <section style={{ position: "relative", overflow: "hidden", background: "#06020f", minHeight: "76vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <HeroBackground />
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 6%", maxWidth: 660, width: "100%" }}
        >
          <motion.div variants={itemBlur} style={{ marginBottom: "1.8rem" }}>
            <img
              src="/Tech_Festival_Canada_Logo_Dark_Transparent.png"
              alt="The Tech Festival Canada"
              style={{ width: "100%", maxWidth: 620, height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 50px rgba(155,135,245,0.22))" }}
            />
          </motion.div>
          {eventOver() ? <SeeYouIn2027 /> : <RegisterWidget />}
        </motion.div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, zIndex: 4, background: "linear-gradient(to bottom, transparent, " + bg + ")", pointerEvents: "none" }} />
      </section>

      {/* GET THE TTFC APP (Oct 22 2026): the App Store and Google Play, right under the hero */}
      <GetAppSection dark={dark} />

      {/* OUR COMMUNITY (logo marquee) + 2026 SPEAKERS — between the Register pill and MEET BUILD SCALE */}
      <div id="our-community" style={{ background: bg }}>
        <div className="community-marquee">
          <SpeakerMarquee dark={dark} title="Our Community" />
        </div>
        <CommunityCarousel dark={dark} limit={14} showAllTo="/speakers" />
      </div>

      {/* HERO LOWER */}
      <section id="hero-lower" style={{ position: "relative", background: bg, overflow: "hidden", padding: "6rem 5% 8rem" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <TextReveal
            text="MEET BUILD SCALE"
            colors={[dark ? "#ffffff" : "#0d0520", accent, "var(--brand-orange, #f5a623)"]}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2.2rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px", marginBottom: "0.5rem", whiteSpace: "nowrap", flexWrap: "nowrap" }}
          />
          <SubtitleReveal textMid={textMid} />
          <CTAReveal dark={dark} textMain={textMain} accent={accent} />
        </div>
      </section>

      {/* ABOUT */}
      <div id="about-section" style={{ background: bg }}>
        <AboutUs onWriteToUs={function () { setInquiryOpen(true); }} />
      </div>

      <SponsorMarquee dark={dark} />
      <div style={{ height: "4rem", background: dark ? "#06020f" : "#ffffff" }} />
      <NewsletterBar dark={dark} />
      <Footer />

      <InquiryModal isOpen={inquiryOpen} onClose={function () { setInquiryOpen(false); }} />
      <PostPurchaseModal isOpen={purchaseOpen} onClose={function () { setPurchaseOpen(false); }} ticketType={purchaseTicketType} />
      <OnboardingSurvey isOpen={surveyOpen} onClose={function () { setSurveyOpen(false); window.location.reload(); }} userName={surveyName} />
    </div>
  );
}
