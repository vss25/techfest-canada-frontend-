/* Stand-in speakers and partners (Nov 22 2026, the owner): until an event has its own speakers or
   partners, its page shows another event's (Admin › Content › Event page). Shared by the admin and
   the website so the defaults read the same in both. */

/** The event shown when none is chosen: Toronto 2026, the main event. */
export const STAND_IN_DEFAULT_FROM = "event-ttfc-2026-main";
/** At most this many picked by hand. */
export const STAND_IN_MAX = 12;

/** "Toronto 2026": the short name each stand-in card carries. */
export function standInLabel(ev) {
  if (!ev) return "Toronto 2026";
  const city = String(ev.city || "").trim();
  return city && ev.year ? `${city} ${ev.year}` : String(ev.name || "Toronto 2026");
}

const DEFAULTS = {
  speakers: {
    heading: "Speakers to be announced",
    text: "This event's speakers are being confirmed. In the meantime, here's who took the stage at {event}.",
    none: "This event's speakers are being confirmed. Check back soon.",
  },
  partners: {
    heading: "Partners to be announced",
    text: "This event's partners are being confirmed. In the meantime, these organisations partnered with us at {event}.",
    none: "This event's partners are being confirmed. Check back soon.",
  },
};

/** The heading and note above the stand-ins: the event's own wording, else the default; {event} filled in. */
export function standInWords(kind, label, heading = "", text = "") {
  const d = DEFAULTS[kind] || DEFAULTS.speakers;
  const fill = (s) => String(s).replace(/\{event\}/g, label);
  return { heading: String(heading || "").trim() || d.heading, text: fill(String(text || "").trim() || d.text), none: d.none };
}
