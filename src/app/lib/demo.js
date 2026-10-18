import { ApiError } from "./api";

/* =========================================================
   Demo backend (/app?demo=1). Answers the same routes, with the
   same JSON shapes, as the real /api/social and /api/community,
   from sample data kept on this device (modelled on the iOS
   MockData / SeedService). Nothing is sent anywhere. All people
   here are fictional.
========================================================= */

export const DEMO_TOKEN = "demo";
const KEY = "ttfc.demo.state.v2";
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

function seed() {
  const people = [
    person("p-hannah", "Hannah Liu", "Product Manager", "Shopify", { topics: ["Sustainability & CleanTech", "Artificial Intelligence"], tagline: "Commerce, climate and the tools in between" }),
    person("p-connor", "Connor O'Brien", "Quantum Hardware Lead", "Xanadu", { topics: ["Quantum Computing"] }),
    person("p-priya", "Priya Raman", "Director, Supply Chain AI", "DHL", { topics: ["Artificial Intelligence", "Supply Chain, Manufacturing & Infrastructure"], availabilitySlots: ["d1-am"] }),
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
  return {
    me: {
      ...person(ME, "Alex Morgan", "Director of Innovation", "Northwind Bank", {
        topics: ["Artificial Intelligence", "Cybersecurity", "Banking, Financial Services & Insurance"],
        tier: "Connect Pass", linkedinUrl: "", tagline: "Bringing AI from pilots to production in banking",
      }),
      email: "alex.morgan@example.com", role: "user", types: ["attendee"],
      rights: { sendMessages: true, receiveMessages: true, sendRequests: true, receiveRequests: true, post: true, comment: true, startDiscussions: true, createGroups: true, shareContact: true, deleteAnyPost: false, moderate: false, checkIn: false },
    },
    tickets: [{ ticketId: "A1B2C3D4E5F6", type: "connect", purchaseDate: "2026-09-02T14:10:00.000Z", checkedIn: false }],
    people,
    connections: [
      { id: "c-hannah", userId: "p-hannah", direction: "outgoing", status: "accepted", kind: "online", note: "", createdAt: hoursAgo(40) },
      { id: "c-connor", userId: "p-connor", direction: "incoming", status: "pending", kind: "online", note: "Would love to compare notes on quantum-safe crypto.", createdAt: hoursAgo(3) },
      { id: "c-grace", userId: "p-grace", direction: "outgoing", status: "pending", kind: "online", note: "", createdAt: hoursAgo(20) },
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
  };
}

let state = null;
function load() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || null; } catch { state = null; }
  if (!state) state = seed();
  return state;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full */ }
}
export function resetDemo() {
  state = seed();
  save();
}

// ---------- DTOs ----------

const card = (id) => {
  const s = load();
  if (id === ME) return { ...s.me };
  return s.people.find((p) => p.id === id) || null;
};

function connectionDTO(c) {
  const user = card(c.userId);
  return { id: c.id, user, direction: c.direction, status: c.status, kind: c.kind, note: c.note, createdAt: c.createdAt, respondedAt: null, ...(c.kind === "inPerson" ? { email: `${user.name.split(" ")[0].toLowerCase()}@example.com` } : {}) };
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

  // Account
  if (is("GET", "social/me")) return done(s.me);
  if (is("GET", "auth/me")) return done({ _id: ME, name: s.me.name, email: s.me.email, role: "user", jobTitle: s.me.jobTitle, organization: s.me.organization, linkedinUrl: s.me.linkedinUrl, country: s.me.country, topics: s.me.topics, tagline: s.me.tagline, appOnboarded: true, termsVersion: "2026-10-09", tickets: s.tickets, rights: s.me.rights });
  if (is("POST", "auth/refresh")) return { token: DEMO_TOKEN };
  if (is("PATCH", "profile")) {
    const allowed = ["name", "jobTitle", "organization", "linkedinUrl", "country", "tagline", "topics", "meetingSpot", "availabilitySlots"];
    for (const k of allowed) if (body[k] !== undefined) s.me[k] = body[k];
    return done({ success: true, user: { ...s.me } });
  }
  if (is("PUT", "profile/avatar")) { s.me.avatarUrl = body.avatarData || ""; return done({ avatarUrl: s.me.avatarUrl }); }

  // People
  if (is("GET", "social/attendees") || is("GET", "social/users")) return done(s.people.filter(match(q.get("q"))));
  if ((m = is("GET", "social/users/:id"))) {
    const p = card(m.id);
    if (!p) throw new ApiError("Not found", 404);
    return done({ ...p, fieldOfWork: "", jobLevel: "", objectives: [] });
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
    if (existing) {
      if (existing.direction === "incoming" || inPerson) { existing.status = "accepted"; if (inPerson) existing.kind = "inPerson"; }
      return done(connectionDTO(existing));
    }
    if (!inPerson && !p.acceptsRequests) throw new ApiError(`${p.name.split(" ")[0]} isn't taking connection requests in the app.`, 403);
    const c = { id: "c-" + uid(), userId: p.id, direction: "outgoing", status: inPerson ? "accepted" : "pending", kind: inPerson ? "inPerson" : "online", note: body.note || "", createdAt: new Date().toISOString() };
    s.connections.push(c);
    return done(connectionDTO(c));
  }
  if ((m = is("POST", "social/connections/:id/respond"))) {
    const c = s.connections.find((x) => x.id === m.id);
    if (!c) throw new ApiError("Not found", 404);
    c.status = body.accept ? "accepted" : "declined";
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
  if (is("GET", "social/activity/unread")) return { feed: 0, discussions: 0 };
  if (is("POST", "social/activity/seen")) return { ok: true };

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
