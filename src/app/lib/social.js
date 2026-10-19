import { del, get, post } from "./api";
import { auth, can, isStaff } from "./auth";
import { createStore, local } from "./store";

/* =========================================================
   The signed-in layer (the web SyncService): people, connections,
   1:1 messages, the feed, session bookmarks, notifications,
   groups and discussions, from /api/social and /api/community.
   Polls like the apps: threads/requests every 30 s while the app
   is open, an open chat every 5 s, a group chat every 6 s.
   Guests keep bookmarks on this device only.
========================================================= */

const GUEST_BOOKMARKS = "ttfc.app.bookmarks";
const READ_NOTIFS = "ttfc.app.readNotifs";
const CHATS_SEEN = "ttfc.app.chatsSeenAt";
const REPLIED = "ttfc.app.repliedTo";
const CHAT_READ = "ttfc.app.chatReadAt";
const GROUP_READ = "ttfc.app.groupReadAt";
const GROUP_BASELINE = "ttfc.app.groupReadBaseline";
/** Group messages from before read-tracking count as read (iOS ChatReadState baseline). */
const groupBaseline = (() => {
  const b = Number(local.get(GROUP_BASELINE, 0));
  if (b) return b;
  const t = Date.now();
  local.set(GROUP_BASELINE, String(t));
  return t;
})();

const blank = () => ({
  people: [], peopleLoaded: false,
  connections: { accepted: [], incoming: [], outgoing: [] }, connectionsLoaded: false,
  threads: [], threadsLoaded: false,
  messages: {},
  feed: [], feedLoaded: false, feedError: "",
  registrations: { mine: [], counts: {} },
  guestBookmarks: local.json(GUEST_BOOKMARKS, []),
  notifications: [], notifUnread: 0,
  groups: [], groupsLoaded: false, groupMessages: {},
  discussions: [], discussionsLoaded: false, replies: {},
  media: null,
  blocked: [],
  readNotifs: local.json(READ_NOTIFS, []),
  chatsSeenAt: Number(local.get(CHATS_SEEN, 0)),
  chatReadAt: local.json(CHAT_READ, {}),
  groupReadAt: local.json(GROUP_READ, {}),
  activity: { feed: 0, discussions: 0 },
  repliedTo: local.json(REPLIED, []),
  lastError: "",
});

export const social = createStore(blank());
const set = (patch) => social.set(patch);
const signedIn = () => ["user", "demo"].includes(auth.get().mode);

let pollTimer = null;

export function startSocial() {
  stopSocial();
  refreshAll();
  pollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    refreshThreads();
    refreshConnections();
    refreshNotifications();
  }, 30000);
}

export function stopSocial() {
  clearInterval(pollTimer);
  pollTimer = null;
}

window.addEventListener("ttfc:signed-out", () => {
  stopSocial();
  social.set({ ...blank(), guestBookmarks: social.get().guestBookmarks });
});

export function refreshAll() {
  return Promise.allSettled([
    refreshPeople(""), refreshConnections(), refreshThreads(), refreshFeed(), refreshRegistrations(),
    refreshNotifications(), refreshGroups(), refreshDiscussions(), loadMediaConfig(), refreshBlocks(),
  ]);
}

const fail = (e) => { set({ lastError: e?.message || "Something went wrong. Try again." }); return false; };

// ---------- Safety: block & report ----------

export async function refreshBlocks() {
  if (!signedIn()) return;
  try {
    const ids = await get("app/blocks");
    set({ blocked: Array.isArray(ids) ? ids.map(String) : [] });
  } catch { /* keep */ }
}

export const isBlocked = (id, s = social.get()) => !!id && s.blocked.includes(id);

export async function blockUser(userId) {
  try {
    await post("app/block", { userId });
    set({ blocked: [...new Set([...social.get().blocked, userId])] });
    return true;
  } catch (e) { return fail(e); }
}

