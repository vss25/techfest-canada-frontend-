/**
 * Partners page matrix: the 5 tech pillars × 5 applied sectors from the
 * home page ("Beyond Theory"), plus paid partners on top.
 *
 * A partner's group comes from its `matrixGroup` field (set in the admin
 * panel) or, failing that, from DEFAULT_GROUPS below (keyed by Sanity _id).
 * Anything unmapped lands in "ecosystem". Order inside a group = the
 * partner's Display order in the admin panel (ranked by recognition).
 */

export var FEATURED_GROUP = { key: "featured", title: "Featured Partners", iconName: "star" };

export var PILLAR_GROUPS = [
  { key: "ai", title: "Artificial Intelligence", iconName: "cpu" },
  { key: "quantum", title: "Quantum Computing", iconName: "atom" },
  { key: "cyber", title: "Cybersecurity", iconName: "lock" },
  { key: "robotics", title: "Robotics & Automation", iconName: "settings" },
  { key: "cleantech", title: "Sustainability & CleanTech", iconName: "leaf" },
];

export var SECTOR_GROUPS = [
  { key: "health", title: "Healthcare & Lifesciences", iconName: "heart" },
  { key: "bfsi", title: "Banking, Financial Services & Insurance", iconName: "building" },
  { key: "supply", title: "Supply Chain, Manufacturing & Infrastructure", iconName: "tool" },
  { key: "defence", title: "Defence & Public Safety", iconName: "shield" },
  { key: "energy", title: "Energy & Utilities", iconName: "zap" },
];

export var ECOSYSTEM_GROUP = { key: "ecosystem", title: "Ecosystem & Media", iconName: "users" };

export var MATRIX_GROUP_KEYS = [FEATURED_GROUP.key]
  .concat(PILLAR_GROUPS.map(function (g) { return g.key; }))
  .concat(SECTOR_GROUPS.map(function (g) { return g.key; }))
  .concat([ECOSYSTEM_GROUP.key]);

