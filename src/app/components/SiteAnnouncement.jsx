import { withOrdinals } from "../../lib/ordinals";
import { ChevronRight, Megaphone, X } from "lucide-react";
import { track } from "../../lib/pwaEvents";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { content, optionalText } from "../lib/content";
import { announcement, announcementShown, dismissAnnouncement } from "../lib/announcement";
import { safeHref } from "../lib/ui";

/* The website's top-bar announcement (admin: site.announcement and
   site.announcement_link), for guests on Home and Schedule (iOS
   SiteAnnouncementBanner). Dismissed for the session, per text;
   hidden when the text is empty. */

export default function SiteAnnouncement({ where }) {
  const a = useStore(auth);
  const ct = useStore(content);
  const st = useStore(announcement);
  const text = optionalText(ct, "site.announcement");
  const link = safeHref(optionalText(ct, "site.announcement_link"));
  if (!announcementShown(a, text, st)) return null;

  const dismiss = () => { dismissAnnouncement(text); track("announcement_dismissed", { where }); };
  const open = () => { track("announcement_click", { where }); if (link) window.open(link, "_blank", "noopener"); };
  const Body = link ? "button" : "div";
  return (
    <div className="site-ann" role="region" aria-label="Announcement">
      <Body {...(link ? { type: "button", onClick: open } : {})} className="site-ann-body">
        <Megaphone aria-hidden="true" className="site-ann-ico" />
        <span className="site-ann-text">{withOrdinals(text)}</span>
        {link && <ChevronRight aria-hidden="true" className="site-ann-chev" />}
      </Body>
      <button type="button" className="site-ann-x" aria-label="Close" onClick={dismiss}><span aria-hidden="true"><X /></span></button>
    </div>
  );
}
