// components/AttendeesCarousel.jsx
import { useEffect, useRef, useState } from "react";
import { client } from "../utils/sanity";// adjust path if needed

/* ─────────────────────────────────────────────
   GROQ query — fetches the singleton toggle
   from the "siteSettings" Sanity document.
───────────────────────────────────────────── */
const SETTINGS_QUERY = `*[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{
  attendeesCarouselEnabled
}`;

/* ─────────────────────────────────────────────
   Static attendee data (replace / extend as
   needed, or pull from Sanity later).
───────────────────────────────────────────── */
const ATTENDEES = [
  { rank: 1,  name: "Tobias Lütke",       role: "CEO & Head of Production",   company: "Shopify",                              img: "/attendees/person1.jpg"  },
  { rank: 2,  name: "Dave McKay",          role: "President & CEO",             company: "Royal Bank of Canada (RBC)",           img: "/attendees/person2.jpg"  },
  { rank: 3,  name: "Victor Dodig",        role: "President & CEO",             company: "TELUS Corporation",                    img: "/attendees/person3.jpg"  },
  { rank: 4,  name: "Tracy Robinson",      role: "President & CEO",             company: "Canadian National Railway Co.",        img: "/attendees/person4.jpg"  },
  { rank: 5,  name: "Darren Entwistle",    role: "Retiring CEO",                company: "TELUS Corporation",                    img: "/attendees/person5.jpg"  },
  { rank: 6,  name: "Jay S. Hennick",      role: "Chairman & CEO",              company: "Colliers International Group",         img: "/attendees/person6.jpg"  },
  { rank: 7,  name: "Nicolas Marcoux",     role: "CEO & Senior Partner",        company: "PwC Canada",                           img: "/attendees/person7.jpg"  },
  { rank: 8,  name: "Gregory L. Ebel",     role: "President & CEO",             company: "Enbridge Inc.",                        img: "/attendees/person8.jpg"  },
  { rank: 9,  name: "Keith E. Creel",      role: "President & CEO",             company: "Canadian Pacific Kansas City Ltd",     img: "/attendees/person9.jpg"  },
  { rank: 10, name: "Mark J. Barrenechea", role: "Vice Chair, CEO",             company: "OpenText Corp",                        img: "/attendees/person10.jpg" },
  { rank: 11, name: "Patrick Dovigi",      role: "President & CEO",             company: "GFL Environmental Inc.",               img: "/attendees/person11.jpg" },
  { rank: 12, name: "Roy Gori",            role: "President & CEO",             company: "Manulife Financial Corporation",       img: "/attendees/person12.jpg" },
  { rank: 13, name: "Kinsey Fabrizio",     role: "President & CEO",             company: "Consumer Technology Assoc. (CTA)",    img: "/attendees/person13.jpg" },
  { rank: 14, name: "Joshua Kobza",        role: "CEO",                         company: "Restaurant Brands International",      img: "/attendees/person14.jpg" },
  { rank: 15, name: "Seetarama Kotagiri",  role: "President & CEO",             company: "Magna International Inc.",             img: "/attendees/person15.jpg" },
  { rank: 16, name: "Harley Finkelstein",  role: "President",                   company: "Shopify",                              img: "/attendees/person16.jpg" },
  { rank: 17, name: "Sarah Jenkins",       role: "Chief Product Officer",       company: "RBC Capital Markets",                  img: "/attendees/person17.jpg" },
  { rank: 18, name: "Jamie Torres",        role: "Head of Engineering",         company: "Google",                               img: "/attendees/person18.jpg" },
  { rank: 19, name: "David Chen",          role: "VP of Global Infrastructure", company: "Shopify",                              img: "/attendees/person19.jpg" },
  { rank: 20, name: "Darcy Tuer",          role: "CEO & Co-Founder",            company: "ZayZoon",                              img: "/attendees/person20.jpg" },
];

export default function AttendeesCarousel() {
  /* ── Sanity toggle state ── */
  const [carouselEnabled, setCarouselEnabled] = useState(null); // null = loading

  useEffect(() => {
    client
      .fetch(SETTINGS_QUERY)
      .then((settings) => {
        console.log("Sanity settings response:", settings);
        // Default to false (Coming Soon) if the document hasn't been
        // created in Sanity Studio yet.
        setCarouselEnabled(settings?.attendeesCarouselEnabled ?? false);
      })
      .catch((err) => {
        console.error("Sanity fetch error (AttendeesCarousel):", err);
        setCarouselEnabled(false); // fail-safe: show Coming Soon
      });
  }, []);

  /* ── Carousel scroll state ── */
  const trackRef  = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  /* ── Auto-scroll (only runs when carousel is visible) ── */
  useEffect(() => {
    if (!carouselEnabled) return;

    const track = trackRef.current;
    if (!track) return;

    let raf;
    const step = () => {
      if (!isPaused) {
        track.scrollLeft += 0.4;
        // Seamless infinite loop
        if (track.scrollLeft >= track.scrollWidth / 2) {
          track.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isPaused, carouselEnabled]);

  /* ── Arrow control ── */
  const scrollByAmount = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  /* ─────────────────────────────────────────
     LOADING STATE — render nothing (or a
     subtle skeleton) while Sanity responds.
  ───────────────────────────────────────── */
  if (carouselEnabled === null) {
    return (
      <section className="attendees-section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading…</p>
        </div>
      </section>
    );
  }

  /* ─────────────────────────────────────────
     COMING SOON — carousel is OFF in Sanity
  ───────────────────────────────────────── */
  if (!carouselEnabled) {
    return (
      <section className="attendees-section">
        <div className="container" style={{ textAlign: "center", padding: "3rem 5% 6rem", maxWidth: 640, margin: "0 auto" }}>
          <h2 className="attendees-title">
            Featured <span>Attendees</span>
          </h2>
          <h2
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              background: "#D6308C",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "1.5rem",
            }}
          >
            Coming Soon.
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.8 }}>
            We are currently curating our lineup of featured attendees for TFC 2026.
          </p>
        </div>
      </section>
    );
  }

  /* ─────────────────────────────────────────
     CAROUSEL — carousel is ON in Sanity
  ───────────────────────────────────────── */
  return (
    <section className="attendees-section">
      <div className="container">
        <h2 className="attendees-title">
          Featured <span>Attendees</span>
        </h2>

        <div
          className="carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* LEFT ARROW */}
          <button
            className="carousel-arrow left"
            onClick={() => scrollByAmount("left")}
          >
            ‹
          </button>

          {/* TRACK — duplicated for seamless loop */}
          <div className="attendees-carousel" ref={trackRef}>
            {[...ATTENDEES, ...ATTENDEES].map((person, index) => (
              <div key={index} className="attendee-card">
                <div className="rank-badge">#{person.rank}</div>
                <img src={person.img} alt={person.name} />
                <h4>{person.name}</h4>
                <p className="attendee-role">{person.role}</p>
                <p className="attendee-company">{person.company}</p>
              </div>
            ))}
          </div>

          {/* RIGHT ARROW */}
          <button
            className="carousel-arrow right"
            onClick={() => scrollByAmount("right")}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}