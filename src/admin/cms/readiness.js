/* Ready to go live (Nov 17 2026). Publish to live turns on when an event has what's required
   to go live; everything else is shown as "recommended" and never holds it back.

   Required, upcoming event (the organiser, Nov 17 2026): the city, the theme, the description
   (the new site's "One line under the name": the home page card and the event page), the city
   photo (the home page card) and when it is (the date, or the date line while the day isn't fixed).
   Required, past event: its dates.
   Pure: no fetching, so it's tested on its own. */

const filled = (v) => String(v ?? "").trim().length > 0;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const refIds = (d) => (d?.events || []).map((r) => r?._ref).filter(Boolean);

/** Content tied to this event (tagged with it). Untagged items show on every event, so they don't count. */
export const forEvent = (list, id) => (list || []).filter((d) => refIds(d).includes(id));

/** Has the event ended (past events get the archive checklist)? */
export function isPastEvent(ev, now = new Date()) {
  const end = ev?.endDate || ev?.startDate;
  if (!end) return false;
  return new Date(`${end}T23:59:59`) < now;
}

/**
 * ev: the event form (current values, unsaved edits included).
 * content: { sessions, speakers, partners } tied to the event; ticketTypes: [] | null (null = unknown);
 *          unsent: how many of this event's items are saved but not sent to staging.
 * → { pct, done, total, ready, items: [{ key, label, ok, detail, to, required }] }
 */
export function readinessFor(ev, { sessions = [], speakers = [], partners = [], ticketTypes = null, unsent = 0 } = {}, now = new Date()) {
  const past = isPastEvent(ev, now);
  const withPhoto = speakers.filter((s) => s.imageUrl || s.image?.asset);
  const withLogo = partners.filter((p) => p.logoUrl || p.logo?.asset);
  const photo = filled(ev?.citySkyline) || filled(ev?.citySkylineUrl);
  const items = past ? [
    { key: "dates", label: "Dates", ok: filled(ev?.startDate), to: "", required: true },
    { key: "venue", label: "Venue", ok: filled(ev?.venueName), to: "", required: false },
    { key: "about", label: "About this event", ok: filled(ev?.description), to: "", required: false },
    { key: "agenda", label: "Agenda", ok: sessions.length > 0, detail: plural(sessions.length, "session"), to: "/admin/content/agenda", required: false },
    { key: "speakers", label: "Speakers with photos", ok: withPhoto.length > 0, detail: `${withPhoto.length} of ${plural(speakers.length, "speaker")}`, to: "/admin/content/speakers", required: false },
    { key: "partners", label: "Partner logos", ok: withLogo.length > 0, detail: plural(withLogo.length, "logo"), to: "/admin/content/partners", required: false },
    { key: "photo", label: "City photo", ok: photo, to: "", required: false },
  ] : [
    { key: "city", label: "City", ok: filled(ev?.city), to: "", required: true },
    { key: "theme", label: "Theme", ok: filled(ev?.theme), to: "", required: true },
    { key: "tagline", label: "Description (one line under the name)", ok: filled(ev?.tagline), detail: "On the home page and the event page", to: "", required: true },
    { key: "photo", label: "City photo", ok: photo, detail: "On the home page", to: "", required: true },
    { key: "dates", label: "Date or date line", ok: filled(ev?.startDate) || filled(ev?.statusNote),
      detail: filled(ev?.startDate) ? "" : filled(ev?.statusNote) ? "Date line set; add the day when it's fixed" : "", to: "", required: true },
    { key: "credit", label: "Photo credit", ok: !photo || filled(ev?.photoCredit), detail: photo ? "Needed for Creative Commons photos" : "Once there's a photo", to: "", required: false },
    { key: "tickets", label: "Tickets & prices", ok: Array.isArray(ticketTypes) && ticketTypes.length > 0,
      detail: ticketTypes == null ? "Couldn't check" : plural(ticketTypes.length, "ticket type"), to: "/admin/inventory", required: false },
    { key: "format", label: "Format", ok: filled(ev?.formatLine), to: "", required: false },
    { key: "audience", label: "Who's in the room", ok: filled(ev?.audience), to: "", required: false },
    { key: "agenda", label: "Agenda", ok: sessions.length > 0, detail: sessions.length ? plural(sessions.length, "session") : "Shows \u201cannounced soon\u201d", to: "/admin/content/agenda", required: false },
    { key: "venue", label: "Venue", ok: filled(ev?.venueName), detail: filled(ev?.venueName) ? "" : "Shows \u201cannounced with tickets\u201d", to: "", required: false },
    { key: "speakers", label: "Speakers", ok: speakers.length > 0, detail: speakers.length ? plural(speakers.length, "speaker") : "Shows \u201cto be announced\u201d", to: "/admin/content/speakers", required: false },
    { key: "partners", label: "Partners", ok: partners.length > 0, detail: plural(partners.length, "partner"), to: "/admin/content/partners", required: false },
    { key: "about", label: "About this event", ok: filled(ev?.description), detail: "Longer text, used by the current site", to: "", required: false },
  ];
  // A reminder, not a requirement: only what's on staging is published.
  items.push({ key: "sent", label: "Everything sent to staging", ok: unsent === 0,
    detail: unsent ? `${plural(unsent, "change")} saved, not sent (won't be published)` : "", to: "/admin/content/changes", required: false });
  const req = items.filter((i) => i.required);
  const done = req.filter((i) => i.ok).length;
  const pct = req.length ? Math.round((done / req.length) * 100) : 100;
  return { pct, done, total: req.length, ready: done === req.length, past, items };
}
