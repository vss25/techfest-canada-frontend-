/* =========================================================
   App configuration (mirrors the iOS AppConfig).
   No secrets: the backend URL and the public Sanity project.
========================================================= */

/** Parts of the app that are switched on in this web release (the rest show "Coming soon"). */
export const FEATURES = { network: true, chats: true, live: true };

export const API = import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
/** Origin of the API, for server paths like /api/files/avatar/<id>. */
export const API_ORIGIN = API.replace(/\/api\/?$/, "");

export const SANITY_QUERY_URL = "https://021qtoci.apicdn.sanity.io/v2021-10-21/data/query/production";

export const EVENT = {
  name: "The Tech Festival Canada",
  shortName: "TTFC 2026",
  tagline: "MEET • BUILD • SCALE",
  venue: "The Westin Harbour Castle",
  city: "Toronto, Canada",
  address: "1 Harbour Square, Toronto, ON M5J 1A6",
};

export const LINKS = {
  website: "https://www.thetechfestival.com",
  tickets: "https://www.thetechfestival.com/tickets",
  privacy: "https://www.thetechfestival.com/privacy",
  venue: "https://www.thetechfestival.com/venue",
  awards: "https://www.thetechfestival.com/awards",
  brochure: "https://www.thetechfestival.com/brochures",
  support: "info@thetechfestival.com",
};

/** Terms + Privacy version the apps record (iOS Consent.version). */
export const CONSENT_VERSION = "2026-10-09";

export const TECH_PILLARS = [
  "Artificial Intelligence",
  "Quantum Computing",
  "Cybersecurity",
  "Robotics & Automation",
  "Sustainability & CleanTech",
];

export const APPLIED_SECTORS = [
  "Healthcare & Lifesciences",
  "Banking, Financial Services & Insurance",
  "Supply Chain, Manufacturing & Infrastructure",
  "Defence & Public Safety",
  "Energy & Utilities",
];

export const STARTUPS_TOPIC = "Startups & Capital";

/** Short forms used in the agenda's tracks ("Quantum × Healthcare"). */
export const TOPIC_SHORT = {
  "Artificial Intelligence": ["AI", "Artificial Intelligence"],
  "Quantum Computing": ["Quantum"],
  "Cybersecurity": ["Cybersecurity"],
  "Robotics & Automation": ["Robotics"],
  "Sustainability & CleanTech": ["Climate Tech", "CleanTech", "Sustainability"],
  "Healthcare & Lifesciences": ["Healthcare"],
  "Banking, Financial Services & Insurance": ["Financial Services"],
  "Supply Chain, Manufacturing & Infrastructure": ["Manufacturing", "Supply Chain"],
  "Defence & Public Safety": ["Public Sector", "Defence"],
  "Energy & Utilities": ["Energy"],
};

export const shortTopic = (t) => TOPIC_SHORT[t]?.[0] || t;

/** Companies the app spotlights per topic (PeopleMatching). */
export const TOPIC_COMPANIES = {
  "Artificial Intelligence": ["IBM Consulting", "Dell Technologies", "NVIDIA", "VAST Data", "Hexaware Technologies", "ADP", "McDonald's", "Pinterest"],
  "Quantum Computing": ["IBM", "Xanadu", "Open Quantum Design", "Broadcom"],
  "Cybersecurity": ["Canadian Cybersecurity Network", "T-Mobile", "Broadcom", "Terranova Aerospace & Defense", "Wells Fargo", "IAPP"],
  "Robotics & Automation": ["Terranova Aerospace & Defense", "Dell Technologies", "DHL"],
  "Sustainability & CleanTech": ["Foresight Canada", "Ontario Centre of Innovation", "BDC"],
  "Healthcare & Lifesciences": ["Public Health Agency of Canada", "NEJM Group", "Hackensack Meridian Health", "Doctors Without Borders", "Sparrow BioAcoustics"],
  "Banking, Financial Services & Insurance": ["JPMorgan Chase & Co.", "Wells Fargo", "Helaba", "BDC", "Kraken", "Marsh", "KPMG"],
  "Supply Chain, Manufacturing & Infrastructure": ["DHL", "Amazon", "International Seaways", "LCBO", "Magna International", "Rockwell Automation"],
  "Defence & Public Safety": ["Global Affairs Canada", "Terranova Aerospace & Defense", "Public Health Agency of Canada"],
  "Energy & Utilities": ["Ontario IESO", "BC Hydro", "Schneider Electric", "Foresight Canada"],
};

export const POST_TAGS = [...TECH_PILLARS, "Networking", "Hiring", "Fundraising"];

/**
 * The passes (Oct 19 2026), same as the apps (iOS TicketTier.key(for:)): Connect, Influence, Power
 * and Apex are sold; the Speaker Pass ("speaker") is internal, never sold or upgraded. Older labels
 * map onto them: "All Access" is the Power Pass, an "Exhibitor Pass" a Connect Pass (exhibitor is a
 * person type), "VIP" Apex. Takes a backend key ("power") or a name ("Power Pass").
 */
export function tierKey(raw = "") {
  const k = String(raw).trim().toLowerCase().replace(/ pass$/, "");
  if (k === "all access" || k === "all-access" || k === "allaccess") return "power";
  if (k === "exhibitor") return "connect";
  if (k === "vip") return "apex";
  return k;
}

/** Pass names (backend tier key → name). */
export function tierName(key = "") {
  const k = tierKey(key);
  if (k === "discover") return "Discover Pass";
  if (k === "connect") return "Connect Pass";
  if (k === "influence") return "Influence Pass";
  if (k === "power") return "Power Pass";
  if (k === "apex") return "Apex Pass";
  if (k === "speaker") return "Speaker Pass";
  if (k === "session") return "Session Pass";
  if (k.startsWith("booth")) return "Exhibition booth"; // a booth, not a pass
  if (!k) return "";
  return k.charAt(0).toUpperCase() + k.slice(1) + " Pass";
}

export function tierRank(key = "") {
  return { discover: 1, connect: 2, influence: 3, power: 4, apex: 5, speaker: 6 }[tierKey(key)] || 0;
}

/** Server file path ("/api/files/avatar/…") or full URL → absolute URL. */
export function fileURL(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("blob:") || path.startsWith("data:")) return path;
  return API_ORIGIN + (path.startsWith("/") ? path : "/" + path);
}
