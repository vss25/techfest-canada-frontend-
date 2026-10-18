import { SANITY_QUERY_URL, TOPIC_COMPANIES } from "./config";
import { clock12, parseClock, torontoDate, EVENT_START, EVENT_END } from "./time";
import { createStore, local } from "./store";

/* =========================================================
   Agenda, speakers and partners, live from the website's CMS
   (the same Sanity queries as the iOS SessionService,
   SpeakerService and PartnerService). The last good copy is
   kept in localStorage (and the service worker caches the
   responses), so the Schedule works offline.
========================================================= */

const Q_SESSIONS = `*[_type=="session" && !(_id in path("drafts.**"))]|order(day asc, time asc){_id,sessionId,day,time,endTime,title,type,format,featured,isBreak,pillar,sector,stage,description,speakers[]{name,org},moderator{name,org},polls,qa}`;
const Q_SPEAKERS = `*[_type=="speaker" && !(_id in path("drafts.**"))]|order(order asc, coalesce(rowPosition,9999) asc){_id,name,title,company,bio,linkedin,speakerType,techPillar,sector,featured,"imageUrl":image.asset->url,"crop":image.crop,"hotspot":image.hotspot,"dims":image.asset->metadata.dimensions}`;
const Q_PARTNERS = `*[_type=="partner" && active==true]|order(category asc, order asc, name asc){name,category,order,"website":coalesce(url, website),displayName,logoScale,"logo":logo.asset->url}`;

const CACHE = { sessions: "ttfc.cms.sessions", speakers: "ttfc.cms.speakers", partners: "ttfc.cms.partners" };

// ---------- Session types ----------

export const SESSION_TYPES = {
  keynote: { label: "Keynote", icon: "mic" },
  panel: { label: "Panel", icon: "users" },
  fireside: { label: "Fireside", icon: "flame" },
  briefing: { label: "Boardroom Briefing", icon: "briefcase" },
  provocation: { label: "Provocation", icon: "zap" },
  dialogue: { label: "Leadership Dialogue", icon: "messages" },
  workshop: { label: "Workshop", icon: "hammer" },
  ceremony: { label: "Ceremony", icon: "trophy" },
  break: { label: "Networking Break", icon: "coffee" },
};

function typeFor(c) {
  if (c.isBreak) return "break";
  const f = String(c.format || "").toLowerCase();
  if (f === "keynote") return "keynote";
  if (f === "fireside") return "fireside";
  if (f === "panel") return "panel";
  if (f === "briefing") return "briefing";
  if (f === "provocation") return "provocation";
  if (f === "dialogue") return "dialogue";
  if (f === "break" || f === "networking") return "break";
  return "ceremony";
}

const PILLAR_LABEL = { ai: "Artificial Intelligence", quantum: "Quantum", cybersecurity: "Cybersecurity", robotics: "Robotics", climate: "Climate Tech" };
const SECTOR_LABEL = { fintech: "Financial Services", healthcare: "Healthcare", energy: "Energy", manufacturing: "Manufacturing", public: "Public Sector", startups: "Startups" };
const PILLAR_TOPIC = { ai: "Artificial Intelligence", quantum: "Quantum Computing", cybersecurity: "Cybersecurity", robotics: "Robotics & Automation", climate: "Sustainability & CleanTech" };
const SECTOR_TOPIC = {
  fintech: "Banking, Financial Services & Insurance", healthcare: "Healthcare & Lifesciences", energy: "Energy & Utilities",
  manufacturing: "Supply Chain, Manufacturing & Infrastructure", public: "Defence & Public Safety", startups: "Startups & Capital",
};

function trackLabel(c) {
  const p = [PILLAR_LABEL[c.pillar], SECTOR_LABEL[c.sector]].filter(Boolean);
  if (p.length) return p.join(" · ");
  return typeFor(c) === "break" ? "Networking" : "Plenary";
}

// ---------- Names (iOS SpeakerMatching, website src/data/agenda.js) ----------

const ALIASES = {
  "vic fedelli": "vic fedeli", "geneievve decambra": "genevieve decambra", "dave hochhalte": "dave hochhalter",
  "aspuru guzik": "alan aspuru guzik", "prof aspuru guzik": "alan aspuru guzik", "mathew growdy growden": "mathew growden",
  "daniel wigdor": "daniel vigdor",
};
const TITLES = ["the honourable", "brigadier general", "brig gen", "major general", "professor", "prof", "doctor", "dr", "hon", "mr", "mrs", "ms", "miss", "sir", "general"];

