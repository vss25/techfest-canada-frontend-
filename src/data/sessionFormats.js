// Session formats: label + colours used on the public Agenda page and the admin panel.
// Values must match the backend's SESSION_FORMATS (services/cmsSchema.js).
export const FORMAT_MAP = {
  networking:  { label: "Networking",          bg: "#3fd19c22", bgL: "#1a9e7022", tc: "#3fd19c", tcL: "#1a9e70" },
  keynote:     { label: "Keynote",             bg: "#b99eff22", bgL: "#7a3fd122", tc: "#b99eff", tcL: "#7a3fd1" },
  fireside:    { label: "Fireside",            bg: "#f5a62322", bgL: "#c4780a22", tc: "#f5a623", tcL: "#c4780a" },
  briefing:    { label: "Boardroom Briefing",  bg: "#56b3f522", bgL: "#1878c222", tc: "#56b3f5", tcL: "#1878c2" },
  panel:       { label: "Panel",               bg: "#f57eb322", bgL: "#c2287a22", tc: "#f57eb3", tcL: "#c2287a" },
  provocation: { label: "Provocation",         bg: "#f5a62322", bgL: "#c4780a22", tc: "#f5a623", tcL: "#c4780a" },
  break:       { label: "Break",               bg: "#88888818", bgL: "#88888818", tc: "#aaa",    tcL: "#777"    },
  awards:      { label: "Awards / Gala",       bg: "#f5c84222", bgL: "#d4970022", tc: "#f5c842", tcL: "#d49700" },
  opening:     { label: "Opening",             bg: "#b99eff22", bgL: "#7a3fd122", tc: "#b99eff", tcL: "#7a3fd1" },
  dialogue:    { label: "Leadership Dialogue", bg: "#56b3f522", bgL: "#1878c222", tc: "#56b3f5", tcL: "#1878c2" },
  closing:     { label: "Closing",             bg: "#b99eff22", bgL: "#7a3fd122", tc: "#b99eff", tcL: "#7a3fd1" },
  Performance: { label: "Performance",         bg: "#f57eb322", bgL: "#c2287a22", tc: "#f57eb3", tcL: "#c2287a" },
};

/** Format keys in a sensible order for pickers. */
export const FORMAT_KEYS = ["opening", "keynote", "fireside", "panel", "briefing", "provocation", "dialogue", "networking", "break", "awards", "closing", "Performance"];

export const PILLARS = [
  { value: "ai", label: "AI / ML" },
  { value: "quantum", label: "Quantum" },
  { value: "cybersecurity", label: "Cybersecurity & Digital Trust" },
  { value: "robotics", label: "Robotics" },
  { value: "climate", label: "Clean Tech" },   // stored key stays "climate" (saved sessions keep matching); shown as Clean Tech
];

export const SECTORS = [
  { value: "fintech", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare & Life Sci" },
  { value: "energy", label: "Energy & Infrastructure" },
  { value: "manufacturing", label: "Manufacturing & Supply" },
  { value: "public", label: "Public Sector & Defence" },
  { value: "startups", label: "Startups & Capital" },
];

/* The agenda's "Session type" dropdown (Nov 25 2026): staff edit the list in Admin › Agenda › Session types
   (backend /api/console/agenda-types). Each type is a label (what the website shows) and a colour style
   (a FORMAT_MAP key). This is the standard list, the same as the backend's DEFAULT_TYPES (services/agendaTypes.js),
   used until the list is first saved or while it can't be loaded. */
export const DEFAULT_SESSION_TYPES = [
  { label: "Opening Remarks", format: "opening" },
  { label: "Keynote", format: "keynote" },
  { label: "Fireside Chat", format: "fireside" },
  { label: "Panel Session", format: "panel" },
  { label: "Boardroom Briefing", format: "briefing" },
  { label: "Provocation", format: "provocation" },
  { label: "Leadership Dialogue", format: "dialogue" },
  { label: "Case Study", format: "briefing" },
  { label: "Roundtable", format: "dialogue" },
  { label: "Workshop", format: "briefing" },
  { label: "Networking", format: "networking" },
  { label: "Break", format: "break" },
  { label: "Lunch Break", format: "break" },
  { label: "Reception", format: "networking" },
  { label: "Awards", format: "awards" },
  { label: "Gala", format: "awards" },
  { label: "Performance", format: "Performance" },
  { label: "Closing Remarks", format: "closing" },
];
