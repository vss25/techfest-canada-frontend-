import { useMemo } from "react";
import { useStore } from "./store";
import { auth } from "./auth";
import { cms, nameKey, sessionById, speakerById, speakerByName } from "./cms";
import { bookmarks, canMessage, canRequest, social } from "./social";
import { recommend } from "./people";

/* The directory and who to meet, shared by Network (its Recommended section and the "Recommended" on each card) and
   Home's "People to meet" in the feed (Oct 26 2026). Moved here from screens/Network.jsx. */

/** People with speaker details filled in from the CMS where the account doesn't have them. */
export function useDirectory() {
  const s = useStore(social);
  const c = useStore(cms);
  return useMemo(() => s.people.map((p) => {
    const sp = speakerByName(p.name, c);
    if (!sp) return p;
    return {
      ...p,
      jobTitle: p.jobTitle || sp.title, organization: p.organization || sp.company,
      avatarUrl: p.avatarUrl || sp.photo, kind: p.kind || "speaker",
    };
  }), [s.people, c]);
}

/** Recommendations (lib/people.js recommend: not connected, contactable, best first) → [{ person, score, reasons }]. */
export function useRecommendations(people) {
  const s = useStore(social);
  const a = useStore(auth);
  const c = useStore(cms);
  // Worked out again only when what it reads changes (Home re-renders often: the feed, chats and typing all live in
  // the social store); the rest of the store is read as it is at that moment.
  const { connections, blocked, registrations, guestBookmarks, threads } = s;
  return useMemo(() => {
    const now = social.get();
    const me = a.me || {};
    const saved = bookmarks(now).map((id) => sessionById(id, c)).filter(Boolean);
    const keys = new Map();
    for (const x of saved) for (const id of x.speakerIds) { const sp = speakerById(id, c); if (sp) keys.set(nameKey(sp.name), x.title); }
    const connected = new Set([...connections.accepted, ...connections.outgoing, ...connections.incoming].map((x) => x.user?.id));
    return recommend(people, { id: me.id, topics: me.topics || [], jobTitle: me.jobTitle || "", organization: me.organization || "", tagline: me.tagline || "", savedSessions: saved, savedSpeakerKeys: keys },
      { connectedIds: connected, canContact: (p) => canMessage(p, now) || canRequest(p, now), isBlocked: (id) => blocked.includes(id) });
  }, [people, connections, blocked, registrations, guestBookmarks, threads, a.me, c]); // eslint-disable-line react-hooks/exhaustive-deps
}
