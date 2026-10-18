import { APPLIED_SECTORS, TECH_PILLARS, TOPIC_COMPANIES, TOPIC_SHORT, shortTopic } from "./config";
import { nameKey } from "./cms";
import { local } from "./store";

/* =========================================================
   Who to meet (iOS PeopleMatching + PeopleRecommender): scores
   the directory against my interests, my role, the sessions I
   saved, the filters I use and the profiles I open. Worked out
   on this device; the signals stay in localStorage.
========================================================= */

const TITLE_KEYWORDS = {
  "Artificial Intelligence": ["Machine Learning", "ML", "GenAI"],
  "Cybersecurity": ["Cyber", "CISO", "Security"],
  "Robotics & Automation": ["Robot", "Robots", "Automation"],
  "Sustainability & CleanTech": ["Climate", "Sustainable"],
  "Healthcare & Lifesciences": ["Health", "Medical", "Biotech", "Pharma"],
  "Banking, Financial Services & Insurance": ["Bank", "Banking", "Fintech", "Insurance"],
  "Supply Chain, Manufacturing & Infrastructure": ["Logistics", "Infrastructure"],
  "Defence & Public Safety": ["Defense", "Government", "Public Safety"],
  "Energy & Utilities": ["Utilities", "Utility"],
};

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** " chief ai officer ": whole-word matching with includes(). */
export const words = (s) => " " + fold(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean).join(" ") + " ";

const COMPANY_WORDS = Object.fromEntries(Object.entries(TOPIC_COMPANIES).map(([t, cs]) => [t, cs.map(words)]));
const KEYWORD_WORDS = Object.fromEntries([...new Set([...Object.keys(TOPIC_COMPANIES), ...Object.keys(TOPIC_SHORT)])]
  .map((t) => [t, [t, ...(TOPIC_SHORT[t] || []), ...(TITLE_KEYWORDS[t] || [])].map(words)]));

/** Points for one topic: listed (3), works at a spotlight company (2), title / company / tagline mentions it (1). */
export function topicPoints(p, topic) {
  let pts = 0;
  const t = words(topic);
  if ((p.topics || []).some((x) => words(x) === t)) pts += 3;
  const org = words(p.organization);
  if (org.length > 4 && (COMPANY_WORDS[topic] || []).some((c) => org.includes(c) || c.includes(org))) pts += 2;
  const text = words([p.jobTitle, p.organization, p.tagline].join(" "));
  if ((KEYWORD_WORDS[topic] || [t]).some((k) => text.includes(k))) pts += 1;
  return pts;
}

export const roleWords = (title) => {
  const filler = new Set(["of", "and", "the", "for", "at", "in", "to", "a", "an", "&", "sr", "jr", "ii", "iii", "co"]);
  return fold(title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !filler.has(w));
};

// ---------- Signals ----------

const SIG_KEY = "ttfc.reco.signals.v1";
const loadSignals = () => local.json(SIG_KEY, { filterTopics: {}, filterCompanies: {}, viewedWords: {}, viewedTopics: {} });
const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };

export const recoSignals = {
  usedTopic(topic) { const s = loadSignals(); bump(s.filterTopics, topic); local.setJSON(SIG_KEY, s); },
  usedCompany(company) { const s = loadSignals(); bump(s.filterCompanies, company); local.setJSON(SIG_KEY, s); },
  viewed(p) {
    const s = loadSignals();
    for (const w of roleWords(p.jobTitle)) bump(s.viewedWords, w);
    for (const t of p.topics || []) bump(s.viewedTopics, t);
    local.setJSON(SIG_KEY, s);
  },
};

const list = (items) => {
  const a = items.slice(0, 3);
  if (a.length <= 1) return a[0] || "";
  return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
};

/**
 * recommend(people, me, { connectedIds, canContact, isBlocked }) → [{ person, score, reasons }]
 * me: { id, topics, jobTitle, organization, tagline, savedSessions, savedSpeakerKeys: Map(nameKey → session title) }
 */
