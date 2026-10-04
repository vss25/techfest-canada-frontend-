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
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "robotics", label: "Robotics" },
  { value: "climate", label: "Climate Tech" },
];

export const SECTORS = [
  { value: "fintech", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare & Life Sci" },
  { value: "energy", label: "Energy & Infrastructure" },
  { value: "manufacturing", label: "Manufacturing & Supply" },
  { value: "public", label: "Public Sector & Defence" },
  { value: "startups", label: "Startups & Capital" },
];

export const SESSION_TYPE_SUGGESTIONS = [
  "Keynote", "Fireside Chat", "Panel Session", "Opening Remarks", "Break", "Lunch Break", "Awards", "Gala", "Performance", "Keynote / Presentation",
];
