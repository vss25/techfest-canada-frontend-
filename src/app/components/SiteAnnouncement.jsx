import { useState } from "react";
import { ChevronRight, Megaphone, X } from "lucide-react";
import { track } from "../../lib/pwaEvents";
import { useStore, session } from "../lib/store";
import { auth } from "../lib/auth";
import { content, optionalText } from "../lib/content";
import { safeHref } from "../lib/ui";

/* The website's top-bar announcement (admin: site.announcement and
   site.announcement_link), for guests on Home and Schedule. Dismissed
   for the session; hidden when the text is empty. */

const KEY = "ttfc.siteAnnouncement.dismissed";

export default function SiteAnnouncement({ where }) {
  const a = useStore(auth);
  const ct = useStore(content);
  const text = optionalText(ct, "site.announcement");
  const link = safeHref(optionalText(ct, "site.announcement_link"));
  const [hidden, setHidden] = useState(() => session.get(KEY) === (text || ""));
  if (a.mode !== "guest" || !text || hidden) return null;

  const dismiss = () => { session.set(KEY, text); setHidden(true); track("announcement_dismissed", { where }); };
  const open = () => { track("announcement_click", { where }); if (link) window.open(link, "_blank", "noopener"); };
  const Body = link ? "button" : "div";
  return (
    <div className="site-ann" role="region" aria-label="Announcement">
      <Body {...(link ? { type: "button", onClick: open } : {})} className="site-ann-body">
        <Megaphone aria-hidden="true" className="site-ann-ico" />
        <span className="site-ann-text">{text}</span>
        {link && <ChevronRight aria-hidden="true" className="site-ann-chev" />}
      </Body>
      <button type="button" className="site-ann-x" aria-label="Dismiss announcement" onClick={dismiss}><X aria-hidden="true" /></button>
    </div>
  );
}
