/* Ready to go live (Nov 17 2026). Publish to live turns on when an event has the bare minimum
   it needs to go live; everything else is shown as "recommended" and never holds it back
   ("Don't do this to 100%… keep it to bare minimum required to go live").

   Minimum, upcoming event: when it is (the date, or the date line while the day isn't fixed),
   ticket types to sell, and its changes sent to staging (what goes live is what was reviewed).
   The new event page has its own wording and photo for everything else.
   Minimum, past event: its dates and its changes sent to staging.
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
  const described = sessions.filter((s) => filled(s.description));
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
    { key: "dates", label: "Date", ok: filled(ev?.startDate) || filled(ev?.statusNote),
      detail: filled(ev?.startDate) ? "" : filled(ev?.statusNote) ? "Date line set; add the day when it's fixed" : "The day, or the date line", to: "", required: true },
    { key: "theme", label: "Theme", ok: filled(ev?.theme), to: "", required: false },
    { key: "tagline", label: "One line under the name", ok: filled(ev?.tagline), to: "", required: false },
    { key: "about", label: "About this event", ok: filled(ev?.description), to: "", required: false },
    { key: "photo", label: "City photo", ok: photo, to: "", required: false },
    { key: "credit", label: "Photo credit", ok: !photo || filled(ev?.photoCredit), detail: photo ? "" : "Once there's a photo", to: "", required: false },
    { key: "format", label: "Format", ok: filled(ev?.formatLine), to: "", required: false },
    { key: "audience", label: "Who's in the room", ok: filled(ev?.audience), to: "", required: false },
    { key: "agenda", label: "Agenda", ok: sessions.length > 0, detail: plural(sessions.length, "session"), to: "/admin/content/agenda", required: false },
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
