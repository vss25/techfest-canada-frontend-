import React from "react";
import { AgendaHighlights, AgendaPage, CardMedia, Countdown, DateStub, DayGlance, HeroCtas, KeyDates, LastYear, NextUp, OnStage, PageHero, PartnersStrip, Passes, SpeakerPage, ContactDone } from "./NewLook";
import { EMAIL_RE, cityPath, countdownTarget, fieldsNear, sendForm } from "./liveShared";
import { speakerSlug } from "../../seo/slug";
import { sessionCardMedia } from "../../lib/sessionMedia";
import { urlFor } from "../../utils/sanity";
import HeroBackgroundVideo from "../../components/HeroBackgroundVideo";
import { homeEyebrow } from "../../lib/homeLayout";
import { SPK_MIN } from "./speakerGrid";
import SponsorCompare from "./SponsorCompare";

/* Fills the boards' new-look slots (tools/newlook_patch2.py) with live data. Shared by the desktop and phone
   layouts: LiveSite.jsx and LivePhone.jsx call it at the end of renderVals().
     self      the board component (state, props)
     openTix   opens the ticket drawer (desktop) or sheet (phone); phone: the phone layout (its section ids)
   Slots it sets: heroCtas, homeNext, homeSpeakers, homeLastYear, homePartners, dayGlance, evOnStage, passes,
   spkHero, isAgenda / agendaPage, isSpeaker / speakerPage, awDates, nav, navSpeakers. A slot left unset keeps the
   board's own section (e.g. "Speakers coming soon" while an event has no speakers). */

const PHOTOS = [
  { src: "/ft-conference.jpg", alt: "The main stage at The Tech Festival Canada 2026" },
  { src: "/ft-expo.jpg", alt: "The expo and networking floor" },
  { src: "/ft-gala.jpg", alt: "Gala dinner and networking reception" },
  { src: "/ft-panel.webp", alt: "A panel discussion" },
  { src: "/ft-breakfast.jpg", alt: "CxO breakfast with senior leaders" },
];
const AWARD_DATES = [
  { t: "Nominations open", d: "Spring 2027 · Next", now: true },
  { t: "Jury review", d: "After nominations close" },
  { t: "Awards Night", d: "Nov 2027 · Toronto" },
];

const AGENDA_IDS = ["van", "mtl", "cgy", "tob", "ott", "tor"];
const AGENDA_NAMES = { van: "Vancouver", mtl: "Montreal", cgy: "Calgary", tob: "Toronto City Briefing", ott: "Ottawa", tor: "Toronto National Festival" };

export const speakerPath = (name) => `/speakers/${speakerSlug(name)}`;

