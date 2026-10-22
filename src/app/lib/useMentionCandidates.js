import { useMemo } from "react";
import { useStore } from "./store";
import { auth } from "./auth";
import { cms } from "./cms";
import { social } from "./social";
import { fileURL } from "./config";

/* Who can be @-tagged in a post or a reply: speakers, then people, never you or someone you've blocked. */

/** [{ type: "speaker" | "user", id, name, detail, photo }] */
export function useMentionCandidates() {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const myId = a.me?.id;
  return useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const sp of c.speakers) { const k = sp.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ type: "speaker", id: sp.id, name: sp.name, detail: [sp.title, sp.company].filter(Boolean).join(" · "), photo: sp.photo }); } }
    for (const p of s.people) {
      const k = p.name.toLowerCase();
      if (seen.has(k) || p.id === myId || s.blocked.includes(p.id)) continue;
      seen.add(k);
      out.push({ type: "user", id: p.id, name: p.name, detail: [p.jobTitle, p.organization].filter(Boolean).join(" · "), photo: fileURL(p.avatarUrl) });
    }
    return out;
  }, [c.speakers, s.people, s.blocked, myId]);
}
