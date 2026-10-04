import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import emailjs from "@emailjs/browser";
import useSiteSettings from "../hooks/useSiteSettings";
import { ClosedNotice } from "../components/SiteNotices";

/* ───── tiny icons ───── */
function ChevronDown({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6 9 17l-5-5" /></svg>;
}

/* ───── data ───── */
var BENEFITS = [
  "Staff Pass — full access to conference sessions and exhibition floor when not on shift",
  "Official TTFC 2026 Staff Polo Shirt",
  "Conference Swag Bag",
  "Certificate of Appreciation",
  "Access to all Conference Sessions once your shift is complete",
  "Access to Networking Events once your shift is complete",
  "LinkedIn recommendation letter upon request",
];

var REQUIREMENTS = [
  "Be at least 18 years of age",
  "Commit to a minimum of 12 hours across both event days (Oct 26–27)",
  "Attend the mandatory Volunteer Orientation (Oct 24, virtual)",
  "Be available during all dates of the event (Oct 26–27, 2026)",
  "Have a valid email address",
  "Be responsible for coordinating your schedule with the Volunteer Manager",
  "Agree to the Volunteer Release & Waiver of Liability",
  "Acknowledge and adhere to the Volunteer Policies and Guidelines",
];

var ROLES = [
  {
    title: "Registration & Check-In",
    duties: [
      "Welcome attendees and speakers to The Tech Festival Canada 2026",
      "Assist attendees with digital check-in using our badge scanning system",
      "Distribute badges, lanyards, and delegate bags",
      "Answer general questions from attendees about the event schedule and venue",
      "Handle registration issues such as reprinting badges or processing upgrades",
      "Staff the Info Desk for questions about the venue, nearby restaurants, transit, etc.",
    ],
    ideal: "You're friendly, calm under pressure, and enjoy working with people. Computer literacy is required. You'll be standing for extended periods during peak check-in times.",
  },
  {
    title: "Hospitality & Wayfinding",
    duties: [
      "Greet and welcome attendees throughout the venue",
      "Provide directions to sessions, exhibition halls, networking areas, and facilities",
      "Staff the Help Desk and handle general inquiries",
      "Manage Lost and Found",
      "Check in and out supplies from the Supply Room",
      "Ensure attendee comfort and assist with accessibility needs",
    ],
    ideal: "You're approachable, resourceful, and good at problem-solving on the fly. Familiarity with the Westin Harbour Castle venue is a bonus.",
  },
  {
    title: "Exhibition Floor Support",
    duties: [
      "Check in exhibitors and assist with booth setup on Day 0 (Oct 25)",
      "Monitor attendee access to the Exhibition Hall during public hours",
      "Encourage delegates and visitors to explore the exhibition floor",
      "Support exhibitors with logistical requests during the event",
      "Coordinate with the Exhibition Manager on floor activities and demos",
    ],
    ideal: "You're energetic, proactive, and comfortable approaching people. Interest in tech and startups is a plus.",
  },
  {
    title: "Session & Stage Support",
    duties: [
      "Manage session room entry and seating",
      "Ensure speakers are in the right room at the right time",
      "Assist with microphone handoffs during Q&A",
      "Monitor session timing and give speakers time cues",
      "Collect audience feedback forms after sessions",
    ],
    ideal: "You're detail-oriented, punctual, and comfortable working backstage. Event or AV experience is helpful but not required.",
  },
  {
    title: "Social Media & Content",
    duties: [
      "Capture photos and short video clips throughout the event",
      "Post real-time updates to TTFC social channels (LinkedIn, X, Instagram)",
      "Interview attendees for short testimonial clips",
      "Document key moments: keynotes, panel discussions, networking, awards",
      "Coordinate with the Marketing team on content priorities",
    ],
    ideal: "You're social-media savvy, creative, and have a good eye for content. Must have your own smartphone. Photography or videography experience preferred.",
  },
  {
    title: "VIP & Speaker Liaison",
    duties: [
      "Greet VIP guests and speakers upon arrival",
      "Escort speakers to green rooms, stages, and media areas",
      "Ensure VIP lounge is stocked and running smoothly",
      "Coordinate with the Events Manager on VIP schedules",
      "Assist with the Awards Night and Gala Dinner logistics",
    ],
    ideal: "You're polished, discreet, and professional. Experience in hospitality or executive support is a strong asset. This is a high-visibility role.",
  },
];

/* ───── accordion ───── */
function RoleAccordion({ role, dark }) {
  var s = useState(false); var open = s[0]; var setOpen = s[1];
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.65)";
  var borderCol = dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)";

  return (
    <div style={{ borderRadius: 16, border: "1px solid " + borderCol, overflow: "hidden", background: dark ? "rgba(255,255,255,0.02)" : "rgba(122,63,209,0.02)", transition: "all 0.2s" }}>
      <button onClick={function () { setOpen(!open); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", color: textMain, textAlign: "left" }}>
        <span style={{ flex: 1, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.5px" }}>{role.title}</span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div style={{ padding: "0 22px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: dark ? "#f5a623" : "#d98a14", marginBottom: 10 }}>In this role you will:</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 7 }}>
            {role.duties.map(function (d, i) {
              return <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.8rem", color: textMuted, lineHeight: 1.5 }}><CheckIcon />{d}</li>;
            })}
          </ul>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: dark ? "rgba(185,158,255,0.7)" : "#7a3fd1", marginBottom: 6 }}>Ideal for:</div>
          <p style={{ fontSize: "0.8rem", color: textMuted, lineHeight: 1.55, margin: 0 }}>{role.ideal}</p>
        </div>
      )}
    </div>
  );
}

