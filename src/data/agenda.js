// src/data/agenda.js
// ─────────────────────────────────────────────────────────────────
// Single source of truth for the TTFC 2026 agenda.
// Imported by BOTH pages/Agenda.jsx and pages/Speakers.jsx so the
// "Show Agenda" button and the agenda's speaker links can never
// disagree about who is speaking where.
//
// Times are 24-hour "HH:MM". Duration is computed from time/endTime,
// never stored, so the two can't drift apart.
//
// speakers:     [{ name, org?, tentative? }]  — real people
// placeholders: ["Hospital CMO", ...]         — unfilled slots from the
//               planning sheet; rendered as "To be confirmed", never linked
//
// Rebuilt from Final_Agenda_W_Speakers_v11.xlsx, "Final Day1" and
// "Final Day 2" tabs (most current version in the workbook).
// ─────────────────────────────────────────────────────────────────

export const DAYS = {
  1: { label: "Day 1", date: "Oct 26", longDate: "Monday, October 26, 2026" },
  2: { label: "Day 2", date: "Oct 27", longDate: "Tuesday, October 27, 2026" },
};

export const SESSIONS = [
  /* ══════════════════ DAY 1 — 26 Oct 2026 ══════════════════ */
  {
    id: "d1-01", day: 1, time: "09:00", endTime: "09:05",
    title: "Opening Remarks + Land Acknowledgement",
    type: "Opening Remarks", format: "opening", featured: true,
    speakers: [{ name: "Baldeep Singh Pahwa" }, { name: "Lubna Soni" }],
  },
  {
    id: "d1-02", day: 1, time: "09:05", endTime: "09:15",
    title: "Opening Ceremony",
    type: "Opening Ceremony", format: "opening", featured: true,
    // No line-up listed on the Final Day1 sheet.
    speakers: [],
  },
  {
    id: "d1-03", day: 1, time: "09:15", endTime: "09:40",
    title: "Canada's Tech Decade: Build | Secure | Scale",
    type: "Keynote", format: "keynote", featured: true,
    // Internal notes: 10 Mins Keynote + 30 Minutes Fireside + 5 Mins Q&A
    // Notes 18/08: Lubna follow up on speaker.
    speakers: [{ name: "TBD" }],
    moderator: { name: "Baldeep Singh Pahwa" },
  },
  {
    id: "d1-04", day: 1, time: "09:40", endTime: "10:10",
    title: "From Investment to Industrial Capacity: Canada's Next Ten Years",
    type: "Keynote", format: "keynote", featured: true,
    // Internal notes: 10 Mins Keynote + 15 Minutes Fireside + 5 Mins Q&A
    speakers: [{ name: "Vic Fedelli" }],
    moderator: { name: "Baldeep Singh Pahwa" },
  },
  {
    id: "d1-05", day: 1, time: "10:10", endTime: "10:15",
    title: "Light Years: A Decade of Building Quantum in Canada",
    type: "Keynote", format: "keynote", pillar: "quantum",
    speakers: [{ name: "Dr. Christian Weedbrook" }],
  },
  {
    id: "d1-06", day: 1, time: "10:15", endTime: "10:40",
    title: "Conviction Before Consensus: A Bet on Canadian Deep Tech",
    type: "Fireside Chat", format: "fireside", pillar: "quantum",
    // Notes 18/08: follow up on Photonic's participation.
    speakers: [{ name: "Dr. Christian Weedbrook" }],
    moderator: { name: "Shawn Abbott" },
  },
  {
    id: "d1-07", day: 1, time: "10:40", endTime: "10:50",
    title: "AM Break", type: "Break", format: "break", isBreak: true,
  },
  {
    id: "d1-08", day: 1, time: "10:50", endTime: "11:20",
    title: "Canada in the New Global Order",
    type: "Fireside Chat", format: "fireside", featured: true,
    // Internal notes: is Stephen Crawford fit for this panel? Move
    // Christy Clark to Day 2 to avoid a second night of accommodation.
    speakers: [{ name: "Stephen Crawford" }, { name: "Christy Clark" }],
    moderator: { name: "Dominic Miserandino" },
  },
  {
    id: "d1-09", day: 1, time: "11:20", endTime: "11:40",
    title: "The Quantum Advantage: Separating Signal from Hype",
    type: "Fireside Chat", format: "fireside", pillar: "quantum",
    speakers: [{ name: "Prof. Aspuru-Guzik" }],
    moderator: { name: "David Succu" },
  },
  {
    id: "d1-10", day: 1, time: "11:40", endTime: "12:10",
    title: "Reinventing the Intelligent Financial Institutions",
    type: "Fireside Chat", format: "fireside", sector: "fintech",
    speakers: [{ name: "Shereen Benzvy Miller" }],
    moderator: { name: "Baldeep Singh Pahwa" },
  },
  {
    id: "d1-11", day: 1, time: "12:10", endTime: "12:40",
    title: "From Co-Pilots to Core Banking",
    type: "Panel Session", format: "panel", pillar: "ai", sector: "fintech",
    speakers: [
      { name: "Joe Greenwood" },
      { name: "Fatemah Pirone" },
      { name: "Naresh Gunupuru" },
      { name: "TBD" },
    ],
    moderator: { name: "TBD" },
  },
  {
    id: "d1-12", day: 1, time: "12:40", endTime: "12:50",
    title: "The Upskilling Gap: What It Actually Takes to Put AI to Work",
    type: "Keynote", format: "keynote", pillar: "ai",
    speakers: [{ name: "Queena Cheung" }],
  },
  {
    id: "d1-13", day: 1, time: "12:50", endTime: "13:35",
    title: "Networking Lunch", type: "Lunch Break", format: "networking", isBreak: true,
  },
  {
    id: "d1-14", day: 1, time: "13:35", endTime: "13:45",
    title: "No Single Vendor Wins: A Boardroom Guide to Enterprise AI Architecture",
    type: "Keynote", format: "keynote", pillar: "ai",
    speakers: [{ name: "Thiru Venkatachalam" }],
  },
  {
    id: "d1-15", day: 1, time: "13:45", endTime: "14:05",
    title: "When Software Starts Talking to Software: MCP, Agents and the Next Wave of Enterprise Automation",
    type: "Panel Session", format: "panel", pillar: "ai",
    speakers: [
      { name: "Thiru Venkatachalam" },
      { name: "Queena Cheung" },
      { name: "Roy Pereira" },
    ],
    moderator: { name: "Yvette Schmitter" },
  },
  {
    id: "d1-16", day: 1, time: "14:05", endTime: "14:35",
    title: "Allied by Design: Securing the Technologies That Hold the Alliance Together",
    type: "Panel Session", format: "panel", sector: "public",
    speakers: [
      { name: "Brigadier General Kyle Paul" },
      { name: "Nancy Morgan" },
      { name: "Daniel Sax" },
      { name: "TBD" },
    ],
    moderator: { name: "Dr. Chris Golden" },
  },
  {
    id: "d1-17", day: 1, time: "14:35", endTime: "15:05",
    title: "Cybersecurity and Digital Trust in the Agentic Age",
    type: "Panel Session", format: "panel", pillar: "cybersecurity",
    speakers: [{ name: "Francois Guay" }, { name: "Samrah Kazmi" }, { name: "Vance Lockton" }],
    moderator: { name: "Brennan Lodge" },
  },
  {
    id: "d1-18", day: 1, time: "15:05", endTime: "15:35",
    title: "Robotics & the Physical AI Economy: Humanoids, Cobots and Warehouse Autonomy",
    type: "Panel Session", format: "panel", pillar: "robotics",
    speakers: [
      { name: "Ryan Gariepy" },
      { name: "Kulbir (Colin) Singh Dhillon" },
      { name: "Todd Deaville" },
      { name: "Laila Burns" },
    ],
    moderator: { name: "Alireza Saboukhi" },
  },
  {
    id: "d1-19", day: 1, time: "15:35", endTime: "15:45",
    title: "PM Tea Break", type: "Break", format: "break", isBreak: true,
  },
  {
    id: "d1-20", day: 1, time: "15:45", endTime: "16:05",
    title: "Drones, Robotics & Remote Ops",
    type: "Fireside Chat", format: "fireside", pillar: "climate",
    speakers: [
      { name: "Geneviève Decambra" },
      { name: "TBD" },
      { name: "James Castle" },
    ],
    moderator: { name: "TBD" },
  },
  {
    id: "d1-21", day: 1, time: "16:05", endTime: "16:35",
    title: "Transition Finance, Carbon Credits and Bankability",
    type: "Fireside Chat", format: "fireside", pillar: "climate", sector: "fintech",
    speakers: [{ name: "Na'im Merchant" }, { name: "Brian Hong" }],
    moderator: { name: "David Hochhalter" },
  },
  {
    id: "d1-22", day: 1, time: "16:35", endTime: "17:05",
    title: "Jobs, Skills, AI and the Human Contract",
    type: "Fireside Chat", format: "fireside", pillar: "ai", featured: true,
    speakers: [
      { name: "Maha Aziz" },
      { name: "Mariano Allegra" },
      { name: "Alyssa Daku" },
    ],
    moderator: { name: "John Wilder" },
  },
  {
    id: "d1-23", day: 1, time: "17:05", endTime: "17:30",
    title: "Build in Canada, Scale to the World: an SMB Way",
    type: "Panel Session", format: "panel", featured: true,
    speakers: [
      { name: "Hon. Nina Tangri" },
      { name: "Kree Govender" },
      { name: "TBD" },
    ],
    moderator: { name: "Dominic Miserandino" },
  },
  {
    id: "d1-24", day: 1, time: "17:30", endTime: "18:30",
    title: "Awards Evening", type: "Awards", format: "awards", isBreak: true, featured: true,
  },
  {
    id: "d1-25", day: 1, time: "18:30", endTime: "19:30",
    title: "Private Dinner with Resonance",
    type: "Private Dinner", format: "networking", isBreak: true,
  },

  /* ══════════════════ DAY 2 — 27 Oct 2026 ══════════════════ */
  {
    id: "d2-01", day: 2, time: "09:00", endTime: "09:05",
    title: "Opening Remarks", type: "Opening Remarks", format: "opening", featured: true,
    speakers: [{ name: "Nicole Louis" }],
  },
  {
    id: "d2-02", day: 2, time: "09:05", endTime: "09:25",
    title: "Canada's Frontier: Building the Next Decade of Innovation",
    type: "Fireside", format: "fireside", pillar: "quantum", featured: true,
    speakers: [{ name: "Hon. Mark Schaan" }],
    moderator: { name: "Dominic Miserandino" },
  },
  {
    id: "d2-03", day: 2, time: "09:25", endTime: "09:45",
    title: "Japan's Quantum Playbook: From National Strategy to Industrial Capability",
    type: "Keynote / Presentation", format: "keynote", pillar: "quantum",
    speakers: [{ name: "Masahiro Horibe" }],
  },
  {
    id: "d2-04", day: 2, time: "09:45", endTime: "10:15",
    title: "Quantum as Strategic Infrastructure: Can Canada Win the Compute Race?",
    type: "Panel Session", format: "panel", pillar: "quantum", featured: true,
    speakers: [
      { name: "Greg Dick" },
      { name: "Luke Preskey" },
      { name: "Masahiro Horibe" },
      { name: "Louise Davey" },
    ],
    moderator: { name: "Rajesh Patil" },
  },
  {
    id: "d2-05", day: 2, time: "10:15", endTime: "10:45",
    title: "Risk Pricing and the Hype Gap",
    type: "Panel Session", format: "panel", pillar: "quantum", sector: "fintech",
    speakers: [
      { name: "Chetan Patel" },
      { name: "David Succu" },
      { name: "Heling (Alex) Pu" },
    ],
    moderator: { name: "Louise Davey" },
  },
  {
    id: "d2-06", day: 2, time: "10:45", endTime: "10:55",
    title: "AM Tea Break", type: "Break", format: "break", isBreak: true,
  },
  {
    id: "d2-07", day: 2, time: "10:55", endTime: "11:25",
    title: "Artificial Intelligence Beyond the Pilot Phase",
    type: "Keynote", format: "keynote", pillar: "ai",
    speakers: [{ name: "Daniel Wigdor" }],
  },
  {
    id: "d2-08", day: 2, time: "11:25", endTime: "11:45",
    title: "Who Owns AI Governance?",
    type: "Keynote", format: "keynote", pillar: "ai",
    speakers: [{ name: "Ashley Casovan" }],
  },
  {
    id: "d2-09", day: 2, time: "11:45", endTime: "12:15",
    title: "AI in Financial Services: From Main Street Lending to Wall Street Trading",
    type: "Panel Session", format: "panel", pillar: "ai", sector: "fintech",
    speakers: [
      { name: "Sankar Krishnan" },
      { name: "Hashem Aboulhosn" },
      { name: "Peyman Pardis" },
    ],
    moderator: { name: "Stephanie", org: "Globe and Mail" },
  },
  {
    id: "d2-10", day: 2, time: "12:15", endTime: "12:35",
    title: "Patch Work: A Practitioner's View on Closing the Supply-Chain Security Gap",
    type: "Fireside", format: "fireside", sector: "fintech",
    speakers: [{ name: "Mark Paulsen" }],
    moderator: { name: "Paul Goldman" },
  },
  {
    id: "d2-11", day: 2, time: "12:35", endTime: "13:20",
    title: "Lunch", type: "Lunch Break", format: "networking", isBreak: true,
  },
  {
    id: "d2-12", day: 2, time: "13:20", endTime: "13:35",
    title: "Powering Canada's Digital and Industrial Future: Grid Intelligence, Asset Optimization and Resilience",
    type: "Keynote", format: "keynote", sector: "energy",
    speakers: [{ name: "Delphine Adenot" }],
  },
  {
    id: "d2-13", day: 2, time: "13:35", endTime: "14:05",
    title: "The Regulator's View on Enterprise AI in Canadian Finance",
    type: "Fireside", format: "fireside", pillar: "ai", sector: "fintech",
    speakers: [{ name: "Peter Routledge" }],
    moderator: { name: "April Fong", org: "Globe and Mail" },
  },
  {
    id: "d2-14", day: 2, time: "14:05", endTime: "14:35",
    title: "Can Canada Regulate Its Way to Better Finance?",
    type: "Panel Session", format: "panel", sector: "fintech",
    speakers: [{ name: "TBD" }, { name: "TBD" }],
    moderator: { name: "TBD", org: "TBD" },
  },
  {
    id: "d2-15", day: 2, time: "14:35", endTime: "15:20",
    title: "Clinical AI That Actually Scales",
    type: "Panel Session", format: "panel", pillar: "ai", sector: "healthcare",
    speakers: [
      { name: "Namita Seth Mohta" },
      { name: "Julia Jezmir" },
      { name: "Amy Flood" },
      { name: "Amina Alavi" },
    ],
    moderator: { name: "Laura Cooley" },
  },
  {
    id: "d2-16", day: 2, time: "15:20", endTime: "15:40",
    title: "We Can't Treat What We Can't Find: Closing the Detection Gap in Healthcare",
    type: "Keynote", format: "keynote", sector: "healthcare",
    speakers: [{ name: "Mark Attila Opauszky" }],
  },
  {
    id: "d2-17", day: 2, time: "15:40", endTime: "16:00",
    title: "Tea Break", type: "Break", format: "break", isBreak: true,
  },
  {
    id: "d2-18", day: 2, time: "16:00", endTime: "16:35",
    title: "Closing the Women's Health Gap: Innovation, Investment and the Blueprint for Action",
    type: "Panel Session", format: "panel", sector: "healthcare",
    speakers: [
      { name: "Jo-Anne Ryan" },
      { name: "Dr. Rulan S. Parekh" },
      { name: "Rachel Bartholomew" },
    ],
    moderator: { name: "Amy Flood" },
  },
  {
    id: "d2-19", day: 2, time: "16:35", endTime: "17:05",
    title: "Capital Lifecycle: Raise | Scale | Exit",
    type: "Panel Session", format: "panel", sector: "startups",
    speakers: [
      { name: "Kevin Jia" },
      { name: "Argentina Beltran" },
      { name: "Jasmin Ganie-Hobbs" },
      { name: "TBD" },
    ],
    moderator: { name: "Peter Aceto" },
  },
  {
    id: "d2-20", day: 2, time: "17:05", endTime: "17:20",
    title: "Beyond the Vehicle: Building the Connected, Intelligent, and Sustainable Mobility Systems of Tomorrow",
    type: "Panel Session", format: "panel", sector: "manufacturing",
    speakers: [{ name: "TBD" }, { name: "Vince Cifani" }],
    moderator: { name: "TBD" },
  },
  {
    id: "d2-21", day: 2, time: "17:20", endTime: "17:45",
    title: "The Toronto Declaration on Technology, Trust and Competitiveness",
    type: "Panel Session", format: "panel", featured: true,
    speakers: [
      { name: "Kapidhwaja Singh" },
      { name: "TBD" },
      { name: "Hiten Makim" },
      { name: "Marc Pepin" },
    ],
    moderator: { name: "Jack Greco" },
  },
  {
    id: "d2-22", day: 2, time: "17:45", endTime: "19:15",
    title: "Gala Dinner", type: "Gala", format: "awards", isBreak: true, featured: true,
  },
];

