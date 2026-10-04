/* Human labels for the Sanity content the panel edits.
   Values must match techfest-canada-backend services/cmsSchema.js. */

export const SPEAKER_TYPES = [
  { value: "speaker", label: "Speaker" },
  { value: "keynote", label: "Keynote" },
  { value: "panelist", label: "Panelist" },
  { value: "moderator", label: "Moderator" },
];

export const TECH_PILLARS = [
  { value: "ai", label: "Artificial Intelligence" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "cloud-data", label: "Cloud & Data" },
  { value: "emerging-tech", label: "Emerging Tech" },
];

export const SECTORS = [
  { value: "healthcare-life-sci", label: "Healthcare & Life Sci" },
  { value: "manufacturing-supply", label: "Manufacturing & Supply" },
  { value: "government", label: "Government & Public Sector" },
  { value: "financial-services", label: "Financial Services" },
  { value: "energy", label: "Energy & Sustainability" },
  { value: "media", label: "Media & Entertainment" },
];

export const PARTNER_CATEGORIES = [
  { value: "partnersAndSupporters", label: "Our Partners and Supporters" },
  { value: "governmentPartners", label: "Government Partners" },
  { value: "industryAssociates", label: "Industry Associates" },
  { value: "academicResearchInstitutions", label: "Academic and Research Institutions" },
  { value: "corporateEnterprisePartners", label: "Corporate and Enterprise Partners" },
  { value: "startupEcosystemPartners", label: "Startup and Ecosystem Partners" },
  { value: "internationalTradeBodies", label: "International Trade Bodies" },
  { value: "other", label: "Other" },
];

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label || value || "";

export const LIVE_NOTE = "Changes appear on the website and the iOS app within about a minute.";
