import { ApiError } from "./api";
import {
  accountEmailOf, cleanItems, CONTACT_KINDS, cleanValue, firstLinkedIn, keepKnown, MAX_CONTACT_ITEMS, resolveItems, SHARE_OFF_ERROR,
} from "./contactCard";

/* =========================================================
   Demo backend (/app?demo=1). Answers the same routes, with the
   same JSON shapes, as the real /api/social and /api/community,
   from sample data kept on this device (modelled on the iOS
   MockData / SeedService). Nothing is sent anywhere. All people
   here are fictional.
========================================================= */

export const DEMO_TOKEN = "demo";
const KEY = "ttfc.demo.state.v3";
const ME = "demo-me";

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
/** Website pictures, as absolute URLs (demo posts only). */
const site = (path) => (typeof window !== "undefined" ? window.location.origin : "") + path;
const uid = () => Math.random().toString(36).slice(2, 10);

function person(id, name, jobTitle, organization, extra = {}) {
  return {
    id, name, jobTitle, organization, linkedinUrl: "", country: "Canada", topics: [], tier: "", tagline: "",
    availabilitySlots: [], meetingSpot: "", avatarUrl: "", onApp: true, acceptsMessages: true, acceptsRequests: true,
    kind: "", booth: "", types: [], ...extra,
  };
}

/* Contact cards (all fake: example.com, 555 numbers). `theirShare` on a connection =
   what that person shares with the demo user; `myShare` = what the demo user picked
   (missing = never picked: share-by-default items in person, nothing online). */
const DEMO_CARDS = {
  "p-hannah": [
    { id: "h-email", kind: "email", label: "Work", value: "hannah.liu@example.com", shareByDefault: true },
    { id: "h-phone", kind: "phone", label: "Mobile", value: "+1 647 555 0118", shareByDefault: true },
    { id: "h-li", kind: "linkedin", label: "", value: "https://www.linkedin.com/in/hannah-liu-demo", shareByDefault: true },
    { id: "h-x", kind: "x", label: "", value: "@hannahliu_demo", shareByDefault: false },
  ],
  "p-marcus": [
    { id: "mc-wa", kind: "whatsapp", label: "", value: "+1 416 555 0127", shareByDefault: true },
    { id: "mc-wechat", kind: "wechat", label: "", value: "marcus_qubit", shareByDefault: true },
    { id: "mc-web", kind: "website", label: "Work", value: "https://example.com/qubit-labs", shareByDefault: false },
  ],
  "p-daniel": [
    { id: "d-email", kind: "email", label: "Work", value: "daniel.okafor@example.com", shareByDefault: false },
  ],
  "p-connor": [
    { id: "c-email", kind: "email", label: "", value: "connor.obrien@example.com", shareByDefault: true },
    { id: "c-li", kind: "linkedin", label: "", value: "https://www.linkedin.com/in/connor-obrien-demo", shareByDefault: true },
  ],
  "p-priya": [
    { id: "p-email", kind: "email", label: "Work", value: "priya.raman@example.com", shareByDefault: true },
    { id: "p-phone", kind: "phone", label: "", value: "+1 647 555 0131", shareByDefault: true },
  ],
  "p-raj": [
    { id: "r-phone", kind: "phone", label: "Mobile", value: "+1 416 555 0164", shareByDefault: true },
    { id: "r-insta", kind: "instagram", label: "", value: "@raj.builds.demo", shareByDefault: true },
  ],
};

const DEMO_CONNECTIONS = [
  { id: "c-hannah", userId: "p-hannah", direction: "outgoing", status: "accepted", kind: "online", note: "", hoursAgo: 40, theirShare: ["h-email", "h-phone", "h-li"], myShare: ["m-phone", "m-li"] },
  { id: "c-marcus", userId: "p-marcus", direction: "incoming", status: "accepted", kind: "inPerson", note: "", hoursAgo: 28, theirShare: ["mc-wa", "mc-wechat"] },
  { id: "c-daniel", userId: "p-daniel", direction: "outgoing", status: "accepted", kind: "online", note: "", hoursAgo: 52, theirShare: [], myShare: [] },
  { id: "c-connor", userId: "p-connor", direction: "incoming", status: "pending", kind: "online", note: "Would love to compare notes on quantum-safe crypto.", hoursAgo: 3, theirShare: ["c-email", "c-li"] },
  { id: "c-grace", userId: "p-grace", direction: "outgoing", status: "pending", kind: "online", note: "", hoursAgo: 20, myShare: ["m-li"] },
];

/** The demo user's card (spec section 6), saved, so every exchange moment has something to tick. */
function demoMyCard() {
  return {
    contactItems: [
      { id: "m-acct", kind: "email", label: "", value: "", shareByDefault: false, account: true },
      { id: "m-phone", kind: "phone", label: "Mobile", value: "+1 416 555 0142", shareByDefault: true },
      { id: "m-wa", kind: "whatsapp", label: "", value: "+1 416 555 0142", shareByDefault: false },
      { id: "m-li", kind: "linkedin", label: "", value: "https://www.linkedin.com/in/alex-morgan-demo", shareByDefault: true },
      { id: "m-web", kind: "website", label: "Work", value: "https://example.com", shareByDefault: false },
    ],
    contactCardSavedAt: "2026-10-12T15:00:00.000Z",
  };
}