/* ─────────────────────────────────────────────────────────────────
   NAME MATCHING
   The planning sheet and Sanity won't always spell a name the same
   way ("Vic Fedeli" / "Vic Fedelli", "Dr Christian Weedbrook" /
   "Christian Weedbrook"). We normalise both sides and generate a few
   equivalent keys so a photo/link is still found.

   Add an entry to NAME_ALIASES whenever a genuine mismatch appears:
   key = the (normalised) spelling used in the agenda,
   value = the (normalised) spelling used in Sanity.
   ───────────────────────────────────────────────────────────────── */

export const NAME_ALIASES = {
  "vic fedelli": "vic fedeli",
  "geneievve decambra": "genevieve decambra",
  "dave hochhalte": "dave hochhalter",
  "aspuru guzik": "alan aspuru guzik",
  "prof aspuru guzik": "alan aspuru guzik",
  "mathew growdy growden": "mathew growden",
  "daniel wigdor": "daniel vigdor",
};

const TITLES = [
  "the honourable", "brigadier general", "brig gen", "major general",
  "professor", "prof", "doctor", "dr", "hon", "mr", "mrs", "ms", "miss", "sir", "general",
];

export function normalizeName(raw) {
  let n = String(raw || "")
    .replace(/\(.*?\)/g, " ")        // drop "(Mastercard)", "(Alex)"
    .toLowerCase()
    .replace(/[’‘']/g, "")           // Na'im -> naim
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // strip any stacked honorifics from the front
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of TITLES) {
      if (n === t) return "";
      if (n.startsWith(t + " ")) { n = n.slice(t.length + 1); changed = true; }
    }
  }
  return n.trim();
}