export function recommend(people, me, { connectedIds = new Set(), canContact = () => true, isBlocked = () => false } = {}) {
  const sig = loadSignals();
  const all = [...TECH_PILLARS, ...APPLIED_SECTORS];
  const meCard = { jobTitle: me.jobTitle, organization: me.organization, tagline: me.tagline, topics: [] };
  const inferred = all.filter((t) => !me.topics.includes(t) && topicPoints(meCard, t) > 0);
  const myRole = new Set(roleWords(me.jobTitle));
  const sessionTopics = {};
  for (const s of me.savedSessions) for (const t of s.topics) sessionTopics[t] = (sessionTopics[t] || 0) + 1;
  const out = [];
  for (const p of people) {
    if (p.id === me.id || p.onApp === false || connectedIds.has(p.id) || p.kind === "staff" || p.kind === "volunteer" || isBlocked(p.id) || !canContact(p)) continue;
    const parts = [];
    const shared = me.topics.filter((t) => topicPoints(p, t) > 0);
    if (shared.length) parts.push([shared.reduce((a, t) => a + topicPoints(p, t), 0) * 2, "Shares your interest in " + list(shared.map(shortTopic))]);
    const fromRole = inferred.filter((t) => topicPoints(p, t) > 0);
    if (fromRole.length) parts.push([fromRole.length * 2, "Works on " + list(fromRole.map(shortTopic)) + ", close to your role"]);
    const peer = roleWords(p.jobTitle).filter((w) => myRole.has(w));
    if (peer.length) parts.push([Math.min(new Set(peer).size, 2), "A similar role to yours"]);
    const savedTitle = me.savedSpeakerKeys.get(nameKey(p.name));
    if (savedTitle) parts.push([10, `Speaking at "${savedTitle}", which you saved`]);
    const fromSessions = Object.keys(sessionTopics).filter((t) => topicPoints(p, t) > 0).sort((a, b) => sessionTopics[b] - sessionTopics[a]);
    if (fromSessions.length) {
      const pts = Math.min(fromSessions.reduce((a, t) => a + Math.min(sessionTopics[t], 3), 0) * 2, 8);
      parts.push([pts, "Into " + list(fromSessions.slice(0, 2).map(shortTopic)) + ", like sessions you saved"]);
    }
    const filtered = Object.entries(sig.filterTopics).filter(([t]) => topicPoints(p, t) > 0);
    if (filtered.length) {
      const top = filtered.reduce((a, b) => (b[1] > a[1] ? b : a));
      parts.push([filtered.reduce((a, [, n]) => a + Math.min(n, 3), 0) * 2, `Matches the ${shortTopic(top[0])} filter you use`]);
    }
    const company = Object.entries(sig.filterCompanies).find(([c]) => p.organization && c.toLowerCase() === p.organization.toLowerCase());
    if (company) parts.push([Math.min(company[1], 3) * 3, `Works at ${p.organization}, a company you looked up`]);
    const browsed = roleWords(p.jobTitle).reduce((a, w) => a + Math.min(sig.viewedWords[w] || 0, 2), 0) + (p.topics || []).reduce((a, t) => a + Math.min(sig.viewedTopics[t] || 0, 1), 0);
    if (browsed > 0) parts.push([Math.min(browsed, 4), "Similar to people you've viewed"]);
    const score = parts.reduce((a, [n]) => a + n, 0);
    if (score < 3) continue;
    out.push({ person: p, score, reasons: parts.sort((a, b) => b[0] - a[0]).map(([, r]) => r) });
  }
  return out.sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name)).slice(0, 20);
}

// ---------- Meeting availability (iOS MeetingSlots) ----------

const SLOT_DAYS = [[1, "Oct 26"], [2, "Oct 27"]];
const SLOT_BLOCKS = [[8, "8–10 AM"], [10, "10 AM–12 PM"], [12, "12–2 PM"], [14, "2–4 PM"], [16, "4–6 PM"], [18, "6–8 PM"]];

/** ["d1-10", "d2-14"] → "Oct 26: 10 AM–12 PM · Oct 27: 2–4 PM" */
export function slotSummary(slots = []) {
  const set = new Set(slots);
  return SLOT_DAYS.map(([d, label]) => {
    const times = SLOT_BLOCKS.filter(([h]) => set.has(`d${d}-${String(h).padStart(2, "0")}`)).map(([, l]) => l);
    return times.length ? `${label}: ${times.join(", ")}` : null;
  }).filter(Boolean).join(" · ");
}