function seed() {
  const people = [
    person("p-hannah", "Hannah Liu", "Product Manager", "Shopify", { topics: ["Sustainability & CleanTech", "Artificial Intelligence"], tagline: "Commerce, climate and the tools in between" }),
    person("p-connor", "Connor O'Brien", "Quantum Hardware Lead", "Xanadu", { topics: ["Quantum Computing"] }),
    person("p-priya", "Priya Raman", "Director, Supply Chain AI", "DHL", { topics: ["Artificial Intelligence", "Supply Chain, Manufacturing & Infrastructure"], availabilitySlots: ["d1-10", "d2-14"], meetingSpot: "Expo floor" }),
    person("p-marcus", "Marcus Chen", "Founder", "Qubit Labs", { topics: ["Quantum Computing", "Startups & Capital"] }),
    person("p-sofia", "Sofia Martins", "Chief Information Security Officer", "Maple Health Network", { topics: ["Cybersecurity", "Healthcare & Lifesciences"] }),
    person("p-daniel", "Daniel Okafor", "VP, Data & AI", "Lakeshore Insurance", { topics: ["Banking, Financial Services & Insurance", "Artificial Intelligence"] }),
    person("p-emily", "Emily Tremblay", "Policy Advisor", "Ontario Innovation Office", { topics: ["Defence & Public Safety"] }),
    person("p-raj", "Raj Patel", "Head of Robotics", "Northbridge Logistics", { topics: ["Robotics & Automation"] }),
    person("p-grace", "Grace Kim", "Partner", "Harbourfront Ventures", { topics: ["Startups & Capital", "Artificial Intelligence"] }),
    person("p-lucas", "Lucas Moreau", "CTO", "VoltGrid Energy", { topics: ["Energy & Utilities", "Sustainability & CleanTech"] }),
    person("p-fatima", "Fatima Haddad", "Research Scientist", "Lakeview University AI Lab", { topics: ["Artificial Intelligence", "Healthcare & Lifesciences"] }),
    person("p-maya", "Dr. Maya Singh", "Chief AI Officer", "Aurora Financial", { topics: ["Artificial Intelligence", "Banking, Financial Services & Insurance"], kind: "speaker", types: ["speaker"], tier: "Speaker Pass" }),
    person("p-tom", "Tom Becker", "Solutions Engineer", "CyberShield", { topics: ["Cybersecurity"], kind: "exhibitor", types: ["exhibitor"], booth: "12", tier: "Exhibitor" }),
    person("p-jordan", "Jordan Lee", "Head of Partnerships", "QuantumLeap Systems", { topics: ["Quantum Computing"], kind: "exhibitor", types: ["exhibitor"], booth: "7", tier: "Exhibitor" }),
    person("p-nina", "Nina Alvarez", "Attendee Experience", "TTFC", { kind: "staff", types: ["staff"] }),
    person("p-ben", "Ben Wright", "Volunteer", "TTFC", { kind: "volunteer", types: ["volunteer"] }),
    person("p-olivia", "Olivia Chen", "Deputy Minister", "Department of Digital Affairs", { kind: "vip", types: ["vip"], acceptsMessages: false, acceptsRequests: false }),
    person("guest:sam", "Sam Rivera", "Operations Director", "Lakeshore Insurance", { onApp: false }),
  ];
  for (const p of people) p.contactItems = DEMO_CARDS[p.id] || [];
  return {
    me: {
      ...person(ME, "Alex Morgan", "Director of Innovation", "Northwind Bank", {
        topics: ["Artificial Intelligence", "Cybersecurity", "Banking, Financial Services & Insurance"],
        tier: "Connect Pass", linkedinUrl: "https://www.linkedin.com/in/alex-morgan-demo", tagline: "Bringing AI from pilots to production in banking",
      }),
      email: "alex.morgan@example.com", role: "user", types: ["attendee"],
      ...demoMyCard(),
      rights: { sendMessages: true, receiveMessages: true, sendRequests: true, receiveRequests: true, post: true, comment: true, startDiscussions: true, createGroups: true, shareContact: true, deleteAnyPost: false, moderate: false, checkIn: false },
    },
    tickets: [{ ticketId: "A1B2C3D4E5F6", type: "connect", purchaseDate: "2026-09-02T14:10:00.000Z", checkedIn: false }],
    people,
    connections: [
      ...DEMO_CONNECTIONS.map(({ hoursAgo: h, ...c }) => ({ ...c, createdAt: hoursAgo(h) })),
    ],
    messages: [
      { id: uid(), peer: "p-hannah", body: "Hey! Loved your question at the AI panel. Coffee tomorrow?", sentByMe: false, createdAt: hoursAgo(18) },
      { id: uid(), peer: "p-hannah", body: "Absolutely. Centre Stage cafe at 9?", sentByMe: true, createdAt: hoursAgo(17) },
      { id: uid(), peer: "p-hannah", body: "Perfect, see you then!", sentByMe: false, createdAt: hoursAgo(16) },
      { id: uid(), peer: "p-lucas", body: "Hi Alex, saw you're into grid-scale AI. We're piloting forecasting with two utilities. Worth a chat at the festival?", sentByMe: false, createdAt: hoursAgo(5) },
    ],
    readAt: {},
    posts: [
      { id: "post-1", authorId: "org", authorName: "The Tech Festival Canada", authorTitle: "Organizers", authorOrg: "AtlasLink Markets", authorTier: "", kind: "announcement",
        body: "Doors open Oct 26 at 9:00 AM. The opening ceremony kicks off on Centre Stage. Save your sessions now so your schedule is ready on day one.",
        topicTags: [], linkUrl: "", media: [], mentions: [], likes: ["p-hannah", "p-priya"], likeBase: 82, comments: [], createdAt: hoursAgo(2) },
      { id: "post-2", authorId: "p-marcus", authorName: "Marcus Chen", authorTitle: "Founder", authorOrg: "Qubit Labs", authorTier: "", kind: "member",
        body: "Setting up our demo for the Quantum Builders meetup on Day 2. If you're building real quantum systems, come say hi. @Priya Raman, your supply-chain use case would be a great fit.",
        topicTags: ["Quantum Computing"], linkUrl: "", media: [{ type: "image", url: site("/ft-conference.jpg"), posterUrl: "", width: 1600, height: 1067, duration: 0 }, { type: "image", url: site("/venue2.jpg"), posterUrl: "", width: 1600, height: 1067, duration: 0 }],
        mentions: [{ type: "user", id: "p-priya", name: "Priya Raman" }], likes: [], likeBase: 37, comments: [
          { id: "cm-1", authorId: "p-priya", authorName: "Priya Raman", authorTier: "", body: "Count me in. I'll bring our routing benchmarks.", status: "approved", createdAt: hoursAgo(4) },
        ], createdAt: hoursAgo(5) },
      { id: "post-3", authorId: "p-hannah", authorName: "Hannah Liu", authorTitle: "Product Manager", authorOrg: "Shopify", authorTier: "", kind: "member",
        body: "Organising an informal CleanTech founders coffee on Day 2 morning before the keynote. Reply if you want in. Aiming for 8–10 people.",
        topicTags: ["Sustainability & CleanTech"], linkUrl: "", media: [], mentions: [], likes: [], likeBase: 21, comments: [], createdAt: hoursAgo(26) },
      { id: "post-4", authorId: "p-maya", authorName: "Dr. Maya Singh", authorTitle: "Chief AI Officer", authorOrg: "Aurora Financial", authorTier: "Speaker Pass", kind: "member",
        body: "Our panel on model governance at scale will get practical: what we stopped doing, what we automated, and what still needs a human. Bring hard questions.",
        topicTags: ["Artificial Intelligence", "Banking, Financial Services & Insurance"], linkUrl: "https://www.thetechfestival.com/agenda", media: [], mentions: [], likes: [], likeBase: 54, comments: [], createdAt: hoursAgo(30) },
    ],
    registrations: [],
    counts: {},
    groups: [
      { id: "g-quantum", name: "Quantum Builders", description: "Hardware and algorithms people building real quantum systems. Day 2 meetup at Pier 4.", tags: ["Quantum Computing"], ownerId: "p-marcus", ownerName: "Marcus Chen", memberCount: 42, joined: true, status: "approved", createdAt: hoursAgo(90) },
      { id: "g-women", name: "Women in Frontier Tech", description: "Network, mentorship, and a Day 1 reception. All welcome as allies.", tags: ["Artificial Intelligence"], ownerId: "p-grace", ownerName: "Grace Kim", memberCount: 88, joined: false, status: "approved", createdAt: hoursAgo(120) },
      { id: "g-defence", name: "Defence Dual-Use Founders", description: "Founders working across civilian and defence applications. Procurement-focused.", tags: ["Defence & Public Safety"], ownerId: "p-raj", ownerName: "Raj Patel", memberCount: 31, joined: false, status: "approved", createdAt: hoursAgo(70) },
    ],
    groupMessages: [
      { id: uid(), groupId: "g-quantum", authorId: "p-marcus", authorName: "Marcus Chen", body: "Welcome all! Meetup is Day 2, 12:30 at Pier 4. Bring a laptop if you want to try the simulator.", createdAt: hoursAgo(8) },
      { id: uid(), groupId: "g-quantum", authorId: "p-connor", authorName: "Connor O'Brien", body: "I'll bring a photonic chip for show and tell.", createdAt: hoursAgo(6) },
    ],
    discussions: [
      { id: "d-pqc", title: "Best approach to post-quantum migration for mid-size banks?", body: "We're scoping a PQC migration and trying to sequence it without disrupting trading systems. What worked for you: a crypto-agility layer first, or system by system?", tags: ["Cybersecurity", "Banking, Financial Services & Insurance"], authorId: "p-daniel", authorName: "Daniel Okafor", status: "approved", following: true, followerCount: 14, createdAt: hoursAgo(20) },
      { id: "d-triage", title: "Who's actually piloting AI in clinical triage?", body: "Looking to compare notes on validation and procurement hurdles for clinical AI. Especially interested in Canadian hospital networks.", tags: ["Healthcare & Lifesciences", "Artificial Intelligence"], authorId: "p-sofia", authorName: "Sofia Martins", status: "approved", following: false, followerCount: 6, createdAt: hoursAgo(30) },
    ],
    replies: [
      { id: "r-1", discussionId: "d-pqc", parentId: null, authorId: "p-marcus", authorName: "Marcus Chen", body: "Crypto-agility layer first, every time. Retrofitting per system without it is how migrations stall.", status: "approved", createdAt: hoursAgo(18) },
      { id: "r-2", discussionId: "d-pqc", parentId: "r-1", authorId: "p-sofia", authorName: "Sofia Martins", body: "Agree. We also ran an inventory of every cert and key in flight before touching anything.", status: "approved", createdAt: hoursAgo(16) },
    ],
    notifications: [
      { id: "n-1", title: "Welcome to TTFC 2026", body: "Your schedule, the attendee network and live Q&A are all in the app. See you on Oct 26!", link: "ttfc://tab/schedule", kind: "personal", sentByName: "TTFC team", createdAt: hoursAgo(1), readAt: null },
    ],
    questions: {},
    votes: {},
    cardV: 1,
  };
}