/** Equivalent lookup keys for one name. */
export function nameKeys(raw) {
  let n = normalizeName(raw);
  if (NAME_ALIASES[n]) n = normalizeName(NAME_ALIASES[n]);
  if (!n) return [];

  const parts = n.split(" ").filter(Boolean);
  const keys = new Set([n]);

  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    keys.add(first + " " + last);            // drop middle names
    keys.add(parts[0] + " " + parts[1]);     // "baldeep singh pahwa" ~ "baldeep singh"
    keys.add(last + " " + first[0]);         // "pahwa b"
  }
  return Array.from(keys);
}

export function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Build { key -> sanitySpeakerDoc } from a Sanity speaker list. */
export function buildSpeakerIndex(speakerDocs) {
  const index = {};
  (speakerDocs || []).forEach((doc) => {
    nameKeys(doc.name).forEach((k) => {
      if (!index[k]) index[k] = doc;      // first writer wins — keeps it stable
    });
  });
  return index;
}

/** Find the Sanity doc for an agenda name, or null. */
export function matchSpeaker(index, name) {
  if (!index) return null;
  const keys = nameKeys(name);
  for (const k of keys) if (index[k]) return index[k];
  return null;
}

/** Every session a given person appears in (as speaker OR moderator). */
export function sessionsForSpeaker(name) {
  const keys = new Set(nameKeys(name));
  if (!keys.size) return [];
  return SESSIONS.filter((s) => {
    const people = (s.speakers || []).concat(s.moderator ? [s.moderator] : []);
    return people.some((p) => nameKeys(p.name).some((k) => keys.has(k)));
  });
}

/** Role of a person within one session: "speaker" | "moderator" | null */
export function roleInSession(session, name) {
  const keys = new Set(nameKeys(name));
  const isMatch = (p) => p && nameKeys(p.name).some((k) => keys.has(k));
  if ((session.speakers || []).some(isMatch)) return "speaker";
  if (isMatch(session.moderator)) return "moderator";
  return null;
}

export function getDuration(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

/** "14:05" -> "2:05 PM" */
export function formatTime12(t) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
}
