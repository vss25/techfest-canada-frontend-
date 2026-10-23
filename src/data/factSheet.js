/* =========================================================
   The TTFC 2026 fact sheet's text (Oct 23 2026), as the organiser
   wrote it: same facts, same order. Imported only by the unlisted
   page src/pages/FactSheet.jsx (a lazy chunk), so none of it is in
   the site's main bundle. Organiser's corrections the same day:
   "90+ speakers" in By the Numbers, and the producer office's email
   is enquire@ (info@ addresses don't exist).

   Rich text: a string, or a list of parts where a part is a string,
   { b: "bold" } or { a: "link text", href }.
   Blocks: { p }, { note } (smaller, muted), { ul: [rich…] },
   { lists: [{ title, items }] } (numbered, side by side),
   { table: [[label, rich]…], head?: [left, right] }.
========================================================= */

export const WEBSITE = "https://www.thetechfestival.com";

const site = { a: "thetechfestival.com", href: WEBSITE };
const mail = (address) => ({ a: address, href: `mailto:${address}` });

export const FACT_SHEET = {
  title: "The Tech Festival Canada 2026: Fact Sheet",
  tagline: "Meet | Build | Scale",
  sections: [
    {
      id: "about",
      title: "About the Festival",
      blocks: [
        { p: "The Tech Festival Canada exists to bring Canada’s frontier technology community together, so that the country’s leaders, builders, and investors can meet, build, and scale. By applying AI, quantum computing, cybersecurity, robotics, and cleantech to financial services, healthcare, energy, manufacturing, and the public sector, we turn ideas into partnerships, partnerships into deployments, and Canadian innovation into global competitiveness." },
      ],
    },
    {
      id: "glance",
      title: "Event at a Glance",
      blocks: [
        {
          table: [
            ["Event", "The Tech Festival Canada (TTFC) 2026"],
            ["Dates", "26–27 October 2026 (Monday–Tuesday)"],
            ["Venue", "The Westin Harbour Castle, 1 Harbour Square, Toronto, Ontario M5J 1A6 (Convention Level)"],
            ["Tagline", "Meet | Build | Scale"],
            ["Host", "Startup Story Canada (non-profit)"],
            ["Producer", "AtlasLink Markets Inc., Oakville, Ontario"],
            ["Website", [site]],
          ],
        },
      ],
    },
    {
      id: "numbers",
      title: "By the Numbers",
      blocks: [
        {
          ul: [
            "1,000–1,500+ senior delegates expected",
            "60%+ C-suite and VP level attendees",
            "25% international delegates from 10+ countries",
            "90+ speakers",
            "28 Catalyst Awards presented on Day 1 evening",
            "25 exhibition booths across two zones",
          ],
        },
      ],
    },
    {
      id: "programme",
      title: "Programme: The 5 × 5 Framework",
      blocks: [
        { p: "Every session, panel, and award category sits at the intersection of five technology pillars and five applied sectors." },
        {
          lists: [
            {
              title: "Technology pillars",
              items: ["AI & Machine Learning", "Quantum Computing", "Cybersecurity & Digital Trust", "Robotics & Automation", "CleanTech & Sustainability"],
            },
            {
              title: "Applied sectors",
              items: ["Financial Services & Banking", "Healthcare & Life Sciences", "Energy & Critical Infrastructure", "Manufacturing, Supply Chain & Mobility", "Public Sector, National Defence & Security"],
            },
          ],
        },
      ],
    },
    {
      id: "formats",
      title: "Session Formats",
      blocks: [
        { p: "Keynote addresses, fireside chats, executive panels, technical workshops, networking receptions, CxO Breakfast, Networking Luncheon, and the Catalyst Awards Gala Night." },
      ],
    },
    {
      id: "agenda",
      title: "Agenda Highlights",
      blocks: [
        { p: [{ b: "Day 1 (26 October):" }, " Registration and networking breakfast with expo preview, opening ceremony, and keynotes on Canada’s tech decade, AI beyond the pilot phase, quantum as strategic infrastructure, cybersecurity and digital trust in the agentic age, robotics and the physical AI economy, and climate tech as competitiveness strategy. Executive panels across the applied sectors, a CxO Breakfast, a Networking Luncheon, and the Catalyst Awards Gala Night round out the day."] },
        { p: [{ b: "Day 2 (27 October):" }, " Deeper sector tracks, technical workshops, B2B matchmaking, and international delegation programming."] },
        { note: ["Session times are being finalised. The full agenda is published progressively at ", site, "."] },
      ],
    },
    {
      id: "awards",
      title: "Catalyst Awards",
      blocks: [
        { p: "The Catalyst Awards Gala Night recognises Canadian and international leadership in frontier tech across 28 categories spanning the 5 × 5 framework. It is held on the evening of Day 1." },
      ],
    },
    {
      id: "venue",
      title: "Venue and Exhibition",
      blocks: [
        { p: "The festival uses two zones on the Convention Level of The Westin Harbour Castle, on the Lake Ontario waterfront." },
        {
          ul: [
            [{ b: "Zone A: Harbour Ballroom Foyer." }, " 15 booths, registration, coffee bar, lounge, and Lake Ontario frontage. The Harbour Ballroom hosts main-stage sessions, with Salon A/B/C breakouts."],
            [{ b: "Zone B: Pier 4 & 5 Foyer." }, " 10 booths, a sponsor signage wall, and an info desk. Adjoins the Pier 4 and Pier 5 breakout rooms."],
          ],
        },
        { p: "Every exhibition booth is 10′ × 10′." },
      ],
    },
    {
      id: "partners",
      title: "Partners",
      blocks: [
        {
          ul: [
            [{ b: "Next Generation Manufacturing Canada (NGen):" }, " Official Advanced Manufacturing Ecosystem Partner"],
            [{ b: "Innovate Council Canada:" }, " Partner"],
            [{ b: "Media partners:" }, " BNN Bloomberg and The Globe and Mail (Report on Business)"],
          ],
        },
      ],
    },
    {
      id: "contacts",
      title: "Contacts",
      blocks: [
        {
          head: ["Purpose", "Contact"],
          table: [
            ["General enquiries", [mail("enquire@thetechfestival.com")]],
            ["Sales and sponsorship", [mail("sales@thetechfestival.com")]],
            ["Partnerships", [mail("partner@thetechfestival.com")]],
            ["Media and PR", [mail("marcom@thetechfestival.com")]],
            ["Speaker enquiries", [mail("lubna@thetechfestival.com")]],
            ["Producer office", [mail("enquire@thetechfestival.com"), " / ", { a: "+1 647 946 4643", href: "tel:+16479464643" }]],
          ],
        },
      ],
    },
  ],
  preparedBy: "Prepared by AtlasLink Markets Inc., producer of The Tech Festival Canada.",
};