export async function unblockUser(userId) {
  try {
    await del(`app/block/${encodeURIComponent(userId)}`);
    set({ blocked: social.get().blocked.filter((x) => x !== userId) });
    return true;
  } catch (e) { return fail(e); }
}

/** targetType: post | comment | message | discussion | reply | group | groupMessage | user | question */
export async function report(targetType, targetId, reason = "") {
  try {
    await post("app/report", { targetType, targetId, reason });
    return true;
  } catch (e) { return fail(e); }
}

// ---------- People ----------

let peopleQuery = "";
export async function refreshPeople(q = "") {
  if (!signedIn()) return;
  peopleQuery = q;
  try {
    const list = await get(`social/attendees?q=${encodeURIComponent(q)}`);
    if (peopleQuery !== q) return;
    // The full list is kept; a query only refines what's shown (the screen filters locally too).
    if (!q) set({ people: Array.isArray(list) ? list : [], peopleLoaded: true });
    else {
      const byId = new Map(social.get().people.map((p) => [p.id, p]));
      for (const p of list || []) byId.set(p.id, p);
      set({ people: [...byId.values()], peopleLoaded: true });
    }
  } catch { set({ peopleLoaded: true }); }
}

export const personById = (id, s = social.get()) => s.people.find((p) => p.id === id) || null;

export async function fetchPerson(id) {
  const known = personById(id);
  if (known) return known;
  return get(`social/users/${encodeURIComponent(id)}`);
}

// ---------- Connections ----------

export async function refreshConnections() {
  if (!signedIn()) return;
  try {
    const c = await get("social/connections");
    set({ connections: { accepted: c.accepted || [], incoming: c.incoming || [], outgoing: c.outgoing || [] }, connectionsLoaded: true });
  } catch { set({ connectionsLoaded: true }); }
}

/** → { status: "accepted" | "pending" | "incoming", conn } or null */
export function connectionWith(userId, s = social.get()) {
  const { accepted, incoming, outgoing } = s.connections;
  let c = accepted.find((x) => x.user?.id === userId);
  if (c) return { status: "accepted", conn: c };
  c = incoming.find((x) => x.user?.id === userId);
  if (c) return { status: "incoming", conn: c };
  c = outgoing.find((x) => x.user?.id === userId);
  if (c) return { status: "pending", conn: c };
  return null;
}

/** Staff switched messages off for VIPs; connected people, people who wrote first and staff still can. */
export function canMessage(user, s = social.get()) {
  if (!user || !can("sendMessages") || user.onApp === false) return false;
  const me = auth.get().me;
  if (me && user.id === me.id) return false;
  const u = personById(user.id, s) || user;
  if (u.acceptsMessages !== false || isStaff()) return true;
  if (connectionWith(u.id, s)?.status === "accepted") return true;
  const thread = s.threads.find((t) => t.user?.id === u.id);
  return !!thread && (!thread.lastMessage?.sentByMe || (s.messages[u.id] || []).some((m) => !m.sentByMe));
}

export function canRequest(user, s = social.get()) {
  if (!user || !can("sendRequests") || user.onApp === false) return false;
  const me = auth.get().me;
  if (me && user.id === me.id) return false;
  const u = personById(user.id, s) || user;
  return u.acceptsRequests !== false || isStaff();
}

/** `share`: my contact card item ids to share (only when I may share; lib/myCard.js). → the connection, or false. */
export async function requestConnection(user, note = "", share) {
  try {
    const c = await post("social/connections/request", { toUserId: user.id, note, ...(Array.isArray(share) ? { share } : {}) });
    await refreshConnections();
    return c || true;
  } catch (e) { return fail(e); }
}

export async function respondConnection(conn, accept, share) {
  try {
    const c = await post(`social/connections/${conn.id}/respond`, { accept, ...(accept && Array.isArray(share) ? { share } : {}) });
    await refreshConnections();
    return c || true;
  } catch (e) { return fail(e); }
}

export async function withdrawConnection(conn) {
  try {
    await post(`social/connections/${conn.id}/withdraw`, {});
    await refreshConnections();
    return true;
  } catch (e) { return fail(e); }
}