/* Screenshot hook: /app/?demo=1&card=one starts the demo user's card with one detail
   (card=empty: none, card=full: the sample card again), and forgets on this device that
   the Profile card was ever opened, so the "add at least 2" dots show. Demo only. */
let cardHook = "";
try {
  const u = new URL(window.location.href);
  cardHook = ["one", "empty", "full"].includes(u.searchParams.get("card")) ? u.searchParams.get("card") : "";
  if (cardHook) {
    u.searchParams.delete("card");
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    for (const k of ["ttfc.contactCard.seen", "ttfc.contactCard.open", "ttfc.app.contactCard"]) localStorage.removeItem(k);
  }
} catch { /* no window (tests) */ }

function applyCardHook(s, hook) {
  const full = demoMyCard();
  s.me.contactItems = hook === "full" ? full.contactItems : hook === "one" ? full.contactItems.filter((it) => it.id === "m-phone") : [];
  s.me.contactCardSavedAt = full.contactCardSavedAt;
  s.me.linkedinUrl = hook === "full" ? "https://www.linkedin.com/in/alex-morgan-demo" : "";
  delete s.me.contactQrShare;
}

let state = null;
function load() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || null; } catch { state = null; }
  if (!state) state = seed();
  if (!state.cardV) addContactCards(state);
  if (cardHook) { applyCardHook(state, cardHook); cardHook = ""; save(); }
  return state;
}

/** Demo data saved before the contact card existed: add the sample cards and connections. */
function addContactCards(s) {
  const fresh = seed();
  if (!Array.isArray(s.me.contactItems)) Object.assign(s.me, demoMyCard());
  if (!s.me.linkedinUrl) s.me.linkedinUrl = fresh.me.linkedinUrl;
  for (const p of s.people) if (!Array.isArray(p.contactItems)) p.contactItems = DEMO_CARDS[p.id] || [];
  for (const c of fresh.connections) {
    const have = s.connections.find((x) => x.userId === c.userId);
    if (!have) s.connections.push(c);
    else if (!Array.isArray(have.theirShare) && have.id === c.id) have.theirShare = c.theirShare;
  }
  s.cardV = 1;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full */ }
}
export function resetDemo() {
  state = seed();
  save();
}

// ---------- DTOs ----------