export function normalizeName(raw) {
  let n = String(raw || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\(.*?\)/g, " ").replace(/[’‘']/g, "").replace(/[^a-z\s-]/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();
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

export function nameKeys(raw) {
  let n = normalizeName(raw);
  if (ALIASES[n]) n = normalizeName(ALIASES[n]);
  if (!n) return [];
  const parts = n.split(" ");
  const out = [n];
  if (parts.length >= 2) {
    const first = parts[0], last = parts[parts.length - 1];
    for (const k of [`${first} ${last}`, `${parts[0]} ${parts[1]}`, `${last} ${first[0]}`]) if (!out.includes(k)) out.push(k);
  }
  return out;
}

export const nameKey = (name) => normalizeName(name).replace(/[^a-z]/g, "");

// ---------- Speakers ----------

function photoURL(c) {
  if (!c.imageUrl) return "";
  let params = "w=400&h=400&fit=crop&auto=format";
  const crop = c.crop, d = c.dims;
  if (crop && d?.width && d?.height) {
    const W = d.width, H = d.height;
    const l = (crop.left || 0) * W, t = (crop.top || 0) * H;
    const w = W * (1 - (crop.left || 0) - (crop.right || 0)), h = H * (1 - (crop.top || 0) - (crop.bottom || 0));
    if (w > 1 && h > 1) params = `rect=${Math.round(l)},${Math.round(t)},${Math.round(w)},${Math.round(h)}&` + params;
  }
  if (c.hotspot?.x != null && c.hotspot?.y != null) params += `&crop=focalpoint&fp-x=${c.hotspot.x}&fp-y=${c.hotspot.y}`;
  else params += "&crop=entropy";
  return `${c.imageUrl}?${params}`;
}

const SPEAKER_PILLAR = { ai: "Artificial Intelligence", cybersecurity: "Cybersecurity", "cloud-data": "Artificial Intelligence", "emerging-tech": "Quantum Computing" };
const SPEAKER_SECTOR = {
  "healthcare-life-sci": "Healthcare & Lifesciences", "manufacturing-supply": "Supply Chain, Manufacturing & Infrastructure",
  government: "Defence & Public Safety", "financial-services": "Banking, Financial Services & Insurance", energy: "Energy & Utilities",
};

function mapSpeakers(raw) {
  const seen = new Set();
  return (raw || []).map((c) => {
    const name = String(c.name || "").trim();
    if (!name || seen.has(c._id)) return null;
    seen.add(c._id);
    const title = String(c.title || "").trim(), company = String(c.company || "").trim();
    const topics = [SPEAKER_PILLAR[c.techPillar], SPEAKER_SECTOR[c.sector]].filter(Boolean);
    return {
      id: c._id, name, title, company,
      bio: c.bio || [title, company].filter(Boolean).join(" at ") + ". Speaking at The Tech Festival Canada 2026.",
      linkedin: c.linkedin || "", photo: photoURL(c), topics,
      isKeynote: c.speakerType === "keynote" || c.featured === true,
    };
  }).filter(Boolean);
}

// ---------- Sessions ----------

function mapSessions(raw, speakers) {
  const index = new Map();
  for (const s of speakers) for (const k of nameKeys(s.name)) if (!index.has(k)) index.set(k, s.id);
  const extras = new Map();
  const idFor = (p) => {
    const name = String(p?.name || "").trim();
    if (!name) return null;
    for (const k of nameKeys(name)) if (index.has(k)) return index.get(k);
    const id = "agenda-" + nameKey(name);
    if (!extras.has(id)) extras.set(id, { id, name, title: "", company: p.org || "", bio: "Speaking at The Tech Festival Canada 2026.", photo: "", topics: [], isKeynote: false, agendaOnly: true });
    return id;
  };
  const sessions = (raw || []).map((c) => {
    if (!c.day || !c.time || !c.endTime || !c.title) return null;
    const ids = (c.speakers || []).map(idFor).filter(Boolean);
    let desc = String(c.description || "").trim();
    const modName = String(c.moderator?.name || "").trim();
    if (modName) {
      const mid = idFor(c.moderator);
      if (mid && !ids.includes(mid)) ids.push(mid);
      if (!desc.includes(modName)) desc += (desc ? "\n\n" : "") + `Moderated by ${modName}.`;
    }
    const type = typeFor(c);
    if (!desc) desc = [c.type, trackLabel(c)].filter(Boolean).join(" · ");
    const startTime = clock12(c.time), endTime = clock12(c.endTime);
    const st = parseClock(startTime), en = parseClock(endTime);
    const dayNum = c.day === 1 ? 26 : 27;
    return {
      id: c.sessionId || c._id, cmsId: c._id, title: c.title, description: desc, day: c.day,
      startTime, endTime, stage: c.stage || "Centre Stage · Harbour Ballroom", track: trackLabel(c),
      speakerIds: [...new Set(ids)], type, topics: [PILLAR_TOPIC[c.pillar], SECTOR_TOPIC[c.sector]].filter(Boolean),
      pollsMode: c.polls || "auto", qaMode: c.qa || "auto", hasModerator: !!modName,
      start: torontoDate(dayNum, st.h, st.m).getTime(), end: torontoDate(dayNum, en.h, en.m).getTime(),
    };
  }).filter(Boolean);
  return { sessions, extras: [...extras.values()] };
}

// ---------- Partners ----------

const PARTNER_NAMES = {
  hackensack: "Hackensack Meridian Health", nejm: "NEJM Group", nyu: "NYU", dell: "Dell Technologies", amazon: "Amazon", broadcom: "Broadcom",
  cbc: "CBC/Radio-Canada", dhl: "DHL", helaba: "Helaba", hexaware: "Hexaware Technologies", ibm: "IBM", "intl seaways inc.": "International Seaways",
  christy: "The Christy Clark Show", jpmorgan: "JPMorgan Chase & Co.", kpmg: "KPMG", "lawrence harvey": "Lawrence Harvey", "mc'd": "McDonald's",
  pint: "Pinterest", tmobile: "T-Mobile", vm: "VMware", "wells fargo": "Wells Fargo", adp: "ADP", osif: "Office of the Superintendent of Financial Institutions",
  "public health agency of canada": "Public Health Agency of Canada", bdc: "BDC", "global affairs canada": "Global Affairs Canada",
  "canadian cybersecurity network": "Canadian Cybersecurity Network", "national association of corporate directors": "National Association of Corporate Directors",
  "ai collective": "The AI Collective", iris: "Iris Software", "rtm nexus": "RTM Nexus", "doc without border": "Doctors Without Borders",
  wef: "World Economic Forum", iapp: "IAPP", oqd: "Open Quantum Design", nvidia: "NVIDIA", "rockwell automation": "Rockwell Automation",
  xanadu: "Xanadu", kraken: "Kraken", "magna international": "Magna International", marsh: "Marsh", "1000 days out": "1000 Days Out",
  "fusion collective": "Fusion Collective", "worktango inc.": "WorkTango", branksome: "Branksome Hall", csa: "Canada Startup Association",
  foresight: "Foresight Canada", metafundwe: "MetaFundWe", schneider: "Schneider Electric", sparrow: "Sparrow BioAcoustics", terranova: "Terranova Aerospace & Defense",
};
const CATEGORY_LABEL = {
  corporateEnterprisePartners: "Corporate", startupEcosystemPartners: "Startups", governmentPartners: "Government",
  industryAssociates: "Associations", academicResearchInstitutions: "Academia & research", internationalTradeBodies: "International",
  partnersAndSupporters: "Partners",
};
export const partnerKey = (s) => (String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0] || "");

function mapPartners(raw) {
  return (raw || []).map((p) => {
    const name = p.name || "";
    const display = p.displayName || PARTNER_NAMES[name.toLowerCase()] || name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const topics = Object.entries(TOPIC_COMPANIES).filter(([, cs]) => cs.some((c) => c === display || partnerKey(c) === partnerKey(display))).map(([t]) => t);
    return {
      id: name + (p.category || ""), name, displayName: display, category: p.category || "other",
      categoryLabel: CATEGORY_LABEL[p.category] || "Supporters", website: p.website || "",
      logo: p.logo ? `${p.logo}?h=160&fit=max&fm=png` : "", scale: Math.min(2.5, Math.max(0.3, (Number(p.logoScale) || 100) / 100)), topics,
    };
  });
}

// ---------- Store ----------

function initial() {
  const rawSpeakers = local.json(CACHE.speakers, []);
  const speakers = mapSpeakers(rawSpeakers);
  const { sessions, extras } = mapSessions(local.json(CACHE.sessions, []), speakers);
  return { sessions, speakers, extras, partners: mapPartners(local.json(CACHE.partners, [])), loaded: sessions.length > 0, live: false, error: false, at: 0 };
}

export const cms = createStore(initial());

async function query(q) {
  const res = await fetch(`${SANITY_QUERY_URL}?query=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`CMS ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

let inflight = null;
/** Re-reads the CMS. Keeps the cached copy if the network fails. */
export function refreshCMS({ force = false } = {}) {
  const s = cms.get();
  if (!force && s.live && Date.now() - s.at < 120000) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [rs, rk, rp] = await Promise.all([query(Q_SESSIONS), query(Q_SPEAKERS), query(Q_PARTNERS).catch(() => null)]);
      const speakers = rk.length ? mapSpeakers(rk) : cms.get().speakers;
      if (rk.length) local.setJSON(CACHE.speakers, rk);
      let next = { speakers, live: true, error: false, at: Date.now(), loaded: true };
      if (rs.length) {
        local.setJSON(CACHE.sessions, rs);
        Object.assign(next, mapSessions(rs, speakers));
      }
      if (rp && rp.length) {
        local.setJSON(CACHE.partners, rp);
        next.partners = mapPartners(rp);
      }
      cms.set(next);
    } catch {
      cms.set({ error: true, loaded: true });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ---------- Lookups ----------

export function speakerById(id, state = cms.get()) {
  if (!id) return null;
  const clean = String(id).replace(/^cms-/, "");
  return state.speakers.find((s) => s.id === clean) || state.extras.find((s) => s.id === clean) || null;
}

export function speakerByName(name, state = cms.get()) {
  const keys = nameKeys(name);
  if (!keys.length) return null;
  return state.speakers.find((s) => nameKeys(s.name).some((k) => keys.includes(k))) || null;
}

export const sessionById = (id, state = cms.get()) => state.sessions.find((s) => s.id === id || s.cmsId === id) || null;
export const sessionsForDay = (day, state = cms.get()) => state.sessions.filter((s) => s.day === day);
export const sessionsForSpeaker = (id, state = cms.get()) => state.sessions.filter((s) => s.speakerIds.includes(id));
export const isProgramme = (s) => s.type !== "break";
export const typeLabel = (s) => SESSION_TYPES[s.type]?.label || "Session";
export const dayLabel = (s) => (s.day === 1 ? "Mon, Oct 26" : "Tue, Oct 27");
export const timeRange = (s) => `${s.startTime} – ${s.endTime}`;

/** The room, only when it isn't the main stage. */
export function roomOf(stage) {
  const s = String(stage || "").trim(), l = s.toLowerCase();
  if (!s || l.includes("centre stage") || l.includes("center stage") || l.includes("main stage") || l === "harbour ballroom") return null;
  return s;
}

// ---------- Live polls / Q&A ----------

const LIVE_PAD = 10 * 60 * 1000;
export const liveWindow = (s) => [s.start - LIVE_PAD, s.end + LIVE_PAD];
export const isLiveWindow = (s, at) => at >= s.start - LIVE_PAD && at <= s.end + LIVE_PAD;
export const minutesUntilLive = (s, at) => Math.ceil((s.start - LIVE_PAD - at) / 60000);

/** "auto" = on when the session has a moderator and isn't a keynote or a break. */
export function liveFeature(s, mode) {
  const m = String(mode || "auto").toLowerCase();
  if (m === "on") return true;
  if (m === "off") return false;
  return s.hasModerator && s.type !== "keynote" && s.type !== "break";
}
export const pollsOn = (s, flags) => flags.polls && liveFeature(s, s.pollsMode);
export const qaOn = (s, flags) => flags.qa && liveFeature(s, s.qaMode);
export const liveOn = (s, flags) => pollsOn(s, flags) || qaOn(s, flags);

/** Spot polls (bundled, like the apps: the server stores only the votes). */
export function pollsFor(s, state = cms.get()) {
  if (s.id === "d1-5") return [{ id: "d1-5-p1", question: "Where is your organisation on the AI journey?", options: ["Exploring", "Piloting", "In production", "Scaled across the business"] }];
  if (s.id === "d1-7") return [{ id: "d1-7-p1", question: "Biggest cyber risk to your sector in 2027?", options: ["State actors", "Ransomware", "Supply chain", "Insider / AI-enabled fraud"] }];
  switch (s.type) {
    case "keynote": case "fireside": case "dialogue":
      return [{ id: `${s.id}-p1`, question: "What's your #1 takeaway from this session?", options: ["New partner to talk to", "A pilot to start", "A risk to manage", "Still thinking"] }];
    case "panel": case "provocation": {
      const names = s.speakerIds.map((id) => speakerById(id, state)?.name.split(" ")[0]).filter(Boolean);
      return [{ id: `${s.id}-p1`, question: s.type === "provocation" ? "Do you agree with the provocation?" : "Which panelist's view do you most agree with?", options: [...names, "Undecided"] }];
    }
    case "workshop": case "briefing":
      return [{ id: `${s.id}-p1`, question: "How ready is your organisation to act on this?", options: ["This quarter", "This year", "Need budget first", "Just learning"] }];
    default:
      return [];
  }
}

// ---------- What's on ----------

const mainStageRank = (s) => (/centre|main/i.test(s.stage) ? 0 : 1);

/** Home hero (Oct 25–27): the one on now (main stage first), else the next to start. */
export function heroSession(at, state = cms.get()) {
  const programme = state.sessions.filter(isProgramme);
  const upcoming = programme.filter((s) => s.start > at).sort((a, b) => a.start - b.start || mainStageRank(a) - mainStageRank(b));
  const next = upcoming[0] || null;
  const on = programme.filter((s) => s.start <= at && s.end > at).sort((a, b) => mainStageRank(a) - mainStageRank(b) || a.start - b.start)[0];
  if (on) return { session: on, isOn: true, next };
  return next ? { session: next, isOn: false, next: null } : null;
}

/** Schedule highlight for a day: the live one, else (within an hour of doors) the next, else the day's first. */
export function highlightedSession(day, at, state = cms.get()) {
  const todays = state.sessions.filter((s) => s.day === day && isProgramme(s)).sort((a, b) => a.start - b.start);
  const live = todays.find((s) => s.start <= at && s.end > at);
  if (live) return live;
  const next = todays.find((s) => s.start > at);
  if (next && at >= EVENT_START.getTime() - 3600000) return next;
  return todays[0] || null;
}

/** Home's Speakers tile: faces from the next sessions, topped up with keynotes. */
export function featuredSpeakers(at, limit = 3, state = cms.get()) {
  const seen = new Set(), picked = [];
  const upcoming = state.sessions.filter((s) => isProgramme(s) && s.start > at).sort((a, b) => a.start - b.start);
  for (const s of upcoming) {
    for (const id of s.speakerIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const sp = speakerById(id, state);
      if (sp?.photo) picked.push(sp);
      if (picked.length === limit) return picked;
    }
  }
  const fill = state.speakers.filter((s) => s.isKeynote && s.photo && !seen.has(s.id));
  const more = state.speakers.filter((s) => s.photo && !seen.has(s.id) && !s.isKeynote);
  return [...picked, ...fill, ...more].slice(0, limit);
}

/** Home's Organisations tile: speakers' organisations next, topped up from the partner list. */
export function featuredOrganisations(at, limit = 3, state = cms.get()) {
  const partners = state.partners.filter((p) => p.logo);
  const match = (company) => {
    const k = partnerKey(company);
    return k ? partners.find((p) => partnerKey(p.name) === k || partnerKey(p.displayName) === k) : null;
  };
  const picked = [];
  for (const s of state.sessions.filter((x) => isProgramme(x) && x.start > at).sort((a, b) => a.start - b.start)) {
    for (const id of s.speakerIds) {
      const p = match(speakerById(id, state)?.company);
      if (p && !picked.includes(p)) picked.push(p);
      if (picked.length === limit) return picked;
    }
  }
  for (const p of partners) {
    if (!picked.includes(p)) picked.push(p);
    if (picked.length === limit) break;
  }
  return picked;
}

/** 1 or 2 on the festival days (Toronto), else null. */
export function eventDay(at) {
  const d = new Date(at - 4 * 3600000); // Toronto wall clock (EDT)
  if (d.getUTCFullYear() !== 2026 || d.getUTCMonth() !== 9) return null;
  if (d.getUTCDate() === 26) return 1;
  if (d.getUTCDate() === 27) return 2;
  return null;
}

/** "Vic Fedeli, Christy Clark +2" */
export function speakerLine(speakers) {
  const names = speakers.slice(0, 2).map((s) => s.name).join(", ");
  return speakers.length > 2 ? `${names} +${speakers.length - 2}` : names;
}

export { EVENT_START, EVENT_END };