export async function connectInPerson(userId, share) {
  try {
    const c = await post("social/connections/in-person", { toUserId: userId, ...(Array.isArray(share) ? { share } : {}) });
    await refreshConnections();
    return c;
  } catch (e) { fail(e); return null; }
}

// ---------- Messages ----------

export async function refreshThreads() {
  if (!signedIn()) return;
  try {
    const threads = await get("social/messages");
    set({ threads: Array.isArray(threads) ? threads : [], threadsLoaded: true });
  } catch { set({ threadsLoaded: true }); }
}

export async function refreshMessages(userId) {
  try {
    const list = await get(`social/messages/${encodeURIComponent(userId)}`);
    const s = social.get();
    set({
      messages: { ...s.messages, [userId]: list || [] },
      threads: s.threads.map((t) => (t.user?.id === userId ? { ...t, unread: 0 } : t)),
    });
    markChatRead(userId);
  } catch { /* next round */ }
}

export async function sendMessage(user, body) {
  try {
    const m = await post(`social/messages/${encodeURIComponent(user.id)}`, { body });
    const s = social.get();
    const list = [...(s.messages[user.id] || []), m];
    const replied = s.repliedTo.includes(user.id) ? s.repliedTo : [...s.repliedTo, user.id];
    local.setJSON(REPLIED, replied);
    const thread = { user: personById(user.id) || user, lastMessage: { body: m.body, sentByMe: true, createdAt: m.createdAt }, unread: 0 };
    set({ messages: { ...s.messages, [user.id]: list }, repliedTo: replied, threads: [thread, ...s.threads.filter((t) => t.user?.id !== user.id)] });
    return true;
  } catch (e) { return fail(e); }
}

export function markChatRead(userId) {
  const s = social.get();
  const next = { ...s.chatReadAt, [userId]: Date.now() };
  local.setJSON(CHAT_READ, next);
  set({ chatReadAt: next });
}

export function markChatsSeen() {
  const t = Date.now();
  local.set(CHATS_SEEN, String(t));
  set({ chatsSeenAt: t });
}

/** Someone not connected wrote and you haven't replied: a message request. */
export function isMessageRequest(thread, s = social.get()) {
  const id = thread.user?.id;
  if (!id || connectionWith(id, s)?.status === "accepted") return false;
  if (s.repliedTo.includes(id)) return false;
  const msgs = s.messages[id];
  if (msgs) return msgs.length > 0 && !msgs.some((m) => m.sentByMe);
  return !thread.lastMessage?.sentByMe;
}

/** A 1:1 thread with a message from them you haven't opened (iOS ChatReadState.isUnread). */
export function threadUnread(t, s = social.get()) {
  const m = t.lastMessage;
  if (!m || m.sentByMe || !(t.unread > 0)) return false;
  return Date.parse(m.createdAt) > (s.chatReadAt[t.user?.id] || 0);
}

/** Their messages in a joined group since you last opened it. */
export function groupUnread(g, s = social.get()) {
  const list = s.groupMessages[g.id];
  if (!g.joined || !Array.isArray(list)) return 0;
  const seen = Math.max(s.groupReadAt[g.id] || 0, groupBaseline);
  return list.filter((m) => !m.mine && Date.parse(m.createdAt) > seen).length;
}

export function markGroupRead(id) {
  const next = { ...social.get().groupReadAt, [id]: Date.now() };
  local.setJSON(GROUP_READ, next);
  set({ groupReadAt: next });
}

/** Activity dots (iOS ActivityService): replies in discussions you follow, reactions on your posts. */
export async function refreshActivity() {
  if (!signedIn()) return;
  try {
    const r = await get("social/activity/unread");
    set({ activity: { feed: Number(r?.feed) || 0, discussions: Number(r?.discussions) || 0 } });
  } catch { /* keep */ }
}

export async function markActivitySeen(section) {
  const a = social.get().activity;
  if (!(a[section] > 0)) return;
  set({ activity: { ...a, [section]: 0 } });
  post("social/activity/seen", { section }).catch(() => {});
}