/* ───── form ───── */
function VolunteerForm({ dark }) {
  var s1 = useState(""); var firstName = s1[0]; var setFirstName = s1[1];
  var s2 = useState(""); var lastName = s2[0]; var setLastName = s2[1];
  var s3 = useState(""); var email = s3[0]; var setEmail = s3[1];
  var s4 = useState(""); var phone = s4[0]; var setPhone = s4[1];
  var s5 = useState(""); var role1 = s5[0]; var setRole1 = s5[1];
  var s6 = useState(""); var role2 = s6[0]; var setRole2 = s6[1];
  var s7 = useState(""); var why = s7[0]; var setWhy = s7[1];
  var s8 = useState("idle"); var status = s8[0]; var setStatus = s8[1];
  var formRef = useRef(null);

  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.65)";
  var inputBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  var inputBorder = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  var inputStyle = { width: "100%", background: inputBg, border: "2px solid " + inputBorder, color: textMain, padding: "14px 16px", borderRadius: 10, fontSize: "0.9rem", outline: "none", fontFamily: "'DM Sans', sans-serif" };

  var handleSubmit = function (e) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !role1) return;
    setStatus("sending");
    emailjs.send("service_gy3fvru", "template_ufqzzep", {
      from_name: firstName + " " + lastName,
      from_email: email,
      phone: phone,
      preferred_role_1: role1,
      preferred_role_2: role2,
      message: "VOLUNTEER APPLICATION\n\nName: " + firstName + " " + lastName + "\nEmail: " + email + "\nPhone: " + phone + "\nPreferred Role 1: " + role1 + "\nPreferred Role 2: " + role2 + "\n\nWhy I want to volunteer:\n" + why,
    }, "gZgYZtLCXPVgUsVj_").then(function () {
      setStatus("sent");
    }).catch(function () {
      setStatus("error");
    });
  };

  if (status === "sent") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: textMain, marginBottom: 10 }}>Application Received!</h3>
        <p style={{ fontSize: "0.9rem", color: textMuted, lineHeight: 1.6 }}>Thank you for applying to volunteer at The Tech Festival Canada 2026. We'll review your application and get back to you within 5 business days.</p>
      </div>
    );
  }

  var roleNames = ROLES.map(function (r) { return r.title; });

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>First Name *</label>
          <input required value={firstName} onChange={function (e) { setFirstName(e.target.value); }} style={inputStyle} placeholder="Jane" />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Last Name *</label>
          <input required value={lastName} onChange={function (e) { setLastName(e.target.value); }} style={inputStyle} placeholder="Smith" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Email *</label>
          <input required type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} style={inputStyle} placeholder="jane@example.com" />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Phone</label>
          <input value={phone} onChange={function (e) { setPhone(e.target.value); }} style={inputStyle} placeholder="+1 416 555 0100" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Preferred Role 1 *</label>
          <select required value={role1} onChange={function (e) { setRole1(e.target.value); }} style={Object.assign({}, inputStyle, { cursor: "pointer" })}>
            <option value="">Select a role</option>
            {roleNames.map(function (r) { return <option key={r} value={r}>{r}</option>; })}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Preferred Role 2 (Optional)</label>
          <select value={role2} onChange={function (e) { setRole2(e.target.value); }} style={Object.assign({}, inputStyle, { cursor: "pointer" })}>
            <option value="">Select a role</option>
            {roleNames.map(function (r) { return <option key={r} value={r}>{r}</option>; })}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: "0.72rem", fontWeight: 700, color: textMuted, letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Why do you want to volunteer at TTFC 2026?</label>
        <textarea value={why} onChange={function (e) { setWhy(e.target.value); }} rows="4" style={Object.assign({}, inputStyle, { resize: "vertical" })} placeholder="Tell us a bit about yourself and why you're interested..." />
      </div>
      <button type="submit" disabled={status === "sending"} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: status === "sending" ? "wait" : "pointer", fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "1.5px", textTransform: "uppercase", color: "#fff", background: "linear-gradient(135deg, #7a3fd1, #f5a623)", boxShadow: "0 4px 20px rgba(122,63,209,0.3)", transition: "transform 0.2s" }}
        onMouseEnter={function (e) { e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={function (e) { e.currentTarget.style.transform = "translateY(0)"; }}
      >{status === "sending" ? "Submitting..." : "Submit Application"}</button>
      {status === "error" && <p style={{ color: "#ff4d4d", fontSize: "0.8rem", textAlign: "center" }}>Something went wrong. Please try again.</p>}
    </form>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function Volunteer() {
  var site = useSiteSettings();
  var volunteerOpen = site["site.volunteer_open"] !== false;
  var s = useState(false); var dark = s[0]; var setDark = s[1];
  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () { setDark(document.body.classList.contains("dark-mode")); });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);

  var bg = dark ? "#06020f" : "#ffffff";
  var textMain = dark ? "#ffffff" : "#0d0520";
  var textMuted = dark ? "rgba(255,255,255,0.60)" : "rgba(13,5,32,0.65)";
  var textLight = dark ? "rgba(255,255,255,0.35)" : "rgba(13,5,32,0.40)";
  var sectionBg = dark ? "rgba(255,255,255,0.02)" : "rgba(122,63,209,0.02)";
  var borderCol = dark ? "rgba(255,255,255,0.08)" : "rgba(122,63,209,0.10)";

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "100vh", background: bg, color: textMain }}>

        {/* ─── HERO ─── */}
        <div style={{ textAlign: "center", padding: "clamp(100px,14vw,140px) 24px 60px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase", color: dark ? "#f5a623" : "#d98a14", marginBottom: 16 }}>CALL FOR VOLUNTEERS</div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 20 }}>
            Be Part of<br /><span style={{ color: dark ? "#f5a623" : "#d98a14" }}>Something Big</span>
          </h1>
          <p style={{ fontSize: "1rem", color: textMuted, lineHeight: 1.75, maxWidth: 600, margin: "0 auto" }}>
            Interested in attending The Tech Festival Canada 2026 but the registration price is restrictive? We have a limited number of volunteer spots available — contribute your time and experience the event from the inside.
          </p>
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>

          {/* ─── BENEFITS ─── */}
          <section style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 8 }}>Volunteer Benefits</h2>
            <p style={{ fontSize: "0.88rem", color: textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              In exchange for your help, we're happy to offer our volunteers passes at no cost. Event volunteers receive a Staff Pass giving you full access when you're not on shift.
            </p>
            <div style={{ background: sectionBg, border: "1px solid " + borderCol, borderRadius: 18, padding: "28px 28px 20px" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", color: textLight, marginBottom: 16 }}>VOLUNTEERS RECEIVE</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {BENEFITS.map(function (b) {
                  return <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: textMuted, lineHeight: 1.5 }}><CheckIcon />{b}</li>;
                })}
              </ul>
            </div>
          </section>

          {/* ─── REQUIREMENTS ─── */}
          <section style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 8 }}>Volunteer Requirements</h2>
            <p style={{ fontSize: "0.88rem", color: textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              To ensure a smooth experience for everyone, we ask that all volunteers meet the following requirements:
            </p>
            <div style={{ background: sectionBg, border: "1px solid " + borderCol, borderRadius: 18, padding: "28px 28px 20px" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", color: textLight, marginBottom: 16 }}>REQUIREMENTS</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {REQUIREMENTS.map(function (r) {
                  return <li key={r} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: textMuted, lineHeight: 1.5 }}>
                    <span style={{ color: dark ? "#e91e8c" : "#e91e8c", flexShrink: 0, marginTop: 2, fontSize: "0.75rem" }}>●</span>{r}
                  </li>;
                })}
              </ul>
            </div>
          </section>

          {/* ─── ROLES ─── */}
          <section style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 8 }}>Volunteer Roles</h2>
            <p style={{ fontSize: "0.88rem", color: textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              Click on each role below to see what's involved. When you apply, you can select your top 2 preferred roles.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ROLES.map(function (role) {
                return <RoleAccordion key={role.title} role={role} dark={dark} />;
              })}
            </div>
          </section>

          {/* ─── KEY DATES ─── */}
          <section style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 24 }}>Key Dates</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              {[
                { date: "Now — Sep 30", label: "Applications Open" },
                { date: "Oct 10", label: "Acceptance Emails Sent" },
                { date: "Oct 24", label: "Virtual Orientation" },
                { date: "Oct 25", label: "On-Site Setup Day" },
                { date: "Oct 26–27", label: "Event Days" },
              ].map(function (d) {
                return (
                  <div key={d.label} style={{ background: sectionBg, border: "1px solid " + borderCol, borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1rem", color: dark ? "#f5a623" : "#d98a14", letterSpacing: "0.5px", marginBottom: 10 }}>{d.date}</div>
                    <div style={{ fontSize: "0.95rem", color: textMuted, lineHeight: 1.5 }}>{d.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── APPLICATION FORM ─── */}
          <section id="apply">
            <div style={{ background: dark ? "linear-gradient(135deg, rgba(122,63,209,0.10), rgba(245,166,35,0.05))" : "linear-gradient(135deg, rgba(122,63,209,0.05), rgba(245,166,35,0.03))", border: "1px solid " + borderCol, borderRadius: 24, padding: "clamp(28px, 5vw, 48px)" }}>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: 6 }}>Apply to Volunteer</h2>
              {volunteerOpen && <p style={{ fontSize: "0.85rem", color: textMuted, lineHeight: 1.6, marginBottom: 28 }}>
                Fill out the form below and we'll be in touch. Spots are limited — applications are reviewed on a rolling basis.
              </p>}
              {volunteerOpen
                ? <VolunteerForm dark={dark} />
                : <ClosedNotice dark={dark} title="Volunteer applications are closed" body="Thank you for your interest. All volunteer spots for this year have been filled." />}
            </div>
          </section>

        </div>
        <Footer />
      </div>
    </>
  );
}