/** "Wednesday" for "2027-02-24" (the date as written, no time zone shift); "" when it isn't a full date. */
function weekdayOf(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/* The Contact page's four inboxes. `form` is the backend form the message is filed under. */
const CONTACT_TOPICS = {
  general: { label: "General", inbox: "enquire@thetechfestival.com", form: "inquiry" },
  sales: { label: "Sponsorship and exhibiting", inbox: "sales@thetechfestival.com", form: "partnership" },
  media: { label: "Media", inbox: "enquire@thetechfestival.com", form: "inquiry" },
  tickets: { label: "Tickets", inbox: "enquire@thetechfestival.com", form: "inquiry" },
};

export function applyNewLook(v, self, opts) {
  const { phone } = opts;
  let { openTix } = opts;
  const p = self.props;
  const s = self.state;
  const c = v.c || {};
  const city = s.city || "van";
  const go = (path) => (e) => { if (e && e.preventDefault) e.preventDefault(); p.navigate(path); };
  const goEvent = (v.goCity && v.goCity[city]) || v.goEvent;
  const goAllSpeakers = go("/speakers");
  const goAgenda = go(cityPath(city) + "/agenda");
  const types = p.data && p.data.types;
  const onSale = !p.ticketsSoon && !!(types && types.length);
  // Nov 26 2026 (the owner: the home page showed the National Festival but Agenda opened Vancouver's). On the
  // home page, Agenda and Speakers open the pages of the event the home page is showing, on both layouts.
  if (s.screen === "home") {
    // Same day, later (the owner: Agenda from Home "shows coming soon even though Vancouver has agenda"): when the
    // home page's event has no agenda yet, Agenda opens the next event in the season that has one.
    const ags = p.homeAgendas || {};
    const agCity = (ags[city] || []).length ? city : AGENDA_IDS.find((id) => (ags[id] || []).length) || city;
    const goHomeAgenda = go(cityPath(agCity) + "/agenda");
    v.goAgenda = goHomeAgenda;
    v.goSpeakers = go(cityPath(city) + "/speakers");
    if (v.goSec && typeof v.goSec === "object") v.goSec = { ...v.goSec, agenda: goHomeAgenda };
    if (v.sec && typeof v.sec === "object" && typeof v.sec.agenda === "function") v.sec = { ...v.sec, agenda: goHomeAgenda };
    // The phone's section links (v.secs) jump to the home event's own page; with no agenda there, Agenda follows the rule above.
    if (agCity !== city && Array.isArray(v.secs)) v.secs = v.secs.map((x) => (x && x.label === "Agenda" ? { ...x, go: goHomeAgenda } : x));
  }
  // The ticket panel (the owner, Nov 26 2026: "it doesn't have any way to enter my details"). It opened on 0
  // tickets with a greyed button and nothing saying to press + first. An event with one ticket type now opens
  // with 1 chosen; with several types the button and the hint say what to do. Both layouts.
  const openKey = phone ? "openSheet" : "openDrawer";
  if (typeof v[openKey] === "function" && types && types.length === 1) {
    const open0 = v[openKey];
    const open1 = (e) => { const q = self.state.q || []; if (!q.some((n) => n > 0)) self.setState({ q: [1, ...q.slice(1)] }); return open0(e); };
    v[openKey] = open1; openTix = open1;
  }
  if (!(s.q || []).some((n) => n > 0)) {
    v.tixCta = "Add a ticket to continue";
    if (phone) { if (v.step1) v.primaryLabel = v.tixCta; if (v.hint) v.hint = `Press + to add a ticket. ${v.hint}`; }
    else if (v.discountHint) v.discountHint = `Press + to add a ticket. ${v.discountHint}`;
  }
  // A session's picture, GIF or video (Admin › Agenda › "On the session's card"): on the home page's Agenda
  // highlights cards (the boards call v.cardMedia) and beside each row of the agenda lists.
  const mediaOf = (r) => sessionCardMedia(r && r.image && r.image.asset ? urlFor(r.image).width(900).height(506).fit("crop").auto("format").url() : "", r && r.mediaUrl);
  v.cardMedia = (r) => <CardMedia media={mediaOf(r)} title={r && r.title} />;
  const rows = ((p.data && p.data.sessionsData) || v.sessions || []).map((r) => ({ ...r, media: mediaOf(r) }));
  const hasAgenda = rows.some((r) => r && r.time);
  const withOpen = (list) => list.map((x) => ({ ...x, open: go(speakerPath(x.name)) }));

  // Speakers and partners: the event's own, else the stand-ins (another event's, labelled).
  const si = p.standIns || {};
  // Same rule as the event page's Speakers section (speakerGrid.jsx): an event's own speakers show once at least
  // three are confirmed; until then the stand-ins (so one early or test record never shows alone).
  const own = p.evSpeakers && p.evSpeakers.length >= SPK_MIN ? p.evSpeakers : null;
  const spk = own || (si.speakers && si.speakers.length ? si.speakers : null);
  const spkLabel = own ? "Speakers" : si.spkLabel ? `Speakers · ${si.spkLabel}` : "Speakers";
  const ptn = p.evPartners && p.evPartners.length
    ? p.evPartners.map((x) => ({ title: x.name, logo: x.logo }))
    : (si.partners || []).map((x) => ({ title: x.title || "", logo: x.name }));

  // The event menu (the pill in the header): Home, then City Briefings with the five cities under it, then the
  // National Festival (Nov 25 2026, the owner; first called Flagship Event). The boards list the six events in season order, Toronto's last.
  const group = (list, labelKey) => {
    if (!Array.isArray(list) || list.length < 6 || list.some((x) => x.head)) return list;
    const plain = list.map((x) => ({ ...x, [labelKey]: String(x[labelKey]).split(" · ")[0], ...(s.screen === "home" ? { bg: "transparent", weight: 400, ...(x.tag ? { tag: String(x.tag).split(" · ")[0] } : {}) } : {}) }));
    return [{ head: true, [labelKey]: "City Briefings" }, ...plain.slice(0, 5), { head: true, [labelKey]: "National Festival" }, ...plain.slice(5)];
  };
  if (v.menuItems) v.menuItems = group(v.menuItems, "label");
  if (v.cities) v.cities = group(v.cities, "label");
  // The pill reads "Home" on the home page.
  if (s.screen === "home") { if (v.pillLabel !== undefined) v.pillLabel = "Home"; if (v.pill !== undefined) v.pill = "Home"; }

  // Header: the current page is underlined (pink); Speakers opens the Speakers page.
  v.nav = { ...(v.nav || {}), agenda: s.screen === "agenda" ? "on" : (v.nav && v.nav.agenda) || "",
    speakers: s.screen === "speakers" || s.screen === "speaker" ? "on" : (v.nav && v.nav.speakers) || "",
    awards: s.screen === "awards" ? "on" : "", partners: s.screen === "partners" ? "on" : (v.nav && v.nav.partners) || "" };
  v.navSpeakers = goAllSpeakers;

  // Home.
  if (s.screen === "home") {
    v.heroCtas = <HeroCtas onTickets={openTix} onExplore={goEvent} city={c.name} />;
    // Agenda highlights: every event that has an agenda can be picked; six sessions show, then its full agenda.
    const agendas = p.homeAgendas || {};
    const withAgenda = AGENDA_IDS.filter((id) => (agendas[id] || []).length)
      .map((id) => ({ id, label: AGENDA_NAMES[id], rows: agendas[id].map((r) => ({ ...r, media: mediaOf(r) })) }));
    if (withAgenda.length) v.homeAgenda = <AgendaHighlights events={withAgenda} initial={city} onAll={(id) => p.navigate(cityPath(id) + "/agenda")} />;
    v.homeNext = (
      <>
        <NextUp matrix label={`Next up · ${c.date || ""}`} title={c.title} lead={c.blurb} img={c.img} alt={c.title} onTickets={openTix} onEvent={goEvent}
          stub={c.startDate ? <DateStub date={c.startDate} /> : null} />
      </>
    );
    // Who's on stage: up to six. The speakers picked in Admin › Content › Home page, else the event's own (or the
    // stand-ins). Six show as two rows of three.
    const picked = p.homeSpeakers && p.homeSpeakers.length ? p.homeSpeakers : null;
    const stage = (picked || spk || []).slice(0, 6);
    v.homeSpeakers = stage.length ? <OnStage alt three={stage.length > 4} label={picked ? "Speakers" : spkLabel} speakers={withOpen(stage)} onAll={goAllSpeakers} /> : null;
    // The home page's own words and media (Admin › Content › Home page): each one set replaces the event's.
    const own = p.homeOwn || {};
    if (own.eyebrow || own.title || own.blurb || own.img) {
      const base = v.homeHero || { img: c.img, alt: c.title, eyebrow: homeEyebrow(c), title: c.title, blurb: c.blurb, credit: c.credit, posD: c.posD || "center", pos: c.pos || c.posD || "center" };
      v.homeHero = { ...base, ...(own.eyebrow ? { eyebrow: own.eyebrow } : {}), ...(own.title ? { title: own.title, alt: own.title } : {}),
        ...(own.blurb ? { blurb: own.blurb } : {}), ...(own.img ? { img: own.img, credit: "", posD: "center", pos: "center" } : {}) };
    }
    if (own.video) { v.heroVideo = <HeroBackgroundVideo key={own.video} src={own.video} position="center" anyDevice />; v.hideCredit = true; }
    else if (own.img) v.heroVideo = null;   // its own picture, no video of its own: the picture shows, not the event's video
    // The pictures chosen in Admin › Home page (and how many of them), else the built-in five.
    const hl = (p.homeOwn && p.homeOwn.photos) || [];
    const hlCount = p.homeOwn && Number.isFinite(p.homeOwn.photoCount) ? p.homeOwn.photoCount : 5;
    v.homeLastYear = <LastYear photos={hl.length ? hl.slice(0, hlCount) : PHOTOS} more={hl.length > hlCount ? hl.length - hlCount : 0} onGallery={v.goPast} />;
    // In good company: the event's own partners, else every 2026 partner's logo (it sits right under the timeline).
    const logos2026 = (p.past2026 && p.past2026.logos) || [];
    const ownPtn = p.evPartners && p.evPartners.length;
    v.homePartners = <PartnersStrip alt label={ownPtn ? "Partners" : "Partners · Toronto 2026"} logos={ownPtn || !logos2026.length ? ptn : logos2026} onAll={v.goPartners || v.goPartnersAll} />;
  }

  // Event page.
  if (s.screen === "event") {
    // The countdown ticks every second, and the date reads like a ticket stub (only once the date is fixed).
    if (c.hasCountdown && c.startDate) v.countdown = <Countdown target={countdownTarget(c.startDate, city)} />;
    // Nov 26 2026 (the owner: "redundancy"): the date is in the banner, the countdown and the timeline already,
    // so this strip shows it once, as text with the weekday, beside the same kind of icon as the other facts.
    if (c.startDate) { const wd = weekdayOf(c.startDate); if (wd && c.date && !String(c.date).startsWith(wd)) v.c = { ...v.c, date: `${wd}, ${c.date}` }; }
    if (hasAgenda) v.dayGlance = <DayGlance alt sessions={rows} onFull={goAgenda} id={phone ? "m-agenda" : "ev-agenda"} />;
    if (own) v.evOnStage = <OnStage speakers={withOpen(own.slice(0, 4))} onAll={goAllSpeakers} id={phone ? "m-speakers" : "ev-speakers"} />;
    if (onSale) v.passes = <Passes types={types} onBuy={openTix} />;
  }

  // Partnership packages, side by side (SponsorCompare.jsx; the owner's sheet, Nov 26 2026): on the Sponsor page
  // (in place of the four old cards), on the Partners page, and on each event's page above its partner form,
  // where it opens on that event's kind and on the main rows only.
  const toForm = () => {   // a coming-soon event page has no form: the call booking opens instead
     const el = document.getElementById(phone ? "m-contact" : "ev-contact"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else if (v.bookCall) v.bookCall(); };
  if (v.pg && v.pg.partner) v.sponsorCompare = <SponsorCompare onEnquire={v.bookCall} enquireLabel="Book a 30-minute call" />;
  if (s.screen === "partners") v.partnersSponsor = <SponsorCompare onEnquire={v.bookCall} enquireLabel="Book a 30-minute call" />;
  // The banner's title (the owner, Nov 26 2026): a City Briefing reads "The City Briefing - Vancouver".
  if (s.screen === "event" && city !== "tor" && c.name) v.evHeading = `The City Briefing - ${c.name}`;
  if (s.screen === "event") v.evSponsor = <SponsorCompare compact focus={city === "tor" ? "main" : "city"} id={phone ? "m-packages" : "ev-packages"} onEnquire={toForm} onCall={v.bookCall} />;

  // The Agenda page.
  v.isAgenda = s.screen === "agenda";
  if (v.isAgenda) {
    v.agendaPage = (
      <AgendaPage rail={v.seasonRail} sessions={rows} onTickets={onSale ? openTix : null}
        hero={{ img: c.img, label: [c.name, c.date].filter(Boolean).join(" · "), title: "Agenda", line: c.blurb, back: c.title, onBack: goEvent }} />
    );
  }

  // The Speakers page's banner.
  if (s.screen === "speakers") {
    v.spkHero = <PageHero img={c.img} label={[c.name, c.date].filter(Boolean).join(" · ")} title="Speakers" line={v.spkIntro} back={c.title} onBack={goEvent} />;
    // Every speaker card opens that speaker's page.
    if (v.spkList) v.spkList = v.spkList.map((x) => (x.name ? { ...x, open: go(speakerPath(x.name)) } : x));
  }

  // A speaker's page.
  v.isSpeaker = s.screen === "speaker";
  if (v.isSpeaker) {
    const doc = p.speakerDoc;   // undefined while loading, null when nobody matches
    v.speakerPage = doc === undefined ? <main className="nx-page" style={{ minHeight: "70vh" }} aria-busy="true" /> : (
      <SpeakerPage sp={doc} rail={v.seasonRail} eventLabel={doc && doc.eventLabel} eventTitle={(doc && doc.eventTitle) || c.title}
        talks={doc ? doc.talks : null} others={doc ? withOpen(doc.others || []) : null}
        onBack={goAllSpeakers} onAll={goAllSpeakers} onAgenda={goAgenda} onTickets={onSale ? openTix : null} />
    );
  }

  // Awards: the key dates under the season timeline.
  if (s.screen === "awards") v.awDates = <KeyDates items={AWARD_DATES} />;
  // ---- Contact page (Nov 26 2026, the owner: the cards "are not selectable", and after sending "there is no
  // confirmation on screen"). Picking a card says who the message is for; after sending, the form gives way to
  // a confirmation that stays put (the small "Thanks" note at the bottom was easy to miss). ----
  {
    const st = self.state || {};
    const topic = CONTACT_TOPICS[st.topic] ? st.topic : "general";
    const T = CONTACT_TOPICS[topic];
    const say = (m) => (self.toast || self.toastIt).call(self, m);
    v.topic = topic;
    v.pickTopicEv = (e) => {
      const card = e.target && e.target.closest ? e.target.closest("[data-topic-key]") : null;
      if (!card || e.target.closest("a")) return;      // the email address itself still opens the mail app
      self.setState({ topic: card.dataset.topicKey });
    };
    v.pickTopicKey = (e) => {
      if ((e.key !== "Enter" && e.key !== " ") || !e.target.matches || !e.target.matches("[data-topic-key]")) return;
      e.preventDefault();
      self.setState({ topic: e.target.dataset.topicKey });
    };
    v.topicNote = `About: ${T.label}. Goes to ${T.inbox}.`;
    if (st.page === "contact") {
      v.submitForm = (e) => {
        const f = fieldsNear(e && (e.currentTarget || e.target));
        if (!String(f.name || "").trim()) { say("Add your name first"); return; }
        if (!EMAIL_RE.test(String(f.email || "").trim())) { say("Add a valid email address"); return; }
        if (!String(f.message || "").trim()) { say("Write a short message first"); return; }
        Promise.resolve(self.run("Sending", () => sendForm(T.form, f, { page: "contact", topic: T.label }), "")).then((ok) => {
          if (ok !== false) self.setState({ contactSent: { email: String(f.email).trim(), topic: T.label } });
        });
      };
      if (st.contactSent) {
        v.contactDone = <ContactDone email={st.contactSent.email} topic={st.contactSent.topic} inbox={T.inbox}
          onAgain={(e) => { if (e && e.preventDefault) e.preventDefault(); self.setState({ contactSent: null }); }} />;
      }
    }
  }
  // ---- What each ticket includes, in the purchase panel (Nov 26 2026, the owner: "the inclusions are not shown
  // in the Ticket Purchase Experience. Fix this for mobile and desktop"). The list staff write in Admin › Tickets
  // sits under the ticket's line, on the computer drawer and the phone sheet alike. ----
  if (Array.isArray(v.tickets)) {
    v.tickets = v.tickets.map((tk) => {
      const list = (Array.isArray(tk.inclusions) ? tk.inclusions : []).map((x) => String(x || "").trim()).filter(Boolean);
      if (!list.length) return tk;
      return { ...tk, incl: <ul className="nl-incl" aria-label={`${tk.name} includes`}>{list.map((x) => <li key={x}>{x}</li>)}</ul> };
    });
  }
  return v;
}