export const fetchGroupMembers = (id) => get(`community/groups/${encodeURIComponent(id)}/members`);

/** The Chats tab's one red dot: something came in since you last looked. */
export function chatsHasNew(s) {
  if (s.threads.some((t) => t.unread > 0 && !t.lastMessage?.sentByMe && Date.parse(t.lastMessage?.createdAt) > s.chatsSeenAt)) return true;
  return s.connections.incoming.some((c) => Date.parse(c.createdAt) > s.chatsSeenAt);
}

// ---------- Feed ----------

export async function refreshFeed() {
  if (!signedIn()) return;
  try {
    const feed = await get("social/feed?limit=60");
    set({ feed: Array.isArray(feed) ? feed : [], feedLoaded: true, feedError: "" });
  } catch (e) { set({ feedLoaded: true, feedError: e?.message || "" }); }
}

const patchPost = (id, fn) => set({ feed: social.get().feed.map((p) => (p.id === id ? fn(p) : p)) });

export async function toggleLike(p) {
  const liked = !p.likedByMe;
  patchPost(p.id, (x) => ({ ...x, likedByMe: liked, likeCount: Math.max(0, x.likeCount + (liked ? 1 : -1)) }));
  try {
    const r = await post(`social/feed/${p.id}/like`, {});
    patchPost(p.id, (x) => ({ ...x, likedByMe: r.liked, likeCount: r.likeCount }));
  } catch (e) {
    patchPost(p.id, (x) => ({ ...x, likedByMe: p.likedByMe, likeCount: p.likeCount }));
    fail(e);
  }
}

export const fetchComments = (postId) => get(`social/feed/${postId}/comments`);

export async function addComment(postId, body) {
  const c = await post(`social/feed/${postId}/comments`, { body });
  patchPost(postId, (x) => ({ ...x, commentCount: c.commentCount ?? x.commentCount + 1 }));
  return c;
}

export async function createPost(payload) {
  const p = await post("social/feed", payload);
  set({ feed: [p, ...social.get().feed.filter((x) => x.id !== p.id)] });
  return p;
}

export async function deletePost(p) {
  try {
    await del(`social/feed/${p.id}`);
    set({ feed: social.get().feed.filter((x) => x.id !== p.id) });
    return true;
  } catch (e) { return fail(e); }
}

export const fetchPost = (id) => get(`social/feed/${encodeURIComponent(id)}`);

export async function loadMediaConfig() {
  if (!signedIn()) return;
  try { set({ media: await get("social/media/config") }); } catch { set({ media: { enabled: false, maxItems: 1, maxVideoSeconds: 30 } }); }
}

// ---------- Session bookmarks ----------

export async function refreshRegistrations() {
  if (!signedIn()) return;
  try {
    const r = await get("social/sessions/registrations");
    set({ registrations: { mine: r.mine || [], counts: r.counts || {} } });
  } catch { /* keep */ }
}

export function bookmarks(s = social.get()) {
  return signedIn() ? s.registrations.mine : s.guestBookmarks;
}

/** Save / unsave a session. Signed in: the server mirrors it; guests: this device. */
export async function toggleBookmark(sessionId) {
  const s = social.get();
  if (!signedIn()) {
    const next = s.guestBookmarks.includes(sessionId) ? s.guestBookmarks.filter((x) => x !== sessionId) : [...s.guestBookmarks, sessionId];
    local.setJSON(GUEST_BOOKMARKS, next);
    set({ guestBookmarks: next });
    return next.includes(sessionId);
  }
  const was = s.registrations.mine.includes(sessionId);
  const optimistic = was ? s.registrations.mine.filter((x) => x !== sessionId) : [...s.registrations.mine, sessionId];
  set({ registrations: { ...s.registrations, mine: optimistic } });
  try {
    const r = await post(`social/sessions/${encodeURIComponent(sessionId)}/register`, {});
    const cur = social.get().registrations;
    const mine = r.registered ? [...new Set([...cur.mine, sessionId])] : cur.mine.filter((x) => x !== sessionId);
    set({ registrations: { mine, counts: { ...cur.counts, [sessionId]: r.count } } });
    return r.registered;
  } catch (e) {
    set({ registrations: s.registrations });
    fail(e);
    return was;
  }
}