var DEFAULT_GROUPS = {
  // Paid partners
  "pd7BC9mehWAqIUtnYVm0zi": "featured", // NuPort Robotics
  "2datpkVcvmhpv74vwA0HS5": "featured", // Kosim Robotics
  "82f1d0a0-0167-479a-94e3-4b9ffeefb24d": "featured", // Dell Technologies
  "inoqRsrtOZgDGk9v20EIqV": "featured", // Paragon Micro

  // Artificial Intelligence
  "dd18693d-bf75-4f53-8f87-3386a71d7cdc": "ai", // Amazon
  "86d0fe21-a629-4d8e-94ee-e311fcb5839c": "ai", // NVIDIA
  "9ca998f5-01c9-461f-909b-4090ed993f1a": "ai", // Pinterest
  "43301b44-ee7e-4b4e-a692-b789a524f5de": "ai", // AI Collective
  "44127cd8-4b59-4c0e-938e-2bee3b9f649c": "ai", // Iris Software
  "137ae343-b5ef-44ad-97b5-c85d75b61b6e": "ai", // Fusion Collective
  "inoqRsrtOZgDGk9v20m52d": "ai", // Transient.AI

  // Quantum Computing
  "497f0323-55b9-4312-ab80-41d6b6f2e21f": "quantum", // IBM
  "937f47a8-925f-465c-a375-6775d01bbf7e": "quantum", // Xanadu
  "6be704cd-d688-48db-8132-231dea0e4629": "quantum", // Open Quantum Design

  // Cybersecurity
  "02fd4302-1aeb-4e60-af63-6000d93487a6": "cyber", // T-Mobile
  "7a1749f1-1672-4f32-a48c-e9477a643057": "cyber", // Broadcom
  "8db8be43-c4e3-42cf-acc4-4c4b06d85a17": "cyber", // VMware
  "66081f1a-33b8-48c1-ab45-f65a257a9f84": "cyber", // IAPP
  "71b1b433-fe17-45a7-a64d-e70d92e94ae3": "cyber", // Office of the Privacy Commissioner
  "59cbb2f2-42d7-4933-82ee-e9451058f7ca": "cyber", // Canadian Cybersecurity Network

  // Robotics & Automation
  "87948a93-aa30-40e6-ae60-37545a499266": "robotics", // Rockwell Automation
  "bdbf4607-9fe7-42d1-a447-5870d6eecba8": "robotics", // Magna International

  // Sustainability & CleanTech
  "0c431feb-2264-437d-946e-45e7a1c0b2ce": "cleantech", // Foresight Canada
  "f8bfcda1-124a-4876-9b36-f757578371c9": "cleantech", // Sparrow BioAcoustics

  // Healthcare & Lifesciences
  "1ac09184-b8b6-4928-a4dd-c2b23a41b863": "health", // NYU
  "09b43bd1-5c5c-42db-9b18-a75e66f06d19": "health", // Public Health Agency of Canada
  "e7c240d2-209b-485d-a03a-5725a926b1fe": "health", // NEJM Group
  "3efeae95-41b2-4097-8fa4-d9bd217dc321": "health", // Hackensack Meridian Health
  "4650ab3e-8744-4b17-8b96-d92493150960": "health", // Doctors Without Borders

  // Banking, Financial Services & Insurance
  "5f094168-aa35-4eb1-8dac-2491ff399955": "bfsi", // JPMorgan Chase
  "2f11b483-319d-4655-b317-d07b5852156b": "bfsi", // Wells Fargo
  "cf9bff15-e936-40ec-b026-a0490f67f77f": "bfsi", // KPMG
  "pd7BC9mehWAqIUtnY3AQ6q": "bfsi", // Scotiabank
  "9ae8fe00-ceb6-450f-92bb-a06843d6fe9a": "bfsi", // ADP
  "77f2b329-2563-4807-b3bc-511083c8aaa1": "bfsi", // Kraken
  "66f7be37-b70a-48df-8d50-56d6db9252b8": "bfsi", // Marsh
  "e17dc876-fb51-4a39-956e-a0751671c6d7": "bfsi", // BDC
  "fec07bc0-7848-4c32-b6a9-906e2e90c1ef": "bfsi", // OSFI
  "d9f43486-af78-403b-ad8f-54b63f978947": "bfsi", // Helaba
  "d39550b0-2afc-4c2e-bb68-b561a35764d9": "bfsi", // National Association of Corporate Directors
  "ba3a03e2-f02b-4d3e-a469-841ffc04a4de": "bfsi", // MetaFundWe
  "a8faad01-28be-4354-99bc-df595bc2733e": "bfsi", // Branksome Consulting & Ventures

  // Supply Chain, Manufacturing & Infrastructure
  "7aa809da-7a3b-4c84-8474-f3797e6e7c11": "supply", // DHL
  "f7800bb4-396e-4dfc-b08d-30f4bbebff45": "supply", // International Seaways

  // Defence & Public Safety
  "4165aaf8-4cf5-42f7-8c38-0dffd914d40d": "defence", // CIA
  "754187ad-62f7-40e6-9dfb-14264577653b": "defence", // Global Affairs Canada
  "915ff467-5613-4b57-a029-1551d23cbf84": "defence", // Terranova Aerospace & Defense

  // Energy & Utilities
  "f9fbb802-0fe8-47ba-baa4-62f5c809536a": "energy", // Schneider Electric

  // Ecosystem & Media
  "286b016f-0570-43b1-b0b9-3159f93e56fb": "ecosystem", // World Economic Forum
  "4b6717c0-4911-4be7-a000-e47f0ef2732d": "ecosystem", // CBC
  "144e1c68-61b7-4b45-957c-4ee7e35a2d00": "ecosystem", // The Christy Clark Show
  "3a8f6255-cd59-4ee0-ac9e-d1122206b084": "ecosystem", // Canada Startup Association
  "fccf4690-8d30-4273-a70c-ff41ca15408b": "ecosystem", // RTM Nexus
  "446fe914-8f6e-4342-8310-0864c98953dd": "ecosystem", // 1000 Days Out
};

export function matrixGroupOf(partner) {
  var g = partner && partner.matrixGroup;
  if (g && MATRIX_GROUP_KEYS.indexOf(g) !== -1) return g;
  return DEFAULT_GROUPS[partner && partner._id] || ECOSYSTEM_GROUP.key;
}
