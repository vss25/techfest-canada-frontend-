/* Ready to go live (Nov 17 2026): "show percentage complete on the content page for an event
   … so staff know when they can actually publish content to live".

   One checklist per event, from what's in the panel now (saved, on staging or live). The
   percentage counts the required items; "nice to have" items are shown but don't hold it back.
   Upcoming events need what the new event page shows; a past event (TTFC 2026) needs what its
   archive page shows. Pure: no fetching, so it's tested on its own. */

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
  const described = sessions.filter((s) => filled(s.description));
  const photo = filled(ev?.citySkyline) || filled(ev?.citySkylineUrl);
  const items = past ? [
    { key: "dates", label: "Dates", ok: filled(ev?.startDate), to: "", required: true },
    { key: "venue", label: "Venue", ok: filled(ev?.venueName), to: "", required: true },
    { key: "about", label: "About this event", ok: filled(ev?.description), to: "", required: true },
    { key: "agenda", label: "Agenda", ok: sessions.length > 0, detail: plural(sessions.length, "session"), to: "/admin/content/agenda", required: true },
    { key: "speakers", label: "Speakers with photos", ok: withPhoto.length > 0, detail: `${withPhoto.length} of ${plural(speakers.length, "speaker")}`, to: "/admin/content/speakers", required: true },
    { key: "partners", label: "Partner logos", ok: withLogo.length > 0, detail: plural(withLogo.length, "logo"), to: "/admin/content/partners", required: true },
    { key: "photo", label: "City photo", ok: photo, to: "", required: false },
  ] : [
    { key: "dates", label: "Date", ok: filled(ev?.startDate), detail: filled(ev?.startDate) ? "" : "Shows the month until it's set", to: "", required: true },
    { key: "theme", label: "Theme", ok: filled(ev?.theme), to: "", required: true },
    { key: "tagline", label: "One line under the name", ok: filled(ev?.tagline), to: "", required: true },
    { key: "about", label: "About this event", ok: filled(ev?.description), to: "", required: true },
    { key: "photo", label: "City photo", ok: photo, to: "", required: true },
    { key: "credit", label: "Photo credit", ok: !photo || filled(ev?.photoCredit), detail: photo ? "" : "Once there's a photo", to: "", required: true },
    { key: "format", label: "Format", ok: filled(ev?.formatLine), to: "", required: true },
    { key: "audience", label: "Who's in the room", ok: filled(ev?.audience), to: "", required: true },
    { key: "agenda", label: "Agenda", ok: sessions.length > 0, detail: plural(sessions.length, "session"), to: "/admin/content/agenda", required: true },
    { key: "tickets", label: "Tickets & prices", ok: Array.isArray(ticketTypes) && ticketTypes.length > 0,
      detail: ticketTypes == null ? "Couldn't check" : plural(ticketTypes.length, "ticket type"), to: "/admin/inventory", required: true },
    { key: "venue", label: "Venue", ok: filled(ev?.venueName), detail: filled(ev?.venueName) ? "" : "Shows “announced with tickets”", to: "", required: false },
    { key: "speakers", label: "Speakers", ok: speakers.length > 0, detail: speakers.length ? plural(speakers.length, "speaker") : "Shows “to be announced”", to: "/admin/content/speakers", required: false },
    { key: "partners", label: "Partners", ok: partners.length > 0, detail: plural(partners.length, "partner"), to: "/admin/content/partners", required: false },
    { key: "descriptions", label: "Session descriptions", ok: sessions.length > 0 && described.length === sessions.length,
      detail: sessions.length ? `${described.length} of ${sessions.length}` : "", to: "/admin/content/agenda", required: false },
  ];
  items.push({ key: "sent", label: "Everything sent to staging", ok: unsent === 0,
    detail: unsent ? `${plural(unsent, "change")} saved, not sent` : "", to: "/admin/content/changes", required: true });
  const req = items.filter((i) => i.required);
  const done = req.filter((i) => i.ok).length;
  const pct = req.length ? Math.round((done / req.length) * 100) : 100;
  return { pct, done, total: req.length, ready: done === req.length, past, items };
}
