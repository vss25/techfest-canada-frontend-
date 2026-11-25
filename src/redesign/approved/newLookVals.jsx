import React from "react";
import { AgendaPage, CardMedia, Countdown, DateStub, DayGlance, HeroCtas, KeyDates, LastYear, LogoStrip, NextUp, Ticker, OnStage, PageHero, PartnersStrip, Passes, SpeakerPage } from "./NewLook";
import { cityPath, countdownTarget } from "./liveShared";
import { speakerSlug } from "../../seo/slug";
import { sessionCardMedia } from "../../lib/sessionMedia";
import { urlFor } from "../../utils/sanity";
import { SPK_MIN } from "./speakerGrid";

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
  { t: "Awards Night", d: "Oct 2027 · Toronto" },
];

export const speakerPath = (name) => `/speakers/${speakerSlug(name)}`;

export function applyNewLook(v, self, { openTix, phone }) {
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
  const ptnLabel = p.evPartners && p.evPartners.length ? "Partners" : si.ptnLabel ? `Partners · ${si.ptnLabel}` : "Partners";

  // The event menu (the pill in the header): Home, then City Briefings with the five cities under it, then the
  // Flagship Event (Nov 25 2026, the owner). The boards list the six events in season order, Toronto's last.
  const group = (list, labelKey) => {
    if (!Array.isArray(list) || list.length < 6 || list.some((x) => x.head)) return list;
    const plain = list.map((x) => ({ ...x, [labelKey]: String(x[labelKey]).split(" · ")[0], ...(s.screen === "home" ? { bg: "transparent", weight: 400, ...(x.tag ? { tag: String(x.tag).split(" · ")[0] } : {}) } : {}) }));
    return [{ head: true, [labelKey]: "City Briefings" }, ...plain.slice(0, 5), { head: true, [labelKey]: "Flagship Event" }, ...plain.slice(5)];
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
    // Under the top section: a moving row of the 2026 partners' logos (the owner replaced the city ticker with it).
    const logos2026 = (p.past2026 && p.past2026.logos) || [];
    v.homeNext = (
      <>
        <LogoStrip label="2026 partners" logos={logos2026} />
        <NextUp matrix label={`Next up · ${c.date || ""}`} title={c.title} lead={c.blurb} img={c.img} alt={c.title} onTickets={openTix} onEvent={goEvent}
          stub={c.startDate ? <DateStub date={c.startDate} /> : null} />
      </>
    );
    v.homeSpeakers = spk ? <OnStage alt label={spkLabel} speakers={withOpen(spk.slice(0, 4))} onAll={goAllSpeakers} /> : null;
    v.homeLastYear = <LastYear photos={PHOTOS} onGallery={v.goPast} />;
    v.homePartners = <PartnersStrip alt label={ptnLabel} logos={ptn} onAll={v.goPartners || v.goPartnersAll} />;
  }

  // Event page.
  if (s.screen === "event") {
    // The countdown ticks every second, and the date reads like a ticket stub (only once the date is fixed).
    if (c.hasCountdown && c.startDate) v.countdown = <Countdown target={countdownTarget(c.startDate, city)} />;
    if (c.startDate) v.dateStub = <DateStub date={c.startDate} />;
    if (hasAgenda) v.dayGlance = <DayGlance alt sessions={rows} onFull={goAgenda} id={phone ? "m-agenda" : "ev-agenda"} />;
    if (own) v.evOnStage = <OnStage speakers={withOpen(own.slice(0, 4))} onAll={goAllSpeakers} id={phone ? "m-speakers" : "ev-speakers"} />;
    if (onSale) v.passes = <Passes types={types} onBuy={openTix} />;
  }

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

  // Above the footer on every page: a closing ticker for the event this page is about.
  if (c.name) v.footTicker = <Ticker big items={[`See you in ${c.name}`, c.date || "2027", c.kind ? `${c.kind} 2027` : "2027", "The Tech Festival Canada"]} />;

  // Awards: the key dates under the season timeline.
  if (s.screen === "awards") v.awDates = <KeyDates items={AWARD_DATES} />;
  return v;
}