/** A person as others see them: never their contact card items (only what they share, via shareFields). */
const card = (id) => {
  const s = load();
  const p = id === ME ? s.me : s.people.find((x) => x.id === id);
  if (!p) return null;
  const { contactItems: _items, contactCardSavedAt: _saved, contactQrShare: _qr, ...rest } = p;
  return rest;
};

// ---------- Contact card (services/contactCard.js on the backend) ----------

const myAccountEmail = () => accountEmailOf(load().me.email);
const myItems = () => resolveItems(load().me.contactItems, myAccountEmail());
const meCanShare = () => !!load().me.rights?.shareContact;
const theirItems = (p) => resolveItems(p?.contactItems, "");

function qrShareOf() {
  const items = myItems();
  const picked = Array.isArray(load().me.contactQrShare);
  return { ids: picked ? keepKnown(load().me.contactQrShare, items) : items.filter((it) => it.shareByDefault).map((it) => it.id), picked };
}

function contactCardDTO() {
  const qr = qrShareOf();
  return { qrShare: qr.ids, qrSharePicked: qr.picked, items: myItems(), accountEmail: myAccountEmail(), canShare: meCanShare(), saved: !!load().me.contactCardSavedAt, max: MAX_CONTACT_ITEMS, kinds: CONTACT_KINDS };
}

/** What the demo user shares on `c` now (resolved): their pick, else defaults in person, else nothing. */
function myShareIds(c) {
  if (!meCanShare()) return [];
  const items = myItems();
  if (Array.isArray(c.myShare)) return keepKnown(c.myShare, items);
  return c.kind === "inPerson" ? items.filter((it) => it.shareByDefault).map((it) => it.id) : [];
}

/** What the other person shares with the demo user: accepted only, never across a block. */
function sharedWithMe(c, p) {
  if (c.status !== "accepted" || (load().blocks || []).includes(c.userId)) return [];
  const items = theirItems(p);
  const ids = Array.isArray(c.theirShare) ? keepKnown(c.theirShare, items) : c.kind === "inPerson" ? items.filter((it) => it.shareByDefault).map((it) => it.id) : [];
  return items.filter((it) => ids.includes(it.id)).map((it) => ({ kind: it.kind, label: it.label || "", value: it.value }));
}

const shareFields = (c, p) => (c ? { sharedContact: sharedWithMe(c, p), myShare: myShareIds(c), mySharePicked: Array.isArray(c.myShare) } : { sharedContact: [], myShare: [], mySharePicked: false });

/** A `share` list from a request body: only my current item ids. null = nothing to change. */
function shareFromBody(body) {
  if (!meCanShare() || !Array.isArray(body?.share)) return null;
  return keepKnown(body.share.filter((x) => typeof x === "string"), myItems());
}

/** PATCH /profile linkedinUrl → the same change on the saved card's first LinkedIn item. */
function syncLinkedInItem(me, linkedinUrl) {
  if (!me.contactCardSavedAt || !Array.isArray(me.contactItems)) return;
  const i = me.contactItems.findIndex((it) => it.kind === "linkedin" && !it.account);
  if (!linkedinUrl) { if (i >= 0) me.contactItems.splice(i, 1); return; }
  const v = cleanValue("linkedin", linkedinUrl).value;
  if (!v) return;
  if (i >= 0) me.contactItems[i] = { ...me.contactItems[i], value: v };
  else if (me.contactItems.length < MAX_CONTACT_ITEMS) me.contactItems.push({ id: "li" + uid(), kind: "linkedin", label: "", value: v, shareByDefault: true });
}

/** Whether a user id is one of the demo's sample people. */
export const demoKnows = (id) => id === ME || load().people.some((p) => p.id === id);

/**
 * A connect code without a user id (another phone in demo mode, an older QR), scanned here:
 * recorded on this device only, with the details the code carried. → the connection DTO.
 */