// ---------- Notifications ----------

export async function refreshNotifications() {
  if (!signedIn()) return;
  try {
    const r = await get("social/notifications");
    set({ notifications: r.notifications || [], notifUnread: r.unread || 0 });
  } catch { /* keep */ }
}

export function markNotificationsRead(ids) {
  const s = social.get();
  const next = [...new Set([...s.readNotifs, ...ids])].slice(-400);
  local.setJSON(READ_NOTIFS, next);
  set({ readNotifs: next });
  const server = ids.filter((id) => id.startsWith("pn-")).map((id) => id.slice(3));
  if (server.length) {
    set({ notifications: s.notifications.map((n) => (server.includes(n.id) ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)) });
    post("social/notifications/read", { ids: server }).catch(() => {});
  }
}

// ---------- Groups & discussions ----------

export async function refreshGroups() {
  if (!signedIn()) return;
  try { set({ groups: await get("community/groups"), groupsLoaded: true }); } catch { set({ groupsLoaded: true }); }
}

export async function toggleJoinGroup(g) {
  try {
    const next = await post(`community/groups/${g.id}/join`, {});
    set({ groups: social.get().groups.map((x) => (x.id === g.id ? next : x)) });
    return next;
  } catch (e) { fail(e); return null; }
}

export async function refreshGroupMessages(id) {
  try {
    const list = await get(`community/groups/${id}/messages`);
    set({ groupMessages: { ...social.get().groupMessages, [id]: list || [] } });
  } catch (e) {
    if (e?.status === 403) set({ groupMessages: { ...social.get().groupMessages, [id]: null } });
  }
}

export async function sendGroupMessage(id, body) {
  try {
    const m = await post(`community/groups/${id}/messages`, { body });
    const s = social.get();
    set({ groupMessages: { ...s.groupMessages, [id]: [...(s.groupMessages[id] || []), m] } });
    return true;
  } catch (e) { return fail(e); }
}

export async function createGroup(fields) {
  const g = await post("community/groups", fields);
  set({ groups: [...social.get().groups, g] });
  return g;
}

export async function refreshDiscussions() {
  if (!signedIn()) return;
  try { set({ discussions: await get("community/discussions"), discussionsLoaded: true }); } catch { set({ discussionsLoaded: true }); }
}

export async function followDiscussion(d, follow) {
  set({ discussions: social.get().discussions.map((x) => (x.id === d.id ? { ...x, following: follow } : x)) });
  try {
    const r = await post(`community/discussions/${d.id}/follow`, { follow });
    set({ discussions: social.get().discussions.map((x) => (x.id === d.id ? { ...x, following: r.following, followerCount: r.followerCount ?? x.followerCount } : x)) });
  } catch (e) {
    set({ discussions: social.get().discussions.map((x) => (x.id === d.id ? { ...x, following: d.following } : x)) });
    fail(e);
  }
}

export async function refreshReplies(id) {
  try { set({ replies: { ...social.get().replies, [id]: await get(`community/discussions/${id}/replies`) } }); } catch { /* keep */ }
}

export async function replyToDiscussion(id, body, parentId) {
  const r = await post(`community/discussions/${id}/replies`, { body, ...(parentId ? { parentId } : {}) });
  const s = social.get();
  set({
    replies: { ...s.replies, [id]: [...(s.replies[id] || []), r] },
    discussions: s.discussions.map((d) => (d.id === id ? { ...d, replyCount: r.replyCount ?? d.replyCount + 1 } : d)),
  });
  return r;
}

export async function createDiscussion(fields) {
  const d = await post("community/discussions", fields);
  set({ discussions: [d, ...social.get().discussions] });
  return d;
}
