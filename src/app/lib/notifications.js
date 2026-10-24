import { bestTicket } from "./auth";
import { dayLabel, roomOf, sessionById } from "./cms";
import { bookmarks } from "./social";
import { FEATURES } from "./config";
import { serverItem } from "./notifRows";

/* =========================================================
   The Notifications list (iOS NotificationsListView.items):
   built from what has happened — invitations, new connections,
   upcoming saved sessions, announcements, moderation outcomes,
   staff messages (server), "<name> connected with you" (server,
   kind "conn": someone scanned your pass, Oct 24 2026) and the
   linked pass. Read state is kept on this device; server rows
   also report "read" to the server. The bell counts exactly what
   the list calls unread.
========================================================= */

export function notificationItems({ social: s, cms: c, auth: a, now }) {
  const out = [];
  const meId = a.me?.id;
  for (const conn of s.connections.incoming) {
    const u = conn.user || {};
    out.push({ id: `inv-${conn.id}`, kind: "invitation", title: `${u.name} wants to connect`, detail: [u.jobTitle, u.organization].filter(Boolean).join(" · "), date: conn.createdAt, conn });
  }
  const server = s.notifications.map(serverItem);
  // A connection someone made by scanning my pass is told by its server row ("… connected with you"), not twice.
  const told = new Set(server.filter((n) => n.connectionId).map((n) => n.connectionId));
  for (const conn of s.connections.accepted) {
    if (told.has(conn.id)) continue;
    const u = conn.user || {};
    const inPerson = conn.kind === "inPerson";
    out.push({
      id: `acc-${conn.id}`, kind: "connection", title: inPerson ? `You met ${u.name}` : `Connected with ${u.name}`,
      detail: inPerson ? "Badge scanned. Contact details saved to their card." : "You're in each other's network. Say hello in Chats.",
      date: conn.createdAt, link: FEATURES.chats ? `/chat/${encodeURIComponent(u.id)}` : "",
    });
  }
  for (const id of bookmarks(s)) {
    const x = sessionById(id, c);
    if (!x || x.start <= now) continue;
    const mins = Math.floor((x.start - now) / 60000);
    const when = mins < 60 ? `in ${mins} min` : mins < 2880 ? `in ${Math.floor(mins / 60)} h` : `on ${dayLabel(x)}`;
    const room = roomOf(x.stage);
    out.push({ id: `ses-${x.id}`, kind: "session", title: x.title, detail: `Starts ${when} · ${x.startTime}${room ? ` · ${room}` : ""}.`, date: new Date(x.start - 86400000 * 30).toISOString(), link: `/session/${encodeURIComponent(x.id)}` });
  }
  for (const p of s.feed.slice(0, 6).filter((x) => x.kind === "announcement")) {
    out.push({ id: `ann-${p.id}`, kind: "announcement", title: "TTFC announcement", detail: p.body, date: p.createdAt, link: `/post/${encodeURIComponent(p.id)}` });
  }
  for (const d of s.discussions.filter((x) => x.mine || x.authorId === meId)) {
    out.push({ id: `disc-${d.id}-${d.status}`, kind: "moderation", title: d.status === "approved" ? "Your discussion is live" : d.status === "pending" ? "Discussion under review" : "Discussion not approved", detail: d.title, date: d.createdAt, link: `/discussion/${encodeURIComponent(d.id)}` });
  }
  for (const g of s.groups.filter((x) => x.ownerId === meId)) {
    out.push({ id: `grp-${g.id}-${g.status}`, kind: "moderation", title: g.status === "approved" ? "Your group is listed" : g.status === "pending" ? "Group under review" : "Group not approved", detail: g.name, date: g.createdAt, link: `/group/${encodeURIComponent(g.id)}` });
  }
  out.push(...server);
  const t = bestTicket(a.user);
  if (t) out.push({ id: `tkt-${t.ticketId}`, kind: "ticket", title: `${t.tierName} linked`, detail: "Your QR pass is ready in Profile → My pass.", date: t.purchasedAt || "2026-09-01T00:00:00Z", link: "/profile/pass" });
  return out.sort((x, y) => Date.parse(y.date || 0) - Date.parse(x.date || 0));
}

export const isUnread = (n, readIds) => !n.serverRead && !readIds.includes(n.id);
export const unreadCount = (items, readIds) => items.filter((n) => isUnread(n, readIds)).length;

/** ttfc:// links from staff messages → app routes; https stays a web link. */
export function routeForLink(link) {
  const l = String(link || "").trim();
  if (!l) return null;
  if (l.startsWith("/")) return { to: l };
  if (/^https?:\/\//i.test(l)) return { href: l };
  const m = l.match(/^ttfc:\/\/([^/?#]+)\/?([^?#]*)/i);
  if (!m) return null;
  const [, host, rest] = m;
  const parts = rest.split("/").filter(Boolean);
  if (host === "session" && parts[0]) return { to: `/session/${encodeURIComponent(parts[0])}${parts[1] === "live" ? "/live" : ""}` };
  if (host === "tab") {
    const tab = parts[0] || "home";
    const map = { home: "/", feed: "/", network: "/network", schedule: "/schedule", venue: "/schedule", profile: "/profile", ticket: "/profile/pass", chats: "/chats", notifications: "/notifications" };
    return { to: map[tab] || "/" };
  }
  if (host === "post" && parts[0]) return { to: `/post/${encodeURIComponent(parts[0])}` };
  return null;
}

/** iOS NotificationsListView.linkLabel: where a staff message points. */
export function linkLabel(link) {
  const l = String(link || "").trim();
  if (/^https:\/\//i.test(l)) { try { return new URL(l).host.replace(/^www\./, ""); } catch { return "Open link"; } }
  const m = l.match(/^ttfc:\/\/([^/?#]+)\/?([^/?#]*)/i);
  if (!m) return "Open";
  const [, host, part] = m;
  if (host === "session") return "Open session";
  if (host === "tab" && part === "ticket") return "My pass";
  if (host === "tab" && part) return `Open ${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
  return "Open";
}