export async function demoConnectFromCode(code, share) {
  await wait(150);
  const s = load();
  const key = String(code.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "contact";
  const id = `qr-${key}`;
  let p = s.people.find((x) => x.id === id);
  if (!p) {
    p = person(id, String(code.name || "Attendee"), code.title || "", code.org || "", { linkedinUrl: code.linkedIn || "" });
    s.people.push(p);
  }
  const items = [];
  const email = cleanValue("email", code.email || "").value;
  const li = cleanValue("linkedin", code.linkedIn || "").value;
  if (email) items.push({ id: `${id}-email`, kind: "email", label: "", value: email, shareByDefault: true });
  if (li) items.push({ id: `${id}-li`, kind: "linkedin", label: "", value: li, shareByDefault: true });
  p.contactItems = items;
  let c = s.connections.find((x) => x.userId === id);
  if (!c) { c = { id: "c-" + uid(), userId: id, direction: "outgoing", note: "", createdAt: new Date().toISOString() }; s.connections.push(c); }
  Object.assign(c, { status: "accepted", kind: "inPerson", theirShare: items.map((it) => it.id) });
  const picked = shareFromBody({ share });
  if (picked) c.myShare = picked;
  save();
  return JSON.parse(JSON.stringify(connectionDTO(c)));
}

function connectionDTO(c) {
  const user = card(c.userId);
  const share = shareFields(c, load().people.find((x) => x.id === c.userId));
  const inPerson = c.status === "accepted" && c.kind === "inPerson";
  const email = share.sharedContact.find((it) => it.kind === "email")?.value || "";
  return {
    id: c.id, user, direction: c.direction, status: c.status, kind: c.kind, note: c.note, createdAt: c.createdAt, respondedAt: null,
    ...share, ...(inPerson ? { email, contactShared: share.sharedContact.length > 0 } : {}),
  };
}

function postDTO(p) {
  return {
    id: p.id, authorId: p.authorId, authorName: p.authorName, authorTitle: p.authorTitle, authorOrg: p.authorOrg, authorTier: p.authorTier,
    kind: p.kind, body: p.body, topicTags: p.topicTags, linkUrl: p.linkUrl, imageData: "", imageUrl: "", media: p.media, mentions: p.mentions,
    authorAvatarUrl: "", likeCount: (p.likeBase || 0) + p.likes.length, commentCount: p.comments.length, likedByMe: p.likes.includes(ME),
    canRemove: p.authorId === ME, status: "approved", createdAt: p.createdAt,
  };
}

function discussionDTO(d) {
  const s = load();
  return { ...d, replyCount: s.replies.filter((r) => r.discussionId === d.id).length, mine: d.authorId === ME };
}

const groupDTO = (g) => ({ ...g });

const match = (q) => (p) => {
  const t = String(q || "").trim().toLowerCase();
  return !t || [p.name, p.organization, p.jobTitle].some((x) => String(x).toLowerCase().includes(t));
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DEMO_LEVELS = [
  { key: "explorer", name: "Explorer", min: 0 }, { key: "connector", name: "Connector", min: 100 },
  { key: "insider", name: "Insider", min: 300 }, { key: "trailblazer", name: "Trailblazer", min: 600 },
  { key: "catalyst", name: "Catalyst", min: 1000 },
];
const DEMO_RULES = [
  { key: "profile.linkedin", label: "Add your LinkedIn", description: "Add your LinkedIn profile to your TTFC profile.", points: 20 },
  { key: "session.saved", label: "Save a session", description: "Each session you save to your agenda (up to 10).", points: 5 },
  { key: "session.attended", label: "Take part in a session", description: "Each session where you vote in a poll or ask a question (up to 40).", points: 20 },
  { key: "network.connection", label: "Make a connection", description: "Each accepted connection.", points: 15 },
  { key: "feed.post", label: "Post on the feed", description: "Each post (up to 3 a day).", points: 10 },
];
/** Sample standing worked out from the demo account's own data. */
function demoPoints(s) {
  const saved = Math.min(10, (s.registrations || []).length);
  const conns = (s.connections || []).filter((c) => c.status === "accepted").length;
  const posts = (s.posts || []).filter((p) => p.authorId === ME).length;
  const breakdown = [
    { key: "session.saved", label: "Saved sessions", points: saved * 5, count: saved },
    { key: "network.connection", label: "Connections", points: conns * 15, count: conns },
    { key: "feed.post", label: "Posts", points: posts * 10, count: posts },
    { key: "profile.topics", label: "Topics picked", points: 10, count: 1 },
  ];
  const total = 70 + breakdown.reduce((n, b) => n + b.points, 0);
  const i = DEMO_LEVELS.reduce((k, l, j) => (total >= l.min ? j : k), 0);
  const next = DEMO_LEVELS[i + 1] || null;
  return {
    total, level: DEMO_LEVELS[i], nextLevel: next, toNext: next ? next.min - total : 0,
    breakdown: [{ key: "network.request", label: "Requests sent", points: 70, count: 14 }, ...breakdown],
    rank: s.pointsHidden ? null : 4, rules: DEMO_RULES, levels: DEMO_LEVELS, hideFromLeaderboard: !!s.pointsHidden,
  };
}

// ---------- Router ----------

/** request(path, {method, body}) in demo mode. */
export async function demoBackend(path, { method = "GET", body = {} } = {}) {
  await wait(120 + Math.random() * 180);
  const s = load();
  const [rawPath, qs = ""] = path.split("?");
  const q = new URLSearchParams(qs);
  const parts = rawPath.split("/").filter(Boolean);
  const is = (m, pattern) => {
    if (m !== method) return null;
    const pp = pattern.split("/");
    if (pp.length !== parts.length) return null;
    const params = {};
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (pp[i] !== parts[i]) return null;
    }
    return params;
  };
  let m;
  const done = (v) => { save(); return JSON.parse(JSON.stringify(v)); };

  // Public
  if (is("GET", "app/content")) return { "flag.polls": true, "flag.qa": true, "flag.allow_posts": true, "flag.allow_groups": true, "feed.empty": "Be the first to post. Everyone at TTFC will see it." };
  if (is("GET", "status")) return { live: true, message: "" };
  if (is("POST", "app/events")) return { accepted: 0 };
  if (is("GET", "app/blocks")) return done(s.blocks || []);
  if (is("POST", "app/block")) { s.blocks = [...new Set([...(s.blocks || []), String(body.userId)])]; return done({ ok: true }); }
  if ((m = is("DELETE", "app/block/:id"))) { s.blocks = (s.blocks || []).filter((x) => x !== m.id); return done({ ok: true }); }
  if (is("POST", "app/report")) return { ok: true };

  // Points (services/points.js on the backend)
  if (is("GET", "social/points/me")) return done(demoPoints(s));
  if (is("GET", "social/points/leaderboard")) {
    const me = demoPoints(s);
    const entries = [
      { rank: 1, user: { id: "p1", name: "Daniel Okafor", organization: "Lakeshore Insurance" }, points: 640, level: DEMO_LEVELS[3] },
      { rank: 2, user: { id: "p2", name: "Dr. Maya Singh", organization: "Aurora Financial" }, points: 410, level: DEMO_LEVELS[2] },
      { rank: 3, user: { id: "p3", name: "Priya Raman", organization: "DHL" }, points: 255, level: DEMO_LEVELS[1] },
    ];
    if (!me.hideFromLeaderboard) entries.push({ rank: 4, user: { id: ME, name: s.me.name, organization: s.me.organization }, points: me.total, level: me.level });
    return done({ entries, me: { rank: me.rank, points: me.total } });
  }
  if (is("PATCH", "social/points/prefs")) { s.pointsHidden = !!body.hideFromLeaderboard; return done({ hideFromLeaderboard: s.pointsHidden }); }

  // Account
  if (is("GET", "social/me")) return done({ ...card(ME), email: s.me.email, contactCard: contactCardDTO() });
  if (is("GET", "auth/me")) return done({ _id: ME, name: s.me.name, email: s.me.email, role: "user", jobTitle: s.me.jobTitle, organization: s.me.organization, linkedinUrl: s.me.linkedinUrl, country: s.me.country, topics: s.me.topics, tagline: s.me.tagline, appOnboarded: true, termsVersion: "2026-10-09", tickets: s.tickets, rights: s.me.rights });
  if (is("POST", "auth/refresh")) return { token: DEMO_TOKEN };
  if (is("PATCH", "profile")) {
    const allowed = ["name", "jobTitle", "organization", "linkedinUrl", "country", "tagline", "topics", "meetingSpot", "availabilitySlots"];
    for (const k of allowed) if (body[k] !== undefined) s.me[k] = body[k];
    if (body.linkedinUrl !== undefined) syncLinkedInItem(s.me, String(body.linkedinUrl || "").trim());
    return done({ success: true, user: { ...card(ME), email: s.me.email } });
  }
  if (is("PUT", "profile/avatar")) { s.me.avatarUrl = body.avatarData || ""; return done({ avatarUrl: s.me.avatarUrl }); }

  // My contact card
  if (is("GET", "social/contact-card")) return done(contactCardDTO());
  if (is("PUT", "social/contact-card")) {
    const out = cleanItems(body.items, { accountEmail: myAccountEmail() });
    if (out.error) throw new ApiError(out.error, 400, { error: out.error, index: out.index });
    const hadLinkedIn = myItems().some((it) => it.kind === "linkedin");
    s.me.contactItems = out.items;
    s.me.contactCardSavedAt = new Date().toISOString();
    const li = firstLinkedIn(out.items);
    if (li) s.me.linkedinUrl = li;
    else if (hadLinkedIn) s.me.linkedinUrl = "";
    return done({ ...contactCardDTO(), linkedinUrl: s.me.linkedinUrl || "" });
  }
  if (is("PUT", "social/contact-card/qr-share")) {
    if (!meCanShare()) throw new ApiError(SHARE_OFF_ERROR, 403);
    if (!Array.isArray(body.share)) throw new ApiError("share must be a list of contact detail ids", 400);
    s.me.contactQrShare = keepKnown(body.share, myItems());
    return done(contactCardDTO());
  }
  if ((m = is("PUT", "social/users/:id/share"))) {
    if (!meCanShare()) throw new ApiError(SHARE_OFF_ERROR, 403);
    if (!Array.isArray(body.share)) throw new ApiError("share must be a list of contact detail ids", 400);
    const c = s.connections.find((x) => x.userId === m.id && x.status !== "declined");
    if (!c) throw new ApiError("Connect first, then you can share your contact details.", 404);
    c.myShare = keepKnown(body.share, myItems());
    return done(connectionDTO(c));
  }

  // People
  if (is("GET", "social/attendees") || is("GET", "social/users")) return done(s.people.filter(match(q.get("q"))).map((p) => card(p.id)));
  if ((m = is("GET", "social/users/:id"))) {
    const p = card(m.id);
    if (!p) throw new ApiError("Not found", 404);
    const c = m.id === ME ? null : s.connections.find((x) => x.userId === m.id && x.status !== "declined") || null;
    const full = s.people.find((x) => x.id === m.id);
    return done({ ...p, fieldOfWork: "", jobLevel: "", objectives: [], connectionId: c?.id || "", connectionStatus: c?.status || "", ...shareFields(c, full) });
  }

  // Connections
  if (is("GET", "social/connections")) {
    const all = s.connections.map(connectionDTO);
    return done({ accepted: all.filter((c) => c.status === "accepted"), incoming: all.filter((c) => c.status === "pending" && c.direction === "incoming"), outgoing: all.filter((c) => c.status === "pending" && c.direction === "outgoing") });
  }
  if (is("POST", "social/connections/request") || is("POST", "social/connections/in-person")) {
    const p = card(body.toUserId);
    if (!p) throw new ApiError("User not found", 404);
    if (!p.onApp) throw new ApiError("They haven't joined the app yet. You can connect once they do.", 409);
    const existing = s.connections.find((c) => c.userId === p.id);
    const inPerson = rawPath.endsWith("in-person");
    const share = shareFromBody(body);
    if (existing) {
      if (existing.direction === "incoming" || inPerson) { existing.status = "accepted"; if (inPerson) existing.kind = "inPerson"; }
      if (share) existing.myShare = share;
      return done(connectionDTO(existing));
    }
    if (!inPerson && !p.acceptsRequests) throw new ApiError(`${p.name.split(" ")[0]} isn't taking connection requests in the app.`, 403);
    const c = { id: "c-" + uid(), userId: p.id, direction: "outgoing", status: inPerson ? "accepted" : "pending", kind: inPerson ? "inPerson" : "online", note: body.note || "", createdAt: new Date().toISOString() };
    if (share) c.myShare = share;
    // Sample people share their defaults once connected (online too, so the demo shows details after a request).
    c.theirShare = theirItems(s.people.find((x) => x.id === p.id)).filter((it) => it.shareByDefault).map((it) => it.id);
    s.connections.push(c);
    return done(connectionDTO(c));
  }
  if ((m = is("POST", "social/connections/:id/respond"))) {
    const c = s.connections.find((x) => x.id === m.id);
    if (!c) throw new ApiError("Not found", 404);
    c.status = body.accept ? "accepted" : "declined";
    const share = body.accept ? shareFromBody(body) : null;
    if (share) c.myShare = share;
    if (!body.accept) s.connections = s.connections.filter((x) => x.id !== c.id);
    return done(connectionDTO(c));
  }
  if ((m = is("POST", "social/connections/:id/withdraw"))) {
    s.connections = s.connections.filter((x) => x.id !== m.id);
    return done({ withdrawn: true, id: m.id });
  }

  // Messages
  if (is("GET", "social/messages")) {
    const peers = [...new Set(s.messages.map((x) => x.peer))];
    return done(peers.map((id) => {
      const list = s.messages.filter((x) => x.peer === id);
      const last = list[list.length - 1];
      const seen = s.readAt[id] || 0;
      return { user: card(id), lastMessage: { body: last.body, sentByMe: last.sentByMe, createdAt: last.createdAt }, unread: list.filter((x) => !x.sentByMe && Date.parse(x.createdAt) > seen).length };
    }).sort((a, b) => Date.parse(b.lastMessage.createdAt) - Date.parse(a.lastMessage.createdAt)));
  }
  if ((m = is("GET", "social/messages/:id"))) {
    s.readAt[m.id] = Date.now();
    const since = q.get("since") ? Date.parse(q.get("since")) : 0;
    return done(s.messages.filter((x) => x.peer === m.id && Date.parse(x.createdAt) > since).map((x) => ({ id: x.id, body: x.body, sentByMe: x.sentByMe, status: "approved", createdAt: x.createdAt, readAt: null })));
  }
  if ((m = is("POST", "social/messages/:id"))) {
    const p = card(m.id);
    if (!p) throw new ApiError("User not found", 404);
    const connected = s.connections.some((c) => c.userId === p.id && c.status === "accepted");
    const wrote = s.messages.some((x) => x.peer === p.id && !x.sentByMe);
    if (!p.acceptsMessages && !connected && !wrote) throw new ApiError(`${p.name.split(" ")[0]} isn't taking messages in the app.`, 403);
    const msg = { id: uid(), peer: p.id, body: String(body.body || "").slice(0, 2000), sentByMe: true, createdAt: new Date().toISOString() };
    s.messages.push(msg);
    // A friendly reply a few seconds later, so the 5-second refresh can be seen working.
    if (p.id === "p-hannah") {
      setTimeout(() => { load().messages.push({ id: uid(), peer: p.id, body: "Sounds good! 👋", sentByMe: false, createdAt: new Date().toISOString() }); save(); }, 6000);
    }
    return done({ id: msg.id, body: msg.body, sentByMe: true, status: "approved", createdAt: msg.createdAt });
  }

  // Feed
  if (is("GET", "social/feed")) return done([...s.posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(postDTO));
  if (is("GET", "social/media/config")) return { enabled: true, maxItems: 6, maxVideoSeconds: 30 };
  if (is("POST", "social/media/sign")) return { demo: true };
  if (is("POST", "social/feed")) {
    const text = String(body.body || "").trim();
    if (!text && !(body.media || []).length) throw new ApiError("Write something or add a photo", 400);
    const p = { id: "post-" + uid(), authorId: ME, authorName: s.me.name, authorTitle: s.me.jobTitle, authorOrg: s.me.organization, authorTier: "", kind: "member",
      body: text, topicTags: body.topicTags || [], linkUrl: body.linkUrl || "", media: (body.media || []).map((x) => ({ type: x.type, url: x.url, posterUrl: "", width: x.width || 0, height: x.height || 0, duration: x.duration || 0 })),
      mentions: body.mentions || [], likes: [], likeBase: 0, comments: [], createdAt: new Date().toISOString() };
    s.posts.unshift(p);
    return done(postDTO(p));
  }
  if ((m = is("GET", "social/feed/:id"))) {
    const p = s.posts.find((x) => x.id === m.id);
    if (!p) throw new ApiError("Not found", 404);
    return done(postDTO(p));
  }
  if ((m = is("DELETE", "social/feed/:id"))) {
    s.posts = s.posts.filter((x) => x.id !== m.id || x.authorId !== ME);
    return done({ ok: true, id: m.id, removed: "deleted" });
  }
  if ((m = is("POST", "social/feed/:id/like"))) {
    const p = s.posts.find((x) => x.id === m.id);
    if (!p) throw new ApiError("Not found", 404);
    if (p.likes.includes(ME)) p.likes = p.likes.filter((x) => x !== ME); else p.likes.push(ME);
    return done({ liked: p.likes.includes(ME), likeCount: (p.likeBase || 0) + p.likes.length });
  }
  if ((m = is("GET", "social/feed/:id/comments"))) {
    const p = s.posts.find((x) => x.id === m.id);
    return done((p?.comments || []).map((c) => ({ ...c, postId: m.id })));
  }
  if ((m = is("POST", "social/feed/:id/comments"))) {
    const p = s.posts.find((x) => x.id === m.id);
    if (!p) throw new ApiError("Not found", 404);
    const c = { id: "cm-" + uid(), authorId: ME, authorName: s.me.name, authorTier: "", body: String(body.body || "").slice(0, 2000), status: "approved", createdAt: new Date().toISOString() };
    p.comments.push(c);
    return done({ ...c, postId: p.id, commentCount: p.comments.length });
  }

  // Sessions
  if (is("GET", "social/sessions/registrations")) return done({ mine: s.registrations, counts: s.counts });
  if ((m = is("POST", "social/sessions/:id/register"))) {
    const on = !s.registrations.includes(m.id);
    s.registrations = on ? [...s.registrations, m.id] : s.registrations.filter((x) => x !== m.id);
    s.counts[m.id] = Math.max(0, (s.counts[m.id] || 0) + (on ? 1 : -1));
    return done({ registered: on, count: s.counts[m.id] });
  }
  if ((m = is("GET", "social/sessions/:id/questions"))) {
    if (!s.questions[m.id]) {
      s.questions[m.id] = [
        { id: "q-" + uid(), sessionId: m.id, authorId: "p-marcus", authorName: "Marcus Chen", body: "What's the single biggest blocker you hit moving from pilot to production?", upvoters: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"], status: "approved", createdAt: hoursAgo(0.2) },
        { id: "q-" + uid(), sessionId: m.id, authorId: "p-sofia", authorName: "Sofia Martins", body: "How do you handle procurement teams that have never bought AI before?", upvoters: ["a", "b", "c", "d", "e", "f", "g"], status: "approved", createdAt: hoursAgo(0.1) },
      ];
    }
    return done(s.questions[m.id].map(questionDTO));
  }
  if ((m = is("POST", "social/sessions/:id/questions"))) {
    const qn = { id: "q-" + uid(), sessionId: m.id, authorId: ME, authorName: s.me.name, body: String(body.body || "").slice(0, 600), upvoters: [ME], status: "approved", createdAt: new Date().toISOString() };
    (s.questions[m.id] = s.questions[m.id] || []).unshift(qn);
    return done(questionDTO(qn));
  }
  if ((m = is("POST", "social/sessions/questions/:qid/upvote"))) {
    for (const list of Object.values(s.questions)) {
      const qn = list.find((x) => x.id === m.qid);
      if (qn) {
        qn.upvoters = qn.upvoters.includes(ME) ? qn.upvoters.filter((x) => x !== ME) : [...qn.upvoters, ME];
        return done(questionDTO(qn));
      }
    }
    throw new ApiError("Not found", 404);
  }
  if ((m = is("GET", "social/sessions/:id/polls/:pollId/results"))) return done(pollResults(m.id, m.pollId, Number(q.get("options")) || 4));
  if ((m = is("POST", "social/sessions/:id/polls/:pollId/vote"))) {
    const key = `${m.id}/${m.pollId}`;
    const v = s.votes[key] || (s.votes[key] = { counts: seedCounts(Number(body.options) || 4), mine: null });
    if (v.mine === null) { v.mine = Number(body.optionIndex); v.counts[v.mine] = (v.counts[v.mine] || 0) + 1; }
    return done(pollResults(m.id, m.pollId, Number(body.options) || 4));
  }

  // Notifications & activity
  if (is("GET", "social/notifications")) return done({ notifications: s.notifications, unread: s.notifications.filter((n) => !n.readAt).length });
  if (is("POST", "social/notifications/read")) {
    for (const n of s.notifications) if (body.all || (body.ids || []).includes(n.id)) n.readAt = n.readAt || new Date().toISOString();
    return done({ ok: true, updated: 1 });
  }
  if (is("GET", "social/activity/unread")) return { feed: 0, discussions: s.activitySeen?.discussions ? 0 : 1 };
  if (is("POST", "social/activity/seen")) { s.activitySeen = { ...(s.activitySeen || {}), [body.section]: true }; return done({ ok: true }); }
  // Typing: someone in the Quantum Builders chat, now and then.
  if (is("POST", "community/typing")) return { ok: true };
  if (is("GET", "community/typing")) return { typing: q.get("scope") === "group" && q.get("id") === "g-quantum" && Math.floor(Date.now() / 8000) % 3 === 0 ? ["Connor O'Brien"] : [] };
  if ((m = is("GET", "community/groups/:id/members"))) {
    const g = s.groups.find((x) => x.id === m.id);
    if (!g) throw new ApiError("Not found", 404);
    const ids = [...new Set([g.ownerId, ...s.groupMessages.filter((x) => x.groupId === g.id).map((x) => x.authorId), ...(g.joined ? [ME] : [])])];
    const extra = s.people.filter((p) => !ids.includes(p.id) && (p.topics || []).some((t) => (g.tags || []).includes(t)));
    const cards = [...ids.map((id) => card(id)).filter(Boolean), ...extra].slice(0, Math.max(3, Math.min(g.memberCount, 12)));
    return done(cards.map((c) => ({ ...c, isOwner: c.id === g.ownerId, isMe: c.id === ME })).sort((a, b) => (b.isOwner - a.isOwner) || a.name.localeCompare(b.name)));
  }

  // Community
  if (is("GET", "community/discussions")) return done(s.discussions.map(discussionDTO));
  if (is("POST", "community/discussions")) {
    const d = { id: "d-" + uid(), title: String(body.title || "").trim(), body: String(body.body || "").trim(), tags: body.tags || [], authorId: ME, authorName: s.me.name, status: "pending", following: true, followerCount: 1, createdAt: new Date().toISOString() };
    if (d.title.length < 4 || !d.body) throw new ApiError("title and body required", 400);
    s.discussions.unshift(d);
    return done(discussionDTO(d));
  }
  if ((m = is("POST", "community/discussions/:id/follow"))) {
    const d = s.discussions.find((x) => x.id === m.id);
    if (!d) throw new ApiError("Not found", 404);
    if (d.following !== !!body.follow) d.followerCount += body.follow ? 1 : -1;
    d.following = !!body.follow;
    return done({ ok: true, following: d.following, followerCount: d.followerCount });
  }
  if ((m = is("GET", "community/discussions/:id/replies"))) return done(s.replies.filter((r) => r.discussionId === m.id).map((r) => ({ ...r, mine: r.authorId === ME })));
  if ((m = is("POST", "community/discussions/:id/replies"))) {
    const r = { id: "r-" + uid(), discussionId: m.id, parentId: body.parentId || null, authorId: ME, authorName: s.me.name, body: String(body.body || "").slice(0, 2000), status: "approved", createdAt: new Date().toISOString() };
    s.replies.push(r);
    return done({ ...r, mine: true, replyCount: s.replies.filter((x) => x.discussionId === m.id).length });
  }
  if (is("GET", "community/groups")) return done([...s.groups].sort((a, b) => b.memberCount - a.memberCount).map(groupDTO));
  if (is("POST", "community/groups")) {
    const g = { id: "g-" + uid(), name: String(body.name || "").trim(), description: String(body.description || "").trim(), tags: body.tags || [], ownerId: ME, ownerName: s.me.name, memberCount: 1, joined: true, status: "pending", createdAt: new Date().toISOString() };
    if (g.name.length < 3) throw new ApiError("Give the group a name (3 characters or more).", 400);
    s.groups.push(g);
    return done(groupDTO(g));
  }
  if ((m = is("POST", "community/groups/:id/join"))) {
    const g = s.groups.find((x) => x.id === m.id);
    if (!g) throw new ApiError("Not found", 404);
    g.joined = !g.joined;
    g.memberCount += g.joined ? 1 : -1;
    return done(groupDTO(g));
  }
  if ((m = is("GET", "community/groups/:id/messages"))) {
    const g = s.groups.find((x) => x.id === m.id);
    if (!g?.joined) throw new ApiError("Join the group to see its chat", 403);
    const since = q.get("since") ? Date.parse(q.get("since")) : 0;
    return done(s.groupMessages.filter((x) => x.groupId === m.id && Date.parse(x.createdAt) > since).map((x) => ({ ...x, status: "approved", mine: x.authorId === ME })));
  }
  if ((m = is("POST", "community/groups/:id/messages"))) {
    const g = s.groups.find((x) => x.id === m.id);
    if (!g?.joined) throw new ApiError("Join the group to see its chat", 403);
    const msg = { id: uid(), groupId: m.id, authorId: ME, authorName: s.me.name, body: String(body.body || "").slice(0, 2000), createdAt: new Date().toISOString() };
    s.groupMessages.push(msg);
    return done({ ...msg, status: "approved", mine: true });
  }

  throw new ApiError("This part isn't in the demo.", 404);
}

function questionDTO(qn) {
  return { id: qn.id, sessionId: qn.sessionId, authorId: qn.authorId, authorName: qn.authorName, body: qn.body, upvotes: qn.upvoters.length, upvotedByMe: qn.upvoters.includes(ME), sentByMe: qn.authorId === ME, status: qn.status, createdAt: qn.createdAt };
}

function seedCounts(n) {
  return Array.from({ length: n }, (_, i) => [9, 14, 6, 3, 2, 1][i] ?? 1);
}

function pollResults(sessionId, pollId, n) {
  const s = load();
  const key = `${sessionId}/${pollId}`;
  const v = s.votes[key] || (s.votes[key] = { counts: seedCounts(n), mine: null });
  save();
  return { counts: v.counts, total: v.counts.reduce((a, b) => a + b, 0), myVote: v.mine };
}
