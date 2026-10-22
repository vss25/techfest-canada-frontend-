import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { preparedShare, shareTo } from "../lib/shareCard";
import { caption } from "../lib/share";
import { showAlert } from "../lib/ui";
import { Sheet } from "./ui";

/* =========================================================
   Share a feed post (iOS PostShareSheet): Instagram, WhatsApp,
   LinkedIn, X, More… and Copy text, as big app tiles in a
   bottom sheet. The post card starts rendering the moment the
   sheet opens, so a tap acts at once (lib/shareCard.js shareTo):
   every tap opens an app, the share sheet or at least copies
   the text and says so. Never a dead tap (Oct 22 2026).
========================================================= */

const TILES = [
  { id: "instagram", label: "Instagram", hint: "Send in a chat" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "linkedin", label: "LinkedIn", hint: "Post" },
  { id: "x", label: "X", hint: "Post" },
];

/** Plain app marks in each app's colour (no logos files: drawn here). Also LinkedInCta's LinkedIn mark. */
export function AppMark({ id }) {
  const svg = { width: 26, height: 26, viewBox: "0 0 24 24", "aria-hidden": true };
  if (id === "instagram") {
    return (
      <span className="share-app-ico share-app-ico--ig">
        <svg {...svg} fill="none" stroke="#fff" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1.1" fill="#fff" stroke="none" /></svg>
      </span>
    );
  }
  if (id === "whatsapp") {
    return (
      <span className="share-app-ico" style={{ background: "#25D366" }}>
        <svg {...svg} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><path d="M4.2 19.8l1.2-4A8 8 0 1 1 8.6 19z" /><path d="M9 8.6c.2 2.9 2.6 5.4 5.6 5.8l1-1.2-1.8-.9-.8.7c-1-.4-1.8-1.2-2.3-2.2l.7-.8-.8-1.9z" fill="#fff" strokeWidth="1" /></svg>
      </span>
    );
  }
  if (id === "linkedin") {
    return (
      <span className="share-app-ico" style={{ background: "#0A66C2" }}>
        <svg {...svg} fill="#fff"><rect x="5" y="9.5" width="3" height="9" rx="0.5" /><circle cx="6.5" cy="6.3" r="1.8" /><path d="M10.5 9.5h2.9v1.3c.5-.9 1.6-1.5 3-1.5 2.4 0 3.1 1.5 3.1 3.9v5.3h-3v-4.7c0-1.1-.3-1.9-1.4-1.9s-1.6.8-1.6 1.9v4.7h-3z" /></svg>
      </span>
    );
  }
  if (id === "x") {
    return (
      <span className="share-app-ico" style={{ background: "#000", border: "1px solid rgba(255,255,255,.18)" }}>
        <svg {...svg} fill="#fff"><path d="M16.9 4h2.6l-5.7 6.5L20.5 20h-5.2l-4.1-5.4L6.5 20H3.9l6.1-7L3.6 4h5.3l3.7 4.9zm-.9 14.4h1.4L8.1 5.5H6.6z" /></svg>
      </span>
    );
  }
  return null;
}

/** `source` from shareSourceOf(post): the sheet prepares its card once per open. */
export default function PostShareSheet({ source, onClose }) {
  const [card, setCard] = useState({ state: "preparing", value: null });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    preparedShare(source).then(
      (value) => { if (alive.current) setCard({ state: "ready", value }); },
      () => { if (alive.current) setCard({ state: "failed", value: null }); },
    );
    return () => { alive.current = false; };
  }, [source]);

  // Straight from the tap (no await): the share sheet and new tabs only open from a tap.
  const pick = (platform) => {
    shareTo(source, card.value, platform);
    onClose();
  };
  const copyText = () => {
    const text = caption(source.authorName, source.body, source.link, null);
    try {
      navigator.clipboard.writeText(text).then(() => showAlert("Text copied", "Paste it wherever you like."), () => window.prompt("Copy this text:", text));
    } catch { window.prompt("Copy this text:", text); }
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Share post">
      <div className="sheet-body stack" style={{ paddingBottom: 8 }}>
        <div className="share-apps" role="group" aria-label="Share to">
          {TILES.map((t) => (
            <button key={t.id} type="button" className="share-app pressable" onClick={() => pick(t.id)}
              aria-label={t.hint ? `${t.label}: ${t.hint}` : t.label}>
              <AppMark id={t.id} />
              <span className="share-app-label">{t.label}</span>
            </button>
          ))}
          <button type="button" className="share-app pressable" onClick={() => pick(null)} aria-label="More apps: the share sheet">
            <span className="share-app-ico share-app-ico--plain"><Share2 aria-hidden="true" /></span>
            <span className="share-app-label">More…</span>
          </button>
          <button type="button" className="share-app pressable" onClick={copyText}>
            <span className="share-app-ico share-app-ico--plain"><Copy aria-hidden="true" /></span>
            <span className="share-app-label">Copy text</span>
          </button>
        </div>
        <p className="share-card-status small muted" role="status">
          {card.state === "preparing" && <><Loader2 aria-hidden="true" className="spin" />Preparing the post card…</>}
          {card.state === "ready" && <><Check aria-hidden="true" />Post card ready for WhatsApp and More…</>}
          {card.state === "failed" && "The post card couldn't be made, so the text and link are shared instead."}
        </p>
      </div>
    </Sheet>
  );
}
