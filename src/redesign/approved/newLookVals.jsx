import React from "react";
import { AgendaPage, CardMedia, Countdown, DayGlance, KeyDates, LastYear, OnStage, Pillars, PageHero, PartnersStrip, Passes, SpeakerPage, ContactDone } from "./NewLook";
import { EMAIL_RE, cityPath, countdownTarget, fieldsNear, sendForm } from "./liveShared";
import { speakerSlug } from "../../seo/slug";
import { sessionCardMedia } from "../../lib/sessionMedia";
import { urlFor } from "../../utils/sanity";
import HeroBackgroundVideo from "../../components/HeroBackgroundVideo";
import { homeEyebrow } from "../../lib/homeLayout";
import { SPK_MIN } from "./speakerGrid";
import { heroStillOnly } from "../../lib/siteFiles";
import { EventBar, PartnerForm, TopBar } from "./SiteBars";

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

/* A see-through 1×1 picture: the banner's <img> with nothing to show yet. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const AGENDA_IDS = ["van", "mtl", "cgy", "tob", "ott", "tor"];
const AGENDA_NAMES = { van: "Vancouver", mtl: "Montreal", cgy: "Calgary", tob: "Toronto City Briefing", ott: "Ottawa", tor: "Toronto Flagship" };

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
  // Nov 27 2026 (the owner: "there is an image that loads... before the actual image is loaded. I don't want the
  // backup image to load"). Until the event's own record has arrived, the banner has no picture at all (the
  // design's stand-in photo used to show for a moment, then swap). heroWait comes from the route (LiveSite.jsx).
  if (p.heroWait && v.c) v.c = { ...v.c, img: BLANK };
  const c = v.c || {};
  const city = s.city || "van";
  const go = (path) => (e) => { if (e && e.preventDefault) e.preventDefault(); p.navigate(path); };
  const goEvent = (v.goCity && v.goCity[city]) || v.goEvent;
  const goAllSpeakers = go("/speakers");
  const goAgenda = go(cityPath(city) + "/agenda");
  const types = p.data && p.data.types;
  const onSale = !p.ticketsSoon && !!(types && types.length);
  // Nov 26 2026 (the owner: the home page showed the Flagship but Agenda opened Vancouver's). On the
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
  const ptn = p.evPartners && p.evPartners.length
    ? p.evPartners.map((x) => ({ title: x.name, logo: x.logo }))
    : (si.partners || []).map((x) => ({ title: x.title || "", logo: x.name }));

  // The event menu (the pill in the header): Home, then City Briefings with the five cities under it, then the
  // Flagship (Nov 25 2026, the owner; first called Flagship Event). The boards list the six events in season order, Toronto's last.
  const group = (list, labelKey) => {
    if (!Array.isArray(list) || list.length < 6 || list.some((x) => x.head)) return list;
    const plain = list.map((x) => ({ ...x, [labelKey]: String(x[labelKey]).split(" · ")[0], ...(s.screen === "home" ? { bg: "transparent", weight: 400, ...(x.tag ? { tag: String(x.tag).split(" · ")[0] } : {}) } : {}) }));
    return [{ head: true, [labelKey]: "City Briefings" }, ...plain.slice(0, 5), { head: true, [labelKey]: "Flagship" }, ...plain.slice(5)];
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

  // The two headers (Nov 27 2026, the owner: "Header 1 - City Briefings (along with Cities) and Flagship Event.
  // Header 2 - Agenda, Speakers, Partners, More for each city... awards for flagship. Home Page should only have
  // header 1"). Header 1 is TopBar on every page. Header 2 is the board's own header row on a computer (its logo,
  // event menu, Log in and Tickets are hidden by .nl-head2) and EventBar on a phone; neither shows on Home.
  const isHome = s.screen === "home";
  const sendPartner = (from) => (f, interests) => self.run("Sending your details",
    () => sendForm("partnership", f, { interests: interests.join(", "), event: from, wants: "partnership packages" }), "Thanks. We'll send the partnership packages to your inbox");
  const ctx = s.screen === "awards" ? "tor" : city;            // the event header 2 belongs to
  const stops = (p.season || []).filter((x) => x.id !== "past");
  const eventScreen = ["event", "agenda", "speakers", "speaker"].includes(s.screen);
  v.topBar = (
    <TopBar phone={phone} isHome={isHome} goHome={v.goHome} here={isHome ? null : (eventScreen || s.screen === "awards" ? ctx : null)}
      cities={stops.filter((x) => x.id !== "tor").map((x) => ({ id: x.id, name: x.name, short: String(x.name).replace(/ Briefing$/, ""), when: String(x.when || "").replace(" · Next", ""), go: v.goCity && v.goCity[x.id] }))}
      flagship={{ id: "tor", go: v.goCity && v.goCity.tor }}
      login={v.notSignedIn ? v.openLogin : null} account={v.signedIn ? <span className="nl-top-acct">My TTFC</span> : null}
      onTickets={isHome ? null : v.openDrawer} />
  );
  v.head2Cls = `nl-head2${isHome ? " nl-head2-off" : ""}`;
  v.noAwards = ctx !== "tor";
  v.head2Label = eventScreen && c.title ? <span className="nl-head2-name">{c.title}</span> : null;
  if (phone) {
    v.eventBar = isHome ? null : (
      <EventBar label={eventScreen ? c.name : ""} onMore={v.openMenu}
        links={[
          { label: "Agenda", go: go(cityPath(ctx) + "/agenda"), on: s.screen === "agenda" },
          { label: "Speakers", go: go(cityPath(ctx) + "/speakers"), on: s.screen === "speakers" || s.screen === "speaker" },
          ...(ctx === "tor" ? [{ label: "Awards", go: go("/awards"), on: s.screen === "awards" }] : []),
          { label: "Partners", go: go("/partners"), on: s.screen === "partners" },
        ]} />
    );
  }

  // Home (Nov 27 2026, the owner's list): the banner's video with Meet | Build | Scale and nothing else, the
  // timeline, In good company (last year's partners), the 5 × 5, past speakers, the partnership form, Last year
  // in numbers. "Decouple Home page linkage to any event page": no event's title, tickets or agenda on it.
  if (isHome) {
    v.homeOrder = ["season", "partners", "next", "speakers", "form", "highlights"];
    v.heroCtas = <></>;
    // The tagline is the page's heading now that the banner has no other text.
    v.heroTag = <h1 className="nx-tagline" aria-label="Meet, Build, Scale"><span>Meet</span><i aria-hidden="true" /><span>Build</span><i aria-hidden="true" /><span>Scale</span></h1>;
    v.homeNext = <Pillars />;
    // Past speakers: last year's (Toronto 2026), up to six, two rows of three.
    const pastSpk = ((p.past2026 && p.past2026.speakers) || []).slice(0, 6);
    const stage = pastSpk.length ? pastSpk : (spk || []).slice(0, 6);
    v.homeSpeakers = stage.length ? <OnStage alt three={stage.length > 4} label="Toronto 2026" title="Past speakers" speakers={withOpen(stage)} onAll={goAllSpeakers} /> : null;
    // The home page's own picture or video (Admin › Content › Home page).
    const own = p.homeOwn || {};
    if (own.img) {
      const base = v.homeHero || { img: c.img, alt: "The Tech Festival Canada", eyebrow: "", title: "", blurb: "", credit: c.credit, posD: c.posD || "center", pos: c.pos || c.posD || "center" };
      v.homeHero = { ...base, img: own.img, credit: "", posD: "center", pos: "center" };
    }
    if (own.video) { v.heroVideo = <HeroBackgroundVideo key={own.video} src={own.video} position="center" anyDevice />; v.hideCredit = true; }
    else if (own.img) v.heroVideo = null;   // its own picture, no video of its own: the picture shows, not the event's video
    // The pictures chosen in Admin › Home page (and how many of them), else the built-in five.
    const hl = (p.homeOwn && p.homeOwn.photos) || [];
    const hlCount = p.homeOwn && Number.isFinite(p.homeOwn.photoCount) ? p.homeOwn.photoCount : 5;
    v.homeLastYear = <LastYear photos={hl.length ? hl.slice(0, hlCount) : PHOTOS} more={hl.length > hlCount ? hl.length - hlCount : 0} onGallery={v.goPast} />;
    // In good company: last year's partners (the owner: "old partners"); the stand-ins until those arrive.
    const logos2026 = (p.past2026 && p.past2026.logos) || [];
    v.homePartners = <PartnersStrip alt label="Partners · Toronto 2026" logos={logos2026.length ? logos2026 : ptn} onAll={v.goPartners || v.goPartnersAll} />;
    v.homeForm = <PartnerForm onSend={sendPartner("home")} />;
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

  // Nov 27 2026 (the owner: "Remove sponsorship packages completely. We want to capture the lead. So, we will
  // send it after the person has provided the details"). The packages comparison is gone from the Sponsor page,
  // the Partners page and every event page; the Sponsor page asks for the visitor's details instead.
  if (v.pg && v.pg.partner) v.sponsorCompare = <PartnerForm onSend={sendPartner("sponsor page")} />;
  // The banner's title (the owner, Nov 26 2026): a City Briefing reads "The City Briefing - Vancouver".
  if (s.screen === "event" && city !== "tor" && c.name) v.evHeading = `The City Briefing - ${c.name}`;

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
  // The same on the banner itself once the record is in: an event (or the home page) that shows a video and has
  // no photo of its own gets no stand-in photo behind the video while it loads. Visitors who never get the video
  // (data saver, reduced motion) keep the stand-in, so they are not left with an empty banner.
  if (s.screen === "home" || s.screen === "event") {
    const ownPic = s.screen === "home" ? !!((p.homeOwn && p.homeOwn.img) || c.ownPhoto) : !!c.ownPhoto;
    const bare = p.heroWait || (!!v.heroVideo && !ownPic && !heroStillOnly({ anyDevice: true }));
    if (bare) {
      if (v.c) v.c = { ...v.c, img: BLANK };
      if (s.screen === "home") {
        const base = v.homeHero || { alt: c.title, eyebrow: homeEyebrow(c), title: c.title, blurb: c.blurb, credit: c.credit, posD: c.posD || "center", pos: c.pos || c.posD || "center" };
        v.homeHero = { ...base, img: BLANK, credit: "" };
      }
      v.hideCredit = true;
    }
  }
  return v;
}
